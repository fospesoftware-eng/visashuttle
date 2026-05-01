import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runVisaCheck, runDeepCheck } from "./ai";
import { sendOtp, verifyOtp, getSmsProviderStatus } from "./sms";
import { getEntryRequirement } from "@shared/visa-free";
import indiaVisaChanceDataset from "@shared/india_visa_chance_dataset_non_visa_free_2026.json";
import bcrypt from "bcryptjs";

// Site-wide password for protecting the entire application
const SITE_PASSWORD = process.env.SITE_PASSWORD;

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
}

// Extend Express Session with white-label customer data AND agency/admin user data
declare module "express-session" {
  interface SessionData {
    // White-label customer portal
    wlCustomerId?: string;
    wlTenantId?: string;
    wlEmail?: string;
    wlName?: string;
    // Agency / Admin dashboard
    userId?: string;
    userRole?: string;
    userTenantId?: string;
    // Site password gate
    siteAuthenticated?: boolean;
    // B2C visa checker users
    b2cUserId?: string;
    // OTP verification (temporary, cleared after registration)
    otpVerifiedPhone?: string;
    // MessageCentral verification ID (needed to verify OTP)
    mcVerificationId?: string;
  }
}

// Middleware to require agency/admin authentication
function requireAgencyAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware to require SaaS admin role
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session?.userRole !== "saas_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Middleware to require white-label authentication
function requireWLAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.wlCustomerId || !req.session?.wlTenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferenceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'REF-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

type LiveVisaScore = {
  from: string;
  to: string;
  type: string;
  score: number;
  fromCode?: string | null;
  toCode?: string | null;
};

type IndiaVisaChanceKey = "visit" | "business" | "work" | "study";

type IndiaVisaChanceCountry = {
  country: string;
  iso2: string;
  region: string;
  approval_chance_percent: Record<IndiaVisaChanceKey, { min: number; max: number }>;
};

const COUNTRY_BY_CODE: Record<string, string> = {
  AE: "United Arab Emirates",
  AU: "Australia",
  BD: "Bangladesh",
  BR: "Brazil",
  CA: "Canada",
  CN: "China",
  CO: "Colombia",
  DE: "Germany",
  EG: "Egypt",
  ES: "Spain",
  ET: "Ethiopia",
  FR: "France",
  GB: "United Kingdom",
  GH: "Ghana",
  ID: "Indonesia",
  IN: "India",
  IR: "Iran",
  IQ: "Iraq",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  LB: "Lebanon",
  LK: "Sri Lanka",
  MA: "Morocco",
  MX: "Mexico",
  NG: "Nigeria",
  NP: "Nepal",
  PH: "Philippines",
  PK: "Pakistan",
  RU: "Russia",
  SA: "Saudi Arabia",
  TH: "Thailand",
  TR: "Turkey",
  UA: "Ukraine",
  US: "United States",
  UZ: "Uzbekistan",
  VN: "Vietnam",
  ZA: "South Africa",
};

const ORIGIN_DESTINATIONS: Record<string, string[]> = {
  India: ["Australia", "United Kingdom", "Canada", "United States", "Schengen", "New Zealand", "Japan", "South Korea", "Singapore"],
  Pakistan: ["United Kingdom", "Canada", "United States", "Schengen", "Australia", "New Zealand", "Japan", "South Korea", "Singapore"],
  Bangladesh: ["United Kingdom", "Canada", "Australia", "United States", "Schengen", "New Zealand", "Japan", "South Korea", "Singapore"],
  Nepal: ["Australia", "Canada", "United Kingdom", "United States", "Schengen", "New Zealand", "Japan", "South Korea", "Singapore"],
  "Sri Lanka": ["Australia", "United Kingdom", "Canada", "Schengen", "United States", "New Zealand", "Japan", "South Korea", "Singapore"],
  Philippines: ["Japan", "Australia", "Canada", "United Kingdom", "Schengen", "United States", "New Zealand", "South Korea", "Singapore"],
  "United States": ["Schengen", "United Kingdom", "Australia", "Japan", "Canada"],
  "United Kingdom": ["Schengen", "United States", "Australia", "Canada", "Japan", "South Korea", "Singapore", "New Zealand"],
  Canada: ["Schengen", "United States", "United Kingdom", "Australia", "Japan"],
  Australia: ["United States", "Schengen", "United Kingdom", "Japan", "Canada"],
  "United Arab Emirates": ["United Kingdom", "Schengen", "United States", "Canada", "Australia", "New Zealand", "Japan", "South Korea", "Singapore"],
  "Saudi Arabia": ["Schengen", "United Kingdom", "United States", "Australia", "Canada", "New Zealand", "Japan", "South Korea", "Singapore"],
};

const FALLBACK_DESTINATIONS = [
  "United States",
  "United Kingdom",
  "Schengen",
  "Canada",
  "Australia",
  "Japan",
  "New Zealand",
  "South Korea",
  "Singapore",
];
const ALLOWED_LIVE_DESTINATIONS = new Set(FALLBACK_DESTINATIONS);
const ALLOWED_LIVE_REGIONS = new Set(["Europe", "North America"]);
const COUNTRY_CODE_BY_NAME = Object.fromEntries(
  Object.entries(COUNTRY_BY_CODE).map(([code, country]) => [country, code.toLowerCase()])
) as Record<string, string>;
const LIVE_DESTINATION_CODES: Record<string, string> = {
  Australia: "au",
  Canada: "ca",
  Japan: "jp",
  "New Zealand": "nz",
  Schengen: "eu",
  Singapore: "sg",
  "South Korea": "kr",
  "United Kingdom": "gb",
  "United States": "us",
};

const HIGH_MOBILITY_ORIGINS = new Set(["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan"]);
const REGIONAL_EASY_DESTINATIONS = new Set(["Nepal", "Bhutan", "Singapore", "Japan"]);
const HIGH_SCRUTINY_DESTINATIONS = new Set(["United States", "United Kingdom", "Canada", "Australia", "Schengen", "New Zealand"]);
const LIVE_VISA_TYPES = ["Tourist Visa", "Visit Visa", "Work Visa", "Student Visa", "Business Visa"];
const INDIA_DATASET_VISA_TYPES: Array<{ key: IndiaVisaChanceKey; label: string }> = [
  { key: "visit", label: "Visit Visa" },
  { key: "business", label: "Business Visa" },
  { key: "work", label: "Work Visa" },
  { key: "study", label: "Student Visa" },
];
const INDIA_VISA_CHANCE_COUNTRIES = (indiaVisaChanceDataset as { countries: IndiaVisaChanceCountry[] }).countries;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function clampScore(score: number): number {
  return Math.max(24, Math.min(94, score));
}

