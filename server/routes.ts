import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runVisaCheck, runDeepCheck } from "./ai";
import { sendOtp, verifyOtp, getSmsProviderStatus } from "./sms";
import { getEntryRequirement } from "@shared/visa-free";
import indiaVisaChanceDataset from "@shared/india_visa_chance_dataset_non_visa_free_2026.json";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import ExcelJS from "exceljs";
import {
  insertFeeTemplateSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertInvoiceSettingsSchema,
  insertPaymentSchema,
} from "@shared/schema";

// Indian state codes for GST place-of-supply lookups.
const INDIAN_STATE_NAME_BY_CODE: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
  "96": "Foreign Country", "97": "Other Territory",
};

// Compute CGST/SGST/IGST split from items + supplier+place-of-supply state codes.
// Returns all amounts in cents.
//
// Behavior contract:
// - When `gstEnabled` is false: returns a flat tax computed via `fallbackTaxRate`
//   on the full subtotal, with all CGST/SGST/IGST = 0 (legacy/non-GST tenants).
// - When `gstEnabled` is true: each item's `taxRate` is used as-is. An explicit
//   `0` means exempt/zero-rated and is preserved (no fallback). `null`/`undefined`
//   falls back to `fallbackTaxRate`. Tax is split into CGST+SGST (intra-state) or
//   IGST (inter-state). When `gstEnabled` is true but the supplier state code is
//   missing, we cannot classify the supply: the tax is computed but kept flat
//   (all splits = 0) so callers/UIs can flag the misconfiguration.
function computeGstSplit(
  items: Array<{ amount: number; taxRate?: number | null; taxable?: boolean | null }>,
  supplierStateCode: string | null | undefined,
  placeOfSupplyCode: string | null | undefined,
  fallbackTaxRate: number,
  gstEnabled: boolean,
): { taxAmount: number; cgst: number; sgst: number; igst: number } {
  // A line is taxable unless explicitly flagged false (e.g. government fees).
  const isTaxable = (it: { taxable?: boolean | null }) => it.taxable !== false;
  if (!gstEnabled) {
    // Flat-tax path: only taxable line items contribute to the taxed subtotal.
    const taxedSubtotal = items
      .filter(isTaxable)
      .reduce((s, it) => s + (it.amount ?? 0), 0);
    const taxAmount = Math.round((taxedSubtotal * (fallbackTaxRate || 0)) / 10000);
    return { taxAmount, cgst: 0, sgst: 0, igst: 0 };
  }
  let totalTax = 0;
  for (const it of items) {
    // Non-taxable lines (e.g. government fees) contribute zero tax even when GST is on.
    if (!isTaxable(it)) continue;
    // Explicit 0 means exempt; only null/undefined falls back.
    const rate = it.taxRate == null ? fallbackTaxRate : it.taxRate;
    totalTax += Math.round(((it.amount ?? 0) * (rate || 0)) / 10000);
  }
  if (!supplierStateCode) {
    // Misconfigured supplier: don't guess intra/inter — keep flat.
    return { taxAmount: totalTax, cgst: 0, sgst: 0, igst: 0 };
  }
  const isIntraState = !!placeOfSupplyCode && supplierStateCode === placeOfSupplyCode;
  if (isIntraState) {
    const half = Math.round(totalTax / 2);
    return { taxAmount: totalTax, cgst: half, sgst: totalTax - half, igst: 0 };
  }
  return { taxAmount: totalTax, cgst: 0, sgst: 0, igst: totalTax };
}

// Site-wide password for protecting the entire application
const SITE_PASSWORD = process.env.SITE_PASSWORD;
const DEMO_B2C_OTP = "1234";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return `${proto || req.protocol}://${req.get("host")}`;
}

function getCashfreeCredentials(cfg: Awaited<ReturnType<typeof storage.getPaymentGatewayConfig>>) {
  const mode = cfg?.mode === "live" || process.env.CASHFREE_MODE === "live" ? "live" : "test";
  const clientId = mode === "live"
    ? cfg?.liveClientId || process.env.CASHFREE_LIVE_CLIENT_ID
    : cfg?.testClientId || process.env.CASHFREE_TEST_CLIENT_ID;
  const clientSecret = mode === "live"
    ? cfg?.liveClientSecret || process.env.CASHFREE_LIVE_CLIENT_SECRET
    : cfg?.testClientSecret || process.env.CASHFREE_TEST_CLIENT_SECRET;
  return {
    mode,
    baseUrl: mode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
    apiVersion: (cfg?.apiVersion || process.env.CASHFREE_API_VERSION || "2023-08-01").trim(),
    clientId: clientId?.trim(),
    clientSecret: clientSecret?.trim(),
  };
}

function validateCashfreeMode(mode: "live" | "test", clientId?: string, clientSecret?: string): string | null {
  const id = clientId || "";
  const secret = clientSecret || "";
  const hasTestMarker = id.toUpperCase().startsWith("TEST") || secret.includes("_test_");
  const hasLiveMarker = id.toUpperCase().startsWith("PROD") || secret.includes("_prod_") || secret.includes("_live_");
  if (mode === "live" && hasTestMarker) {
    return "Cashfree is set to Live mode, but the configured credentials are Test credentials. Switch SaaS Admin > Integrations > Cashfree mode to Test.";
  }
  if (mode === "test" && hasLiveMarker) {
    return "Cashfree is set to Test mode, but the configured credentials look like Live credentials. Switch mode to Live or use Test credentials.";
  }
  return null;
}

function getCashfreePhone(phone?: string | null): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return "9999999999";
}