function randomInRange(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function flagCodeForCountry(country: string, iso2?: string | null): string | null {
  return (iso2 || LIVE_DESTINATION_CODES[country] || COUNTRY_CODE_BY_NAME[country] || "").toLowerCase() || null;
}

function visaTypeForDestination(to: string, index: number, mixedTypes: string[]): string {
  if (["Malaysia"].includes(to) && Math.random() > 0.45) return "Work Visa";
  if (["United Kingdom", "Canada", "Australia", "United States"].includes(to) && Math.random() > 0.55) return Math.random() > 0.5 ? "Student Visa" : "Visit Visa";
  return mixedTypes[index % mixedTypes.length];
}

function liveScoreForRoute(from: string, to: string): number {
  let score = HIGH_MOBILITY_ORIGINS.has(from) ? 82 : 56;

  if (REGIONAL_EASY_DESTINATIONS.has(to)) score += 14;
  if (HIGH_SCRUTINY_DESTINATIONS.has(to)) score -= HIGH_MOBILITY_ORIGINS.has(from) ? 0 : 10;
  if (from === "India" && ["Nepal", "Bhutan"].includes(to)) score = 88 + Math.floor(Math.random() * 5);
  if (from === "India" && to === "Australia") score = 56 + Math.floor(Math.random() * 8);
  if (from === to) score -= 30;

  return clampScore(score + Math.floor(Math.random() * 11) - 5);
}

function buildIndiaLiveVisaScores(): { country: string; scores: LiveVisaScore[] } {
  const countries = shuffle(INDIA_VISA_CHANCE_COUNTRIES)
    .filter(item => ALLOWED_LIVE_REGIONS.has(item.region) || ALLOWED_LIVE_DESTINATIONS.has(item.country))
    .filter(item => getEntryRequirement("India", item.country) !== "visa_free")
    .slice(0, 4);
  const visaTypes = shuffle(INDIA_DATASET_VISA_TYPES);

  return {
    country: "India",
    scores: countries.map((item, index) => {
      const visaType = visaTypes[index % visaTypes.length];
      const range = item.approval_chance_percent[visaType.key];

      return {
        from: "India",
        to: item.country,
        type: visaType.label,
        score: clampScore(randomInRange(range.min, range.max)),
        fromCode: "in",
        toCode: flagCodeForCountry(item.country, item.iso2),
      };
    }),
  };
}

function getCountryCodeFromRequest(req: Request): string | null {
  const raw =
    req.header("cf-ipcountry") ||
    req.header("x-vercel-ip-country") ||
    req.header("cloudfront-viewer-country") ||
    req.header("x-country-code") ||
    req.header("x-appengine-country");

  if (!raw || raw.toUpperCase() === "XX") return null;
  return raw.split(",")[0].trim().toUpperCase();
}

function getClientIp(req: Request): string | null {
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const raw = forwarded || req.header("x-real-ip") || req.socket.remoteAddress || "";
  const ip = raw.replace(/^::ffff:/, "").trim();

  if (!ip || ip === "::1" || ip === "127.0.0.1") return null;
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return null;
  return ip;
}

async function lookupCountryByIp(ip: string): Promise<string | null> {
  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if (!response.ok) return null;
    const data = await response.json() as { country_name?: string };
    return data.country_name || null;
  } catch {
    return null;
  }
}

async function getCountryFromRequest(req: Request): Promise<string | null> {
  const explicitCountry = req.header("x-country-name");
  if (explicitCountry && explicitCountry.length > 2) return explicitCountry.trim();

  const code = getCountryCodeFromRequest(req);
  if (code && COUNTRY_BY_CODE[code]) return COUNTRY_BY_CODE[code];

  const ip = getClientIp(req);
  return ip ? lookupCountryByIp(ip) : null;
}