async function readCashfreeBody(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
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
    // Plan limit enforcement
    const tenantForLeads = await storage.getTenant(req.params.tenantId);
    if (tenantForLeads) {
      const planLeadLimits: Record<string, number> = { starter: 50, professional: 500, enterprise: 9999 };
      const leadLimit = planLeadLimits[tenantForLeads.plan ?? "starter"] ?? 50;
      const existingLeads = await storage.getLeadsByTenantId(req.params.tenantId);
      if (existingLeads.length >= leadLimit) {
        return res.status(403).json({ error: `Lead limit reached for your ${tenantForLeads.plan} plan (${leadLimit}). Please upgrade.` });
      }
    }
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

  // === Accounting Routes ===
  // Roles allowed to view/manage accounting data (agency staff + saas admin).
  const ACCOUNTING_ALLOWED_ROLES = new Set([
    "saas_admin",
    "agency_owner",
    "agency_admin",
    "agency_staff",
    "agency_manager",
  ]);

  // Helper: caller must be authenticated, hold an allowed role, and either belong
  // to the tenant or be a saas admin. Customer-role and unknown roles are rejected.
  function requireTenantAccess(req: Request, res: Response, tenantId: string): boolean {
    if (!req.session?.userId) {
      res.status(401).json({ error: "Authentication required" });
      return false;
    }
    const role = req.session.userRole ?? "";
    if (!ACCOUNTING_ALLOWED_ROLES.has(role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return false;
    }
    if (role === "saas_admin") return true;
    if (req.session.userTenantId !== tenantId) {
      res.status(403).json({ error: "Forbidden: tenant mismatch" });
      return false;
    }
    return true;
  }

  // Whitelist of fields that may be patched on an invoice (excludes computed totals).
  const invoicePatchSchema = insertInvoiceSchema.partial().pick({
    customerName: true, customerEmail: true, caseId: true, currency: true,
    status: true, dueDate: true, issuedAt: true, notes: true,
    feePaymentType: true, destinationCountry: true, visaType: true,
    customerGstin: true, placeOfSupplyCode: true, placeOfSupplyName: true,
    reverseCharge: true,
  } as any).extend({
    dueDate: z.union([z.string(), z.date(), z.null()]).optional(),
    issuedAt: z.union([z.string(), z.date()]).optional(),
  });

  // Recompute totals for an invoice from current items + tenant GST/tax settings.
  async function recomputeInvoiceTotals(invoiceId: string) {
    const inv = await storage.getInvoice(invoiceId);
    if (!inv) return;
    const items = await storage.getInvoiceItems(invoiceId);
    const subtotal = items.reduce((s, it) => s + (it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1))), 0);
    const settings = await storage.getInvoiceSettings(inv.tenantId);
    const fallbackRate = settings?.taxRate ?? 0;
    const supplyCode = inv.placeOfSupplyCode ?? settings?.gstStateCode ?? null;
    const split = computeGstSplit(items, settings?.gstStateCode, supplyCode, fallbackRate, !!settings?.gstEnabled);
    await storage.updateInvoice(invoiceId, {
      subtotal,
      taxAmount: split.taxAmount,
      cgstAmount: split.cgst,
      sgstAmount: split.sgst,
      igstAmount: split.igst,
      total: subtotal + split.taxAmount,
    } as any);
  }

  // Fee Templates
  app.get("/api/tenants/:tenantId/fee-templates", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const items = await storage.getFeeTemplatesByTenantId(req.params.tenantId);
    res.json(items);
  });

  app.post("/api/tenants/:tenantId/fee-templates", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const parsed = insertFeeTemplateSchema.parse({ ...req.body, tenantId: req.params.tenantId });
      const created = await storage.createFeeTemplate(parsed);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid fee template" });
    }
  });

  app.patch("/api/fee-templates/:id", async (req, res) => {
    const existing = await storage.getFeeTemplate(req.params.id);
    if (!existing) return res.status(404).json({ error: "Fee template not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;
    try {
      const { tenantId: _t, id: _i, ...rest } = req.body ?? {};
      const parsed = insertFeeTemplateSchema.partial().parse(rest);
      const updated = await storage.updateFeeTemplate(req.params.id, parsed);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid fee template patch" });
    }
  });

  app.delete("/api/fee-templates/:id", async (req, res) => {
    const existing = await storage.getFeeTemplate(req.params.id);
    if (!existing) return res.status(404).json({ error: "Fee template not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;
    await storage.deleteFeeTemplate(req.params.id);
    res.status(204).send();
  });

  // Invoice Settings
  app.get("/api/tenants/:tenantId/invoice-settings", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const settings = await storage.getInvoiceSettings(req.params.tenantId);
    res.json(settings ?? null);
  });

  app.put("/api/tenants/:tenantId/invoice-settings", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const { tenantId: _t, id: _i, ...rest } = req.body ?? {};
      // Auto-fill GST state name from code if a code was provided.
      if (rest.gstStateCode && !rest.gstStateName) {
        rest.gstStateName = INDIAN_STATE_NAME_BY_CODE[rest.gstStateCode] ?? null;
      }
      const parsed = insertInvoiceSettingsSchema.partial().parse(rest);
      const settings = await storage.upsertInvoiceSettings(req.params.tenantId, parsed as any);
      res.json(settings);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid invoice settings" });
    }
  });

  // GST: Indian state list (for selectors)
  app.get("/api/gst/states", (_req, res) => {
    res.json(
      Object.entries(INDIAN_STATE_NAME_BY_CODE).map(([code, name]) => ({ code, name })),
    );
  });

  // GST monthly report (GSTR-1 style) — returns an .xlsx file.
  app.get("/api/tenants/:tenantId/gst-reports/monthly", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const tenantId = req.params.tenantId;
      const yearStr = String(req.query.year ?? "");
      const monthStr = String(req.query.month ?? "");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10); // 1-12
      if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year or month (year=YYYY, month=1-12 required)" });
      }
      const settings = await storage.getInvoiceSettings(tenantId);
      const invoices = await storage.getInvoicesByTenantId(tenantId);
      const startUtc = new Date(Date.UTC(year, month - 1, 1));
      const endUtc = new Date(Date.UTC(year, month, 1));
      const inMonth = invoices.filter((inv) => {
        const d = inv.issuedAt ? new Date(inv.issuedAt) : null;
        if (!d) return false;
        return d >= startUtc && d < endUtc && inv.status !== "cancelled";
      });

      const wb = new ExcelJS.Workbook();
      wb.creator = "VisaShuttle";
      wb.created = new Date();

      // ---- Sheet: B2B (invoices with customer GSTIN) ----
      const b2bRows = inMonth.filter((inv) => !!inv.customerGstin);
      const b2cRows = inMonth.filter((inv) => !inv.customerGstin);

      const headerStyle = {
        font: { bold: true, color: { argb: "FFFFFFFF" } },
        fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2563EB" } },
        alignment: { vertical: "middle" as const, horizontal: "center" as const },
      };
      const totalRowStyle = {
        font: { bold: true },
        fill: { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE0E7FF" } },
      };

      const b2b = wb.addWorksheet("B2B");
      b2b.columns = [
        { header: "GSTIN/UIN of Recipient", key: "gstin", width: 22 },
        { header: "Receiver Name", key: "name", width: 28 },
        { header: "Invoice Number", key: "no", width: 18 },
        { header: "Invoice Date", key: "date", width: 14 },
        { header: "Invoice Value", key: "value", width: 14 },
        { header: "Place Of Supply", key: "pos", width: 22 },
        { header: "Reverse Charge", key: "rc", width: 14 },
        { header: "Invoice Type", key: "type", width: 14 },
        { header: "Rate", key: "rate", width: 8 },
        { header: "Taxable Value", key: "taxable", width: 14 },
        { header: "CGST", key: "cgst", width: 12 },
        { header: "SGST", key: "sgst", width: 12 },
        { header: "IGST", key: "igst", width: 12 },
      ];
      b2b.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
      let b2bSubtotal = 0, b2bCgst = 0, b2bSgst = 0, b2bIgst = 0, b2bTotal = 0;
      for (const inv of b2bRows) {
        const items = await storage.getInvoiceItems(inv.id);
        const taxableValue = items.reduce((s, it) => s + (it.amount ?? 0), 0);
        const ratesUsed = items.map((it) => (it.taxRate ?? 0)).filter((r) => r > 0);
        const rate = ratesUsed.length ? Math.max(...ratesUsed) / 100 : (settings?.taxRate ?? 0) / 100;
        b2b.addRow({
          gstin: inv.customerGstin ?? "",
          name: inv.customerName,
          no: inv.invoiceNumber,
          date: inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("en-GB") : "",
          value: (inv.total ?? 0) / 100,
          pos: inv.placeOfSupplyCode ? `${inv.placeOfSupplyCode}-${inv.placeOfSupplyName ?? ""}` : "",
          rc: inv.reverseCharge ? "Y" : "N",
          type: "Regular",
          rate,
          taxable: taxableValue / 100,
          cgst: (inv.cgstAmount ?? 0) / 100,
          sgst: (inv.sgstAmount ?? 0) / 100,
          igst: (inv.igstAmount ?? 0) / 100,
        });
        b2bSubtotal += taxableValue;
        b2bCgst += inv.cgstAmount ?? 0;
        b2bSgst += inv.sgstAmount ?? 0;
        b2bIgst += inv.igstAmount ?? 0;
        b2bTotal += inv.total ?? 0;
      }
      const b2bTotalRow = b2b.addRow({
        name: "TOTAL",
        value: b2bTotal / 100,
        taxable: b2bSubtotal / 100,
        cgst: b2bCgst / 100,
        sgst: b2bSgst / 100,
        igst: b2bIgst / 100,
      });
      b2bTotalRow.eachCell((c) => Object.assign(c, totalRowStyle));

      // ---- Sheet: B2C (no GSTIN) ----
      const b2c = wb.addWorksheet("B2C");
      b2c.columns = [
        { header: "Invoice Number", key: "no", width: 18 },
        { header: "Invoice Date", key: "date", width: 14 },
        { header: "Customer Name", key: "name", width: 28 },
        { header: "Place Of Supply", key: "pos", width: 22 },
        { header: "Invoice Value", key: "value", width: 14 },
        { header: "Rate", key: "rate", width: 8 },
        { header: "Taxable Value", key: "taxable", width: 14 },
        { header: "CGST", key: "cgst", width: 12 },
        { header: "SGST", key: "sgst", width: 12 },
        { header: "IGST", key: "igst", width: 12 },
      ];
      b2c.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
      let b2cSubtotal = 0, b2cCgst = 0, b2cSgst = 0, b2cIgst = 0, b2cTotal = 0;
      for (const inv of b2cRows) {
        const items = await storage.getInvoiceItems(inv.id);
        const taxableValue = items.reduce((s, it) => s + (it.amount ?? 0), 0);
        const ratesUsed = items.map((it) => (it.taxRate ?? 0)).filter((r) => r > 0);
        const rate = ratesUsed.length ? Math.max(...ratesUsed) / 100 : (settings?.taxRate ?? 0) / 100;
        b2c.addRow({
          no: inv.invoiceNumber,
          date: inv.issuedAt ? new Date(inv.issuedAt).toLocaleDateString("en-GB") : "",
          name: inv.customerName,
          pos: inv.placeOfSupplyCode ? `${inv.placeOfSupplyCode}-${inv.placeOfSupplyName ?? ""}` : "",
          value: (inv.total ?? 0) / 100,
          rate,
          taxable: taxableValue / 100,
          cgst: (inv.cgstAmount ?? 0) / 100,
          sgst: (inv.sgstAmount ?? 0) / 100,
          igst: (inv.igstAmount ?? 0) / 100,
        });
        b2cSubtotal += taxableValue;
        b2cCgst += inv.cgstAmount ?? 0;
        b2cSgst += inv.sgstAmount ?? 0;
        b2cIgst += inv.igstAmount ?? 0;
        b2cTotal += inv.total ?? 0;
      }
      const b2cTotalRow = b2c.addRow({
        name: "TOTAL",
        value: b2cTotal / 100,
        taxable: b2cSubtotal / 100,
        cgst: b2cCgst / 100,
        sgst: b2cSgst / 100,
        igst: b2cIgst / 100,
      });
      b2cTotalRow.eachCell((c) => Object.assign(c, totalRowStyle));

      // ---- Sheet: HSN Summary ----
      const hsn = wb.addWorksheet("HSN Summary");
      hsn.columns = [
        { header: "HSN/SAC", key: "hsn", width: 14 },
        { header: "Description", key: "desc", width: 36 },
        { header: "Total Quantity", key: "qty", width: 14 },
        { header: "Total Value", key: "value", width: 14 },
        { header: "Taxable Value", key: "taxable", width: 14 },
        { header: "Integrated Tax (IGST)", key: "igst", width: 18 },
        { header: "Central Tax (CGST)", key: "cgst", width: 18 },
        { header: "State Tax (SGST)", key: "sgst", width: 18 },
      ];
      hsn.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
      const hsnAgg = new Map<string, { desc: string; qty: number; value: number; taxable: number; cgst: number; sgst: number; igst: number }>();
      for (const inv of inMonth) {
        const items = await storage.getInvoiceItems(inv.id);
        const invTaxable = items.reduce((s, it) => s + (it.amount ?? 0), 0) || 1;
        for (const it of items) {
          const key = it.hsnCode || "—";
          const share = (it.amount ?? 0) / invTaxable;
          const row = hsnAgg.get(key) ?? { desc: it.description, qty: 0, value: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
          row.qty += it.quantity ?? 0;
          row.value += it.amount ?? 0;
          row.taxable += it.amount ?? 0;
          row.cgst += Math.round((inv.cgstAmount ?? 0) * share);
          row.sgst += Math.round((inv.sgstAmount ?? 0) * share);
          row.igst += Math.round((inv.igstAmount ?? 0) * share);
          hsnAgg.set(key, row);
        }
      }
      for (const [hsnCode, agg] of Array.from(hsnAgg.entries())) {
        hsn.addRow({
          hsn: hsnCode,
          desc: agg.desc,
          qty: agg.qty,
          value: agg.value / 100,
          taxable: agg.taxable / 100,
          igst: agg.igst / 100,
          cgst: agg.cgst / 100,
          sgst: agg.sgst / 100,
        });
      }

      // ---- Sheet: Summary ----
      const sum = wb.addWorksheet("Summary");
      sum.columns = [
        { header: "Field", key: "k", width: 32 },
        { header: "Value", key: "v", width: 36 },
      ];
      sum.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
      const monthLabel = startUtc.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      sum.addRow({ k: "Legal Name", v: settings?.gstLegalName ?? settings?.companyName ?? "—" });
      sum.addRow({ k: "GSTIN", v: settings?.gstin ?? "—" });
      sum.addRow({ k: "State", v: settings?.gstStateCode ? `${settings.gstStateCode} - ${settings.gstStateName ?? ""}` : "—" });
      sum.addRow({ k: "Return Period", v: monthLabel });
      sum.addRow({ k: "Generated At", v: new Date().toISOString() });
      sum.addRow({ k: "", v: "" });
      sum.addRow({ k: "B2B Invoices", v: b2bRows.length });
      sum.addRow({ k: "B2C Invoices", v: b2cRows.length });
      sum.addRow({ k: "Total Taxable Value", v: (b2bSubtotal + b2cSubtotal) / 100 });
      sum.addRow({ k: "Total CGST", v: (b2bCgst + b2cCgst) / 100 });
      sum.addRow({ k: "Total SGST", v: (b2bSgst + b2cSgst) / 100 });
      sum.addRow({ k: "Total IGST", v: (b2bIgst + b2cIgst) / 100 });
      sum.addRow({ k: "Total Invoice Value", v: (b2bTotal + b2cTotal) / 100 });

      const filename = `GST-Report-${year}-${String(month).padStart(2, "0")}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      const buf = await wb.xlsx.writeBuffer();
      res.send(Buffer.from(buf));
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to build GST report" });
    }
  });

  // Invoices
  app.get("/api/tenants/:tenantId/invoices", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const invoices = await storage.getInvoicesByTenantId(req.params.tenantId);
    res.json(invoices);
  });

  app.get("/api/tenants/:tenantId/invoices/stats", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const invoices = await storage.getInvoicesByTenantId(req.params.tenantId);
    const totals = invoices.reduce(
      (acc, inv) => {
        acc.totalBilled += inv.total;
        acc.totalPaid += inv.paidAmount;
        acc.totalOutstanding += Math.max(0, inv.total - inv.paidAmount);
        if (inv.status === "draft") acc.draftCount += 1;
        if (inv.status === "sent") acc.sentCount += 1;
        if (inv.status === "partial") acc.partialCount += 1;
        if (inv.status === "paid") acc.paidCount += 1;
        if (inv.status === "overdue") acc.overdueCount += 1;
        if (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== "paid" && inv.status !== "cancelled") {
          acc.totalOverdue += Math.max(0, inv.total - inv.paidAmount);
        }
        return acc;
      },
      { totalBilled: 0, totalPaid: 0, totalOutstanding: 0, totalOverdue: 0, draftCount: 0, sentCount: 0, partialCount: 0, paidCount: 0, overdueCount: 0, count: invoices.length },
    );
    res.json(totals);
  });

  app.post("/api/tenants/:tenantId/invoices", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const tenantId = req.params.tenantId;
      const settings = await storage.getInvoiceSettings(tenantId);
      const existing = await storage.getInvoicesByTenantId(tenantId);
      const prefix = settings?.invoicePrefix ?? "INV";
      const year = new Date().getFullYear();
      const seq = existing.length + 1;
      const rawItems: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
      const fallbackRate = settings?.taxRate ?? 0;
      // Validate each item; ignore invoiceId in the input (server sets it).
      // For government fees we default `taxable` to false (most agencies don't
      // charge GST on government/consular fees collected on behalf of authorities)
      // — but the client can still override either way explicitly.
      const items = rawItems.map((it) => {
        const category = it.category ?? "agency_fee";
        const taxable = typeof it.taxable === "boolean"
          ? it.taxable
          : category !== "government_fee";
        return insertInvoiceItemSchema.omit({ invoiceId: true } as any).parse({
          description: it.description,
          quantity: it.quantity ?? 1,
          unitPrice: it.unitPrice ?? 0,
          amount: it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1)),
          category,
          hsnCode: it.hsnCode ?? null,
          // When GST is on we preserve explicit 0 (exempt) and only fall back when null/undefined.
          // When GST is off we always store 0 (no per-line GST tracking).
          taxRate: settings?.gstEnabled
            ? (it.taxRate == null ? fallbackRate : it.taxRate)
            : 0,
          taxable,
        });
      });
      const subtotal: number = (items as any[]).reduce(
        (s: number, it: any) => s + (it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1))),
        0,
      );
      // Validate the invoice header. Strip computed/forbidden fields from input.
      const { items: _items, id: _id, tenantId: _t, invoiceNumber: _n, subtotal: _s, taxAmount: _ta, cgstAmount: _c, sgstAmount: _sg, igstAmount: _ig, total: _to, paidAmount: _pa, ...header } = req.body ?? {};
      const invoiceNumber = req.body.invoiceNumber ?? `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
      const supplyCode = header.placeOfSupplyCode ?? settings?.gstStateCode ?? null;
      const supplyName = header.placeOfSupplyName ?? (supplyCode ? INDIAN_STATE_NAME_BY_CODE[supplyCode] ?? null : null);
      const split = computeGstSplit(items as any[], settings?.gstStateCode, supplyCode, fallbackRate, !!settings?.gstEnabled);
      const parsedHeader = insertInvoiceSchema.parse({
        ...header,
        tenantId,
        invoiceNumber,
        subtotal,
        taxAmount: split.taxAmount,
        cgstAmount: split.cgst,
        sgstAmount: split.sgst,
        igstAmount: split.igst,
        total: subtotal + split.taxAmount,
        paidAmount: 0,
        currency: header.currency ?? settings?.currency ?? "USD",
        status: header.status ?? "draft",
        placeOfSupplyCode: supplyCode,
        placeOfSupplyName: supplyName,
        dueDate: header.dueDate ? new Date(header.dueDate) : null,
        issuedAt: header.issuedAt ? new Date(header.issuedAt) : new Date(),
      });
      const created = await storage.createInvoice(parsedHeader, items as any);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid invoice" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!requireTenantAccess(req, res, invoice.tenantId)) return;
    const [items, payments] = await Promise.all([
      storage.getInvoiceItems(req.params.id),
      storage.getPaymentsByInvoiceId(req.params.id),
    ]);
    res.json({ ...invoice, items, payments });
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!requireTenantAccess(req, res, invoice.tenantId)) return;
    try {
      const { items, ...rest } = req.body ?? {};
      const parsed = invoicePatchSchema.parse(rest);
      const patch: any = { ...parsed };
      if (parsed.dueDate !== undefined) patch.dueDate = parsed.dueDate ? new Date(parsed.dueDate as any) : null;
      if (parsed.issuedAt !== undefined) patch.issuedAt = new Date(parsed.issuedAt as any);
      await storage.updateInvoice(req.params.id, patch);
      if (Array.isArray(items)) {
        const settingsForItems = await storage.getInvoiceSettings(invoice.tenantId);
        const fallbackRate = settingsForItems?.taxRate ?? 0;
        const validated = items.map((it: any) => {
          const category = it.category ?? "agency_fee";
          const taxable = typeof it.taxable === "boolean"
            ? it.taxable
            : category !== "government_fee";
          return insertInvoiceItemSchema.omit({ invoiceId: true } as any).parse({
            description: it.description,
            quantity: it.quantity ?? 1,
            unitPrice: it.unitPrice ?? 0,
            amount: it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1)),
            category,
            hsnCode: it.hsnCode ?? null,
            taxRate: settingsForItems?.gstEnabled
              ? (it.taxRate == null ? fallbackRate : it.taxRate)
              : 0,
            taxable,
          });
        });
        await storage.replaceInvoiceItems(req.params.id, validated as any);
      }
      // Always recompute totals in case items or tax settings changed.
      await recomputeInvoiceTotals(req.params.id);
      const final = await storage.getInvoice(req.params.id);
      res.json(final);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid invoice patch" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!requireTenantAccess(req, res, invoice.tenantId)) return;
    await storage.deleteInvoice(req.params.id);
    res.status(204).send();
  });

  app.get("/api/cases/:caseId/invoices", async (req, res) => {
    const caseRow = await storage.getCase(req.params.caseId);
    if (!caseRow) return res.status(404).json({ error: "Case not found" });
    if (!requireTenantAccess(req, res, caseRow.tenantId)) return;
    const invoices = await storage.getInvoicesByCaseId(req.params.caseId);
    res.json(invoices);
  });

  // Payments
  app.get("/api/tenants/:tenantId/payments", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const payments = await storage.getPaymentsByTenantId(req.params.tenantId);
    res.json(payments);
  });

  app.get("/api/invoices/:invoiceId/payments", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!requireTenantAccess(req, res, invoice.tenantId)) return;
    const payments = await storage.getPaymentsByInvoiceId(req.params.invoiceId);
    res.json(payments);
  });

  app.post("/api/invoices/:invoiceId/payments", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!requireTenantAccess(req, res, invoice.tenantId)) return;
    try {
      const { invoiceId: _i, tenantId: _t, id: _id, ...body } = req.body ?? {};
      const parsed = insertPaymentSchema.parse({
        ...body,
        invoiceId: req.params.invoiceId,
        tenantId: invoice.tenantId,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      });
      const created = await storage.createPayment(parsed);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid payment" });
    }
  });

  app.delete("/api/payments/:id", async (req, res) => {
    const payment = await storage.getPayment(req.params.id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (!requireTenantAccess(req, res, payment.tenantId)) return;
    await storage.deletePayment(req.params.id);
    res.status(204).send();
  });

  // === Case Routes ===
  // Date validation helpers — enforce travel >= today, DOB <= today
  function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function validateCaseDates(body: any): string | null {
    if (body?.travelDate) {
      const td = new Date(body.travelDate);
      if (isNaN(td.getTime())) return "Invalid travel date";
      if (td < startOfToday()) return "Intended travel date cannot be in the past";
    }
    if (body?.applicantDob) {
      // applicantDob is stored as a string (YYYY-MM-DD)
      const dob = new Date(body.applicantDob);
      if (isNaN(dob.getTime())) return "Invalid date of birth";
      if (dob > new Date()) return "Date of birth cannot be in the future";
    }
    return null;
  }
  const ALLOWED_CASE_STATUSES = new Set([
    "draft", "pending", "in_progress", "documents_required",
    "under_review", "submitted", "approved", "rejected",
  ]);
  const ALLOWED_CASE_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
  function validateCaseEnums(body: any): string | null {
    if (body?.status !== undefined && !ALLOWED_CASE_STATUSES.has(body.status)) {
      return `Invalid status: must be one of ${Array.from(ALLOWED_CASE_STATUSES).join(", ")}`;
    }
    if (body?.priority !== undefined && body.priority !== null && !ALLOWED_CASE_PRIORITIES.has(body.priority)) {
      return `Invalid priority: must be one of ${Array.from(ALLOWED_CASE_PRIORITIES).join(", ")}`;
    }
    return null;
  }
  function validateCoTraveller(body: any): string | null {
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) return "Co-traveller name is required";
    if (!body?.relationship || typeof body.relationship !== "string") return "Relationship is required";
    if (body?.dob) {
      const dob = new Date(body.dob);
      if (isNaN(dob.getTime())) return "Invalid co-traveller date of birth";
      if (dob > new Date()) return "Co-traveller date of birth cannot be in the future";
    }
    return null;
  }

  app.get("/api/tenants/:tenantId/cases", async (req, res) => {
    const cases = await storage.getCasesByTenantId(req.params.tenantId);
    res.json(cases);
  });

  app.post("/api/tenants/:tenantId/cases", async (req, res) => {
    // Validate dates: travel date can't be in the past, DOB can't be in the future
    const dateError = validateCaseDates(req.body);
    if (dateError) return res.status(400).json({ error: dateError });
    const enumError = validateCaseEnums(req.body);
    if (enumError) return res.status(400).json({ error: enumError });
    // Required fields (relaxed for drafts: only destination + visa type required)
    if (!req.body?.destinationCountry || typeof req.body.destinationCountry !== "string" || !req.body.destinationCountry.trim()) {
      return res.status(400).json({ error: "Destination country is required" });
    }
    if (!req.body?.visaType || typeof req.body.visaType !== "string" || !req.body.visaType.trim()) {
      return res.status(400).json({ error: "Visa type is required" });
    }
    if (req.body?.status !== "draft") {
      if (!req.body?.applicantName || typeof req.body.applicantName !== "string" || !req.body.applicantName.trim()) {
        return res.status(400).json({ error: "Applicant name is required (or save as draft)" });
      }
    }

    // Plan limit enforcement (cases per month)
    const tenantForCases = await storage.getTenant(req.params.tenantId);
    if (tenantForCases) {
      const planCaseLimits: Record<string, number> = { starter: 30, professional: 200, enterprise: 9999 };
      const caseLimit = planCaseLimits[tenantForCases.plan ?? "starter"] ?? 30;
      const allCases = await storage.getCasesByTenantId(req.params.tenantId);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const casesThisMonth = allCases.filter(c => c.createdAt && new Date(c.createdAt) >= startOfMonth).length;
      if (casesThisMonth >= caseLimit) {
        return res.status(403).json({ error: `Monthly case limit reached for your ${tenantForCases.plan} plan (${caseLimit}). Please upgrade.` });
      }
    }
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
    const dateError = validateCaseDates(req.body);
    if (dateError) return res.status(400).json({ error: dateError });
    const enumError = validateCaseEnums(req.body);
    if (enumError) return res.status(400).json({ error: enumError });

    const caseData = await storage.updateCase(req.params.id, req.body);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseData);
  });

  // === Case Co-Travellers (companions) ===
  app.get("/api/cases/:caseId/co-travellers", async (req, res) => {
    const caseRow = await storage.getCase(req.params.caseId);
    if (!caseRow) return res.status(404).json({ error: "Case not found" });
    if (!requireTenantAccess(req, res, caseRow.tenantId)) return;
    const list = await storage.getCoTravellersByCaseId(req.params.caseId);
    res.json(list);
  });

  app.post("/api/cases/:caseId/co-travellers", async (req, res) => {
    const caseRow = await storage.getCase(req.params.caseId);
    if (!caseRow) return res.status(404).json({ error: "Case not found" });
    if (!requireTenantAccess(req, res, caseRow.tenantId)) return;
    const err = validateCoTraveller(req.body);
    if (err) return res.status(400).json({ error: err });
    const created = await storage.createCoTraveller({
      ...req.body,
      caseId: req.params.caseId,
      tenantId: caseRow.tenantId,
    });
    res.status(201).json(created);
  });

  app.patch("/api/co-travellers/:id", async (req, res) => {
    const existing = await storage.getCoTraveller(req.params.id);
    if (!existing) return res.status(404).json({ error: "Co-traveller not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;
    const err = validateCoTraveller({ ...existing, ...req.body });
    if (err) return res.status(400).json({ error: err });
    // Disallow re-parenting to a different case/tenant via body
    const { caseId: _ignoreCaseId, tenantId: _ignoreTenantId, ...safeBody } = req.body || {};
    const updated = await storage.updateCoTraveller(req.params.id, safeBody);
    if (!updated) return res.status(404).json({ error: "Co-traveller not found" });
    res.json(updated);
  });

  app.delete("/api/co-travellers/:id", async (req, res) => {
    const existing = await storage.getCoTraveller(req.params.id);
    if (!existing) return res.status(404).json({ error: "Co-traveller not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;
    const ok = await storage.deleteCoTraveller(req.params.id);
    if (!ok) return res.status(404).json({ error: "Co-traveller not found" });
    res.status(204).send();
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
    if (DEMO_B2C_OTP) {
      req.session.mcVerificationId = undefined;
      return res.json({ success: true, message: `Demo OTP is ${DEMO_B2C_OTP}. No SMS was sent.` });
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
    const enteredOtp = String(otp).replace(/\D/g, "");
    if (DEMO_B2C_OTP) {
      if (enteredOtp !== DEMO_B2C_OTP) {
        return res.status(400).json({ error: `For demo signup, use OTP ${DEMO_B2C_OTP}` });
      }
      req.session.otpVerifiedPhone = phone;
      req.session.mcVerificationId = undefined;
      return res.json({ success: true });
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
    const mode = cfg?.mode === "live" || process.env.CASHFREE_MODE === "live" ? "live" : "test";
    const testReady = !!((cfg?.testClientId || process.env.CASHFREE_TEST_CLIENT_ID) && (cfg?.testClientSecret || process.env.CASHFREE_TEST_CLIENT_SECRET));
    const liveReady = !!((cfg?.liveClientId || process.env.CASHFREE_LIVE_CLIENT_ID) && (cfg?.liveClientSecret || process.env.CASHFREE_LIVE_CLIENT_SECRET));
    res.json({
      provider: cfg?.provider || "cashfree",
      mode,
      apiVersion: cfg?.apiVersion || process.env.CASHFREE_API_VERSION || "2023-08-01",
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
      usingEnvTestCredentials: !cfg?.testClientId && !!process.env.CASHFREE_TEST_CLIENT_ID,
      usingEnvLiveCredentials: !cfg?.liveClientId && !!process.env.CASHFREE_LIVE_CLIENT_ID,
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

  // ── Agency: Per-Tenant Payment Gateway Config (Cashfree) ─────────────────
  // Each agency can configure its own Cashfree credentials. When `enabled=true`
  // and credentials are present, agency-scoped flows should prefer this over
  // the global SaaS-admin config.
  app.get("/api/tenants/:tenantId/payment-gateway-config", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const cfg = await storage.getTenantPaymentGatewayConfig(req.params.tenantId);
    const mode = cfg?.mode === "live" ? "live" : "test";
    const hasTestCredentials = !!(cfg?.testClientId && cfg?.testClientSecret);
    const hasLiveCredentials = !!(cfg?.liveClientId && cfg?.liveClientSecret);
    res.json({
      provider: cfg?.provider || "cashfree",
      mode,
      apiVersion: cfg?.apiVersion || "2023-08-01",
      enabled: !!cfg?.enabled,
      // Mask all secret-bearing fields so the client never gets raw values.
      testClientId: cfg?.testClientId ? maskKey(cfg.testClientId) : "",
      testClientSecret: cfg?.testClientSecret ? maskKey(cfg.testClientSecret) : "",
      liveClientId: cfg?.liveClientId ? maskKey(cfg.liveClientId) : "",
      liveClientSecret: cfg?.liveClientSecret ? maskKey(cfg.liveClientSecret) : "",
      webhookSecret: cfg?.webhookSecret ? maskKey(cfg.webhookSecret) : "",
      sandboxBaseUrl: "https://sandbox.cashfree.com/pg",
      productionBaseUrl: "https://api.cashfree.com/pg",
      activeBaseUrl: mode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
      hasTestCredentials,
      hasLiveCredentials,
      hasWebhookSecret: !!cfg?.webhookSecret,
      activeReady: mode === "live" ? hasLiveCredentials : hasTestCredentials,
    });
  });

  app.post("/api/tenants/:tenantId/payment-gateway-config", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const {
        mode, apiVersion, enabled,
        testClientId, testClientSecret, liveClientId, liveClientSecret, webhookSecret,
      } = req.body ?? {};
      const patch: Record<string, any> = { provider: "cashfree" };
      if (mode !== undefined) patch.mode = mode === "live" ? "live" : "test";
      if (apiVersion !== undefined) patch.apiVersion = apiVersion || "2023-08-01";
      if (enabled !== undefined) patch.enabled = !!enabled;
      // Only overwrite a secret field if the value is not a masked placeholder.
      const writeSecret = (v: any) => v !== undefined && !String(v).includes("•");
      if (writeSecret(testClientId)) patch.testClientId = testClientId || null;
      if (writeSecret(testClientSecret)) patch.testClientSecret = testClientSecret || null;
      if (writeSecret(liveClientId)) patch.liveClientId = liveClientId || null;
      if (writeSecret(liveClientSecret)) patch.liveClientSecret = liveClientSecret || null;
      if (writeSecret(webhookSecret)) patch.webhookSecret = webhookSecret || null;
      const updated = await storage.upsertTenantPaymentGatewayConfig(req.params.tenantId, patch);
      const activeMode = updated.mode === "live" ? "live" : "test";
      res.json({
        success: true,
        provider: updated.provider || "cashfree",
        mode: activeMode,
        apiVersion: updated.apiVersion || "2023-08-01",
        enabled: !!updated.enabled,
        hasTestCredentials: !!(updated.testClientId && updated.testClientSecret),
        hasLiveCredentials: !!(updated.liveClientId && updated.liveClientSecret),
        hasWebhookSecret: !!updated.webhookSecret,
        activeBaseUrl: activeMode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
      });
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid payment gateway config" });
    }
  });

  // ── Agency: Per-Tenant SMS Config (MessageCentral) ───────────────────────
  app.get("/api/tenants/:tenantId/sms-config", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const cfg = await storage.getTenantSmsConfig(req.params.tenantId);
    const hasMcCredentials = !!(cfg?.mcCustomerId && cfg?.mcAuthToken);
    res.json({
      provider: cfg?.provider || "messagecentral",
      enabled: !!cfg?.enabled,
      mcCustomerId: cfg?.mcCustomerId ?? "",
      // Mask the auth token; customer ID is not secret per MessageCentral docs.
      mcAuthToken: cfg?.mcAuthToken ? maskKey(cfg.mcAuthToken) : "",
      senderId: cfg?.senderId ?? "",
      hasMcCredentials,
      activeReady: hasMcCredentials && !!cfg?.enabled,
    });
  });

  app.post("/api/tenants/:tenantId/sms-config", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const { provider, mcCustomerId, mcAuthToken, senderId, enabled } = req.body ?? {};
      const patch: Record<string, any> = { provider: provider || "messagecentral" };
      if (mcCustomerId !== undefined) patch.mcCustomerId = mcCustomerId || null;
      if (senderId !== undefined) patch.senderId = senderId || null;
      if (enabled !== undefined) patch.enabled = !!enabled;
      // Only overwrite the auth token if the new value is not a masked placeholder.
      if (mcAuthToken !== undefined && !String(mcAuthToken).includes("•")) {
        patch.mcAuthToken = mcAuthToken || null;
      }
      const updated = await storage.upsertTenantSmsConfig(req.params.tenantId, patch);
      const hasMcCredentials = !!(updated.mcCustomerId && updated.mcAuthToken);
      res.json({
        success: true,
        provider: updated.provider || "messagecentral",
        enabled: !!updated.enabled,
        hasMcCredentials,
        activeReady: hasMcCredentials && !!updated.enabled,
      });
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Invalid SMS config" });
    }
  });

  // Send a test OTP using the tenant's MessageCentral credentials.
  app.post("/api/tenants/:tenantId/sms-config/test", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const { phone } = req.body ?? {};
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number is required for testing" });
    }
    const cfg = await storage.getTenantSmsConfig(req.params.tenantId);
    if (!cfg?.mcCustomerId || !cfg?.mcAuthToken) {
      return res.status(400).json({ error: "MessageCentral credentials are not configured for this agency." });
    }
    // Reuse the global sendOtp helper but pass a SmsConfig-shaped object built
    // from this tenant's MessageCentral credentials so we don't accidentally
    // fall back to the global SMS config.
    const tenantSmsConfig: any = {
      id: 0,
      provider: "messagecentral",
      msg91AuthKey: null, msg91TemplateId: null, msg91SenderId: null,
      zauvApiKey: null,
      mcCustomerId: cfg.mcCustomerId,
      mcAuthToken: cfg.mcAuthToken,
      updatedAt: new Date(),
    };
    const result = await sendOtp(phone, tenantSmsConfig);
    if (!result.success) return res.status(502).json({ error: result.error || "Failed to send test OTP" });
    res.json({ success: true, message: `Test OTP sent to ${phone}` });
  });

  // ── B2C Register ──────────────────────────────────────────────────────────
  app.post("/api/b2c/auth/register", async (req, res) => {
    const { email, password, fullName, phone, otp } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const enteredOtp = String(otp || "").replace(/\D/g, "");
    if (phone && enteredOtp === DEMO_B2C_OTP) {
      req.session.otpVerifiedPhone = phone;
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

  // ── B2C Payments: Deep Check via Cashfree ────────────────────────────────
  app.post("/api/b2c/payments/deep-check/order", requireB2cAuth, async (req, res) => {
    const user = await storage.getB2cUser(req.session.b2cUserId!);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (user.deepCheckAccess) {
      return res.json({ alreadyActive: true, redirectUrl: "/deep-check" });
    }

    const cfg = await storage.getPaymentGatewayConfig();
    const cashfree = getCashfreeCredentials(cfg);
    if (!cashfree.clientId || !cashfree.clientSecret) {
      return res.status(503).json({
        error: `Cashfree ${cashfree.mode} credentials are not configured. Please add them in SaaS Admin > Integrations.`,
      });
    }
    const modeError = validateCashfreeMode(cashfree.mode, cashfree.clientId, cashfree.clientSecret);
    if (modeError) {
      return res.status(400).json({ error: modeError });
    }

    const orderId = `VS_DEEP_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const requestId = randomUUID();
    const origin = getRequestOrigin(req);
    const payload = {
      order_id: orderId,
      order_amount: 500,
      order_currency: "INR",
      order_note: "Visa Shuttle Deep Check",
      customer_details: {
        customer_id: user.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45),
        customer_email: user.email,
        customer_name: user.fullName,
        customer_phone: getCashfreePhone(user.phone),
      },
      order_meta: {
        return_url: `${origin}/payment/deep-check/return?order_id=${orderId}`,
      },
      order_tags: {
        product: "deep_check",
        user_id: user.id,
      },
    };

    let response: Response;
    try {
      response = await fetch(`${cashfree.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": cashfree.apiVersion,
          "x-client-id": cashfree.clientId,
          "x-client-secret": cashfree.clientSecret,
          "x-request-id": requestId,
          "x-idempotency-key": randomUUID(),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
    } catch (err) {
      console.error("[Cashfree] Create order network error:", err);
      return res.status(503).json({
        error: "Cashfree checkout is temporarily unreachable. Please try again in a few minutes.",
      });
    }

    const data = await readCashfreeBody(response);
    if (!response.ok) {
      console.error("[Cashfree] Create order failed:", {
        status: response.status,
        requestId,
        response: data,
      });
      const message = data?.message || data?.error || data?.type || "Unable to create Cashfree order";
      const isAuthError = response.status === 401 || /auth|credential|client/i.test(String(message));
      const status = response.status >= 500 ? 503 : response.status;
      return res.status(status).json({
        error: response.status >= 500
          ? "Cashfree gateway is temporarily unavailable. Please try again in a few minutes."
          : isAuthError
            ? `Cashfree authentication failed in ${cashfree.mode.toUpperCase()} mode. Please verify the App ID and Secret Key in SaaS Admin > Integrations, and make sure Test credentials are used only with Test mode.`
            : message,
      });
    }

    res.json({
      orderId: data.order_id || orderId,
      paymentSessionId: data.payment_session_id,
      mode: cashfree.mode,
      amount: 500,
      currency: "INR",
    });
  });

  app.get("/api/b2c/payments/deep-check/order/:orderId", requireB2cAuth, async (req, res) => {
    const user = await storage.getB2cUser(req.session.b2cUserId!);
    if (!user) return res.status(401).json({ error: "User not found" });

    const orderId = req.params.orderId;
    if (!/^VS_DEEP_[a-zA-Z0-9_-]+$/.test(orderId)) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    const cfg = await storage.getPaymentGatewayConfig();
    const cashfree = getCashfreeCredentials(cfg);
    if (!cashfree.clientId || !cashfree.clientSecret) {
      return res.status(503).json({ error: "Cashfree credentials are not configured" });
    }

    let response: Response;
    try {
      response = await fetch(`${cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          "x-api-version": cashfree.apiVersion,
          "x-client-id": cashfree.clientId,
          "x-client-secret": cashfree.clientSecret,
          "x-request-id": randomUUID(),
        },
        signal: AbortSignal.timeout(20000),
      });
    } catch (err) {
      console.error("[Cashfree] Verify order network error:", err);
      return res.status(503).json({ error: "Cashfree checkout is temporarily unreachable. Please try again in a few minutes." });
    }

    const data = await readCashfreeBody(response);
    if (!response.ok) {
      console.error("[Cashfree] Verify order failed:", data);
      return res.status(response.status >= 500 ? 503 : response.status).json({
        error: response.status >= 500
          ? "Cashfree gateway is temporarily unavailable. Please try again in a few minutes."
          : data?.message || "Unable to verify Cashfree order",
      });
    }

    const isPaid = data.order_status === "PAID";
    if (isPaid && !user.deepCheckAccess) {
      await storage.updateB2cUser(user.id, {
        subscriptionPlan: "pro",
        deepCheckAccess: true,
        checkLimit: Math.max(user.checkLimit || 1, 1),
      });
    }

    res.json({
      orderId: data.order_id || orderId,
      status: data.order_status,
      paid: isPaid,
      deepCheckAccess: isPaid || user.deepCheckAccess,
    });
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
  // Weekly activity breakdown for admin dashboard chart
  app.get("/api/admin/weekly-activity", requireAdminAuth, async (req, res) => {
    const [allCases, activityLogs] = await Promise.all([
      (async () => {
        const tenants = await storage.getAllTenants();
        const caseArrays = await Promise.all(tenants.map(t => storage.getCasesByTenantId(t.id)));
        return caseArrays.flat();
      })(),
      storage.getAllActivityLogs(),
    ]);

    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const now = new Date();
    // Build 7-day window ending today
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      const dayLabel = days[d.getDay()];
      const cases = allCases.filter(c => {
        if (!c.createdAt) return false;
        const t = new Date(c.createdAt);
        return t >= d && t < nextDay;
      }).length;
      const checks = activityLogs.filter(l => {
        if (!l.createdAt) return false;
        const t = new Date(l.createdAt);
        return t >= d && t < nextDay;
      }).length;
      return { day: dayLabel, cases, checks };
    });
    res.json(result);
  });

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

  // === Agency Self-Registration ===
  app.post("/api/agency-register", async (req, res) => {
    const { agencyName, slug, email, password, name, contactEmail, contactPhone } = req.body;
    if (!agencyName || !slug || !email || !password || !name) {
      return res.status(400).json({ error: "agencyName, slug, email, password, and name are required" });
    }
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!cleanSlug) return res.status(400).json({ error: "Invalid slug" });
    const existing = await storage.getTenantBySlug(cleanSlug);
    if (existing) return res.status(409).json({ error: "That agency URL is already taken" });
    const existingUser = await storage.getUserByEmail(email.toLowerCase().trim());
    if (existingUser) return res.status(409).json({ error: "An account with that email already exists" });
    const tenant = await storage.createTenant({
      name: agencyName.trim(),
      slug: cleanSlug,
      plan: "starter",
      status: "active",
      contactEmail: contactEmail || email,
      contactPhone: contactPhone || null,
      showPoweredBy: true,
      authMethod: "otp",
    });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await storage.createUser({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password: hashedPassword,
      role: "agency_owner",
      tenantId: tenant.id,
      avatarUrl: null,
    });
    await storage.createActivityLog({
      tenantId: tenant.id,
      userId: user.id,
      action: "agency.registered",
      entityType: "tenant",
      entityId: tenant.id,
      details: { agencyName: tenant.name, plan: "starter" },
    });
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userTenantId = tenant.id;
    req.session.save(() => {
      const { password: _, ...safeUser } = user;
      res.status(201).json({ tenant, user: safeUser });
    });
  });

  // === Tenant Staff Management ===
  app.get("/api/tenants/:tenantId/staff", requireAgencyAuth, async (req, res) => {
    const users = await storage.getUsersByTenantId(req.params.tenantId);
    const staff = users
      .filter(u => ["agency_owner", "agency_staff", "agency_manager"].includes(u.role))
      .map(({ password: _, ...u }) => u)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    res.json(staff);
  });

  app.post("/api/tenants/:tenantId/staff", requireAgencyAuth, async (req, res) => {
    const { email, name, role } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });
    const tenantId = req.params.tenantId;
    const existing = await storage.getUserByEmail(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: "A user with that email already exists" });
    // Plan limits check
    const tenant = await storage.getTenant(tenantId);
    const currentStaff = await storage.getUsersByTenantId(tenantId);
    const staffCount = currentStaff.filter(u => ["agency_owner", "agency_staff", "agency_manager"].includes(u.role)).length;
    const limits: Record<string, number> = { starter: 3, professional: 10, enterprise: 999 };
    const limit = limits[tenant?.plan ?? "starter"] ?? 3;
    if (staffCount >= limit) {
      return res.status(403).json({ error: `Your ${tenant?.plan} plan allows up to ${limit} staff members. Upgrade to add more.` });
    }
    const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const user = await storage.createUser({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password: hashedPassword,
      role: role ?? "agency_staff",
      tenantId,
      avatarUrl: null,
    });
    await storage.createActivityLog({
      tenantId,
      userId: req.session.userId ?? null,
      action: "staff.invited",
      entityType: "user",
      entityId: user.id,
      details: { email, name, role: role ?? "agency_staff" },
    });
    const { password: _, ...safeUser } = user;
    res.status(201).json({ ...safeUser, tempPassword });
  });

  app.patch("/api/tenants/:tenantId/staff/:userId", requireAgencyAuth, async (req, res) => {
    const { role, name } = req.body;
    const user = await storage.updateUser(req.params.userId, { role, name });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.delete("/api/tenants/:tenantId/staff/:userId", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const userId = req.params.userId;
    if (userId === req.session.userId) {
      return res.status(400).json({ error: "You cannot remove yourself" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.tenantId !== tenantId) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    await storage.deleteUser(userId);
    await storage.createActivityLog({
      tenantId,
      userId: req.session.userId ?? null,
      action: "staff.removed",
      entityType: "user",
      entityId: userId,
      details: { email: user.email, name: user.name },
    });
    res.status(204).send();
  });

  // === Tenant Analytics ===
  app.get("/api/tenants/:tenantId/analytics", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const [cases, leads, documents] = await Promise.all([
      storage.getCasesByTenantId(tenantId),
      storage.getLeadsByTenantId(tenantId),
      storage.getDocumentsByTenantId(tenantId),
    ]);
    const now = new Date();
    // Monthly breakdown for last 6 months
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleString("en", { month: "short" });
      const monthCases = cases.filter(c => {
        const cd = new Date(c.createdAt!);
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
      });
      return {
        month: label,
        cases: monthCases.length,
        approved: monthCases.filter(c => c.status === "approved").length,
        leads: leads.filter(l => {
          const ld = new Date(l.createdAt!);
          return ld.getFullYear() === d.getFullYear() && ld.getMonth() === d.getMonth();
        }).length,
      };
    });
    // Destination breakdown
    const destinationMap: Record<string, number> = {};
    cases.forEach(c => {
      destinationMap[c.destinationCountry] = (destinationMap[c.destinationCountry] ?? 0) + 1;
    });
    const topDestinations = Object.entries(destinationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([country, applications]) => ({ country, applications }));
    // Visa type breakdown
    const visaTypeMap: Record<string, number> = {};
    cases.forEach(c => {
      visaTypeMap[c.visaType] = (visaTypeMap[c.visaType] ?? 0) + 1;
    });
    const visaTypeData = Object.entries(visaTypeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
    // Stage breakdown for leads
    const stageMap: Record<string, number> = {};
    leads.forEach(l => { stageMap[l.stage] = (stageMap[l.stage] ?? 0) + 1; });
    const approvedCases = cases.filter(c => c.status === "approved");
    const approvalRate = cases.length > 0 ? Math.round((approvedCases.length / cases.length) * 100) : 0;
    const wonLeads = leads.filter(l => l.stage === "won");
    const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
    const docApprovalRate = documents.length > 0
      ? Math.round((documents.filter(d => d.status === "approved").length / documents.length) * 100)
      : 0;
    res.json({
      summary: {
        totalCases: cases.length,
        activeCases: cases.filter(c => !["approved", "rejected"].includes(c.status)).length,
        approvedCases: approvedCases.length,
        approvalRate,
        totalLeads: leads.length,
        wonLeads: wonLeads.length,
        conversionRate,
        totalDocuments: documents.length,
        docApprovalRate,
      },
      monthlyData,
      topDestinations,
      visaTypeData,
      stageBreakdown: stageMap,
    });
  });

  // === Tenant Usage / Plan Info ===
  app.get("/api/tenants/:tenantId/usage", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const [tenant, cases, leads, staff] = await Promise.all([
      storage.getTenant(tenantId),
      storage.getCasesByTenantId(tenantId),
      storage.getLeadsByTenantId(tenantId),
      storage.getUsersByTenantId(tenantId),
    ]);
    const staffCount = staff.filter(u => ["agency_owner", "agency_staff", "agency_manager"].includes(u.role)).length;
    const now = new Date();
    const thisMonthCases = cases.filter(c => {
      const d = new Date(c.createdAt!);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const PLAN_LIMITS: Record<string, { staff: number; casesPerMonth: number; leads: number; label: string }> = {
      starter: { staff: 3, casesPerMonth: 30, leads: 50, label: "Starter" },
      professional: { staff: 10, casesPerMonth: 200, leads: 500, label: "Professional" },
      enterprise: { staff: 999, casesPerMonth: 9999, leads: 9999, label: "Enterprise" },
    };
    const plan = tenant?.plan ?? "starter";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
    res.json({
      plan,
      planLabel: limits.label,
      usage: {
        staff: staffCount,
        casesThisMonth: thisMonthCases,
        totalLeads: leads.length,
        totalCases: cases.length,
      },
      limits: {
        staff: limits.staff,
        casesPerMonth: limits.casesPerMonth,
        leads: limits.leads,
      },
      features: {
        whiteLabel: plan !== "starter",
        removesPoweredBy: plan === "enterprise",
        customDomain: plan === "enterprise",
        advancedAnalytics: plan !== "starter",
        prioritySupport: plan === "enterprise",
      },
    });
  });

  // ===== Invoice PDF + Email =====

  // SSRF-safe URL guard for tenant-supplied logo URLs.
  // Rejects non-https, private/loopback/link-local IPs, and cloud metadata endpoints.
  async function isSafePublicUrl(rawUrl: string): Promise<boolean> {
    let u: URL;
    try { u = new URL(rawUrl); } catch { return false; }
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
    // IP literal check
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    const isIp = ipRegex.test(host) || host.includes(":");
    let resolved: string[] = [];
    try {
      const dns = await import("node:dns/promises");
      if (isIp) resolved = [host];
      else {
        const recs = await dns.lookup(host, { all: true });
        resolved = recs.map((r) => r.address);
      }
    } catch { return false; }
    const isPrivate = (ip: string) => {
      // IPv6 quick reject (loopback / link-local / unique-local / metadata-style)
      if (ip.includes(":")) {
        const lower = ip.toLowerCase();
        return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd")
          || lower.startsWith("fe80:") || lower.startsWith("::ffff:");
      }
      const parts = ip.split(".").map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true;
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 169 && b === 254) return true; // link-local + AWS/GCP metadata
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 0) return true;
      if (a >= 224) return true; // multicast/reserved
      return false;
    };
    return resolved.length > 0 && resolved.every((ip) => !isPrivate(ip));
  }

  // Fetch a tenant-provided image with SSRF protection + size/type/timeout limits.
  async function fetchSafeImage(rawUrl: string | null | undefined): Promise<Buffer | null> {
    if (!rawUrl) return null;
    if (!(await isSafePublicUrl(rawUrl))) return null;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 4000);
    try {
      const r = await fetch(rawUrl, { signal: ac.signal, redirect: "error" });
      if (!r.ok) return null;
      const ct = (r.headers.get("content-type") ?? "").toLowerCase();
      if (!ct.includes("png") && !ct.includes("jpeg") && !ct.includes("jpg")) return null;
      const len = parseInt(r.headers.get("content-length") ?? "0", 10);
      if (len && len > 2_000_000) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.byteLength > 2_000_000) return null;
      return buf;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Render the invoice PDF to an arbitrary writable stream so it can be
  // streamed to the HTTP response or buffered for email attachment.
  async function renderInvoicePdf(
    inv: any,
    items: any[],
    settings: any,
    out: NodeJS.WritableStream,
  ): Promise<void> {
    const PDFDocumentMod: any = await import("pdfkit");
    const PDFDocument = PDFDocumentMod.default ?? PDFDocumentMod;
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(out);

    const accent = settings?.invoiceAccentColor || "#1f2937";
    const currency = settings?.currency ?? inv.currency ?? "USD";
    const fmt = (cents: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
    const fmtDate = (d: Date | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

    // Accent bar
    doc.rect(0, 0, doc.page.width, 6).fill(accent);

    // Try to embed logo (SSRF-guarded; failure just skips the image)
    let logoHeight = 0;
    const logoBuf = await fetchSafeImage(settings?.logoUrl);
    if (logoBuf) {
      try {
        doc.image(logoBuf, 48, 24, { fit: [120, 60] });
        logoHeight = 60;
      } catch { /* invalid image bytes — skip */ }
    }

    const headerTop = Math.max(28 + logoHeight, 32);
    doc.fillColor("#111827").fontSize(22).text("INVOICE", 48, headerTop, { align: "right" });
    doc.fontSize(11).fillColor("#6b7280").text(inv.invoiceNumber, { align: "right" });
    doc.moveDown(0.4);
    doc.fontSize(9).fillColor("#6b7280")
      .text(`Issued: ${fmtDate(inv.issuedAt)}`, { align: "right" })
      .text(`Due: ${fmtDate(inv.dueDate)}`, { align: "right" })
      .text(`Status: ${(inv.status ?? "draft").toUpperCase()}`, { align: "right" });

    doc.moveDown(2);
    const fromY = doc.y;

    doc.fontSize(9).fillColor("#9ca3af").text("FROM", 48, fromY);
    doc.fillColor("#111827").fontSize(11).text(settings?.companyName ?? "Your agency", 48);
    doc.fontSize(9).fillColor("#374151");
    if (settings?.companyAddress) doc.text(settings.companyAddress, 48, doc.y, { width: 220 });
    if (settings?.companyEmail) doc.text(settings.companyEmail);
    if (settings?.companyPhone) doc.text(settings.companyPhone);
    if (settings?.taxId) doc.text(`Tax ID: ${settings.taxId}`);

    doc.fontSize(9).fillColor("#9ca3af").text("BILL TO", 320, fromY);
    doc.fillColor("#111827").fontSize(11).text(inv.customerName ?? "—", 320);
    doc.fontSize(9).fillColor("#374151");
    if (inv.customerEmail) doc.text(inv.customerEmail, 320, doc.y);
    if (inv.customerPhone) doc.text(inv.customerPhone, 320, doc.y);
    const meta = [inv.destinationCountry, inv.visaType].filter(Boolean).join(" · ");
    if (meta) doc.fillColor("#6b7280").text(meta, 320, doc.y);

    doc.moveDown(2);

    const tableTop = Math.max(doc.y, fromY + 90);
    doc.y = tableTop;
    const colDesc = 48, colQty = 320, colUnit = 380, colAmt = 470;
    doc.fontSize(9).fillColor("#9ca3af")
      .text("DESCRIPTION", colDesc, doc.y, { continued: true })
      .text("QTY", colQty - colDesc - 30, undefined, { continued: true })
      .text("UNIT", colUnit - colQty + 8, undefined, { continued: true })
      .text("AMOUNT", colAmt - colUnit + 24, undefined, { width: 80, align: "right" });
    doc.moveDown(0.3);
    doc.strokeColor("#e5e7eb").lineWidth(0.5).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.4);

    doc.fillColor("#111827").fontSize(10);
    for (const it of items) {
      const lineY = doc.y;
      doc.text(it.description ?? "", colDesc, lineY, { width: 260 });
      const lineEnd = doc.y;
      doc.text(String(it.quantity ?? 1), colQty, lineY, { width: 40 });
      doc.text(fmt(it.unitPrice ?? 0), colUnit, lineY, { width: 80 });
      doc.text(fmt(it.amount ?? 0), colAmt, lineY, { width: 80, align: "right" });
      doc.y = Math.max(lineEnd, lineY + 14);
      doc.moveDown(0.2);
    }

    doc.moveDown(0.5);
    doc.strokeColor("#e5e7eb").lineWidth(0.5).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.6);

    const totalsX = 360;
    const balance = Math.max(0, (inv.total ?? 0) - (inv.paidAmount ?? 0));
    const drawTotal = (label: string, value: string, bold = false) => {
      doc.fontSize(bold ? 11 : 10).fillColor(bold ? "#111827" : "#374151")
        .text(label, totalsX, doc.y, { width: 110, continued: true })
        .text(value, { width: 80, align: "right" });
      doc.moveDown(0.25);
    };
    drawTotal("Subtotal", fmt(inv.subtotal ?? 0));
    if ((inv.taxAmount ?? 0) > 0) drawTotal(settings?.taxLabel ?? "Tax", fmt(inv.taxAmount));
    doc.strokeColor(accent).lineWidth(1).moveTo(totalsX, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.3);
    drawTotal("Total", fmt(inv.total ?? 0), true);
    if ((inv.paidAmount ?? 0) > 0) drawTotal("Paid", fmt(inv.paidAmount));
    drawTotal("Balance Due", fmt(balance), true);

    doc.moveDown(2);
    if (settings?.paymentTerms) {
      doc.fontSize(9).fillColor("#374151").text(`Payment terms: ${settings.paymentTerms}`, 48);
    }
    if (settings?.bankDetails) {
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#9ca3af").text("PAYMENT DETAILS", 48);
      doc.fontSize(9).fillColor("#374151").text(settings.bankDetails, 48, doc.y, { width: 500 });
    }
    if (settings?.footerText) {
      doc.moveDown(1);
      doc.fontSize(9).fillColor("#6b7280").text(settings.footerText, 48, doc.y, { align: "center", width: 500 });
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
      out.on("finish", () => resolve());
      out.on("end", () => resolve());
      out.on("error", reject);
    });
  }

  // Buffer the PDF in memory (used for email attachments)
  async function renderInvoicePdfBuffer(inv: any, items: any[], settings: any): Promise<Buffer> {
    const { PassThrough } = await import("node:stream");
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
    const done = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
    await renderInvoicePdf(inv, items, settings, stream);
    return done;
  }

  app.get("/api/invoices/:id/pdf", async (req, res) => {
    try {
      const inv = await storage.getInvoice(req.params.id);
      if (!inv) return res.status(404).json({ error: "Not found" });
      if (!requireTenantAccess(req, res, inv.tenantId)) return;
      const [items, settings] = await Promise.all([
        storage.getInvoiceItems(inv.id),
        storage.getInvoiceSettings(inv.tenantId),
      ]);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${inv.invoiceNumber}.pdf"`);
      await renderInvoicePdf(inv, items, settings, res);
    } catch (e: any) {
      if (!res.headersSent) res.status(500).json({ error: e?.message ?? "Failed to generate PDF" });
    }
  });

  app.post("/api/invoices/:id/email", async (req, res) => {
    try {
      const inv = await storage.getInvoice(req.params.id);
      if (!inv) return res.status(404).json({ error: "Not found" });
      if (!requireTenantAccess(req, res, inv.tenantId)) return;
      const settings = await storage.getInvoiceSettings(inv.tenantId);
      const to = String(req.body?.to ?? "").trim();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ error: "A valid recipient email is required" });
      }
      const subject = String(req.body?.subject ?? `Invoice ${inv.invoiceNumber} from ${settings?.companyName ?? "your agency"}`);
      const currency = settings?.currency ?? inv.currency ?? "USD";
      const fmt = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
      const balance = Math.max(0, (inv.total ?? 0) - (inv.paidAmount ?? 0));
      const defaultBody =
        `Hi ${inv.customerName ?? "there"},\n\n` +
        `Please find your invoice ${inv.invoiceNumber} attached.\n\n` +
        `Total: ${fmt(inv.total ?? 0)}\n` +
        `Balance due: ${fmt(balance)}\n\n` +
        `${settings?.paymentTerms ? `Payment terms: ${settings.paymentTerms}\n\n` : ""}` +
        `Thank you,\n${settings?.companyName ?? "Your agency"}`;
      const body = String(req.body?.body ?? defaultBody);

      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const fromAddress = process.env.RESEND_FROM ?? settings?.companyEmail ?? "onboarding@resend.dev";
        try {
          const items = await storage.getInvoiceItems(inv.id);
          const pdfBuf = await renderInvoicePdfBuffer(inv, items, settings);
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [to],
              subject,
              text: body,
              attachments: [
                {
                  filename: `${inv.invoiceNumber}.pdf`,
                  content: pdfBuf.toString("base64"),
                },
              ],
            }),
          });
          if (resp.ok) {
            return res.json({ ok: true, sent: true, to, attached: true });
          }
          // fall through to fallback
        } catch {
          // fall through to fallback
        }
      }

      // Fallback: hand the agency a mailto: link they can open in their email client.
      // The dialog UI auto-opens this link and informs the user that email sending
      // isn't configured, so the "PDF attachment" expectation is met by the user's
      // own client (we still surface the PDF download URL for convenience).
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      res.json({
        ok: true,
        sent: false,
        fallback: {
          mailto,
          pdfUrl: `/api/invoices/${inv.id}/pdf`,
          message: "Email sending isn't configured. Open this in your email client and attach the PDF download.",
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to send invoice" });
    }
  });

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