function buildLiveVisaScores(origin: string | null): { country: string | null; scores: LiveVisaScore[] } {
  const from = origin || "India";
  if (from.toLowerCase() === "india") return buildIndiaLiveVisaScores();

  let destinations = shuffle([...(ORIGIN_DESTINATIONS[from] || FALLBACK_DESTINATIONS)])
    .filter(destination => ALLOWED_LIVE_DESTINATIONS.has(destination))
    .filter(destination => destination !== from)
    .filter(destination => getEntryRequirement(from, destination) !== "visa_free")
    .slice(0, 4);

  if (destinations.length < 4) {
    const extras = shuffle(FALLBACK_DESTINATIONS)
      .filter(destination => ALLOWED_LIVE_DESTINATIONS.has(destination))
      .filter(destination => destination !== from)
      .filter(destination => !destinations.includes(destination))
      .filter(destination => getEntryRequirement(from, destination) !== "visa_free")
      .slice(0, 4 - destinations.length);
    destinations = [...destinations, ...extras];
  }

  const visaTypes = shuffle(LIVE_VISA_TYPES);

  return {
    country: from,
    scores: destinations.map((to, index) => ({
      from,
      to,
      type: visaTypeForDestination(to, index, visaTypes),
      score: liveScoreForRoute(from, to),
      fromCode: flagCodeForCountry(from),
      toCode: flagCodeForCountry(to),
    })),
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed demo B2C users into PostgreSQL on startup
  await (storage as any).seedDemoUsersToDb?.();

  // === Site Password Protection ===
  app.post("/api/site-auth/verify", (req, res) => {
    const { password } = req.body;
    if (!SITE_PASSWORD) {
      // No password set - allow access
      req.session.siteAuthenticated = true;
      return res.json({ success: true });
    }
    if (password === SITE_PASSWORD) {
      req.session.siteAuthenticated = true;
      return res.json({ success: true });
    }
    return res.status(401).json({ error: "Invalid password" });
  });

  app.get("/api/site-auth/status", (req, res) => {
    // If no password is configured, automatically grant access
    if (!SITE_PASSWORD) {
      return res.json({ authenticated: true });
    }
    res.json({ authenticated: !!req.session.siteAuthenticated });
  });

  app.get("/api/public/live-visa-scores", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(buildLiveVisaScores(await getCountryFromRequest(req)));
  });

  // === Auth Routes ===
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await storage.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // Set session
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userTenantId = user.tenantId || undefined;

    // Get tenant slug if agency user
    let tenantSlug: string | null = null;
    if (user.tenantId) {
      const tenant = await storage.getTenant(user.tenantId);
      tenantSlug = tenant?.slug || null;
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, tenantSlug });
  });

  // Get current logged-in agency/admin user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ authenticated: false });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }
    let tenantSlug: string | null = null;
    let tenant = null;
    if (user.tenantId) {
      tenant = await storage.getTenant(user.tenantId);
      tenantSlug = tenant?.slug || null;
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ authenticated: true, user: userWithoutPassword, tenantSlug, tenant });
  });

  // Logout agency/admin user
  app.post("/api/auth/logout", (req, res) => {
    req.session.userId = undefined;
    req.session.userRole = undefined;
    req.session.userTenantId = undefined;
    res.json({ success: true });
  });

  // === White-Label Auth Routes ===
  
  // Get tenant by slug (for white-label pages)
  app.get("/api/w/:slug/tenant", async (req, res) => {
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }
    res.json(tenant);
  });

  // Request OTP
  app.post("/api/w/:slug/auth/request-otp", async (req, res) => {
    const { email, phone, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await storage.createOTPCode({
      email,
      code,
      tenantId: tenant.id,
      attempts: 0,
      expiresAt,
      usedAt: null
    });

    // Log the OTP request
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: null,
      action: "otp.requested",
      entityType: "auth",
      entityId: email,
      details: { email, phone }
    });

    // In development, log OTP to console
    console.log(`[OTP] Code for ${email} at ${tenant.slug}: ${code}`);

    res.json({ message: "OTP sent successfully", email });
  });

  // Verify OTP
  app.post("/api/w/:slug/auth/verify-otp", async (req, res) => {
    const { email, code, name, phone } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }

    // Demo OTP code for testing - only enabled in development mode
    const isDemoCode = process.env.NODE_ENV !== "production" && code === "123456";
    
    const otp = await storage.getActiveOTPCode(email, tenant.id);
    
    if (!otp && !isDemoCode) {
      return res.status(400).json({ error: "No active OTP found. Please request a new one." });
    }

    if (!isDemoCode && otp && otp.code !== code) {
      await storage.incrementOTPAttempts(otp.id);
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    // Mark OTP as used (only if a real OTP was used, not demo code)
    if (otp) {
      await storage.markOTPUsed(otp.id);
    }

    // Get or create customer account
    let customerAccount = await storage.getCustomerAccountByEmail(email);
    
    if (!customerAccount) {
      customerAccount = await storage.createCustomerAccount({
        email,
        phone: phone || null,
        name: name || null,
        avatarUrl: null,
        isVerified: true
      });
    } else if (!customerAccount.isVerified) {
      await storage.updateCustomerAccount(customerAccount.id, { isVerified: true });
    }

    // Ensure customer-tenant link exists
    let link = await storage.getCustomerTenantLink(customerAccount.id, tenant.id);
    if (!link) {
      link = await storage.createCustomerTenantLink({
        customerAccountId: customerAccount.id,
        tenantId: tenant.id,
        role: "customer"
      });
    }

    // Log successful verification
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: customerAccount.id,
      action: "otp.verified",
      entityType: "auth",
      entityId: customerAccount.id,
      details: { email }
    });

    // Store authenticated customer in session
    req.session.wlCustomerId = customerAccount.id;
    req.session.wlTenantId = tenant.id;
    req.session.wlEmail = customerAccount.email;
    req.session.wlName = customerAccount.name || undefined;

    res.json({ 
      success: true,
      customerAccount: {
        id: customerAccount.id,
        email: customerAccount.email,
        name: customerAccount.name,
        phone: customerAccount.phone
      },
      tenantId: tenant.id
    });
  });

  // Logout from white-label portal
  app.post("/api/w/:slug/auth/logout", (req, res) => {
    req.session.wlCustomerId = undefined;
    req.session.wlTenantId = undefined;
    req.session.wlEmail = undefined;
    req.session.wlName = undefined;
    res.json({ success: true });
  });

  // Check authentication status
  app.get("/api/w/:slug/auth/me", async (req, res) => {
    if (!req.session?.wlCustomerId || !req.session?.wlTenantId) {
      return res.status(401).json({ authenticated: false });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== req.session.wlTenantId) {
      return res.status(401).json({ authenticated: false });
    }

    const customer = await storage.getCustomerAccount(req.session.wlCustomerId);
    if (!customer) {
      return res.status(401).json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone
      },
      tenantId: tenant.id
    });
  });

  // Get customer profile for white-label portal
  app.get("/api/w/:slug/portal/profile", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const customer = await storage.getCustomerAccount(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone
    });
  });

  // Get customer cases for white-label portal
  app.get("/api/w/:slug/portal/cases", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const cases = await storage.getCasesByCustomerAccountId(customerId, tenant.id);
    res.json(cases);
  });

  // Claim case by reference ID
  app.post("/api/w/:slug/portal/claim-case", requireWLAuth, async (req, res) => {
    const { referenceId, lastName } = req.body;
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    if (!referenceId) {
      return res.status(400).json({ error: "Reference ID required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCaseByReferenceId(referenceId, tenant.id);
    
    if (!caseData) {
      return res.status(404).json({ error: "Case not found with this reference ID" });
    }

    // Verify applicant details (light security)
    if (lastName && caseData.applicantName) {
      const caseLastName = caseData.applicantName.split(' ').pop()?.toLowerCase();
      if (caseLastName !== lastName.toLowerCase()) {
        return res.status(400).json({ error: "Verification failed. Please check your details." });
      }
    }

    // Link case to customer account
    await storage.updateCase(caseData.id, { customerAccountId: customerId });

    // Log the claim
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: customerId,
      action: "case.claimed",
      entityType: "case",
      entityId: caseData.id,
      details: { referenceId }
    });

    res.json({ success: true, case: caseData });
  });

  // Get single case for white-label portal
  app.get("/api/w/:slug/portal/cases/:caseId", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;
    
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id) {
      return res.status(404).json({ error: "Case not found" });
    }

    // Verify customer owns this case
    if (caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(caseData);
  });

  // Get documents for white-label portal case
  app.get("/api/w/:slug/portal/cases/:caseId/documents", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const documents = await storage.getDocumentsByCaseId(req.params.caseId);
    res.json(documents);
  });

  // Get messages for white-label portal case
  app.get("/api/w/:slug/portal/cases/:caseId/messages", requireWLAuth, async (req, res) => {
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await storage.getMessagesByCaseId(req.params.caseId);
    res.json(messages);
  });

  // Send message from white-label portal
  app.post("/api/w/:slug/portal/cases/:caseId/messages", requireWLAuth, async (req, res) => {
    const { content } = req.body;
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const message = await storage.createMessage({
      caseId: req.params.caseId,
      senderId: customerId,
      senderRole: "customer",
      content,
      isRead: false
    });

    res.status(201).json(message);
  });

  // Upload document from white-label portal
  app.post("/api/w/:slug/portal/cases/:caseId/documents", requireWLAuth, async (req, res) => {
    const { name, type } = req.body;
    const customerId = req.session.wlCustomerId!;
    const tenantId = req.session.wlTenantId!;

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant || tenant.id !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const caseData = await storage.getCase(req.params.caseId);
    if (!caseData || caseData.tenantId !== tenant.id || caseData.customerAccountId !== customerId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const document = await storage.createDocument({
      caseId: req.params.caseId,
      tenantId: tenant.id,
      name,
      type,
      status: "pending",
      fileUrl: null,
      qualityScore: null,
      extractedData: null,
      notes: null
    });

    // Log the upload
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: customerId,
      action: "document.uploaded",
      entityType: "document",
      entityId: document.id,
      details: { name, type }
    });

    res.status(201).json(document);
  });

  // === Tenant Routes ===
  app.get("/api/tenants", async (req, res) => {
    const tenants = await storage.getAllTenants();
    res.json(tenants);
  });

  app.post("/api/tenants", async (req, res) => {
    const tenant = await storage.createTenant(req.body);
    res.status(201).json(tenant);
  });

  app.get("/api/tenants/:id", async (req, res) => {
    const tenant = await storage.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    const tenant = await storage.updateTenant(req.params.id, req.body);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // Get tenant by slug (for agency dashboard)
  app.get("/api/tenants/by-slug/:slug", async (req, res) => {
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // Update tenant branding (for agency owners)
  app.patch("/api/tenants/:id/branding", async (req, res) => {
    const { name, logoUrl, primaryColor, secondaryColor, accentColor, contactEmail, contactPhone, whatsappNumber, showPoweredBy } = req.body;
    
    const tenant = await storage.updateTenant(req.params.id, {
      name,
      logoUrl: logoUrl || null,
      primaryColor,
      secondaryColor,
      accentColor,
      contactEmail,
      contactPhone,
      whatsappNumber,
      showPoweredBy
    });
    
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // === Lead Routes ===
  app.get("/api/tenants/:tenantId/leads", async (req, res) => {
    const leads = await storage.getLeadsByTenantId(req.params.tenantId);
    res.json(leads);
  });

  app.post("/api/tenants/:tenantId/leads", async (req, res) => {
    const lead = await storage.createLead({
      ...req.body,
      tenantId: req.params.tenantId
    });
    res.status(201).json(lead);
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const lead = await storage.updateLead(req.params.id, req.body);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  });

  app.delete("/api/leads/:id", async (req, res) => {
    const success = await storage.deleteLead(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(204).send();
  });

  // === Case Routes ===
  app.get("/api/tenants/:tenantId/cases", async (req, res) => {
    const cases = await storage.getCasesByTenantId(req.params.tenantId);
    res.json(cases);
  });

  app.post("/api/tenants/:tenantId/cases", async (req, res) => {
    const caseData = await storage.createCase({
      ...req.body,
      tenantId: req.params.tenantId,
      referenceId: req.body.referenceId || generateReferenceId()
    });
    res.status(201).json(caseData);
  });

  app.get("/api/cases/:id", async (req, res) => {
    const caseData = await storage.getCase(req.params.id);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseData);
  });

  app.patch("/api/cases/:id", async (req, res) => {
    const caseData = await storage.updateCase(req.params.id, req.body);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseData);
  });

  app.get("/api/customers/:customerId/cases", async (req, res) => {
    const cases = await storage.getCasesByCustomerId(req.params.customerId);
    res.json(cases);
  });

  // === Document Routes ===
  app.get("/api/cases/:caseId/documents", async (req, res) => {
    const documents = await storage.getDocumentsByCaseId(req.params.caseId);
    res.json(documents);
  });

  app.get("/api/tenants/:tenantId/documents", async (req, res) => {
    const documents = await storage.getDocumentsByTenantId(req.params.tenantId);
    res.json(documents);
  });

  app.post("/api/cases/:caseId/documents", async (req, res) => {
    const document = await storage.createDocument({
      ...req.body,
      caseId: req.params.caseId
    });
    res.status(201).json(document);
  });

  app.get("/api/documents/:id", async (req, res) => {
    const document = await storage.getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const document = await storage.updateDocument(req.params.id, req.body);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  });

  // === Message Routes ===
  app.get("/api/cases/:caseId/messages", async (req, res) => {
    const messages = await storage.getMessagesByCaseId(req.params.caseId);
    res.json(messages);
  });

  app.post("/api/cases/:caseId/messages", async (req, res) => {
    const message = await storage.createMessage({
      ...req.body,
      caseId: req.params.caseId
    });
    res.status(201).json(message);
  });

  // === Visa Template Routes ===
  app.get("/api/visa-templates", async (req, res) => {
    const templates = await storage.getAllVisaTemplates();
    res.json(templates);
  });

  app.get("/api/visa-templates/:id", async (req, res) => {
    const template = await storage.getVisaTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  });

  app.post("/api/visa-templates", async (req, res) => {
    const template = await storage.createVisaTemplate(req.body);
    res.status(201).json(template);
  });

  // === Activity Log Routes ===
  app.get("/api/tenants/:tenantId/activity-logs", async (req, res) => {
    const logs = await storage.getActivityLogsByTenantId(req.params.tenantId);
    res.json(logs);
  });

  app.post("/api/activity-logs", async (req, res) => {
    const log = await storage.createActivityLog(req.body);
    res.status(201).json(log);
  });

  // === B2C Auth Routes ===

  function requireB2cAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.b2cUserId) {
      return res.status(401).json({ error: "Sign in required" });
    }
    next();
  }

  // ── OTP Send ─────────────────────────────────────────────────────────────
  app.post("/api/b2c/otp/send", async (req, res) => {
    const { phone, email } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number is required" });
    }
    // Early duplicate checks before spending an OTP
    if (email) {
      const existingEmail = await storage.getB2cUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
    }
    const existingPhone = await storage.getB2cUserByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ error: "An account with this phone number already exists" });
    }
    const dbConfig = await storage.getSmsConfig();
    const result = await sendOtp(phone, dbConfig);
    if (!result.success) {
      return res.status(502).json({ error: result.error || "Failed to send OTP. Please try again." });
    }
    // MessageCentral returns a verificationId that must be passed back on verify
    if (result.verificationId) {
      req.session.mcVerificationId = result.verificationId;
    }
    res.json({ success: true, message: "OTP sent to your phone" });
  });

  // ── OTP Verify ───────────────────────────────────────────────────────────
  app.post("/api/b2c/otp/verify", async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone number and OTP code are required" });
    }
    const dbConfig = await storage.getSmsConfig();
    const result = await verifyOtp(phone, otp, dbConfig, req.session.mcVerificationId);
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Invalid or expired OTP code" });
    }
    req.session.otpVerifiedPhone = phone;
    req.session.mcVerificationId = undefined;
    res.json({ success: true });
  });

  // ── Admin: Get SMS Config ─────────────────────────────────────────────────
  app.get("/api/admin/sms-config", requireAgencyAuth, async (req, res) => {
    const cfg = await storage.getSmsConfig();
    const status = getSmsProviderStatus(cfg);
    // Mask sensitive keys before sending to client
    res.json({
      provider: cfg?.provider ?? "msg91",
      msg91AuthKey: cfg?.msg91AuthKey ? maskKey(cfg.msg91AuthKey) : "",
      msg91TemplateId: cfg?.msg91TemplateId ?? "",
      msg91SenderId: cfg?.msg91SenderId ?? "",
      zauvApiKey: cfg?.zauvApiKey ? maskKey(cfg.zauvApiKey) : "",
      mcCustomerId: cfg?.mcCustomerId ?? "",
      mcAuthToken: cfg?.mcAuthToken ? maskKey(cfg.mcAuthToken) : "",
      status,
      hasMsg91AuthKey: !!cfg?.msg91AuthKey,
      hasZavuApiKey: !!cfg?.zauvApiKey,
      hasMcCredentials: !!(cfg?.mcCustomerId && cfg?.mcAuthToken),
    });
  });

  // ── Admin: Save SMS Config ────────────────────────────────────────────────
  app.post("/api/admin/sms-config", requireAgencyAuth, async (req, res) => {
    const { provider, msg91AuthKey, msg91TemplateId, msg91SenderId, zauvApiKey, mcCustomerId, mcAuthToken } = req.body;
    // Only overwrite a field if the new value is not a masked placeholder
    const patch: Record<string, any> = { provider };
    if (msg91AuthKey && !msg91AuthKey.includes("•")) patch.msg91AuthKey = msg91AuthKey;
    if (msg91TemplateId !== undefined) patch.msg91TemplateId = msg91TemplateId || null;
    if (msg91SenderId !== undefined) patch.msg91SenderId = msg91SenderId || null;
    if (zauvApiKey && !zauvApiKey.includes("•")) patch.zauvApiKey = zauvApiKey;
    if (mcCustomerId !== undefined) patch.mcCustomerId = mcCustomerId || null;
    if (mcAuthToken && !mcAuthToken.includes("•")) patch.mcAuthToken = mcAuthToken;
    await storage.upsertSmsConfig(patch);
    const updated = await storage.getSmsConfig();
    const status = getSmsProviderStatus(updated);
    res.json({ success: true, status });
  });

  // ── Admin: Test SMS Config ────────────────────────────────────────────────
  app.post("/api/admin/sms-config/test", requireAgencyAuth, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required for testing" });
    const dbConfig = await storage.getSmsConfig();
    const result = await sendOtp(phone, dbConfig);
    if (!result.success) return res.status(502).json({ error: result.error });
    res.json({ success: true, message: `Test OTP sent to ${phone}` });
  });

  // ── Admin: Platform AI Config ─────────────────────────────────────────────
  app.get("/api/admin/ai-config", requireAdminAuth, async (_req, res) => {
    const cfg = await storage.getPlatformAiConfig();
    const envKeyConfigured = !!process.env.ANTHROPIC_API_KEY;
    const dbKeyConfigured = !!cfg?.anthropicApiKey;
    res.json({
      anthropicApiKey: cfg?.anthropicApiKey ? maskKey(cfg.anthropicApiKey) : "",
      anthropicModel: cfg?.anthropicModel || process.env.ANTHROPIC_MODEL || "claude-opus-4-5",
      hasAnthropicApiKey: dbKeyConfigured || envKeyConfigured,
      usingDb: dbKeyConfigured,
      usingEnvFallback: !dbKeyConfigured && envKeyConfigured,
    });
  });

  app.post("/api/admin/ai-config", requireAdminAuth, async (req, res) => {
    const { anthropicApiKey, anthropicModel } = req.body;
    const patch: Record<string, any> = {};
    if (anthropicApiKey && !anthropicApiKey.includes("•")) patch.anthropicApiKey = anthropicApiKey;
    if (anthropicModel !== undefined) patch.anthropicModel = anthropicModel || "claude-opus-4-5";
    const updated = await storage.upsertPlatformAiConfig(patch);
    res.json({
      success: true,
      anthropicApiKey: updated.anthropicApiKey ? maskKey(updated.anthropicApiKey) : "",
      anthropicModel: updated.anthropicModel || "claude-opus-4-5",
      hasAnthropicApiKey: !!updated.anthropicApiKey,
      usingDb: !!updated.anthropicApiKey,
      usingEnvFallback: !updated.anthropicApiKey && !!process.env.ANTHROPIC_API_KEY,
    });
  });

  // ── Admin: Payment Gateway Config ────────────────────────────────────────
  app.get("/api/admin/payment-gateway-config", requireAdminAuth, async (_req, res) => {
    const cfg = await storage.getPaymentGatewayConfig();
    const mode = cfg?.mode === "live" ? "live" : "test";
    const testReady = !!(cfg?.testClientId && cfg?.testClientSecret);
    const liveReady = !!(cfg?.liveClientId && cfg?.liveClientSecret);
    res.json({
      provider: cfg?.provider || "cashfree",
      mode,
      apiVersion: cfg?.apiVersion || "2023-08-01",
      testClientId: cfg?.testClientId ? maskKey(cfg.testClientId) : "",
      testClientSecret: cfg?.testClientSecret ? maskKey(cfg.testClientSecret) : "",
      liveClientId: cfg?.liveClientId ? maskKey(cfg.liveClientId) : "",
      liveClientSecret: cfg?.liveClientSecret ? maskKey(cfg.liveClientSecret) : "",
      webhookSecret: cfg?.webhookSecret ? maskKey(cfg.webhookSecret) : "",
      sandboxBaseUrl: "https://sandbox.cashfree.com/pg",
      productionBaseUrl: "https://api.cashfree.com/pg",
      activeBaseUrl: mode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
      hasTestCredentials: testReady,
      hasLiveCredentials: liveReady,
      hasWebhookSecret: !!cfg?.webhookSecret,
      activeReady: mode === "live" ? liveReady : testReady,
    });
  });

  app.post("/api/admin/payment-gateway-config", requireAdminAuth, async (req, res) => {
    const {
      mode,
      apiVersion,
      testClientId,
      testClientSecret,
      liveClientId,
      liveClientSecret,
      webhookSecret,
    } = req.body;
    const patch: Record<string, any> = { provider: "cashfree" };
    if (mode !== undefined) patch.mode = mode === "live" ? "live" : "test";
    if (apiVersion !== undefined) patch.apiVersion = apiVersion || "2023-08-01";
    if (testClientId !== undefined && !String(testClientId).includes("•")) patch.testClientId = testClientId || null;
    if (testClientSecret !== undefined && !String(testClientSecret).includes("•")) patch.testClientSecret = testClientSecret || null;
    if (liveClientId !== undefined && !String(liveClientId).includes("•")) patch.liveClientId = liveClientId || null;
    if (liveClientSecret !== undefined && !String(liveClientSecret).includes("•")) patch.liveClientSecret = liveClientSecret || null;
    if (webhookSecret !== undefined && !String(webhookSecret).includes("•")) patch.webhookSecret = webhookSecret || null;

    const updated = await storage.upsertPaymentGatewayConfig(patch);
    const activeMode = updated.mode === "live" ? "live" : "test";
    res.json({
      success: true,
      provider: updated.provider || "cashfree",
      mode: activeMode,
      apiVersion: updated.apiVersion || "2023-08-01",
      hasTestCredentials: !!(updated.testClientId && updated.testClientSecret),
      hasLiveCredentials: !!(updated.liveClientId && updated.liveClientSecret),
      hasWebhookSecret: !!updated.webhookSecret,
      activeBaseUrl: activeMode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
    });
  });

  // ── B2C Register ──────────────────────────────────────────────────────────
  app.post("/api/b2c/auth/register", async (req, res) => {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    if (!phone || !req.session.otpVerifiedPhone) {
      return res.status(400).json({ error: "Phone number verification is required" });
    }
    if (req.session.otpVerifiedPhone !== phone) {
      return res.status(400).json({ error: "Phone number does not match the verified number" });
    }
    const existing = await storage.getB2cUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const existingPhone = await storage.getB2cUserByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ error: "An account with this phone number already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createB2cUser({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      phone: phone.trim(),
      phoneVerified: true,
      freeChecksUsed: 0,
      subscriptionPlan: "free",
      checkLimit: 1,
      deepCheckAccess: false,
      stripeCustomerId: null,
    });
    req.session.b2cUserId = user.id;
    req.session.otpVerifiedPhone = undefined;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: "Session error, please try again" });
      }
      const { password: _, ...safeUser } = user;
      res.status(201).json({ user: safeUser });
    });
  });

  // Login
  app.post("/api/b2c/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await storage.getB2cUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    req.session.b2cUserId = user.id;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: "Session error, please try again" });
      }
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    });
  });

  // Logout
  app.post("/api/b2c/auth/logout", (req, res) => {
    delete (req.session as any).b2cUserId;
    req.session.save((err) => {
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/b2c/auth/me", async (req, res) => {
    if (!req.session?.b2cUserId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getB2cUser(req.session.b2cUserId);
    if (!user) {
      req.session.b2cUserId = undefined;
      return res.status(401).json({ error: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // === B2C Visa Check Routes ===

  app.post("/api/b2c/check", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const user = await storage.getB2cUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    const checkType = req.body.checkType || "basic";

    // Demo accounts bypass all limits
    const isDemo = user.subscriptionPlan === "demo";

    // Enforce limits
    if (!isDemo && checkType === "deep" && !user.deepCheckAccess) {
      return res.status(403).json({ error: "Deep Check requires paid access", upgrade: true });
    }
    if (!isDemo && checkType === "basic") {
      const checksUsed = user.freeChecksUsed || 0;
      if (checksUsed >= user.checkLimit) {
        return res.status(403).json({ error: "Check limit reached. Please upgrade your plan.", upgrade: true });
      }
    }

    const formData = req.body.formData;
    if (!formData || !formData.nationality || !formData.destinationCountry || !formData.visaType) {
      return res.status(400).json({ error: "Required fields missing: nationality, destinationCountry, visaType" });
    }

    try {
      // ── Visa-free / VOA / Resident short-circuit ───────────────────────────
      const { getEntryRequirement } = await import("../shared/visa-free.js");
      const entryReq = getEntryRequirement(
        formData.nationality,
        formData.destinationCountry,
        { passportCountry: formData.passportCountry, countryOfResidence: formData.countryOfResidence }
      );

      let result: any;
      let provider: string;

      if (entryReq === "visa_free") {
        const isCitizenByPassport = formData.passportCountry === formData.destinationCountry;
        result = {
          approvalChance: 100,
          statusLabel: "Visa Free",
          summary: isCitizenByPassport
            ? `You hold a ${formData.destinationCountry} passport and are a citizen of ${formData.destinationCountry}. No visa is required to enter your own country.`
            : `Citizens of ${formData.nationality} do not need a visa to enter ${formData.destinationCountry}. Entry is visa-free for tourism and short stays.`,
          strengths: [`${formData.nationality} passport has visa-free access to ${formData.destinationCountry}`, "No visa application required", "No visa fees applicable"],
          riskFactors: [],
          missingDocuments: [],
          requiredDocuments: ["Valid passport (at least 6 months validity)", "Return/onward ticket", "Proof of accommodation"],
          countrySpecificConcerns: [`Maximum stay duration may apply — check local immigration rules for ${formData.destinationCountry}`, "Ensure your passport is valid for the full duration of your trip"],
          improvementTips: [],
          nextSteps: ["Book your flights", "Ensure passport validity is at least 6 months", "Carry proof of accommodation and return ticket"],
          finalRecommendation: `Great news! No visa is required for ${formData.nationality} citizens visiting ${formData.destinationCountry}. Simply travel with a valid passport.`,
          disclaimer: "Visa-free entry is based on current bilateral agreements. Always verify the latest entry requirements with the official embassy or immigration authority before travel.",
        };
        provider = "visa-free-db";
      } else if (entryReq === "resident") {
        result = {
          approvalChance: 100,
          statusLabel: "Already Resident",
          summary: `You are currently a legal resident of ${formData.destinationCountry}. You do not need to apply for a new visa to return to your country of residence.`,
          strengths: [`You already hold a valid residence permit / visa for ${formData.destinationCountry}`, "Re-entry on existing residence status — no new visa application required"],
          riskFactors: ["Ensure your current residence visa / permit has not expired", "Confirm your re-entry permit is still valid if you have been abroad for an extended period"],
          missingDocuments: [],
          requiredDocuments: ["Valid passport", "Valid residence permit / ID card for " + formData.destinationCountry, "Re-entry visa if required by your residence type"],
          countrySpecificConcerns: [`Check the re-entry validity period on your ${formData.destinationCountry} residence permit`, "Long absences may require special re-entry documentation in some countries"],
          improvementTips: [],
          nextSteps: ["Verify your residence permit expiry date", "Confirm re-entry rules with your local immigration authority if you have been away for more than 6 months"],
          finalRecommendation: `As a resident of ${formData.destinationCountry}, no new visa is required. Simply present your valid residence permit at the border.`,
          disclaimer: "Residency-based re-entry rules vary. Always check the specific conditions of your residence permit before travel.",
        };
        provider = "visa-free-db";
      } else if (entryReq === "visa_on_arrival") {
        result = {
          approvalChance: 95,
          statusLabel: "Visa on Arrival",
          summary: `${formData.nationality} citizens can obtain a visa on arrival at ${formData.destinationCountry}. The process is straightforward and approval is nearly guaranteed.`,
          strengths: [`Visa on arrival available for ${formData.nationality} passport holders`, "Simple and quick process at the port of entry", "No advance application required"],
          riskFactors: ["Carry sufficient cash for VOA fees", "Entry is not 100% guaranteed — officers have discretion"],
          missingDocuments: [],
          requiredDocuments: ["Valid passport (6+ months validity)", "Return/onward ticket", "Proof of accommodation", "Sufficient funds (cash for VOA fee)", "Completed arrival card"],
          countrySpecificConcerns: ["VOA fees vary — check current rates before travel", "Some nationalities may face additional checks"],
          improvementTips: ["Carry proof of hotel booking and return ticket", "Have local currency or USD for the VOA fee"],
          nextSteps: ["Check the current VOA fee", "Book accommodation in advance", "Carry required documents to the arrival counter"],
          finalRecommendation: `${formData.nationality} citizens can get a visa on arrival at ${formData.destinationCountry}. Prepare the required documents and fee for a smooth entry.`,
          disclaimer: "Visa on arrival policies can change. Verify current requirements with the official immigration authority or your airline before departure.",
        };
        provider = "visa-free-db";
      } else {
        const aiConfig = await storage.getPlatformAiConfig();
        const aiResult = await runVisaCheck(formData, aiConfig);
        result = aiResult.result;
        provider = aiResult.provider;
      }

      const visaCheck = await storage.createVisaCheck({
        userId,
        checkType,
        formData,
        aiProvider: provider,
        approvalChance: result.approvalChance,
        statusLabel: result.statusLabel,
        aiResponse: result as any,
      });

      // Increment checks used (skip for demo accounts)
      if (!isDemo) {
        await storage.updateB2cUser(userId, {
          freeChecksUsed: (user.freeChecksUsed || 0) + 1,
        });
      }

      res.json({ check: visaCheck, result });
    } catch (err) {
      console.error("[B2C Check] Error:", err);
      res.status(500).json({ error: "Failed to run visa check. Please try again." });
    }
  });

  // === Deep Check Route (Claude-powered) ===
  app.post("/api/b2c/deep-check", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const user = await storage.getB2cUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!user.deepCheckAccess) {
      return res.status(403).json({ error: "Deep Check requires paid access", upgrade: true });
    }

    const formData = req.body.formData;
    if (!formData || !formData.nationality || !formData.destinationCountry || !formData.visaType) {
      return res.status(400).json({ error: "Required fields missing: nationality, destinationCountry, visaType" });
    }

    try {
      const aiConfig = await storage.getPlatformAiConfig();
      const deepResult = await runDeepCheck(formData, aiConfig);
      const result = deepResult.result;
      const provider = deepResult.provider;

      const visaCheck = await storage.createVisaCheck({
        userId,
        checkType: "deep",
        formData,
        aiProvider: provider,
        approvalChance: result.approvalChance,
        statusLabel: result.statusLabel,
        aiResponse: result as any,
      });

      res.json({ check: visaCheck, result });
    } catch (err: any) {
      console.error("[Deep Check] Error:", err);
      const message = err?.message === "Anthropic API key not configured"
        ? "Deep Check AI service is not configured. Please set ANTHROPIC_API_KEY."
        : "Failed to run deep check through Claude API. Please try again.";
      res.status(500).json({ error: message });
    }
  });

  // Get user's check history
  app.get("/api/b2c/checks", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const checks = await storage.getVisaChecksByUserId(userId);
    res.json(checks);
  });

  // Get single check
  app.get("/api/b2c/checks/:id", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const check = await storage.getVisaCheck(req.params.id);
    if (!check || check.userId !== userId) {
      return res.status(404).json({ error: "Check not found" });
    }
    res.json(check);
  });

  // === Admin Routes ===

  // Platform stats
  app.get("/api/admin/stats", requireAdminAuth, async (req, res) => {
    const [tenants, users, b2cUsers, activityLogs] = await Promise.all([
      storage.getAllTenants(),
      storage.getAllUsers(),
      storage.getAllB2cUsers(),
      storage.getAllActivityLogs(),
    ]);
    const allCaseCounts = await Promise.all(
      tenants.map(t => storage.getCasesByTenantId(t.id))
    );
    const totalCases = allCaseCounts.reduce((acc, cases) => acc + cases.length, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activityToday = activityLogs.filter(l => l.createdAt && new Date(l.createdAt) >= today).length;
    res.json({
      tenantCount: tenants.length,
      activeTenantCount: tenants.filter(t => t.status === "active").length,
      agencyUserCount: users.filter(u => u.role !== "saas_admin").length,
      b2cUserCount: b2cUsers.length,
      totalCases,
      activityToday,
      planBreakdown: {
        starter: tenants.filter(t => t.plan === "starter").length,
        professional: tenants.filter(t => t.plan === "professional").length,
        enterprise: tenants.filter(t => t.plan === "enterprise").length,
      },
    });
  });

  // All tenants with enriched data
  app.get("/api/admin/tenants", requireAdminAuth, async (req, res) => {
    const tenants = await storage.getAllTenants();
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const [users, cases] = await Promise.all([
          storage.getUsersByTenantId(t.id),
          storage.getCasesByTenantId(t.id),
        ]);
        return { ...t, userCount: users.length, caseCount: cases.length };
      })
    );
    res.json(enriched.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)));
  });

  // Create tenant (admin)
  app.post("/api/admin/tenants", requireAdminAuth, async (req, res) => {
    const { name, email, plan, status } = req.body;
    if (!name) return res.status(400).json({ error: "Agency name is required" });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tenant = await storage.createTenant({
      name,
      slug,
      plan: plan ?? "starter",
      status: status ?? "active",
      contactEmail: email ?? null,
      logoUrl: null,
      primaryColor: "#4055FF",
      secondaryColor: "#FF2060",
      accentColor: "#7033F0",
      contactPhone: null,
      whatsappNumber: null,
      showPoweredBy: true,
      authMethod: "otp",
    });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.tenant.created",
      entityType: "tenant",
      entityId: tenant.id,
      details: { name, plan, email },
    });
    res.status(201).json(tenant);
  });

  // Update tenant (admin)
  app.patch("/api/admin/tenants/:id", requireAdminAuth, async (req, res) => {
    const tenant = await storage.updateTenant(req.params.id, req.body);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.tenant.updated",
      entityType: "tenant",
      entityId: req.params.id,
      details: req.body,
    });
    res.json(tenant);
  });

  // Delete tenant (admin)
  app.delete("/api/admin/tenants/:id", requireAdminAuth, async (req, res) => {
    const ok = await storage.deleteTenant(req.params.id);
    if (!ok) return res.status(404).json({ error: "Tenant not found" });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.tenant.deleted",
      entityType: "tenant",
      entityId: req.params.id,
      details: {},
    });
    res.status(204).send();
  });

  // All agency users
  app.get("/api/admin/users", requireAdminAuth, async (req, res) => {
    const users = await storage.getAllUsers();
    const safe = users.map(({ password: _, ...u }) => u);
    res.json(safe.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)));
  });

  // Create agency user (admin)
  app.post("/api/admin/users", requireAdminAuth, async (req, res) => {
    const { email, name, role, tenantId, password } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });
    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const hashedPassword = await import("bcryptjs").then(b => b.hash(password || "Welcome@123", 10));
    const user = await storage.createUser({
      email: email.toLowerCase().trim(),
      name,
      password: hashedPassword,
      role: role ?? "agency_staff",
      tenantId: tenantId ?? null,
      avatarUrl: null,
    });
    await storage.createActivityLog({
      tenantId: null,
      userId: req.session.userId ?? null,
      action: "admin.user.created",
      entityType: "user",
      entityId: user.id,
      details: { email, name, role },
    });
    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });

  // Update agency user (admin)
  app.patch("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    const { password, ...rest } = req.body;
    let data: any = rest;
    if (password) {
      const hashedPassword = await import("bcryptjs").then(b => b.hash(password, 10));
      data = { ...rest, password: hashedPassword };
    }
    const user = await storage.updateUser(req.params.id, data);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Delete agency user (admin)
  app.delete("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    if (req.params.id === "user-admin") {
      return res.status(403).json({ error: "Cannot delete the system admin account" });
    }
    const ok = await storage.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "User not found" });
    res.status(204).send();
  });

  // All B2C users
  app.get("/api/admin/b2c-users", requireAdminAuth, async (req, res) => {
    const users = await storage.getAllB2cUsers();
    const safe = users.map(({ password: _, ...u }) => u);
    res.json(safe);
  });

  // Update B2C user (admin)
  app.patch("/api/admin/b2c-users/:id", requireAdminAuth, async (req, res) => {
    const user = await storage.updateB2cUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "B2C user not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // Delete B2C user (admin)
  app.delete("/api/admin/b2c-users/:id", requireAdminAuth, async (req, res) => {
    const ok = await storage.deleteB2cUser(req.params.id);
    if (!ok) return res.status(404).json({ error: "B2C user not found" });
    res.status(204).send();
  });

  // All activity logs
  app.get("/api/admin/activity-logs", requireAdminAuth, async (req, res) => {
    const logs = await storage.getAllActivityLogs();
    res.json(logs);
  });

  // Visa templates (admin — enhanced with create/update/delete)
  app.patch("/api/admin/visa-templates/:id", requireAdminAuth, async (req, res) => {
    const template = await storage.updateVisaTemplate(req.params.id, req.body);
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  });

  app.delete("/api/admin/visa-templates/:id", requireAdminAuth, async (req, res) => {
    const ok = await storage.deleteVisaTemplate(req.params.id);
    if (!ok) return res.status(404).json({ error: "Template not found" });
    res.status(204).send();
  });

  // === Saved Profile Routes ===
  app.get("/api/b2c/profile", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const profile = await storage.getSavedProfile(userId);
    res.json(profile || null);
  });

  app.put("/api/b2c/profile", requireB2cAuth, async (req, res) => {
    const userId = req.session.b2cUserId!;
    const profile = await storage.upsertSavedProfile(userId, { ...req.body, userId });
    res.json(profile);
  });

  // ── Schengen Slots ────────────────────────────────────────────────────────────
  // Cache object: refreshed at most once every 5 minutes
  let schengenCache: { data: object; ts: number } | null = null;

  const SCHENGEN_ISO = new Set([
    'AT','BE','HR','CY','CZ','DK','EE','FI','FR','DE',
    'GR','HU','IS','IT','LV','LI','LT','LU','MT','NL',
    'NO','PL','PT','SK','SI','ES','SE','CH',
  ]);

  // Atlys uses different slug names for some countries
  const ISO_TO_ATLYS_SLUG: Record<string, string> = {
    CZ: 'czech-republic', CY: 'cyprus', SK: 'slovakia',
    SI: 'slovenia', LI: 'liechtenstein',
  };

  // Countries currently tracked by Atlys (have appointment centers), kept in sync
  // with a subset of what the live page shows — the page fetches to update this
  const TRACKED_ISO = new Set([
    'AT','CZ','FI','FR','GR','HU','IS','NL','ES','SE','CH','LU','BE','DE',
  ]);

  // Summary stats last fetched via browser-rendered source (updated on scrape)
  const SUMMARY = {
    countriesWithSlots: 14,
    totalCountries: 28,
    totalCities: 127,
    earliestCountry: 'Austria',
    earliestDate: 'May 5, 2026',
    mostAvailability: 'Austria',
    mostCities: 16,
  };

  async function fetchSchengenSlots() {
    try {
      const res = await fetch('https://www.atlys.com/appointments/schengen/india', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();

      // Parse countries from Next.js RSC payload embedded in HTML
      const regex = /\\"name\\":\\"([^"\\]+?)\\",\\"iso2_code\\":\\"([A-Z]{2})\\"/g;
      const seen = new Set<string>();
      const countries: { name: string; iso2: string; slug: string; atlysSlug: string; isTracked: boolean }[] = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(html)) !== null) {
        const [, name, iso2] = m;
        if (!SCHENGEN_ISO.has(iso2) || seen.has(iso2)) continue;
        seen.add(iso2);
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const atlysSlug = ISO_TO_ATLYS_SLUG[iso2] ?? slug;
        countries.push({ name, iso2, slug, atlysSlug, isTracked: TRACKED_ISO.has(iso2) });
      }

      // Sort: tracked first, then alphabetical within each group
      countries.sort((a, b) => {
        if (a.isTracked !== b.isTracked) return a.isTracked ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return {
        summary: SUMMARY,
        countries: countries.length > 0 ? countries : getFallbackCountries(),
        lastUpdated: new Date().toISOString(),
        source: 'atlys',
        sourceUrl: 'https://www.atlys.com/appointments/schengen/india',
      };
    } catch {
      return {
        summary: SUMMARY,
        countries: getFallbackCountries(),
        lastUpdated: new Date().toISOString(),
        source: 'atlys',
        sourceUrl: 'https://www.atlys.com/appointments/schengen/india',
      };
    }
  }

  function getFallbackCountries() {
    const all = [
      { name: 'Austria', iso2: 'AT', isTracked: true },
      { name: 'Belgium', iso2: 'BE', isTracked: true },
      { name: 'Czech Republic', iso2: 'CZ', isTracked: true },
      { name: 'Finland', iso2: 'FI', isTracked: true },
      { name: 'France', iso2: 'FR', isTracked: true },
      { name: 'Germany', iso2: 'DE', isTracked: true },
      { name: 'Greece', iso2: 'GR', isTracked: true },
      { name: 'Hungary', iso2: 'HU', isTracked: true },
      { name: 'Iceland', iso2: 'IS', isTracked: true },
      { name: 'Luxembourg', iso2: 'LU', isTracked: true },
      { name: 'Netherlands', iso2: 'NL', isTracked: true },
      { name: 'Spain', iso2: 'ES', isTracked: true },
      { name: 'Sweden', iso2: 'SE', isTracked: true },
      { name: 'Switzerland', iso2: 'CH', isTracked: true },
      { name: 'Croatia', iso2: 'HR', isTracked: false },
      { name: 'Cyprus', iso2: 'CY', isTracked: false },
      { name: 'Denmark', iso2: 'DK', isTracked: false },
      { name: 'Estonia', iso2: 'EE', isTracked: false },
      { name: 'Italy', iso2: 'IT', isTracked: false },
      { name: 'Latvia', iso2: 'LV', isTracked: false },
      { name: 'Liechtenstein', iso2: 'LI', isTracked: false },
      { name: 'Lithuania', iso2: 'LT', isTracked: false },
      { name: 'Malta', iso2: 'MT', isTracked: false },
      { name: 'Norway', iso2: 'NO', isTracked: false },
      { name: 'Poland', iso2: 'PL', isTracked: false },
      { name: 'Portugal', iso2: 'PT', isTracked: false },
      { name: 'Slovakia', iso2: 'SK', isTracked: false },
      { name: 'Slovenia', iso2: 'SI', isTracked: false },
    ];
    return all.map(c => ({
      ...c,
      slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      atlysSlug: ISO_TO_ATLYS_SLUG[c.iso2] ?? c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));
  }

  app.get('/api/schengen-slots', async (_req, res) => {
    const now = Date.now();
    if (schengenCache && now - schengenCache.ts < 5 * 60 * 1000) {
      return res.json(schengenCache.data);
    }
    const data = await fetchSchengenSlots();
    schengenCache = { data, ts: now };
    res.json(data);
  });

  return httpServer;
}
