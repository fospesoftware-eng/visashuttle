import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { runVisaCheck, runDeepCheck, scanPassportImage, isPassportScanConfigured } from "../ai";
import { registerApiPlatformRoutes } from "./api-platform";
import { registerPlatformExtensions } from "./platform-extensions";
import express from "express";
import { sendOtp, verifyOtp, getSmsProviderStatus } from "../sms";
import { getEntryRequirement } from "../shared/visa-free";
import indiaVisaChanceDataset from "../shared/india_visa_chance_dataset_non_visa_free_2026.json" assert { type: "json" };
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { randomUUID, randomBytes } from "crypto";

type DocumentRequirement = {
  type: string;
  name: string;
  description: string;
  required: boolean;
};

function sanitizeProposalDraftPayload(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const draft = raw as Record<string, unknown>;
  const documents = Array.isArray(draft.documents) ? draft.documents.slice(0, 30) : [];
  for (const item of documents) {
    if (!item || typeof item !== "object") continue;
    const fileUrl = (item as any).fileUrl;
    if (typeof fileUrl === "string" && fileUrl.startsWith("data:") && fileUrl.length > 11 * 1024 * 1024) {
      throw new Error("One of the draft uploads is too large. Please upload files under 8 MB.");
    }
  }
  return {
    form: draft.form && typeof draft.form === "object" && !Array.isArray(draft.form) ? draft.form : {},
    documents,
    passportFileName: typeof draft.passportFileName === "string" ? draft.passportFileName.slice(0, 240) : "",
    paymentChoice: ["online", "offline", "later"].includes(String(draft.paymentChoice)) ? draft.paymentChoice : "later",
    offlinePaymentReference: typeof draft.offlinePaymentReference === "string" ? draft.offlinePaymentReference.slice(0, 500) : "",
  };
}

// ── Rate limiters ─────────────────────────────────────────────────────────
// Brute-force defence on credential endpoints. Limits are per-IP and reset
// each window. They're intentionally permissive enough not to break a real
// user fat-fingering their password, but tight enough to stop a credential-
// stuffing script in its tracks. We disable the X-RateLimit-* legacy
// headers and emit only RFC-standard `RateLimit-*` headers.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts / IP / window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});
// OTP request: stricter so we don't burn through SMS quota or spam customers.
const otpRequestRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait a few minutes before trying again." },
});
// OTP verify: more attempts allowed than request (typos), still capped.
const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please request a new code." },
});
// Site-wide password gate: low-entropy single secret, so be aggressive.
const siteAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
import type { Proposal, InsertAppointment } from "@workspace/db";
import { VISA_STAGES, VISA_PROCESSING_STATUSES, SUBMISSION_METHODS, APPOINTMENT_TYPES, APPOINTMENT_STATUSES, PAYMENT_METHODS, PASSPORT_RELATIONSHIPS, insertPassportSchema, type InsertPassport } from "@workspace/db";
import { VISA_TYPES } from "../shared/destinations";
import { isValidVisaTypeForCountry, getCountryVisaTypes } from "../shared/visa-catalog";
import { z } from "zod";
// ExcelJS is lazy-loaded inside the GSTR export handler to avoid adding
// its large module footprint to the startup bundle.
import {
  insertFeeTemplateSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertInvoiceSettingsSchema,
  insertPaymentSchema,
  type InsertCustomerAccount,
  AGENCY_PERMISSIONS,
} from "@workspace/db";

// Strip everything that isn't a digit. Used to build the deterministic
// placeholder email for phone-only customer accounts.
function normalizePhoneDigits(input: string): string {
  return input.replace(/[^\d]/g, "");
}

// Send a staff-invitation email containing the agency dashboard URL + the
// freshly generated temporary password. We use Resend when RESEND_API_KEY is
// configured (same provider as the invoice emailer) and fall back to a
// "not sent — show the password to the agent" response otherwise so the owner
// can still hand the credentials to the new member out-of-band.
async function sendStaffInviteEmail(opts: {
  to: string;
  name: string;
  tenantName: string;
  tempPassword: string;
  loginUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  const fromAddress = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  const subject = `You've been added to ${opts.tenantName} on VisaShuttle`;
  const text =
    `Hi ${opts.name},\n\n` +
    `${opts.tenantName} has added you as a team member on VisaShuttle.\n\n` +
    `Sign in at: ${opts.loginUrl}\n` +
    `Email:    ${opts.to}\n` +
    `Password: ${opts.tempPassword}\n\n` +
    `For your security, please change your password after the first login.\n\n` +
    `— VisaShuttle`;
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress, to: [opts.to], subject, text }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.warn("[staff-invite] Resend rejected:", resp.status, detail.slice(0, 200));
      return { ok: false, error: `Resend HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[staff-invite] Resend network error:", err);
    return { ok: false, error: "Network error contacting email provider" };
  }
}

// Resolve the team member who should own a new lead/case. Falls back to the
// currently signed-in user when the client doesn't specify one. Always
// validates that the resolved user belongs to the tenant — assigning a lead
// or case to a user from a different agency is never allowed. Returns the
// assignee userId or `null` when no valid assignee can be determined (caller
// is unauthenticated AND no explicit valid assignee was passed).
async function resolveTenantAssignee(
  req: Request,
  tenantId: string,
  candidate: unknown,
): Promise<string | null> {
  const TEAM_ROLES = ["agency_owner", "agency_manager", "agency_staff"];
  const candidateId = typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
  // 1) Try the explicit candidate first.
  if (candidateId) {
    const user = await storage.getUser(candidateId);
    if (user && user.tenantId === tenantId && TEAM_ROLES.includes(user.role)) {
      return user.id;
    }
  }
  // 2) Fall back to the signed-in user — but only when they actually belong
  //    to this tenant AND hold a team-member role. Customers signed into the
  //    same tenant are NOT allowed to own a lead/case, so we always reload the
  //    user from storage and check their role; never trust the session alone.
  const sessionUserId = req.session?.userId;
  if (sessionUserId) {
    const me = await storage.getUser(sessionUserId);
    if (me && me.tenantId === tenantId && TEAM_ROLES.includes(me.role)) {
      return me.id;
    }
  }
  return null;
}

// Guard for the tenant-staff management endpoints. Confirms the caller is
// signed into THIS tenant AND holds an owner/manager role (or is a saas_admin
// acting on any tenant). Prevents cross-tenant reads/writes and stops a
// regular staff member from inviting/editing/removing colleagues. On failure
// it sends the response and returns null; otherwise it returns the loaded
// caller user.
async function requireTenantStaffAdmin(
  req: Request,
  res: Response,
  tenantId: string,
): Promise<{ id: string; role: string; tenantId: string | null } | null> {
  const callerId = req.session?.userId;
  if (!callerId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const caller = await storage.getUser(callerId);
  if (!caller) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  // saas_admin can manage any tenant's staff (used by the platform team).
  if (caller.role === "saas_admin") return caller;
  if (caller.tenantId !== tenantId) {
    res.status(403).json({ error: "You don't have access to this agency" });
    return null;
  }
  if (!["agency_owner", "agency_manager"].includes(caller.role)) {
    res.status(403).json({ error: "Only an agency owner or manager can manage team members" });
    return null;
  }
  return caller;
}

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
// Demo OTP is a developer convenience. In production, the demo bypass MUST be
// disabled so customers go through the real SMS provider. Setting this to null
// in prod makes the `if (DEMO_B2C_OTP)` branches in b2c/otp/{send,verify} fall
// through to the real provider.
const DEMO_B2C_OTP = process.env.NODE_ENV === "production" ? null : "1234";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "•".repeat(key.length - 8) + key.slice(-4);
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return `${proto || req.protocol}://${req.get("host")}`;
}

// Accepts either the global platform Cashfree config or a per-tenant config
// — both share the same {mode, apiVersion, testClientId, testClientSecret,
// liveClientId, liveClientSecret} surface, so we narrow on those fields only.
type CashfreeConfigShape = {
  mode?: string | null;
  apiVersion?: string | null;
  testClientId?: string | null;
  testClientSecret?: string | null;
  liveClientId?: string | null;
  liveClientSecret?: string | null;
};
function getCashfreeCredentials(cfg: CashfreeConfigShape | undefined): {
  mode: "live" | "test";
  baseUrl: string;
  apiVersion: string;
  clientId?: string;
  clientSecret?: string;
} {
  const mode: "live" | "test" =
    cfg?.mode === "live" || process.env.CASHFREE_MODE === "live" ? "live" : "test";
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

// Stripe credentials are split test/live just like Cashfree but with a
// different naming convention (publishable + secret keys).
type StripeConfigShape = {
  stripeMode?: string | null;
  stripeTestPublishableKey?: string | null;
  stripeTestSecretKey?: string | null;
  stripeLivePublishableKey?: string | null;
  stripeLiveSecretKey?: string | null;
};
function getStripeCredentials(cfg: StripeConfigShape | undefined): {
  mode: "live" | "test";
  publishableKey?: string;
  secretKey?: string;
} {
  const mode: "live" | "test" =
    cfg?.stripeMode === "live" || process.env.STRIPE_MODE === "live" ? "live" : "test";
  const publishableKey = mode === "live"
    ? cfg?.stripeLivePublishableKey || process.env.STRIPE_LIVE_PUBLISHABLE_KEY
    : cfg?.stripeTestPublishableKey || process.env.STRIPE_TEST_PUBLISHABLE_KEY;
  const secretKey = mode === "live"
    ? cfg?.stripeLiveSecretKey || process.env.STRIPE_LIVE_SECRET_KEY
    : cfg?.stripeTestSecretKey || process.env.STRIPE_TEST_SECRET_KEY;
  return { mode, publishableKey: publishableKey?.trim(), secretKey: secretKey?.trim() };
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

async function readCashfreeBody(response: globalThis.Response) {
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

// Roles that may use the platform admin console. `saas_admin` is the super
// role; the others are granular sub-roles introduced for the admin team.
const PLATFORM_ROLES_SET = new Set([
  "saas_admin", "platform_readonly", "platform_finance", "platform_support",
]);

// Middleware to require an admin role. GETs are accessible to ALL platform
// roles (including read-only). Writes (POST/PATCH/DELETE) are still gated to
// the super role `saas_admin` for endpoints that haven't been granularized
// yet — finance/support endpoints opt-in via `requirePlatformRole` in
// platform-extensions.ts.
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const role = req.session?.userRole ?? "";
  if (!req.session?.userId || !PLATFORM_ROLES_SET.has(role)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  if (req.method !== "GET" && role !== "saas_admin") {
    return res.status(403).json({ error: "Super-admin access required for this action" });
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
// Visa types used by the synthetic "live activity" feed generator. We keep
// this scoped to a small, broadly-recognisable subset of the master list in
// `shared/destinations.ts` so the feed reads naturally.
const LIVE_VISA_TYPES = VISA_TYPES.filter(t => [
  "Tourist Visa", "Visit Visa", "Work Visa", "Student Visa", "Business Visa",
].includes(t));
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
  // Health check — must be first so deployment probes always get a 200
  app.get("/api/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Seed demo B2C users into PostgreSQL on startup. Fire-and-forget — we
  // never want a slow/cold DB connection to delay the server opening its
  // listening port (the deploy infra port-probe times out at 60s).
  void Promise.resolve((storage as any).seedDemoUsersToDb?.()).catch((err) => {
    // Use console here because the request-scoped logger isn't available at boot.
    // eslint-disable-next-line no-console
    console.error("[Boot] seedDemoUsersToDb failed:", err);
  });

  // === Site Password Protection ===
  app.post("/api/site-auth/verify", siteAuthRateLimiter, (req, res) => {
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
  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // Bcrypt hashes always start with `$2`. Anything else is a legacy
    // plaintext seed from the demo data — accept it on first login, then
    // rehash transparently so the next login uses bcrypt.
    let valid = false;
    const looksHashed = typeof user.password === "string" && user.password.startsWith("$2");
    if (looksHashed) {
      try {
        valid = await bcrypt.compare(password, user.password);
      } catch {
        valid = false;
      }
    } else {
      valid = user.password === password;
      if (valid) {
        try {
          const fresh = await bcrypt.hash(password, 10);
          await storage.updateUser(user.id, { password: fresh });
        } catch {
          // Non-fatal: a failed rehash shouldn't block sign-in.
        }
      }
    }
    if (!valid) {
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
  
  // Get tenant by slug (for white-label pages). Public by design — the
  // white-label login page renders before sign-in. Returns ONLY branding-safe
  // fields; never echo internal config (plan/status/billing) to anonymous
  // callers, since slugs are guessable.
  app.get("/api/w/:slug/tenant", async (req, res) => {
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }
    res.json({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl ?? null,
      primaryColor: tenant.primaryColor ?? null,
      secondaryColor: tenant.secondaryColor ?? null,
      accentColor: tenant.accentColor ?? null,
      contactEmail: tenant.contactEmail ?? null,
      contactPhone: tenant.contactPhone ?? null,
      whatsappNumber: tenant.whatsappNumber ?? null,
      showPoweredBy: tenant.showPoweredBy ?? true,
    });
  });

  // Request OTP — accepts either `email` or `phone` (one is required).
  // The white-label customer portal lets the customer pick which identifier
  // they want to receive the code on, so this endpoint serves both flows.
  app.post("/api/w/:slug/auth/request-otp", otpRequestRateLimiter, async (req, res) => {
    const { email, phone, name } = req.body ?? {};

    const emailNorm = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    const phoneNorm = typeof phone === "string" && phone.trim() ? phone.trim() : null;

    if (!emailNorm && !phoneNorm) {
      return res.status(400).json({ error: "Email or phone number is required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const method = emailNorm ? "email" : "phone";
    const identifier = (emailNorm ?? phoneNorm)!;

    await storage.createOTPCode({
      email: emailNorm,
      phone: phoneNorm,
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
      entityId: identifier,
      details: { method, email: emailNorm, phone: phoneNorm }
    });

    // Dev-only convenience: surface the code in server logs so a developer can
    // copy it without wiring SMS/email. NEVER log OTPs in production — that
    // would defeat the entire point of out-of-band verification.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP] Code for ${method}:${identifier} at ${tenant.slug}: ${code}`);
    }

    res.json({ message: "OTP sent successfully", method, email: emailNorm, phone: phoneNorm });
  });

  // Verify OTP — same shape as request-otp: caller passes whichever identifier
  // they used, plus the 6-digit code.
  app.post("/api/w/:slug/auth/verify-otp", otpVerifyRateLimiter, async (req, res) => {
    const { email, code, name, phone } = req.body ?? {};

    const emailNorm = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
    const phoneNorm = typeof phone === "string" && phone.trim() ? phone.trim() : null;

    if (!emailNorm && !phoneNorm) {
      return res.status(400).json({ error: "Email or phone number is required" });
    }
    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Agency not found" });
    }

    // Demo OTP code for testing - only enabled in development mode
    const isDemoCode = process.env.NODE_ENV !== "production" && code === "123456";

    const otp = emailNorm
      ? await storage.getActiveOTPCode(emailNorm, tenant.id)
      : await storage.getActiveOTPCodeByPhone(phoneNorm!, tenant.id);

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

    // Get or create customer account. We look up by BOTH identifiers when
    // available (email first, then phone) so a returning customer who first
    // signed in phone-only and is now signing in with email+phone is found
    // and updated rather than creating a duplicate placeholder account.
    let customerAccount = emailNorm ? await storage.getCustomerAccountByEmail(emailNorm) : undefined;
    if (!customerAccount && phoneNorm) {
      customerAccount = await storage.getCustomerAccountByPhone(phoneNorm);
    }

    if (!customerAccount) {
      // Phone-only sign-ins synthesize a placeholder email so the existing
      // email column (NOT NULL on customer_accounts) stays satisfied. The
      // placeholder is never surfaced in the UI; it's a database sentinel.
      const placeholderEmail = emailNorm ?? `phone+${normalizePhoneDigits(phoneNorm!)}@whitelabel.local`;
      customerAccount = await storage.createCustomerAccount({
        email: placeholderEmail,
        phone: phoneNorm || null,
        name: name || null,
        avatarUrl: null,
        isVerified: true
      });
    } else {
      const patch: Partial<InsertCustomerAccount> = {};
      if (!customerAccount.isVerified) patch.isVerified = true;
      // Backfill missing identifier when the customer signed in with the OTHER
      // method on a later visit (e.g. email-first user now adding their phone).
      if (phoneNorm && !customerAccount.phone) patch.phone = phoneNorm;
      // Upgrade a placeholder email to a real one if the customer now provides
      // it. We never overwrite a real email with another real email here —
      // that's an account-merge scenario the agent should handle manually.
      if (emailNorm && customerAccount.email.endsWith("@whitelabel.local")) {
        patch.email = emailNorm;
      }
      if (Object.keys(patch).length > 0) {
        await storage.updateCustomerAccount(customerAccount.id, patch);
      }
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
  // Platform-level: SaaS admin only (lists every tenant on the platform).
  app.get("/api/tenants", requireAdminAuth, async (req, res) => {
    const tenants = await storage.getAllTenants();
    res.json(tenants);
  });

  // Platform-level: tenant creation is reserved for SaaS admin. The agency
  // self-signup flow lives at /api/agency-register which has its own validation.
  app.post("/api/tenants", requireAdminAuth, async (req, res) => {
    const tenant = await storage.createTenant(req.body);
    res.status(201).json(tenant);
  });

  app.get("/api/tenants/:id", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.id)) return;
    const tenant = await storage.getTenant(req.params.id);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // Full tenant row mutation (plan, status, billing, etc.) is platform-only.
  // Agency owners use PATCH /api/tenants/:id/branding for the fields they own.
  app.patch("/api/tenants/:id", requireAdminAuth, async (req, res) => {
    const tenant = await storage.updateTenant(req.params.id, req.body);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  });

  // Public by design — used by the white-label login page (`/w/:slug/login`)
  // which renders BEFORE the customer is signed in. Returns only branding-safe
  // fields so internal config can't leak via slug enumeration.
  app.get("/api/tenants/by-slug/:slug", async (req, res) => {
    const tenant = await storage.getTenantBySlug(req.params.slug);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    // Whitelist: never echo internal config (plan, status, billing flags).
    res.json({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl ?? null,
      primaryColor: tenant.primaryColor ?? null,
      secondaryColor: tenant.secondaryColor ?? null,
      accentColor: tenant.accentColor ?? null,
      contactEmail: tenant.contactEmail ?? null,
      contactPhone: tenant.contactPhone ?? null,
      whatsappNumber: tenant.whatsappNumber ?? null,
      showPoweredBy: tenant.showPoweredBy ?? true,
    });
  });

  // Update tenant branding (agency owner/manager of that tenant or saas_admin).
  // Excludes regular agency_staff because branding affects every customer-facing
  // surface for the agency.
  app.patch("/api/tenants/:id/branding", async (req, res) => {
    const caller = await requireTenantStaffAdmin(req, res, req.params.id);
    if (!caller) return;
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
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const leads = await storage.getLeadsByTenantId(req.params.tenantId);
    res.json(leads);
  });

  app.post("/api/tenants/:tenantId/leads", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const tenantId = req.params.tenantId;
    // Plan limit enforcement
    const tenantForLeads = await storage.getTenant(tenantId);
    if (tenantForLeads) {
      const planLeadLimits: Record<string, number> = { starter: 50, professional: 500, enterprise: 9999 };
      const leadLimit = planLeadLimits[tenantForLeads.plan ?? "starter"] ?? 50;
      const existingLeads = await storage.getLeadsByTenantId(tenantId);
      if (existingLeads.length >= leadLimit) {
        return res.status(403).json({ error: `Lead limit reached for your ${tenantForLeads.plan} plan (${leadLimit}). Please upgrade.` });
      }
    }
    // Resolve assignee: client may pass one explicitly; otherwise default to
    // the currently signed-in user. Either way we must validate the assignee
    // belongs to this tenant — leads cannot be assigned to a foreign user.
    const assignedTo = await resolveTenantAssignee(req, tenantId, req.body?.assignedTo);
    if (!assignedTo) {
      return res.status(400).json({ error: "A team member must be assigned to this lead." });
    }
    // Defense-in-depth: if BOTH country + visa type are provided, they must
    // agree per the shared catalog (e.g. no "Schengen Visa" for Algeria).
    // Leads can be created with neither (just a name + contact), so we only
    // validate when the user supplied both.
    const leadCountry = typeof req.body?.destinationCountry === "string" ? req.body.destinationCountry.trim() : "";
    const leadVisaType = typeof req.body?.visaType === "string" ? req.body.visaType.trim() : "";
    if (leadCountry && leadVisaType && !isValidVisaTypeForCountry(leadCountry, leadVisaType)) {
      const allowed = getCountryVisaTypes(leadCountry).slice(0, 6).join(", ");
      return res.status(400).json({
        error: `"${leadVisaType}" is not a recognised visa type for ${leadCountry}. Try one of: ${allowed}…`,
      });
    }
    const lead = await storage.createLead({
      ...req.body,
      assignedTo,
      tenantId,
    });
    res.status(201).json(lead);
  });

  app.get("/api/leads/:id", async (req, res) => {
    const lead = await storage.getLead(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    if (!requireTenantAccess(req, res, lead.tenantId)) return;
    res.json(lead);
  });

  app.patch("/api/leads/:id", async (req, res) => {
    const current = await storage.getLead(req.params.id);
    if (!current) return res.status(404).json({ error: "Lead not found" });
    if (!requireTenantAccess(req, res, current.tenantId)) return;
    // If the patch touches either field, validate the EFFECTIVE pair (merge
    // patch over current row) so partial updates can't sneak through with
    // a stale country or visa type. Empty-string is treated as a clear.
    const touchesCountry = req.body && typeof req.body === "object" && "destinationCountry" in req.body;
    const touchesVisaType = req.body && typeof req.body === "object" && "visaType" in req.body;
    if (touchesCountry || touchesVisaType) {
      const effectiveCountry = (touchesCountry ? req.body.destinationCountry : current.destinationCountry) ?? "";
      const effectiveVisaType = (touchesVisaType ? req.body.visaType : current.visaType) ?? "";
      const c = String(effectiveCountry).trim();
      const v = String(effectiveVisaType).trim();
      if (c && v && !isValidVisaTypeForCountry(c, v)) {
        const allowed = getCountryVisaTypes(c).slice(0, 6).join(", ");
        return res.status(400).json({
          error: `"${v}" is not a recognised visa type for ${c}. Try one of: ${allowed}…`,
        });
      }
    }
    const lead = await storage.updateLead(req.params.id, req.body);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  });

  app.delete("/api/leads/:id", async (req, res) => {
    const existing = await storage.getLead(req.params.id);
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;
    const success = await storage.deleteLead(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.status(204).send();
  });

  // === Proposals ===
  // Tokenized intake invitations the agency sends to a prospect. The customer
  // opens a public /p/:token URL (or scans the QR), sees the document
  // checklist for the chosen visa, and submits an application that becomes a
  // regular Case under the tenant.

  // Generate an unguessable URL-safe token. 22+ chars of base64url ≈ 132 bits
  // of entropy — enough that we don't need a separate secret for these links.
  function generateProposalToken(): string {
    return randomBytes(18).toString("base64url");
  }

  // Mirror the agency staff guard: caller must be a team member of this
  // tenant (owner / manager / staff) — saas_admin bypasses. We don't reuse
  // requireTenantStaffAdmin() here because regular staff are allowed to send
  // their own proposals, not just owner/manager.
  async function requireTenantTeamMember(req: Request, res: Response, tenantId: string) {
    const callerId = req.session?.userId;
    const caller = callerId ? await storage.getUser(callerId) : null;
    if (!caller) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }
    if (caller.role === "saas_admin") return caller;
    if (caller.tenantId !== tenantId) {
      res.status(403).json({ error: "You don't have access to this agency" });
      return null;
    }
    if (!["agency_owner", "agency_manager", "agency_staff"].includes(caller.role)) {
      res.status(403).json({ error: "Only team members can manage proposals" });
      return null;
    }
    return caller;
  }

  const checklistItemSchema = z.object({
    type: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).default(""),
    required: z.boolean().default(true),
  });

  function normalizeChecklistItems(input: unknown): DocumentRequirement[] {
    const parsed = z.array(checklistItemSchema).parse(input);
    const seen = new Map<string, DocumentRequirement>();
    for (const item of parsed) {
      const type = item.type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (!type) continue;
      seen.set(type, {
        type,
        name: item.name.trim(),
        description: item.description?.trim() ?? "",
        required: !!item.required,
      });
    }
    return Array.from(seen.values());
  }

  async function getVisaTemplateChecklist(country: string, visaType: string): Promise<DocumentRequirement[] | null> {
    const templates = await storage.getAllVisaTemplates();
    const template = templates.find((t) =>
      t.isActive !== false &&
      t.country.toLowerCase() === country.toLowerCase() &&
      t.visaType.toLowerCase() === visaType.toLowerCase()
    );
    if (!template) return null;
    try {
      const items = normalizeChecklistItems(template.requirements);
      return items.length ? items : null;
    } catch {
      return null;
    }
  }

  async function getEffectiveDocumentChecklist(tenantId: string, country: string, visaType: string) {
    let override: Awaited<ReturnType<typeof storage.getTenantDocumentChecklist>> | undefined;
    try {
      override = await storage.getTenantDocumentChecklist(tenantId, country, visaType);
    } catch (error) {
      // Public proposal links must stay usable even if an older Replit DB has
      // not had the per-agency checklist table pushed yet. In that case we
      // simply fall through to the global template/default checklist.
      console.warn("[checklists] agency override unavailable; falling back", {
        tenantId,
        country,
        visaType,
        error: error instanceof Error ? error.message : String(error),
      });
      override = undefined;
    }
    if (override) {
      return {
        source: "agency" as const,
        country,
        visaType,
        checklist: normalizeChecklistItems(override.requirements),
        override,
      };
    }

    const templateChecklist = await getVisaTemplateChecklist(country, visaType);
    if (templateChecklist) {
      return {
        source: "database" as const,
        country,
        visaType,
        checklist: templateChecklist,
        override: null,
      };
    }

    return {
      source: "default" as const,
      country,
      visaType,
      checklist: [] as DocumentRequirement[],
      override: null,
    };
  }

  app.get("/api/tenants/:tenantId/proposals", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;
    const proposals = await storage.getProposalsByTenantId(tenantId);
    res.json(proposals);
  });

  app.post("/api/tenants/:tenantId/proposals", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;

    const {
      customerName, customerEmail, customerPhone,
      destinationCountry, visaType, notes, leadId,
      expiresInDays, estimateAmountCents,
    } = req.body ?? {};
    const linkedLead = leadId ? await storage.getLead(String(leadId)) : undefined;
    if (leadId && (!linkedLead || linkedLead.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Originating lead not found for this agency." });
    }
    const effectiveDestinationCountry = typeof destinationCountry === "string" && destinationCountry.trim()
      ? destinationCountry.trim()
      : linkedLead?.destinationCountry?.trim() || "";
    const effectiveVisaType = typeof visaType === "string" && visaType.trim()
      ? visaType.trim()
      : linkedLead?.visaType?.trim() || "";

    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return res.status(400).json({ error: "Customer name is required" });
    }
    if (!effectiveDestinationCountry) {
      return res.status(400).json({ error: "Destination country is required" });
    }
    if (!effectiveVisaType) {
      return res.status(400).json({ error: "Visa type is required" });
    }
    // Defense-in-depth: reject country↔visa-type mismatches that the
    // structured selectors should have prevented (e.g. "Schengen Visa" for
    // Algeria). The shared catalog is the single source of truth.
    if (!isValidVisaTypeForCountry(effectiveDestinationCountry, effectiveVisaType)) {
      const allowed = getCountryVisaTypes(effectiveDestinationCountry).slice(0, 6).join(", ");
      return res.status(400).json({
        error: `"${effectiveVisaType}" is not a recognised visa type for ${effectiveDestinationCountry}. Try one of: ${allowed}…`,
      });
    }

    // The proposal is owned by whichever team member created it; that same
    // user becomes the case's assignee when the customer applies.
    const createdBy = await resolveTenantAssignee(req, tenantId, req.body?.assignedTo);
    if (!createdBy) {
      return res.status(400).json({ error: "A team member must own this proposal." });
    }

    let expiresAt: Date | null = null;
    const days = Number(expiresInDays);
    if (Number.isFinite(days) && days > 0 && days <= 365) {
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    // Estimate amount (cents/paise). Optional. Coerce numeric input,
    // reject negatives, and ignore zero so "no estimate" stays null.
    let estCents: number | null = null;
    if (estimateAmountCents !== undefined && estimateAmountCents !== null && estimateAmountCents !== "") {
      const n = Math.round(Number(estimateAmountCents));
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: "Estimate amount must be a non-negative number." });
      }
      estCents = n > 0 ? n : null;
    }

    const proposal = await storage.createProposal({
      tenantId,
      token: generateProposalToken(),
      createdBy,
      leadId: linkedLead?.id ?? null,
      customerName: customerName.trim(),
      customerEmail: customerEmail?.trim() || null,
      customerPhone: customerPhone?.trim() || null,
      destinationCountry: effectiveDestinationCountry,
      visaType: effectiveVisaType,
      notes: notes?.trim() || null,
      estimateAmountCents: estCents,
      status: "sent",
      expiresAt,
    });
    if (linkedLead) {
      await storage.updateLead(linkedLead.id, {
        stage: "proposal",
        destinationCountry: effectiveDestinationCountry,
        visaType: effectiveVisaType,
      });
    }

    await storage.createActivityLog({
      tenantId,
      userId: createdBy,
      action: "proposal.created",
      entityType: "proposal",
      entityId: proposal.id,
      details: { customerName: proposal.customerName, destinationCountry: effectiveDestinationCountry, visaType: effectiveVisaType, leadId: linkedLead?.id ?? null },
    });

    res.status(201).json(proposal);
  });

  app.patch("/api/tenants/:tenantId/proposals/:id", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;
    const existing = await storage.getProposal(req.params.id);
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    // Only allow safe fields. Don't let the client rewrite the token, the
    // tenant binding, or the applied-case linkage.
    const patch: Partial<Proposal> = {};
    const { status, notes, customerEmail, customerPhone, estimateAmountCents } = req.body ?? {};
    if (status !== undefined) {
      if (!["sent", "viewed", "applied", "expired", "revoked"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      patch.status = status;
    }
    if (notes !== undefined) patch.notes = notes || null;
    if (customerEmail !== undefined) patch.customerEmail = customerEmail || null;
    if (customerPhone !== undefined) patch.customerPhone = customerPhone || null;
    if (estimateAmountCents !== undefined) {
      if (estimateAmountCents === null || estimateAmountCents === "") {
        patch.estimateAmountCents = null;
      } else {
        const n = Math.round(Number(estimateAmountCents));
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ error: "Estimate amount must be a non-negative number." });
        }
        patch.estimateAmountCents = n > 0 ? n : null;
      }
    }

    const updated = await storage.updateProposal(req.params.id, patch);
    res.json(updated);
  });

  app.delete("/api/tenants/:tenantId/proposals/:id", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;
    const existing = await storage.getProposal(req.params.id);
    if (!existing || existing.tenantId !== tenantId) {
      return res.status(404).json({ error: "Proposal not found" });
    }
    await storage.deleteProposal(req.params.id);
    res.status(204).send();
  });

  app.get("/api/tenants/:tenantId/application-settings/checklists", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;

    const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
    const visaType = typeof req.query.visaType === "string" ? req.query.visaType.trim() : "";
    if (country && visaType) {
      return res.json(await getEffectiveDocumentChecklist(tenantId, country, visaType));
    }

    const overrides = await storage.getTenantDocumentChecklists(tenantId);
    res.json({ overrides });
  });

  app.put("/api/tenants/:tenantId/application-settings/checklists", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;
    if (!["saas_admin", "agency_owner", "agency_manager"].includes(caller.role)) {
      return res.status(403).json({ error: "Only an agency owner or manager can edit application settings" });
    }

    try {
      const body = z.object({
        country: z.string().trim().min(1),
        visaType: z.string().trim().min(1),
        checklist: z.array(checklistItemSchema).min(1),
      }).parse(req.body ?? {});
      const checklist = normalizeChecklistItems(body.checklist);
      const override = await storage.upsertTenantDocumentChecklist(tenantId, body.country, body.visaType, checklist);
      res.json({ source: "agency", country: body.country, visaType: body.visaType, checklist, override });
    } catch (error: any) {
      res.status(400).json({ error: error?.message ?? "Invalid checklist" });
    }
  });

  app.delete("/api/tenants/:tenantId/application-settings/checklists", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantTeamMember(req, res, tenantId);
    if (!caller) return;
    if (!["saas_admin", "agency_owner", "agency_manager"].includes(caller.role)) {
      return res.status(403).json({ error: "Only an agency owner or manager can edit application settings" });
    }

    const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
    const visaType = typeof req.query.visaType === "string" ? req.query.visaType.trim() : "";
    if (!country || !visaType) return res.status(400).json({ error: "country and visaType are required" });
    await storage.deleteTenantDocumentChecklist(tenantId, country, visaType);
    res.json(await getEffectiveDocumentChecklist(tenantId, country, visaType));
  });

  // --- Public proposal endpoints (no auth — token IS the credential) ---

  const formatProposalPublicId = (token: string) => `VS-${token}`;

  app.get("/api/proposals/lookup/:proposalId", async (req, res) => {
    const raw = String(req.params.proposalId ?? "").trim();
    const token = raw.toLowerCase().startsWith("vs-") ? raw.slice(3) : raw;
    const proposal = await storage.getProposalByToken(token);
    if (!proposal) return res.status(404).json({ error: "Proposal not found." });
    if (proposal.status === "revoked") return res.status(410).json({ error: "This proposal has been revoked." });
    if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This proposal has expired." });
    }
    res.json({
      publicId: formatProposalPublicId(proposal.token),
      url: `/p/${proposal.token}`,
      status: proposal.status,
      destinationCountry: proposal.destinationCountry,
      visaType: proposal.visaType,
    });
  });

  // Returns the proposal + minimal tenant branding so the public apply page
  // can render the right colors and logo. Marks the proposal as "viewed" on
  // the first hit so the agency can see when the customer opened the link.
  app.get("/api/proposals/:token", async (req, res) => {
    const proposal = await storage.getProposalByToken(req.params.token);
    if (!proposal) {
      return res.status(404).json({ error: "This proposal link is invalid or has been removed." });
    }
    if (proposal.status === "revoked") {
      return res.status(410).json({ error: "This proposal link has been revoked." });
    }
    if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
      // Lazily mark expired so the agency dashboard reflects state without a cron.
      if (proposal.status !== "expired") {
        await storage.updateProposal(proposal.id, { status: "expired" });
      }
      return res.status(410).json({ error: "This proposal link has expired. Please contact your agency for a new one." });
    }
    if (proposal.status === "sent") {
      await storage.updateProposal(proposal.id, { status: "viewed", viewedAt: new Date() });
    }
    const tenant = await storage.getTenant(proposal.tenantId);
    if (!tenant) return res.status(404).json({ error: "Agency not found" });

    // Surface the agency's currency so the public apply page can format the
    // estimate amount correctly (falls back to USD if no settings row yet).
    const settings = await storage.getInvoiceSettings(proposal.tenantId);
    const currency = settings?.currency || "USD";
    const gatewayConfig = await storage.getTenantPaymentGatewayConfig(proposal.tenantId).catch(() => undefined);
    const gatewayConfigured = !!(gatewayConfig?.enabled && (gatewayConfig.testClientId || gatewayConfig.liveClientId));
    const documentChecklist = await getEffectiveDocumentChecklist(
      proposal.tenantId,
      proposal.destinationCountry,
      proposal.visaType,
    );

    res.json({
      proposal: {
        id: proposal.id,
        token: proposal.token,
        publicId: formatProposalPublicId(proposal.token),
        customerName: proposal.customerName,
        customerEmail: proposal.customerEmail,
        customerPhone: proposal.customerPhone,
        destinationCountry: proposal.destinationCountry,
        visaType: proposal.visaType,
        notes: proposal.notes,
        estimateAmountCents: proposal.estimateAmountCents,
        currency,
        status: proposal.status === "sent" ? "viewed" : proposal.status,
        appliedCaseId: proposal.appliedCaseId,
        expiresAt: proposal.expiresAt,
        customerDraftData: proposal.customerDraftData ?? null,
        customerDraftSavedAt: proposal.customerDraftSavedAt ?? null,
      },
      payment: {
        amountCents: proposal.estimateAmountCents,
        currency,
        gatewayConfigured,
        bankDetails: settings?.bankDetails || null,
        upiId: settings?.upiId || null,
        upiQrFileUrl: settings?.upiQrFileUrl || null,
        paymentInstructions: settings?.paymentInstructions || null,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        accentColor: tenant.accentColor,
        contactEmail: tenant.contactEmail,
        contactPhone: tenant.contactPhone,
      },
      checklist: documentChecklist.checklist,
      checklistSource: documentChecklist.source,
    });
  });

  app.put("/api/proposals/:token/draft", async (req, res) => {
    try {
      const proposal = await storage.getProposalByToken(req.params.token);
      if (!proposal) return res.status(404).json({ error: "Invalid proposal link." });
      if (proposal.status === "revoked") return res.status(410).json({ error: "This proposal has been revoked." });
      if (proposal.appliedCaseId) return res.status(409).json({ error: "This proposal has already been submitted." });
      if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
        return res.status(410).json({ error: "This proposal has expired." });
      }
      const draft = sanitizeProposalDraftPayload(req.body?.draft);
      if (!draft) return res.status(400).json({ error: "Draft data is required." });
      const savedAt = new Date();
      const updated = await storage.updateProposal(proposal.id, {
        customerDraftData: { ...draft, savedAt: savedAt.toISOString() },
        customerDraftSavedAt: savedAt,
      } as any);
      res.json({
        success: true,
        savedAt,
        draft: updated?.customerDraftData ?? { ...draft, savedAt: savedAt.toISOString() },
      });
    } catch (err: any) {
      const message = err?.message ?? "Could not save proposal draft.";
      res.status(message.includes("too large") ? 413 : 500).json({ error: message });
    }
  });

  app.post("/api/proposals/:token/passport/scan", async (req, res) => {
    const proposal = await storage.getProposalByToken(req.params.token);
    if (!proposal) return res.status(404).json({ error: "Invalid proposal link." });
    if (proposal.status === "revoked") return res.status(410).json({ error: "This proposal has been revoked." });
    if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This proposal has expired." });
    }

    const { imageBase64, mimeType } = req.body ?? {};
    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      return res.status(400).json({ error: "imageBase64 is required" });
    }
    if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
      return res.status(400).json({ error: "mimeType must be an image/* type" });
    }

    const cleaned = imageBase64.includes(",") ? imageBase64.split(",").pop()! : imageBase64;
    if (cleaned.length > 11 * 1024 * 1024) {
      return res.status(413).json({ error: "Passport image is too large. Please upload an image under 8 MB." });
    }

    const aiConfig = await storage.getPlatformAiConfig();
    if (!isPassportScanConfigured(aiConfig)) {
      return res.status(503).json({
        error: "Passport auto-scan is not configured. Please enter passport details manually.",
        code: "ai_not_configured",
      });
    }

    try {
      const result = await scanPassportImage(cleaned, mimeType, aiConfig);
      res.json(result);
    } catch (err: any) {
      console.error("[proposal-passport-scan] failed:", err?.message ?? err);
      res.status(502).json({ error: "Passport scan failed. Please try again, or enter the details manually." });
    }
  });

  // Public apply: customer submits the form on the proposal page. Creates a
  // Case under the tenant, owned by the proposal's createdBy team member.
  // Per-token in-flight guard so a double-clicked submit can't create two
  // cases for the same proposal before the DB write of `appliedCaseId` lands.
  // (MemStorage is single-process; for a real DB this would be a SELECT FOR
  //  UPDATE or a unique-constraint upsert.)
  const proposalApplyInFlight = new Set<string>();

  app.post("/api/proposals/:token/apply", async (req, res) => {
    const proposal = await storage.getProposalByToken(req.params.token);
    if (!proposal) {
      return res.status(404).json({ error: "Invalid proposal link." });
    }
    if (proposal.status === "revoked") {
      return res.status(410).json({ error: "This proposal has been revoked." });
    }
    if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This proposal has expired." });
    }
    if (proposal.appliedCaseId) {
      return res.status(409).json({ error: "An application has already been submitted for this proposal." });
    }
    if (proposalApplyInFlight.has(proposal.id)) {
      return res.status(409).json({ error: "An application is already being submitted for this proposal. Please wait." });
    }

    const {
      applicantName, applicantDob, email, phone,
      passportNumber, passportNationality, passportSurname, passportGivenName,
      passportMiddleName, passportGender, passportDateOfIssue, passportDateOfExpiry,
      passportPlaceOfIssue, passportPlaceOfBirth, passportFileUrl,
      travelDate, notes, documents,
    } = req.body ?? {};

    if (!applicantName || typeof applicantName !== "string" || !applicantName.trim()) {
      return res.status(400).json({ error: "Applicant name is required" });
    }

    // Same date validation the authenticated /api/tenants/:tenantId/cases
    // route enforces — clients submitting via a token aren't a privileged
    // path, so they shouldn't get to bypass these checks.
    const dateError = validateCaseDates({ travelDate, applicantDob });
    if (dateError) return res.status(400).json({ error: dateError });
    const expiryText = typeof passportDateOfExpiry === "string" ? passportDateOfExpiry.trim() : "";
    if (expiryText) {
      const expiry = new Date(expiryText);
      if (!isNaN(expiry.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiry < today) {
          return res.status(400).json({ error: "Expired passports are not eligible. Please upload a valid current passport." });
        }
      }
    }
    if (Array.isArray(documents)) {
      for (const raw of documents.slice(0, 30)) {
        if (!raw || typeof raw !== "object") continue;
        const d = raw as any;
        const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 160) : "Uploaded document";
        const fileUrl = typeof d.fileUrl === "string" && d.fileUrl.startsWith("data:") ? d.fileUrl : null;
        if (fileUrl && fileUrl.length > 11 * 1024 * 1024) {
          return res.status(413).json({ error: `${name} is too large. Please upload files under 8 MB.` });
        }
      }
    }

    // Legacy proposals created before the country↔visa-type catalog was
    // tightened could still hold an invalid pair (e.g. "Schengen Visa"
    // for Algeria). Don't mint a new case from a bad proposal — the
    // agency must fix the proposal first. Empty-string fallback is
    // safe because empty fields are caught by the create-time validators.
    const propCountry = (proposal.destinationCountry ?? "").trim();
    const propVisaType = (proposal.visaType ?? "").trim();
    if (propCountry && propVisaType && !isValidVisaTypeForCountry(propCountry, propVisaType)) {
      return res.status(409).json({
        error: `This proposal lists "${propVisaType}" for ${propCountry}, which is no longer a recognised pair. Please ask the agency to update it before applying.`,
      });
    }

    // Same monthly plan limit as the regular case-create route — the agency
    // can't bypass their plan by funnelling cases through proposal links.
    const tenant = await storage.getTenant(proposal.tenantId);
    if (tenant) {
      const planCaseLimits: Record<string, number> = { starter: 30, professional: 200, enterprise: 9999 };
      const caseLimit = planCaseLimits[tenant.plan ?? "starter"] ?? 30;
      const allCases = await storage.getCasesByTenantId(tenant.id);
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const casesThisMonth = allCases.filter(c => c.createdAt && new Date(c.createdAt) >= startOfMonth).length;
      if (casesThisMonth >= caseLimit) {
        return res.status(403).json({ error: "This agency has reached its monthly application limit. Please contact them directly." });
      }
    }

    proposalApplyInFlight.add(proposal.id);
    try {
    // Re-read the proposal inside the lock to defend against a concurrent
    // request that already finished the apply between our pre-check above
    // and acquiring the lock.
    const fresh = await storage.getProposal(proposal.id);
    if (fresh?.appliedCaseId) {
      return res.status(409).json({ error: "An application has already been submitted for this proposal." });
    }

    const caseCount = (await storage.getCasesByTenantId(proposal.tenantId)).length + 1;
    const caseNumber = `CASE-${String(caseCount).padStart(5, "0")}`;
    let travelDateObj: Date | null = null;
    if (travelDate) {
      const t = new Date(travelDate);
      if (!isNaN(t.getTime())) travelDateObj = t;
    }

    const newCase = await storage.createCase({
      tenantId: proposal.tenantId,
      customerId: null,
      customerAccountId: null,
      caseNumber,
      referenceId: generateReferenceId(),
      applicantName: applicantName.trim(),
      applicantDob: applicantDob || null,
      passportSurname: passportSurname?.trim() || null,
      passportGivenName: passportGivenName?.trim() || null,
      passportMiddleName: passportMiddleName?.trim() || null,
      passportNumber: passportNumber?.trim() || null,
      passportNationality: passportNationality?.trim() || null,
      passportGender: passportGender || null,
      passportDateOfIssue: passportDateOfIssue || null,
      passportDateOfExpiry: passportDateOfExpiry || null,
      passportPlaceOfIssue: passportPlaceOfIssue?.trim() || null,
      passportPlaceOfBirth: passportPlaceOfBirth?.trim() || null,
      passportFileUrl: typeof passportFileUrl === "string" && passportFileUrl.startsWith("data:") ? passportFileUrl : null,
      visaType: proposal.visaType,
      destinationCountry: proposal.destinationCountry,
      status: "pending",
      priority: "normal",
      assignedTo: proposal.createdBy,
      travelDate: travelDateObj,
      notes: notes?.trim() || null,
      readinessScore: 0,
    });
    if (Array.isArray(documents)) {
      for (const raw of documents.slice(0, 30)) {
        if (!raw || typeof raw !== "object") continue;
        const d = raw as any;
        const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 160) : "Uploaded document";
        const type = typeof d.type === "string" && d.type.trim() ? d.type.trim().slice(0, 80) : "other";
        const fileUrl = typeof d.fileUrl === "string" && d.fileUrl.startsWith("data:") ? d.fileUrl : null;
        if (!fileUrl) continue;
        await storage.createDocument({
          caseId: newCase.id,
          tenantId: proposal.tenantId,
          name,
          type,
          fileUrl,
          status: "pending",
          qualityScore: null,
          extractedData: d.extractedData ?? null,
          notes: typeof d.notes === "string" ? d.notes.slice(0, 500) : null,
        });
      }
    }
    if (proposal.leadId) {
      await storage.updateLead(proposal.leadId, {
        stage: "won",
        destinationCountry: proposal.destinationCountry,
        visaType: proposal.visaType,
      });
    }

    const preSubmissionInvoices = await storage.getInvoicesByTenantId(proposal.tenantId);
    for (const invoice of preSubmissionInvoices) {
      if (!invoice.caseId && invoice.notes?.startsWith(`Estimate from proposal ${proposal.token}`)) {
        await storage.updateInvoice(invoice.id, { caseId: newCase.id } as any);
      }
    }

    await storage.updateProposal(proposal.id, {
      status: "applied",
      appliedCaseId: newCase.id,
      appliedAt: new Date(),
      customerDraftData: null,
      customerDraftSavedAt: null,
      // If the customer corrected their email/phone on the form, save it back
      // on the proposal so the agency sees what the customer actually entered.
      customerEmail: email?.trim() || proposal.customerEmail,
      customerPhone: phone?.trim() || proposal.customerPhone,
    });

    await storage.createActivityLog({
      tenantId: proposal.tenantId,
      userId: proposal.createdBy,
      action: "proposal.applied",
      entityType: "case",
      entityId: newCase.id,
      details: {
        proposalId: proposal.id,
        applicantName,
        destinationCountry: proposal.destinationCountry,
        visaType: proposal.visaType,
      },
    });

    res.status(201).json({
      success: true,
      referenceId: newCase.referenceId,
      caseNumber: newCase.caseNumber,
      tenantSlug: tenant?.slug ?? null,
    });
    } finally {
      proposalApplyInFlight.delete(proposal.id);
    }
  });

  // Per-proposal in-flight guard for payment initiation. Stops two near-
  // simultaneous "Pay estimate" clicks from racing past the read-then-create
  // window in `getInvoicesByCaseId` → `createInvoice` and minting two
  // duplicate draft invoices for the same proposal/case.
  // (MemStorage is single-process; for a real DB this would be a DB-level
  //  unique index on (caseId, notes) or a SELECT FOR UPDATE.)
  const proposalPaymentInFlight = new Set<string>();

  // POST /api/public/proposal/:token/initiate-payment — customer-facing
  // "Pay estimate" CTA on the proposal-apply success screen. Requires the
  // proposal to carry an estimateAmountCents > 0. If the customer starts
  // payment before final submission, the invoice is created without a case
  // and linked to the case when /apply succeeds.
  // Idempotent: re-calling returns the same unpaid invoice's public URL
  // instead of stacking duplicates.
  app.post("/api/public/proposal/:token/initiate-payment", async (req, res) => {
    const proposal = await storage.getProposalByToken(req.params.token);
    if (!proposal) return res.status(404).json({ error: "Invalid proposal link." });

    // Mirror the lifecycle gates on the other public proposal endpoints —
    // a revoked or expired proposal shouldn't be able to spawn fresh
    // payment links even after the customer has already applied.
    if (proposal.status === "revoked") {
      return res.status(410).json({ error: "This proposal has been revoked." });
    }
    if (proposal.expiresAt && proposal.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This proposal has expired." });
    }
    if (!proposal.estimateAmountCents || proposal.estimateAmountCents <= 0) {
      return res.status(400).json({ error: "This proposal has no estimate amount to collect." });
    }
    if (proposalPaymentInFlight.has(proposal.id)) {
      return res.status(409).json({ error: "Your payment link is being prepared. Please try again in a moment." });
    }
    proposalPaymentInFlight.add(proposal.id);

    try {
      const tenantId = proposal.tenantId;
      const settings = await storage.getInvoiceSettings(tenantId);
      const currency = settings?.currency || "USD";
      const prefix = settings?.invoicePrefix ?? "INV";
      const origin = getRequestOrigin(req);

      // Idempotency: reuse an outstanding estimate-invoice for this same
      // proposal/case if one already exists. We *only* match collectible
      // statuses — a paid/cancelled invoice from a prior attempt should
      // never be re-served as a payment link.
      const REUSABLE_STATUSES = new Set(["draft", "sent", "partial", "overdue"]);
      const allTenantInvoices = await storage.getInvoicesByTenantId(tenantId);
      const existingInvoices = proposal.appliedCaseId
        ? await storage.getInvoicesByCaseId(proposal.appliedCaseId)
        : allTenantInvoices.filter((inv) => !inv.caseId);
      let invoice = existingInvoices.find(
        (inv) =>
          inv.notes?.startsWith(`Estimate from proposal ${proposal.token}`) &&
          inv.total === proposal.estimateAmountCents &&
          REUSABLE_STATUSES.has(inv.status),
      );

      // If a paid invoice exists for this exact estimate, surface that
      // explicitly instead of silently minting a duplicate the customer
      // would pay twice.
      if (!invoice) {
        const alreadyPaid = existingInvoices.find(
          (inv) =>
            inv.notes?.startsWith(`Estimate from proposal ${proposal.token}`) &&
            inv.total === proposal.estimateAmountCents &&
            inv.status === "paid",
        );
        if (alreadyPaid) {
          return res.status(409).json({ error: "This estimate has already been paid. Thank you!" });
        }
      }

      if (!invoice) {
        const year = new Date().getFullYear();
        const seq = allTenantInvoices.length + 1;
        const invoiceNumber = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
        const total = proposal.estimateAmountCents;
        invoice = await storage.createInvoice(
          {
            tenantId,
            invoiceNumber,
            caseId: proposal.appliedCaseId ?? null,
            leadId: proposal.leadId ?? null,
            customerName: proposal.customerName,
            customerEmail: proposal.customerEmail,
            customerPhone: proposal.customerPhone,
            destinationCountry: proposal.destinationCountry,
            visaType: proposal.visaType,
            status: "sent",
            paymentType: "upfront",
            currency,
            subtotal: total,
            taxAmount: 0,
            total,
            paidAmount: 0,
            issuedAt: new Date(),
            notes: `Estimate from proposal ${proposal.token}`,
          } as any,
          [
            {
              description: `${proposal.destinationCountry} ${proposal.visaType} — service estimate`,
              quantity: 1,
              unitPrice: total,
              amount: total,
              category: "agency_fee",
              taxable: false,
              taxRate: 0,
            } as any,
          ],
        );
      }

      // Lazily generate the invoice's public token so the customer can pay it
      // through the standard /pay/invoice/:token page.
      let payToken = invoice.publicToken;
      if (!payToken) {
        payToken = randomUUID().replace(/-/g, "");
        await storage.updateInvoice(invoice.id, { publicToken: payToken } as any);
      }

      res.json({
        invoiceToken: payToken,
        url: `${origin}/pay/invoice/${payToken}`,
        amountCents: invoice.total,
        currency,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to initiate payment" });
    } finally {
      proposalPaymentInFlight.delete(proposal.id);
    }
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
    paymentType: true, destinationCountry: true, visaType: true,
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

      const ExcelJS = (await import("exceljs")).default;
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
      // Whitelist payment method against shared enum so a typo (or a
      // hand-crafted POST) can't store an arbitrary string.
      if (body.method !== undefined) {
        const ok = PAYMENT_METHODS.some((m) => m.value === body.method);
        if (!ok) {
          return res.status(400).json({
            error: `Invalid method: must be one of ${PAYMENT_METHODS.map((m) => m.value).join(", ")}`,
          });
        }
      }
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

  // POST /api/invoices/:id/share-link — lazily generates the invoice's
  // publicToken (so an invoice that's never been shared has no token at all)
  // and returns the full URL the agency can paste/email/whatsapp.
  app.post("/api/invoices/:id/share-link", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      if (!requireTenantAccess(req, res, invoice.tenantId)) return;
      let token = invoice.publicToken;
      if (!token) {
        token = randomUUID().replace(/-/g, "");
        await storage.updateInvoice(invoice.id, { publicToken: token } as any);
      }
      const origin = getRequestOrigin(req);
      res.json({ token, url: `${origin}/pay/invoice/${token}` });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to generate share link" });
    }
  });

  // GET /api/public/invoice/:token — public, unauthenticated. Returns just
  // enough to render the customer payment page (no internal IDs leaked).
  app.get("/api/public/invoice/:token", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByPublicToken(req.params.token);
      if (!invoice) return res.status(404).json({ error: "This payment link is invalid or has been removed." });
      const settings = await storage.getInvoiceSettings(invoice.tenantId);
      const tenant = await storage.getTenant(invoice.tenantId);
      const items = await storage.getInvoiceItems(invoice.id);
      const payments = await storage.getPaymentsByInvoiceId(invoice.id);
      const cfg = await storage.getTenantPaymentGatewayConfig(invoice.tenantId);
      const gatewayConfigured = !!(cfg?.testClientId || cfg?.liveClientId);
      // Strip internal ids/foreign keys from the items we return — the public
      // page only needs description / quantity / unit price / amount to render
      // the line items table.
      const publicItems = items
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
        }));
      res.json({
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName,
          customerEmail: invoice.customerEmail,
          status: invoice.status,
          currency: invoice.currency,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          paidAmount: invoice.paidAmount,
          balance: Math.max(0, invoice.total - invoice.paidAmount),
          issuedAt: invoice.issuedAt,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          items: publicItems,
          paymentsCount: payments.length,
        },
        agency: {
          name: settings?.companyName || tenant?.name || "",
          logoUrl: settings?.logoUrl || tenant?.logoUrl || null,
          accentColor: settings?.invoiceAccentColor || tenant?.primaryColor || null,
          email: settings?.companyEmail || tenant?.contactEmail || null,
          phone: settings?.companyPhone || tenant?.contactPhone || null,
          bankDetails: settings?.bankDetails || null,
          upiId: settings?.upiId || null,
          upiQrFileUrl: settings?.upiQrFileUrl || null,
          paymentInstructions: settings?.paymentInstructions || null,
        },
        gatewayConfigured,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load invoice" });
    }
  });

  // POST /api/public/invoice/:token/initiate-payment — initiates a Cashfree
  // order for the outstanding balance if the tenant has gateway credentials.
  // Returns paymentSessionId (frontend uses Cashfree's drop-in or hosted
  // checkout) plus the orderId we'll use in /confirm.
  app.post("/api/public/invoice/:token/initiate-payment", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByPublicToken(req.params.token);
      if (!invoice) return res.status(404).json({ error: "Invalid payment link" });
      const balance = Math.max(0, invoice.total - invoice.paidAmount);
      if (balance <= 0) return res.status(400).json({ error: "This invoice is already fully paid." });
      const cfg = await storage.getTenantPaymentGatewayConfig(invoice.tenantId);
      const cashfree = getCashfreeCredentials(cfg);
      if (!cashfree.clientId || !cashfree.clientSecret) {
        return res.status(503).json({ error: "Online payments are not configured for this agency. Please use the offline tab." });
      }
      const orderId = `INV_${invoice.id.slice(0, 8)}_${Date.now()}`;
      const requestId = randomUUID();
      const origin = getRequestOrigin(req);
      const payload = {
        order_id: orderId,
        order_amount: balance / 100,
        order_currency: invoice.currency || "INR",
        order_note: `Invoice ${invoice.invoiceNumber}`,
        customer_details: {
          customer_id: invoice.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45),
          customer_email: invoice.customerEmail || "noreply@visashuttle.app",
          customer_name: invoice.customerName,
          customer_phone: getCashfreePhone(invoice.customerPhone),
        },
        order_meta: {
          return_url: `${origin}/pay/invoice/${req.params.token}?order_id=${orderId}`,
        },
        order_tags: { product: "invoice", invoice_id: invoice.id },
      };
      // Note: don't annotate `gatewayRes` — Express's `Response` type is
      // imported at the top of this file and would clash with fetch's.
      let gatewayRes;
      try {
        gatewayRes = await fetch(`${cashfree.baseUrl}/orders`, {
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
      } catch {
        return res.status(503).json({ error: "Payment gateway is temporarily unreachable." });
      }
      const data = await readCashfreeBody(gatewayRes);
      if (!gatewayRes.ok) {
        return res.status(gatewayRes.status >= 500 ? 503 : gatewayRes.status).json({
          error: data?.message || "Unable to create payment order",
        });
      }
      res.json({
        orderId: data.order_id || orderId,
        paymentSessionId: data.payment_session_id,
        mode: cashfree.mode,
        amount: balance,
        currency: invoice.currency,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to initiate payment" });
    }
  });

  // POST /api/public/invoice/:token/confirm — called by the public payment
  // page after Cashfree's return-url. Verifies the order with Cashfree and,
  // if PAID, records a `gateway` payment row (idempotent: if a payment with
  // the same gateway-orderId reference already exists, returns it).
  app.post("/api/public/invoice/:token/confirm", async (req, res) => {
    try {
      const invoice = await storage.getInvoiceByPublicToken(req.params.token);
      if (!invoice) return res.status(404).json({ error: "Invalid payment link" });
      const orderId = String(req.body?.orderId || "").trim();
      if (!orderId || !/^INV_[a-zA-Z0-9_-]+$/.test(orderId)) {
        return res.status(400).json({ error: "Invalid order id" });
      }
      // Idempotency: skip if we already recorded this gateway transaction.
      const existing = (await storage.getPaymentsByInvoiceId(invoice.id))
        .find((p) => p.method === "gateway" && p.reference === orderId);
      if (existing) return res.json({ paid: true, payment: existing, alreadyRecorded: true });

      const cfg = await storage.getTenantPaymentGatewayConfig(invoice.tenantId);
      const cashfree = getCashfreeCredentials(cfg);
      if (!cashfree.clientId || !cashfree.clientSecret) {
        return res.status(503).json({ error: "Gateway not configured" });
      }
      let gatewayRes;
      try {
        gatewayRes = await fetch(`${cashfree.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
          headers: {
            "x-api-version": cashfree.apiVersion,
            "x-client-id": cashfree.clientId,
            "x-client-secret": cashfree.clientSecret,
            "x-request-id": randomUUID(),
          },
          signal: AbortSignal.timeout(20000),
        });
      } catch {
        return res.status(503).json({ error: "Gateway temporarily unreachable" });
      }
      const data = await readCashfreeBody(gatewayRes);
      if (!gatewayRes.ok) {
        return res.status(gatewayRes.status >= 500 ? 503 : gatewayRes.status).json({
          error: data?.message || "Unable to verify payment",
        });
      }
      // Bind the gateway order to THIS invoice. Cashfree echoes back the
      // `order_tags` we sent at create time. We refuse to record a payment if
      // the order belongs to a different invoice (replay guard) or if the
      // amount/currency drifted from what we created.
      const tagInvoiceId = data?.order_tags?.invoice_id;
      if (tagInvoiceId && tagInvoiceId !== invoice.id) {
        return res.status(400).json({ error: "Order does not belong to this invoice" });
      }
      const orderCurrency = String(data?.order_currency || "").toUpperCase();
      if (orderCurrency && invoice.currency && orderCurrency !== invoice.currency.toUpperCase()) {
        return res.status(400).json({ error: "Order currency mismatch" });
      }
      const isPaid = data.order_status === "PAID";
      if (!isPaid) return res.json({ paid: false, status: data.order_status });
      const amountCents = Math.round((data.order_amount ?? 0) * 100) || Math.max(0, invoice.total - invoice.paidAmount);
      const payment = await storage.createPayment({
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        amount: amountCents,
        method: "gateway",
        reference: orderId,
        notes: `Cashfree ${cashfree.mode} order`,
      } as any);
      res.json({ paid: true, payment });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to confirm payment" });
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
    if (body?.submissionMethod !== undefined && body.submissionMethod !== null) {
      const ok = SUBMISSION_METHODS.some((m) => m.value === body.submissionMethod);
      if (!ok) return `Invalid submissionMethod: must be one of ${SUBMISSION_METHODS.map((m) => m.value).join(", ")}`;
    }
    if (body?.visaStage !== undefined && body.visaStage !== null) {
      const ok = VISA_STAGES.some((s) => s.value === body.visaStage);
      if (!ok) return `Invalid visaStage: must be one of ${VISA_STAGES.map((s) => s.value).join(", ")}`;
    }
    if (body?.visaProcessingStatus !== undefined && body.visaProcessingStatus !== null) {
      const ok = VISA_PROCESSING_STATUSES.some((s) => s.value === body.visaProcessingStatus);
      if (!ok) return `Invalid visaProcessingStatus: must be one of ${VISA_PROCESSING_STATUSES.map((s) => s.value).join(", ")}`;
    }
    return null;
  }

  function cleanString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function normalizeEmail(value: unknown): string | null {
    const v = cleanString(value);
    return v ? v.toLowerCase() : null;
  }

  function makeAgencyPlaceholderEmail(tenantId: string, seed: string): string {
    const safeSeed = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32) || randomUUID().replace(/-/g, "");
    return `agency+${tenantId.slice(0, 12)}+${safeSeed}@visashuttle.local`;
  }

  async function getOrCreateAgencyCustomer(
    tenantId: string,
    input: { name?: unknown; email?: unknown; phone?: unknown; seed?: string },
  ) {
    const email = normalizeEmail(input.email);
    const phone = cleanString(input.phone);
    const phoneNorm = phone ? normalizePhoneDigits(phone) : "";
    const name = cleanString(input.name);

    const agencyCustomers = await storage.getCustomersByTenantId(tenantId);
    let customer = agencyCustomers.find((c) => {
      const cEmail = c.email?.toLowerCase();
      const cPhone = c.phone ? normalizePhoneDigits(c.phone) : "";
      return (!!email && cEmail === email) || (!!phoneNorm && cPhone === phoneNorm);
    });

    if (!customer && email) {
      customer = await storage.getCustomerAccountByEmail(email);
    }

    if (!customer) {
      const placeholderSeed = phoneNorm || input.seed || randomUUID();
      customer = await storage.createCustomerAccount({
        email: email ?? makeAgencyPlaceholderEmail(tenantId, String(placeholderSeed)),
        phone: phone || null,
        name: name || null,
        avatarUrl: null,
        isVerified: false,
      } as InsertCustomerAccount);
    } else {
      const patch: Partial<InsertCustomerAccount> = {};
      if (name && !customer.name) patch.name = name;
      if (phone && !customer.phone) patch.phone = phone;
      if (email && customer.email.endsWith("@visashuttle.local")) patch.email = email;
      if (Object.keys(patch).length > 0) {
        customer = await storage.updateCustomerAccount(customer.id, patch) ?? customer;
      }
    }

    const existingLink = await storage.getCustomerTenantLink(customer.id, tenantId);
    if (!existingLink) {
      await storage.createCustomerTenantLink({
        customerAccountId: customer.id,
        tenantId,
        role: "customer",
      });
    }

    return customer;
  }

  function caseHasCustomerData(body: any): boolean {
    return !!(
      cleanString(body?.customerEmail) ||
      cleanString(body?.customerPhone) ||
      cleanString(body?.applicantName) ||
      cleanString(body?.passportNumber)
    );
  }

  async function saveApplicationPassportToCustomer(tenantId: string, customerAccountId: string | null, body: any) {
    const passportNumber = cleanString(body?.passportNumber);
    if (!customerAccountId || !passportNumber) return;

    const existing = await storage.getPassportsByCustomerId(customerAccountId, tenantId);
    const normalizedIncoming = passportNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const samePassport = existing.find((p) =>
      p.passportNumber?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === normalizedIncoming
    );
    if (samePassport) return;

    await storage.createPassport({
      customerAccountId,
      tenantId,
      holderName: cleanString(body?.applicantName),
      relationship: "self",
      isPrimary: existing.length === 0,
      passportSurname: cleanString(body?.passportSurname),
      passportGivenName: cleanString(body?.passportGivenName),
      passportMiddleName: cleanString(body?.passportMiddleName),
      passportNumber,
      passportNationality: cleanString(body?.passportNationality),
      passportGender: cleanString(body?.passportGender) as any,
      passportDateOfBirth: cleanString(body?.applicantDob),
      passportDateOfIssue: cleanString(body?.passportDateOfIssue),
      passportDateOfExpiry: cleanString(body?.passportDateOfExpiry),
      passportPlaceOfIssue: cleanString(body?.passportPlaceOfIssue),
      passportPlaceOfBirth: cleanString(body?.passportPlaceOfBirth),
      passportFileUrl: null,
      notes: "Saved from agency application onboarding",
    } as InsertPassport);
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

  // Whitelist + light type-check for co-traveller POST/PATCH bodies. Drops any
  // unknown keys (e.g. caseId/tenantId injected via body), and rejects
  // gender values that aren't M/F/X. Ownership keys are set by the route, not
  // by client input.
  const coTravellerBodySchema = z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    dob: z.string().nullish(),
    passportNumber: z.string().nullish(),
    nationality: z.string().nullish(),
    passportSurname: z.string().nullish(),
    passportGivenName: z.string().nullish(),
    passportMiddleName: z.string().nullish(),
    passportGender: z.enum(["M", "F", "X"]).nullish(),
    passportDateOfIssue: z.string().nullish(),
    passportDateOfExpiry: z.string().nullish(),
    passportPlaceOfIssue: z.string().nullish(),
    passportPlaceOfBirth: z.string().nullish(),
    notes: z.string().nullish(),
  }).strip();
  function parseCoTravellerBody(body: any): { ok: true; data: z.infer<typeof coTravellerBodySchema> } | { ok: false; error: string } {
    const parsed = coTravellerBodySchema.safeParse(body ?? {});
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid co-traveller payload" };
    }
    return { ok: true, data: parsed.data };
  }

  app.get("/api/tenants/:tenantId/cases", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const cases = await storage.getCasesByTenantId(req.params.tenantId);
    res.json(cases);
  });

  // === Customers (agency-side directory of portal customers) ===
  // Lists every CustomerAccount linked to this tenant, with a small
  // aggregate (case count, latest case date) computed off the cases table
  // so the index page is single-fetch.
  app.get("/api/tenants/:tenantId/customers", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const tenantId = req.params.tenantId;
    const [customers, allCases, allPassports] = await Promise.all([
      storage.getCustomersByTenantId(tenantId),
      storage.getCasesByTenantId(tenantId),
      storage.getPassportsByTenantId(tenantId),
    ]);
    const casesByCust = new Map<string, typeof allCases>();
    for (const c of allCases) {
      if (!c.customerAccountId) continue;
      const arr = casesByCust.get(c.customerAccountId) ?? [];
      arr.push(c);
      casesByCust.set(c.customerAccountId, arr);
    }
    const passportsByCust = new Map<string, typeof allPassports>();
    for (const p of allPassports) {
      const arr = passportsByCust.get(p.customerAccountId) ?? [];
      arr.push(p);
      passportsByCust.set(p.customerAccountId, arr);
    }
    const enriched = customers.map(cust => {
      const cs = casesByCust.get(cust.id) ?? [];
      const ps = passportsByCust.get(cust.id) ?? [];
      const latest = cs.reduce<Date | null>((acc, c) => {
        const d = c.updatedAt ? new Date(c.updatedAt) : (c.createdAt ? new Date(c.createdAt) : null);
        if (!d) return acc;
        return !acc || d > acc ? d : acc;
      }, null);
      // Prefer the customer's passport library (master record). If no
      // library entry exists yet, fall back to the most recent case
      // snapshot for backwards compatibility with legacy data.
      const libraryPrimary = ps
        .filter(p => p.passportNumber)
        .sort((a, b) => {
          if ((b.isPrimary ? 1 : 0) !== (a.isPrimary ? 1 : 0)) {
            return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
          }
          const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return tb - ta;
        })[0];
      const caseFallback = cs
        .filter(c => c.passportNumber)
        .sort((a, b) => {
          const ta = (a.updatedAt ?? a.createdAt) ? new Date(a.updatedAt ?? a.createdAt!).getTime() : 0;
          const tb = (b.updatedAt ?? b.createdAt) ? new Date(b.updatedAt ?? b.createdAt!).getTime() : 0;
          return tb - ta;
        })[0];
      const passportSrc = libraryPrimary ?? caseFallback;
      // Earliest expiry across both the library AND legacy case snapshots
      // (so an expired passport anywhere flags the customer).
      const allExpiries = [
        ...ps.map(p => p.passportDateOfExpiry),
        ...cs.map(c => c.passportDateOfExpiry),
      ].filter((d): d is string => !!d).sort();
      // Every passport number associated with this customer (library +
      // legacy case snapshots), de-duplicated. Used by the agency search
      // box so staff can find a customer by *any* of their passports —
      // including co-travellers' — not just the primary.
      const passportNumbers = Array.from(new Set([
        ...ps.map(p => p.passportNumber),
        ...cs.map(c => c.passportNumber),
      ].filter((n): n is string => !!n && n.trim().length > 0)));
      // Holder names from the library too, so search like "jane smith" still
      // finds the customer when Jane is only listed as a co-traveller.
      const passportHolderNames = Array.from(new Set(
        ps.map(p => p.holderName).filter((n): n is string => !!n && n.trim().length > 0)
      ));
      return {
        ...cust,
        caseCount: cs.length,
        activeCaseCount: cs.filter(c => !["approved", "rejected"].includes(c.status)).length,
        latestActivityAt: latest,
        passportCount: ps.length,
        latestPassportNumber: passportSrc?.passportNumber ?? null,
        latestPassportNationality: passportSrc?.passportNationality ?? null,
        earliestPassportExpiry: allExpiries[0] ?? null,
        passportNumbers,
        passportHolderNames,
      };
    });
    // Most recent activity first.
    enriched.sort((a, b) => {
      const ta = a.latestActivityAt ? a.latestActivityAt.getTime() : 0;
      const tb = b.latestActivityAt ? b.latestActivityAt.getTime() : 0;
      return tb - ta;
    });
    res.json(enriched);
  });

  app.post("/api/tenants/:tenantId/customers", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const name = cleanString(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const phone = cleanString(req.body?.phone);
    if (!name && !email && !phone) {
      return res.status(400).json({ error: "Customer name, email, or mobile is required" });
    }

    const customer = await getOrCreateAgencyCustomer(req.params.tenantId, {
      name,
      email,
      phone,
      seed: email ?? phone ?? randomUUID(),
    });
    res.status(201).json(customer);
  });

  app.get("/api/tenants/:tenantId/customers/lookup", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const tenantId = req.params.tenantId;
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    if (!email && !phone) return res.json({ customer: null, passports: [], validPassport: null });

    const byEmail = email ? await storage.getCustomerAccountByEmail(email) : undefined;
    const byPhone = phone ? await storage.getCustomerAccountByPhone(phone) : undefined;
    const customer = byEmail ?? byPhone;
    if (!customer) return res.json({ customer: null, passports: [], validPassport: null });

    const link = await storage.getCustomerTenantLink(customer.id, tenantId);
    if (!link) return res.json({ customer: null, passports: [], validPassport: null });

    const [passports, cases] = await Promise.all([
      storage.getPassportsByCustomerId(customer.id, tenantId),
      storage.getCasesByCustomerAccountId(customer.id, tenantId),
    ]);
    const today = startOfToday().toISOString().slice(0, 10);
    const validPassports = passports
      .filter((p) => !!p.passportNumber && !!p.passportDateOfExpiry && p.passportDateOfExpiry >= today)
      .sort((a, b) => {
        if ((b.isPrimary ? 1 : 0) !== (a.isPrimary ? 1 : 0)) return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
        return String(b.passportDateOfExpiry ?? "").localeCompare(String(a.passportDateOfExpiry ?? ""));
      });
    const validPassport = validPassports[0] ?? null;
    const latestCase = cases
      .filter((c) => c.passportNumber && c.passportDateOfExpiry && c.passportDateOfExpiry >= today)
      .sort((a, b) => {
        const ta = (a.updatedAt ?? a.createdAt) ? new Date(a.updatedAt ?? a.createdAt!).getTime() : 0;
        const tb = (b.updatedAt ?? b.createdAt) ? new Date(b.updatedAt ?? b.createdAt!).getTime() : 0;
        return tb - ta;
      })[0];
    const fallbackPassport = validPassport ? null : latestCase ? {
      id: `case:${latestCase.id}`,
      customerAccountId: customer.id,
      tenantId,
      holderName: latestCase.applicantName,
      relationship: "self",
      isPrimary: true,
      passportSurname: latestCase.passportSurname,
      passportGivenName: latestCase.passportGivenName,
      passportMiddleName: latestCase.passportMiddleName,
      passportNumber: latestCase.passportNumber,
      passportNationality: latestCase.passportNationality,
      passportGender: latestCase.passportGender,
      passportDateOfBirth: latestCase.applicantDob,
      passportDateOfIssue: latestCase.passportDateOfIssue,
      passportDateOfExpiry: latestCase.passportDateOfExpiry,
      passportPlaceOfIssue: latestCase.passportPlaceOfIssue,
      passportPlaceOfBirth: latestCase.passportPlaceOfBirth,
      passportFileUrl: latestCase.passportFileUrl,
      notes: null,
      createdAt: latestCase.createdAt,
      updatedAt: latestCase.updatedAt,
    } : null;

    res.json({
      customer,
      passports,
      validPassport: validPassport ?? fallbackPassport,
    });
  });

  // Single customer with their applications and full passport library.
  // Passports live at the customer level (master record reused across
  // applications, including co-travellers' passports), not on individual
  // cases. The case snapshot fields are still returned for legacy data.
  app.get("/api/tenants/:tenantId/customers/:customerId", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const { tenantId, customerId } = req.params;
    const link = await storage.getCustomerTenantLink(customerId, tenantId);
    if (!link) {
      return res.status(404).json({ error: "Customer not found in this agency" });
    }
    const account = await storage.getCustomerAccount(customerId);
    if (!account) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const [cases, passports] = await Promise.all([
      storage.getCasesByCustomerAccountId(customerId, tenantId),
      storage.getPassportsByCustomerId(customerId, tenantId),
    ]);
    res.json({ account, cases, passports });
  });

  // === Customer passport library (CRUD) ===
  // Schema-shape for what an agency-side caller is allowed to send. We
  // never trust customerAccountId/tenantId from the body — those come
  // from the URL and are verified against the tenant link.
  const passportBodyShape = insertPassportSchema
    .omit({ customerAccountId: true, tenantId: true })
    .partial();

  // Cheap consistency guards on date fields the UI is allowed to send.
  function validatePassportDates(body: any): string | null {
    const ymd = /^\d{4}-\d{2}-\d{2}$/;
    for (const f of ["passportDateOfIssue", "passportDateOfExpiry", "passportDateOfBirth"]) {
      const v = body?.[f];
      if (v != null && v !== "" && (typeof v !== "string" || !ymd.test(v))) {
        return `${f} must be a YYYY-MM-DD date`;
      }
    }
    if (body?.passportDateOfIssue && body?.passportDateOfExpiry &&
        body.passportDateOfIssue > body.passportDateOfExpiry) {
      return "passportDateOfIssue cannot be after passportDateOfExpiry";
    }
    return null;
  }
  function validatePassportRelationship(body: any): string | null {
    if (body?.relationship != null && !PASSPORT_RELATIONSHIPS.includes(body.relationship)) {
      return `relationship must be one of: ${PASSPORT_RELATIONSHIPS.join(", ")}`;
    }
    return null;
  }
  function validatePassportFileUrl(body: any): string | null {
    const v = body?.passportFileUrl;
    if (v == null || v === "") return null;
    if (typeof v !== "string") return "passportFileUrl must be a string";
    // Match the client-side allowlist: https?:// or data:image/<safe>;base64,…
    if (/^https?:\/\//i.test(v)) return null;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(v)) return null;
    return "passportFileUrl must be an http(s) URL or data:image/* base64 URI";
  }

  app.get("/api/tenants/:tenantId/customers/:customerId/passports", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const { tenantId, customerId } = req.params;
    const link = await storage.getCustomerTenantLink(customerId, tenantId);
    if (!link) return res.status(404).json({ error: "Customer not found in this agency" });
    const passports = await storage.getPassportsByCustomerId(customerId, tenantId);
    res.json(passports);
  });

  app.post("/api/tenants/:tenantId/customers/:customerId/passports", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const { tenantId, customerId } = req.params;
    const link = await storage.getCustomerTenantLink(customerId, tenantId);
    if (!link) return res.status(404).json({ error: "Customer not found in this agency" });
    const parsed = passportBodyShape.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid passport data", details: parsed.error.flatten() });
    }
    const dateErr = validatePassportDates(parsed.data);
    if (dateErr) return res.status(400).json({ error: dateErr });
    const relErr = validatePassportRelationship(parsed.data);
    if (relErr) return res.status(400).json({ error: relErr });
    const fileErr = validatePassportFileUrl(parsed.data);
    if (fileErr) return res.status(400).json({ error: fileErr });
    const created = await storage.createPassport({
      ...parsed.data,
      customerAccountId: customerId,
      tenantId,
    } as InsertPassport);
    res.status(201).json(created);
  });

  app.patch("/api/tenants/:tenantId/customers/:customerId/passports/:passportId", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const { tenantId, customerId, passportId } = req.params;
    const existing = await storage.getPassport(passportId);
    if (!existing || existing.tenantId !== tenantId || existing.customerAccountId !== customerId) {
      return res.status(404).json({ error: "Passport not found" });
    }
    const parsed = passportBodyShape.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid passport data", details: parsed.error.flatten() });
    }
    const dateErr = validatePassportDates(parsed.data);
    if (dateErr) return res.status(400).json({ error: dateErr });
    const relErr = validatePassportRelationship(parsed.data);
    if (relErr) return res.status(400).json({ error: relErr });
    const fileErr = validatePassportFileUrl(parsed.data);
    if (fileErr) return res.status(400).json({ error: fileErr });
    const updated = await storage.updatePassport(passportId, parsed.data);
    res.json(updated);
  });

  app.delete("/api/tenants/:tenantId/customers/:customerId/passports/:passportId", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const { tenantId, customerId, passportId } = req.params;
    const existing = await storage.getPassport(passportId);
    if (!existing || existing.tenantId !== tenantId || existing.customerAccountId !== customerId) {
      return res.status(404).json({ error: "Passport not found" });
    }
    await storage.deletePassport(passportId);
    res.status(204).end();
  });

  app.post("/api/tenants/:tenantId/cases", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
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
    // Defense-in-depth: reject country↔visa-type mismatches (e.g. picking
    // "Schengen Visa" for Algeria). Drafts get the same check — if the
    // user explicitly chose both fields, they must agree. Empty visaType
    // is already rejected above.
    if (!isValidVisaTypeForCountry(req.body.destinationCountry.trim(), req.body.visaType.trim())) {
      const allowed = getCountryVisaTypes(req.body.destinationCountry.trim()).slice(0, 6).join(", ");
      return res.status(400).json({
        error: `"${req.body.visaType.trim()}" is not a recognised visa type for ${req.body.destinationCountry.trim()}. Try one of: ${allowed}…`,
      });
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
    // Resolve assignee — every case must be owned by a team member of this
    // tenant. The wizard always sends one (defaulted to the signed-in user)
    // but we still validate it server-side.
    const assignedTo = await resolveTenantAssignee(req, req.params.tenantId, req.body?.assignedTo);
    if (!assignedTo) {
      return res.status(400).json({ error: "A team member must be assigned to this case." });
    }
    const referenceId = req.body.referenceId || generateReferenceId();
    let customerAccountId = req.body?.customerAccountId || null;
    if (customerAccountId) {
      const link = await storage.getCustomerTenantLink(customerAccountId, req.params.tenantId);
      if (!link) return res.status(400).json({ error: "Customer does not belong to this agency" });
    } else if (caseHasCustomerData(req.body)) {
      const customer = await getOrCreateAgencyCustomer(req.params.tenantId, {
        name: req.body?.applicantName,
        email: req.body?.customerEmail,
        phone: req.body?.customerPhone,
        seed: referenceId,
      });
      customerAccountId = customer.id;
    }
    const caseData = await storage.createCase({
      ...req.body,
      customerAccountId,
      assignedTo,
      tenantId: req.params.tenantId,
      referenceId
    });
    await saveApplicationPassportToCustomer(req.params.tenantId, customerAccountId, req.body);
    res.status(201).json(caseData);
  });

  app.get("/api/cases/:id", async (req, res) => {
    const caseData = await storage.getCase(req.params.id);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    if (!requireTenantAccess(req, res, caseData.tenantId)) return;
    res.json(caseData);
  });

  // === Passport OCR (Claude vision) ===
  // Body parser bumped on this route only — passport images can be a few MB
  // base64-encoded — but we don't want to inflate global request limits.
  app.post(
    "/api/passport/scan",
    requireAgencyAuth,
    express.json({ limit: "10mb" }),
    async (req, res) => {
      const { imageBase64, mimeType } = req.body ?? {};
      if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      if (typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
        return res.status(400).json({ error: "mimeType must be an image/* type" });
      }
      // Strip a data URL prefix if the client included it.
      const cleaned = imageBase64.includes(",") ? imageBase64.split(",").pop()! : imageBase64;
      // Rough size cap: 8 MB raw → ~10.7 MB base64. Be defensive.
      if (cleaned.length > 11 * 1024 * 1024) {
        return res.status(413).json({ error: "Passport image is too large. Please upload an image under 8 MB." });
      }

      const aiConfig = await storage.getPlatformAiConfig();
      if (!isPassportScanConfigured(aiConfig)) {
        return res.status(503).json({
          error: "Passport auto-scan is not configured. Ask your platform admin to set ANTHROPIC_API_KEY, or fill the form manually.",
          code: "ai_not_configured",
        });
      }

      try {
        const result = await scanPassportImage(cleaned, mimeType, aiConfig);
        res.json(result);
      } catch (err: any) {
        // Log the upstream detail server-side, but never echo it to the client —
        // upstream errors can include API keys, prompts, or model output text.
        console.error("[passport-scan] failed:", err?.message ?? err);
        res.status(502).json({
          error: "Passport scan failed. Please try again, or switch to manual entry.",
        });
      }
    },
  );

  app.patch("/api/cases/:id", async (req, res) => {
    // Tenant guard — load the case first so we can verify ownership before
    // any validation/mutation runs.
    const existing = await storage.getCase(req.params.id);
    if (!existing) return res.status(404).json({ error: "Case not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;

    const dateError = validateCaseDates(req.body);
    if (dateError) return res.status(400).json({ error: dateError });
    const enumError = validateCaseEnums(req.body);
    if (enumError) return res.status(400).json({ error: enumError });

    // Defense-in-depth on edits too: when the patch touches country or
    // visa type, validate the merged effective pair against the catalog.
    const touchesCountry = req.body && typeof req.body === "object" && "destinationCountry" in req.body;
    const touchesVisaType = req.body && typeof req.body === "object" && "visaType" in req.body;
    if (touchesCountry || touchesVisaType) {
      const effectiveCountry = String((touchesCountry ? req.body.destinationCountry : existing.destinationCountry) ?? "").trim();
      const effectiveVisaType = String((touchesVisaType ? req.body.visaType : existing.visaType) ?? "").trim();
      if (effectiveCountry && effectiveVisaType && !isValidVisaTypeForCountry(effectiveCountry, effectiveVisaType)) {
        const allowed = getCountryVisaTypes(effectiveCountry).slice(0, 6).join(", ");
        return res.status(400).json({
          error: `"${effectiveVisaType}" is not a recognised visa type for ${effectiveCountry}. Try one of: ${allowed}…`,
        });
      }
    }

    const caseData = await storage.updateCase(req.params.id, req.body);
    if (!caseData) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseData);
  });

  // ==========================================================================
  // Case PDF + email + visa-stage update (Visa workflow module)
  // ==========================================================================
  // PDF mirrors the invoice pattern: pdfkit, accent strip, header w/ logo,
  // applicant + passport block, destination/visa, current submission method
  // and visa stage, fees if present, and document checklist if uploaded.
  async function renderCasePdf(
    c: any,
    coTravellers: any[],
    documents: any[],
    settings: any,
    out: NodeJS.WritableStream,
  ): Promise<void> {
    const PDFDocumentMod: any = await import("pdfkit");
    const PDFDocument = PDFDocumentMod.default ?? PDFDocumentMod;
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(out);

    const accent = settings?.invoiceAccentColor || "#1f2937";
    const fmtDate = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    const labelFor = <T extends { value: string; label: string }>(arr: readonly T[], v: string | null | undefined) =>
      arr.find((x) => x.value === v)?.label ?? "—";

    doc.rect(0, 0, doc.page.width, 6).fill(accent);

    let logoHeight = 0;
    const logoBuf = await fetchSafeImage(settings?.logoUrl);
    if (logoBuf) {
      try { doc.image(logoBuf, 48, 24, { fit: [120, 60] }); logoHeight = 60; } catch { /* skip */ }
    }
    const headerTop = Math.max(28 + logoHeight, 32);
    doc.fillColor("#111827").fontSize(22).text("VISA APPLICATION", 48, headerTop, { align: "right" });
    doc.fontSize(11).fillColor("#6b7280").text(c.caseNumber, { align: "right" });
    doc.fontSize(9).fillColor("#9ca3af").text(`Ref: ${c.referenceId}`, { align: "right" });
    doc.text(`Created: ${fmtDate(c.createdAt)}`, { align: "right" });

    doc.moveDown(2);
    const fromY = doc.y;

    doc.fontSize(9).fillColor("#9ca3af").text("AGENCY", 48, fromY);
    doc.fillColor("#111827").fontSize(11).text(settings?.companyName ?? "Your agency", 48);
    doc.fontSize(9).fillColor("#374151");
    if (settings?.companyEmail) doc.text(settings.companyEmail);
    if (settings?.companyPhone) doc.text(settings.companyPhone);

    doc.fontSize(9).fillColor("#9ca3af").text("APPLICANT", 320, fromY);
    doc.fillColor("#111827").fontSize(11).text(c.applicantName ?? "—", 320);
    doc.fontSize(9).fillColor("#374151");
    if (c.applicantDob) doc.text(`DOB: ${c.applicantDob}`, 320, doc.y);
    if (c.passportNumber) doc.text(`Passport: ${c.passportNumber}`, 320, doc.y);
    if (c.passportNationality) doc.text(`Nationality: ${c.passportNationality}`, 320, doc.y);

    doc.moveDown(2);
    doc.y = Math.max(doc.y, fromY + 100);

    // Application section
    doc.fontSize(9).fillColor("#9ca3af").text("APPLICATION", 48);
    doc.moveDown(0.3);
    const appRows: Array<[string, string]> = [
      ["Destination", c.destinationCountry ?? "—"],
      ["Visa Type", c.visaType ?? "—"],
      ["Travel Date", fmtDate(c.travelDate)],
      ["Status", String(c.status ?? "—").toUpperCase()],
      ["Priority", String(c.priority ?? "normal").toUpperCase()],
      ["Submission Method", labelFor(SUBMISSION_METHODS, c.submissionMethod)],
      ["Visa Stage", labelFor(VISA_STAGES, c.visaStage)],
      ["Processing Status", labelFor(VISA_PROCESSING_STATUSES, c.visaProcessingStatus)],
    ];
    doc.fontSize(10).fillColor("#111827");
    for (const [k, v] of appRows) {
      const y = doc.y;
      doc.fillColor("#6b7280").text(k, 48, y, { width: 140 });
      doc.fillColor("#111827").text(v, 200, y, { width: 350 });
      doc.moveDown(0.25);
    }

    if (c.visaStatusComment) {
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#9ca3af").text("STATUS NOTE", 48);
      doc.fontSize(10).fillColor("#374151").text(c.visaStatusComment, 48, doc.y, { width: 500 });
    }

    if (c.notes) {
      doc.moveDown(0.8);
      doc.fontSize(9).fillColor("#9ca3af").text("NOTES", 48);
      doc.fontSize(10).fillColor("#374151").text(c.notes, 48, doc.y, { width: 500 });
    }

    if (Array.isArray(coTravellers) && coTravellers.length > 0) {
      doc.moveDown(0.8);
      doc.fontSize(9).fillColor("#9ca3af").text(`CO-TRAVELLERS (${coTravellers.length})`, 48);
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor("#111827");
      for (const t of coTravellers) {
        const meta = [t.relationship, t.dob ? `DOB ${t.dob}` : null, t.passportNumber ? `Passport ${t.passportNumber}` : null]
          .filter(Boolean).join(" · ");
        doc.text(`• ${t.name ?? "—"}${meta ? ` (${meta})` : ""}`, 48, doc.y, { width: 500 });
        doc.moveDown(0.2);
      }
    }

    if (Array.isArray(documents) && documents.length > 0) {
      doc.moveDown(0.8);
      doc.fontSize(9).fillColor("#9ca3af").text(`DOCUMENTS (${documents.length})`, 48);
      doc.moveDown(0.2);
      doc.fontSize(10);
      for (const d of documents) {
        const status = String(d.status ?? "pending").toUpperCase();
        doc.fillColor("#111827").text(`• ${d.name ?? d.type ?? "Document"}`, 48, doc.y, { width: 380, continued: true });
        doc.fillColor(status === "APPROVED" ? "#059669" : status === "REJECTED" ? "#dc2626" : "#6b7280")
          .text(`  [${status}]`, { align: "left" });
        doc.moveDown(0.2);
      }
    }

    if (settings?.footerText) {
      doc.moveDown(2);
      doc.fontSize(9).fillColor("#6b7280").text(settings.footerText, 48, doc.y, { align: "center", width: 500 });
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
      out.on("finish", () => resolve());
      out.on("end", () => resolve());
      out.on("error", reject);
    });
  }

  async function renderCasePdfBuffer(c: any, coTravellers: any[], documents: any[], settings: any): Promise<Buffer> {
    const { PassThrough } = await import("node:stream");
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (b: Buffer) => chunks.push(Buffer.from(b)));
    const done = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
    await renderCasePdf(c, coTravellers, documents, settings, stream);
    return done;
  }

  app.get("/api/cases/:id/pdf", async (req, res) => {
    try {
      const c = await storage.getCase(req.params.id);
      if (!c) return res.status(404).json({ error: "Not found" });
      if (!requireTenantAccess(req, res, c.tenantId)) return;
      const [coTravellers, documents, settings] = await Promise.all([
        storage.getCoTravellersByCaseId(c.id).catch(() => []),
        storage.getDocumentsByCaseId(c.id).catch(() => []),
        storage.getInvoiceSettings(c.tenantId).catch(() => undefined),
      ]);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${c.caseNumber}.pdf"`);
      await renderCasePdf(c, coTravellers as any[], documents as any[], settings, res);
    } catch (e: any) {
      if (!res.headersSent) res.status(500).json({ error: e?.message ?? "Failed to generate PDF" });
    }
  });

  app.post("/api/cases/:id/email", async (req, res) => {
    try {
      const c = await storage.getCase(req.params.id);
      if (!c) return res.status(404).json({ error: "Not found" });
      if (!requireTenantAccess(req, res, c.tenantId)) return;
      const settings = await storage.getInvoiceSettings(c.tenantId).catch(() => undefined);
      const to = String(req.body?.to ?? "").trim();
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ error: "A valid recipient email is required" });
      }
      const subject = String(req.body?.subject ?? `Your visa application ${c.caseNumber}`);
      const stageLabel = VISA_STAGES.find((s) => s.value === c.visaStage)?.label ?? "—";
      const methodLabel = SUBMISSION_METHODS.find((m) => m.value === c.submissionMethod)?.label ?? "—";
      const defaultBody =
        `Hi ${c.applicantName ?? "there"},\n\n` +
        `Please find your visa application summary attached.\n\n` +
        `Reference: ${c.referenceId}\n` +
        `Destination: ${c.destinationCountry}\n` +
        `Visa Type: ${c.visaType}\n` +
        `Submission Method: ${methodLabel}\n` +
        `Status: ${stageLabel}\n\n` +
        `Thank you,\n${settings?.companyName ?? "Your agency"}`;
      const body = String(req.body?.body ?? defaultBody);

      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const fromAddress = process.env.RESEND_FROM ?? settings?.companyEmail ?? "onboarding@resend.dev";
        try {
          const [coTravellers, documents] = await Promise.all([
            storage.getCoTravellersByCaseId(c.id).catch(() => []),
            storage.getDocumentsByCaseId(c.id).catch(() => []),
          ]);
          const pdfBuf = await renderCasePdfBuffer(c, coTravellers as any[], documents as any[], settings);
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: fromAddress,
              to: [to],
              subject,
              text: body,
              attachments: [{ filename: `${c.caseNumber}.pdf`, content: pdfBuf.toString("base64") }],
            }),
          });
          if (resp.ok) return res.json({ ok: true, sent: true, to, attached: true });
        } catch { /* fall through */ }
      }

      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      res.json({
        ok: true,
        sent: false,
        fallback: {
          mailto,
          pdfUrl: `/api/cases/${c.id}/pdf`,
          message: "Email sending isn't configured. Open this in your email client and attach the PDF download.",
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to send case email" });
    }
  });

  // PATCH visa-stage / processing-status / comment in one go.
  // Updates `visaStatusUpdatedAt` whenever any of these changes so the Visa
  // module pages can show "Updated 2h ago" timestamps.
  app.patch("/api/cases/:id/visa-status", async (req, res) => {
    try {
      const c = await storage.getCase(req.params.id);
      if (!c) return res.status(404).json({ error: "Not found" });
      if (!requireTenantAccess(req, res, c.tenantId)) return;
      const enumError = validateCaseEnums(req.body);
      if (enumError) return res.status(400).json({ error: enumError });

      const patch: any = { visaStatusUpdatedAt: new Date() };
      if (req.body?.visaStage !== undefined) patch.visaStage = req.body.visaStage;
      if (req.body?.visaProcessingStatus !== undefined) patch.visaProcessingStatus = req.body.visaProcessingStatus;
      if (req.body?.visaStatusComment !== undefined) patch.visaStatusComment = req.body.visaStatusComment;
      // Mirror visa stage transitions up to the case's main `status` field so
      // the Applications list + dashboards stay in sync with the Visa module
      // in BOTH directions — including when a case is moved back to
      // Processing from Approved/Rejected (otherwise the case lingers as
      // "approved" in the Applications list while showing as "Processing"
      // in the Visa module).
      if (patch.visaStage === "approved") patch.status = "approved";
      else if (patch.visaStage === "rejected") patch.status = "rejected";
      else if (patch.visaStage === "processing") patch.status = "in_progress";
      else if (patch.visaStage === "not_started") patch.status = "pending";

      const updated = await storage.updateCase(c.id, patch);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to update visa status" });
    }
  });

  // PATCH visa-copy file — uploaded after the case is approved. Body:
  // {visaCopyFileUrl?: string|null, visaCopyFileName?: string|null}. Setting
  // both to null removes the file. Capped at ~2 MB so a single inline data URL
  // can't blow past the global 1 MB JSON parser; the body parser also enforces
  // its own limit so this is defence-in-depth.
  app.patch("/api/cases/:id/visa-copy", async (req, res) => {
    try {
      const c = await storage.getCase(req.params.id);
      if (!c) return res.status(404).json({ error: "Not found" });
      if (!requireTenantAccess(req, res, c.tenantId)) return;
      // Stage gate: visa copies are only meaningful once the destination
      // authority has approved the application. Block uploads on any other
      // stage so the UI affordance and server stay in sync.
      if (c.visaStage !== "approved") {
        return res.status(409).json({
          error: "Visa copy can only be uploaded after the case is approved.",
        });
      }
      const url = req.body?.visaCopyFileUrl;
      const name = req.body?.visaCopyFileName;
      if (url !== undefined && url !== null && typeof url !== "string") {
        return res.status(400).json({ error: "visaCopyFileUrl must be a string" });
      }
      if (typeof url === "string" && url.length > 3_000_000) {
        return res.status(413).json({ error: "Visa copy file is too large (max ~2 MB)" });
      }
      if (name !== undefined && name !== null && typeof name !== "string") {
        return res.status(400).json({ error: "visaCopyFileName must be a string" });
      }
      const patch: any = {};
      if (url !== undefined) patch.visaCopyFileUrl = url;
      if (name !== undefined) patch.visaCopyFileName = name;
      const updated = await storage.updateCase(c.id, patch);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to update visa copy" });
    }
  });

  // ============================================================
  // Appointments — embassy / VFS / BLS / other bookings per case.
  // Tenant isolation is enforced via the parent case's tenantId.
  // ============================================================
  function validateAppointmentEnums(body: any): string | null {
    if (body?.appointmentType !== undefined) {
      const ok = APPOINTMENT_TYPES.some((t) => t.value === body.appointmentType);
      if (!ok) return `Invalid appointmentType: must be one of ${APPOINTMENT_TYPES.map((t) => t.value).join(", ")}`;
    }
    if (body?.status !== undefined) {
      const ok = APPOINTMENT_STATUSES.some((s) => s.value === body.status);
      if (!ok) return `Invalid status: must be one of ${APPOINTMENT_STATUSES.map((s) => s.value).join(", ")}`;
    }
    return null;
  }

  // Tenant-wide list of appointments — used by the agency dashboard for the
  // "Upcoming appointments" panel.
  app.get("/api/tenants/:tenantId/appointments", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    try {
      const list = await storage.getAppointmentsByTenantId(req.params.tenantId);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load appointments" });
    }
  });

  app.get("/api/cases/:caseId/appointments", async (req, res) => {
    try {
      const c = await storage.getCase(req.params.caseId);
      if (!c) return res.status(404).json({ error: "Case not found" });
      if (!requireTenantAccess(req, res, c.tenantId)) return;
      const list = await storage.getAppointmentsByCaseId(req.params.caseId);
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load appointments" });
    }
  });

  app.post("/api/cases/:caseId/appointments", async (req, res) => {
    try {
      const c = await storage.getCase(req.params.caseId);
      if (!c) return res.status(404).json({ error: "Case not found" });
      if (!requireTenantAccess(req, res, c.tenantId)) return;
      const enumError = validateAppointmentEnums(req.body);
      if (enumError) return res.status(400).json({ error: enumError });
      // Required fields — surface a clear 400 instead of letting the DB-style
      // schema fail with a cryptic message.
      const { appointmentType, provider, scheduledAt } = req.body ?? {};
      if (!appointmentType || !provider || !scheduledAt) {
        return res.status(400).json({ error: "appointmentType, provider and scheduledAt are required" });
      }
      // Mirror the 2 MB client-side cap on confirmation files so a crafted
      // request cannot blow up MemStorage with a giant base64 payload.
      if (
        typeof req.body.confirmationFileUrl === "string" &&
        req.body.confirmationFileUrl.length > 3_000_000
      ) {
        return res.status(413).json({ error: "Confirmation file too large (max ~2 MB)" });
      }
      const appt = await storage.createAppointment({
        caseId: c.id,
        tenantId: c.tenantId,
        appointmentType,
        provider: String(provider).trim(),
        location: req.body.location ? String(req.body.location).trim() : null,
        scheduledAt: new Date(scheduledAt),
        confirmationFileUrl: req.body.confirmationFileUrl ?? null,
        confirmationFileName: req.body.confirmationFileName ?? null,
        notes: req.body.notes ?? null,
        status: req.body.status ?? "scheduled",
      });
      // Activity log so the timeline records who scheduled the booking.
      await storage.createActivityLog({
        tenantId: c.tenantId,
        userId: (req as any).session?.userId ?? null,
        action: "appointment.created",
        entityType: "appointment",
        entityId: appt.id,
        details: {
          caseNumber: c.caseNumber,
          appointmentType,
          provider,
          scheduledAt,
        },
      });
      res.status(201).json(appt);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const existing = await storage.getAppointment(req.params.id);
      if (!existing) return res.status(404).json({ error: "Appointment not found" });
      if (!requireTenantAccess(req, res, existing.tenantId)) return;
      const enumError = validateAppointmentEnums(req.body);
      if (enumError) return res.status(400).json({ error: enumError });
      // Whitelist mutable fields. `caseId`/`tenantId` are NEVER mutable so a
      // crafted PATCH cannot re-parent an appointment across cases or tenants.
      const b = req.body ?? {};
      const patch: Partial<InsertAppointment> = {};
      if (b.appointmentType !== undefined) patch.appointmentType = b.appointmentType;
      if (b.provider !== undefined) patch.provider = String(b.provider).trim();
      if (b.location !== undefined) patch.location = b.location ? String(b.location).trim() : null;
      if (b.scheduledAt !== undefined) patch.scheduledAt = new Date(b.scheduledAt);
      if (b.status !== undefined) patch.status = b.status;
      if (b.notes !== undefined) patch.notes = b.notes;
      if (b.confirmationFileUrl !== undefined) {
        // Server-side guard mirroring the 2 MB client cap so a crafted request
        // cannot blow up MemStorage with a giant base64 payload.
        if (typeof b.confirmationFileUrl === "string" && b.confirmationFileUrl.length > 3_000_000) {
          return res.status(413).json({ error: "Confirmation file too large (max ~2 MB)" });
        }
        patch.confirmationFileUrl = b.confirmationFileUrl;
      }
      if (b.confirmationFileName !== undefined) patch.confirmationFileName = b.confirmationFileName;
      const updated = await storage.updateAppointment(req.params.id, patch);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const existing = await storage.getAppointment(req.params.id);
      if (!existing) return res.status(404).json({ error: "Appointment not found" });
      if (!requireTenantAccess(req, res, existing.tenantId)) return;
      const ok = await storage.deleteAppointment(req.params.id);
      res.json({ ok });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to delete appointment" });
    }
  });

  // === Visa stage list (used by the Visa → Processing/Approved/Rejected pages) ===
  app.get("/api/tenants/:tenantId/visa-cases", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const stage = String(req.query.stage ?? "processing");
    if (!VISA_STAGES.some((s) => s.value === stage)) {
      return res.status(400).json({ error: "Invalid stage" });
    }
    const list = await storage.getCasesByTenantAndVisaStage(req.params.tenantId, stage);
    res.json(list);
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
    const parsed = parseCoTravellerBody(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const err = validateCoTraveller(parsed.data);
    if (err) return res.status(400).json({ error: err });
    const created = await storage.createCoTraveller({
      ...parsed.data,
      // Force ownership server-side — never trust caseId/tenantId from body.
      name: parsed.data.name!,
      relationship: parsed.data.relationship!,
      caseId: req.params.caseId,
      tenantId: caseRow.tenantId,
    });
    res.status(201).json(created);
  });

  app.patch("/api/co-travellers/:id", async (req, res) => {
    const existing = await storage.getCoTraveller(req.params.id);
    if (!existing) return res.status(404).json({ error: "Co-traveller not found" });
    if (!requireTenantAccess(req, res, existing.tenantId)) return;
    const parsed = parseCoTravellerBody(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const err = validateCoTraveller({ ...existing, ...parsed.data });
    if (err) return res.status(400).json({ error: err });
    // parsed.data is already stripped of caseId/tenantId by the schema.
    const updated = await storage.updateCoTraveller(req.params.id, parsed.data);
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

  // SaaS admin only — surfaces every case linked to a customer ID across the
  // platform. Tenant-scoped customer flows go through /api/w/:slug/portal/cases.
  app.get("/api/customers/:customerId/cases", requireAdminAuth, async (req, res) => {
    const cases = await storage.getCasesByCustomerId(req.params.customerId);
    res.json(cases);
  });

  // === Document Routes ===
  // Helper: load the parent case and enforce tenant ownership before any
  // case-scoped read/write. Returns the case row on success, or null after
  // it has already written the 401/403/404 response.
  async function caseTenantGuard(req: Request, res: Response, caseId: string) {
    const c = await storage.getCase(caseId);
    if (!c) {
      res.status(404).json({ error: "Case not found" });
      return null;
    }
    if (!requireTenantAccess(req, res, c.tenantId)) return null;
    return c;
  }

  app.get("/api/cases/:caseId/documents", async (req, res) => {
    if (!(await caseTenantGuard(req, res, req.params.caseId))) return;
    const documents = await storage.getDocumentsByCaseId(req.params.caseId);
    res.json(documents);
  });

  app.get("/api/tenants/:tenantId/documents", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const documents = await storage.getDocumentsByTenantId(req.params.tenantId);
    res.json(documents);
  });

  app.post("/api/cases/:caseId/documents", async (req, res) => {
    if (!(await caseTenantGuard(req, res, req.params.caseId))) return;
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
    // Document tenant access is verified through the parent case.
    if (document.caseId) {
      const c = await storage.getCase(document.caseId);
      if (!c || !requireTenantAccess(req, res, c.tenantId)) return;
    } else if (!req.session?.userId || req.session?.userRole !== "saas_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(document);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    const existing = await storage.getDocument(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Document not found" });
    }
    if (existing.caseId) {
      const c = await storage.getCase(existing.caseId);
      if (!c || !requireTenantAccess(req, res, c.tenantId)) return;
    } else if (!req.session?.userId || req.session?.userRole !== "saas_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const document = await storage.updateDocument(req.params.id, req.body);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  });

  // === Message Routes ===
  app.get("/api/cases/:caseId/messages", async (req, res) => {
    if (!(await caseTenantGuard(req, res, req.params.caseId))) return;
    const messages = await storage.getMessagesByCaseId(req.params.caseId);
    res.json(messages);
  });

  app.post("/api/cases/:caseId/messages", async (req, res) => {
    if (!(await caseTenantGuard(req, res, req.params.caseId))) return;
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

  // Platform-level visa knowledge base — only the SaaS admin curates the
  // global catalog. Reads are public so unauthenticated landing pages can
  // surface visa requirements.
  app.post("/api/visa-templates", requireAdminAuth, async (req, res) => {
    const template = await storage.createVisaTemplate(req.body);
    res.status(201).json(template);
  });

  // === Activity Log Routes ===
  app.get("/api/tenants/:tenantId/activity-logs", async (req, res) => {
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
    const logs = await storage.getActivityLogsByTenantId(req.params.tenantId);
    res.json(logs);
  });

  app.post("/api/activity-logs", async (req, res) => {
    // Activity logs MUST be tied to a tenant the caller can write to —
    // otherwise an attacker could spoof audit entries against another agency.
    const tenantId = String(req.body?.tenantId ?? "").trim();
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    if (!requireTenantAccess(req, res, tenantId)) return;
    const log = await storage.createActivityLog({
      ...req.body,
      tenantId,
      // Always tag with the authenticated user; never trust body.userId.
      userId: req.session?.userId ?? null,
    });
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
  app.post("/api/b2c/otp/send", otpRequestRateLimiter, async (req, res) => {
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
  app.post("/api/b2c/otp/verify", otpVerifyRateLimiter, async (req, res) => {
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
  app.get("/api/admin/sms-config", requireAdminAuth, async (req, res) => {
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
  app.post("/api/admin/sms-config", requireAdminAuth, async (req, res) => {
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
  app.post("/api/admin/sms-config/test", requireAdminAuth, async (req, res) => {
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
    // Stripe-side flags
    const stripeMode: "live" | "test" =
      cfg?.stripeMode === "live" || process.env.STRIPE_MODE === "live" ? "live" : "test";
    const stripeTestReady = !!((cfg?.stripeTestPublishableKey || process.env.STRIPE_TEST_PUBLISHABLE_KEY) && (cfg?.stripeTestSecretKey || process.env.STRIPE_TEST_SECRET_KEY));
    const stripeLiveReady = !!((cfg?.stripeLivePublishableKey || process.env.STRIPE_LIVE_PUBLISHABLE_KEY) && (cfg?.stripeLiveSecretKey || process.env.STRIPE_LIVE_SECRET_KEY));
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
      // Stripe block. Only the publishable key is returned in clear text
      // (it's safe to expose to clients). Secret key is masked.
      stripe: {
        mode: stripeMode,
        testPublishableKey: cfg?.stripeTestPublishableKey || "",
        testSecretKey: cfg?.stripeTestSecretKey ? maskKey(cfg.stripeTestSecretKey) : "",
        livePublishableKey: cfg?.stripeLivePublishableKey || "",
        liveSecretKey: cfg?.stripeLiveSecretKey ? maskKey(cfg.stripeLiveSecretKey) : "",
        webhookSecret: cfg?.stripeWebhookSecret ? maskKey(cfg.stripeWebhookSecret) : "",
        hasTestCredentials: stripeTestReady,
        hasLiveCredentials: stripeLiveReady,
        hasWebhookSecret: !!cfg?.stripeWebhookSecret,
        activeReady: stripeMode === "live" ? stripeLiveReady : stripeTestReady,
      },
    });
  });

  app.post("/api/admin/payment-gateway-config", requireAdminAuth, async (req, res) => {
    const {
      provider,
      mode,
      apiVersion,
      testClientId,
      testClientSecret,
      liveClientId,
      liveClientSecret,
      webhookSecret,
      stripe,
    } = req.body;
    const patch: Record<string, any> = {};
    // Active provider for platform subscription billing.
    if (provider === "cashfree" || provider === "stripe") patch.provider = provider;
    if (mode !== undefined) patch.mode = mode === "live" ? "live" : "test";
    if (apiVersion !== undefined) patch.apiVersion = apiVersion || "2023-08-01";
    if (testClientId !== undefined && !String(testClientId).includes("•")) patch.testClientId = testClientId || null;
    if (testClientSecret !== undefined && !String(testClientSecret).includes("•")) patch.testClientSecret = testClientSecret || null;
    if (liveClientId !== undefined && !String(liveClientId).includes("•")) patch.liveClientId = liveClientId || null;
    if (liveClientSecret !== undefined && !String(liveClientSecret).includes("•")) patch.liveClientSecret = liveClientSecret || null;
    if (webhookSecret !== undefined && !String(webhookSecret).includes("•")) patch.webhookSecret = webhookSecret || null;
    // Stripe fields are nested under `stripe`. Mask checks ensure we don't
    // accidentally overwrite a real saved key with the masked placeholder
    // displayed in the UI.
    if (stripe && typeof stripe === "object") {
      if (stripe.mode !== undefined) patch.stripeMode = stripe.mode === "live" ? "live" : "test";
      if (stripe.testPublishableKey !== undefined && !String(stripe.testPublishableKey).includes("•")) {
        patch.stripeTestPublishableKey = stripe.testPublishableKey || null;
      }
      if (stripe.testSecretKey !== undefined && !String(stripe.testSecretKey).includes("•")) {
        patch.stripeTestSecretKey = stripe.testSecretKey || null;
      }
      if (stripe.livePublishableKey !== undefined && !String(stripe.livePublishableKey).includes("•")) {
        patch.stripeLivePublishableKey = stripe.livePublishableKey || null;
      }
      if (stripe.liveSecretKey !== undefined && !String(stripe.liveSecretKey).includes("•")) {
        patch.stripeLiveSecretKey = stripe.liveSecretKey || null;
      }
      if (stripe.webhookSecret !== undefined && !String(stripe.webhookSecret).includes("•")) {
        patch.stripeWebhookSecret = stripe.webhookSecret || null;
      }
    }

    const updated = await storage.upsertPaymentGatewayConfig(patch);
    const activeMode = updated.mode === "live" ? "live" : "test";
    const stripeActiveMode = updated.stripeMode === "live" ? "live" : "test";
    res.json({
      success: true,
      provider: updated.provider || "cashfree",
      mode: activeMode,
      apiVersion: updated.apiVersion || "2023-08-01",
      hasTestCredentials: !!(updated.testClientId && updated.testClientSecret),
      hasLiveCredentials: !!(updated.liveClientId && updated.liveClientSecret),
      hasWebhookSecret: !!updated.webhookSecret,
      activeBaseUrl: activeMode === "live" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
      stripe: {
        mode: stripeActiveMode,
        hasTestCredentials: !!(updated.stripeTestPublishableKey && updated.stripeTestSecretKey),
        hasLiveCredentials: !!(updated.stripeLivePublishableKey && updated.stripeLiveSecretKey),
        hasWebhookSecret: !!updated.stripeWebhookSecret,
      },
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
  app.post("/api/b2c/auth/login", authRateLimiter, async (req, res) => {
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
        req.log.error({ err }, "[b2c/auth/login] session.save failed");
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
  // ============================================================
  // Platform analytics — feeds the SaaS Admin dashboard.
  // Plan pricing is hard-coded here (no per-tier pricing table yet);
  // adjust if/when a `plans` table is introduced.
  // ============================================================
  const PLAN_PRICING_USD: Record<string, number> = {
    free: 0,
    starter: 49,
    professional: 149,
    enterprise: 499,
  };
  function planPrice(plan: string | null | undefined): number {
    return PLAN_PRICING_USD[plan ?? ""] ?? 0;
  }

  // Shared calendar-day window helper. A "days=N" window covers the last N
  // *full* calendar days ending tomorrow at 00:00 (i.e. today is included).
  // Returns symmetric current and previous windows so period-over-period
  // deltas compare equal-length spans.
  function buildAnalyticsWindow(days: number) {
    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);
    const endExclusive = new Date(todayMid);
    endExclusive.setDate(todayMid.getDate() + 1);
    const startNow = new Date(endExclusive);
    startNow.setDate(endExclusive.getDate() - days);
    const startPrev = new Date(startNow);
    startPrev.setDate(startNow.getDate() - days);
    return { days, startPrev, startNow, endExclusive };
  }

  app.get("/api/admin/weekly-activity", requireAdminAuth, async (req, res) => {
    const requestedDays = Math.max(7, Math.min(90, Number(req.query.days) || 7));
    const { startNow } = buildAnalyticsWindow(requestedDays);
    const [tenants, activityLogs] = await Promise.all([
      storage.getAllTenants(),
      storage.getAllActivityLogs(),
    ]);
    const allCases = (await Promise.all(tenants.map(t => storage.getCasesByTenantId(t.id)))).flat();

    const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const result = Array.from({ length: requestedDays }, (_, i) => {
      const d = new Date(startNow);
      d.setDate(startNow.getDate() + i);
      const nextDay = new Date(d);
      nextDay.setDate(d.getDate() + 1);
      const inWindow = (ts: Date | null | undefined) => {
        if (!ts) return false;
        const t = new Date(ts);
        return t >= d && t < nextDay;
      };
      const cases = allCases.filter(c => inWindow(c.createdAt)).length;
      const checks = activityLogs.filter(l => inWindow(l.createdAt)).length;
      const newTenants = tenants.filter(t => inWindow(t.createdAt)).length;
      // Approvals: only count cases whose visa stage was explicitly transitioned
      // to "approved" in this window. Don't fall back to updatedAt — unrelated
      // edits to an already-approved case would otherwise re-trigger the count.
      const approvals = allCases.filter(c =>
        c.visaStage === "approved" && inWindow(c.visaStatusUpdatedAt),
      ).length;
      // Short label: weekday for ≤14d windows, otherwise "MMM D".
      const label = requestedDays <= 14
        ? dayLabels[d.getDay()]
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: d.toISOString(),
        day: label,
        cases,
        checks,
        newTenants,
        approvals,
      };
    });
    res.json(result);
  });

  app.get("/api/admin/stats", requireAdminAuth, async (req, res) => {
    const days = Math.max(7, Math.min(90, Number(req.query.days) || 30));
    const { startNow, startPrev, endExclusive } = buildAnalyticsWindow(days);
    const today = new Date(); today.setHours(0,0,0,0);

    const [tenants, users, b2cUsers, activityLogs, smsCfg, aiCfg] = await Promise.all([
      storage.getAllTenants(),
      storage.getAllUsers(),
      storage.getAllB2cUsers(),
      storage.getAllActivityLogs(),
      storage.getSmsConfig().catch(() => undefined),
      storage.getPlatformAiConfig().catch(() => undefined),
    ]);

    // All cases + per-tenant gateway config (parallel).
    const [casesPerTenant, gatewayConfigs] = await Promise.all([
      Promise.all(tenants.map(t => storage.getCasesByTenantId(t.id))),
      Promise.all(tenants.map(t => storage.getTenantPaymentGatewayConfig(t.id).catch(() => undefined))),
    ]);
    const allCases = casesPerTenant.flat();

    // Window helpers.
    const inWindow = (ts: Date | null | undefined, from: Date, to: Date) => {
      if (!ts) return false;
      const t = new Date(ts);
      return t >= from && t < to;
    };
    const decided = (cs: typeof allCases) => {
      const approved = cs.filter(c => c.visaStage === "approved").length;
      const rejected = cs.filter(c => c.visaStage === "rejected").length;
      return { approved, rejected, rate: approved + rejected ? approved / (approved + rejected) : 0 };
    };

    const newTenantsThisPeriod = tenants.filter(t => inWindow(t.createdAt, startNow, endExclusive)).length;
    const newTenantsPrev       = tenants.filter(t => inWindow(t.createdAt, startPrev, startNow)).length;
    const newCasesThisPeriod   = allCases.filter(c => inWindow(c.createdAt, startNow, endExclusive)).length;
    const newCasesPrev         = allCases.filter(c => inWindow(c.createdAt, startPrev, startNow)).length;
    const newUsersThisPeriod   = users.filter(u => inWindow(u.createdAt, startNow, endExclusive)).length;
    const newUsersPrev         = users.filter(u => inWindow(u.createdAt, startPrev, startNow)).length;

    // Decided-this-period: only cases explicitly transitioned to approved/rejected
    // in this window. We don't fall back to updatedAt because unrelated case edits
    // would re-count an already-decided case.
    const decidedNow  = decided(allCases.filter(c => inWindow(c.visaStatusUpdatedAt, startNow, endExclusive)));
    const decidedPrev = decided(allCases.filter(c => inWindow(c.visaStatusUpdatedAt, startPrev, startNow)));

    // MRR — sum of plan prices for non-suspended tenants.
    // NOTE: `mrrPrev` is an approximation. We don't store historical plan/status
    // changes, so we estimate by excluding tenants created during the current
    // window. Mid-window plan upgrades or suspensions won't reflect in the delta.
    const mrr     = tenants.filter(t => t.status !== "suspended").reduce((s, t) => s + planPrice(t.plan), 0);
    const mrrPrev = tenants.filter(t =>
      t.status !== "suspended" && (!t.createdAt || new Date(t.createdAt) < startNow),
    ).reduce((s, t) => s + planPrice(t.plan), 0);

    // Visa funnel across all cases.
    const visaFunnel = {
      notStarted: allCases.filter(c => !c.visaStage || c.visaStage === "not_started").length,
      processing: allCases.filter(c => c.visaStage === "processing").length,
      approved:   allCases.filter(c => c.visaStage === "approved").length,
      rejected:   allCases.filter(c => c.visaStage === "rejected").length,
    };

    // Top destinations by case count.
    const destCounts: Record<string, number> = {};
    for (const c of allCases) {
      const k = (c.destinationCountry || "Unknown").trim();
      destCounts[k] = (destCounts[k] ?? 0) + 1;
    }
    const topDestinations = Object.entries(destCounts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top agencies by case volume (last 30d).
    const tenantCaseCounts = tenants.map((t, i) => ({
      id: t.id,
      name: t.name,
      plan: t.plan,
      status: t.status,
      caseCount: casesPerTenant[i].length,
      recentCaseCount: casesPerTenant[i].filter(c => inWindow(c.createdAt, startNow, endExclusive)).length,
    }));
    const topAgencies = tenantCaseCounts
      .slice()
      .sort((a, b) => b.caseCount - a.caseCount)
      .slice(0, 5);

    // Integration health.
    const gatewayCount = gatewayConfigs.filter(g => !!(g?.testClientId || g?.liveClientId)).length;
    const liveGatewayCount = gatewayConfigs.filter(g => !!g?.liveClientId).length;
    const integrationsHealth = {
      gateway: {
        configuredTenants: gatewayCount,
        liveTenants: liveGatewayCount,
        totalTenants: tenants.length,
      },
      sms: { configured: !!(smsCfg as any)?.apiKey || !!(smsCfg as any)?.mcCustomerId },
      ai:  { configured: !!aiCfg?.anthropicApiKey || !!process.env.ANTHROPIC_API_KEY },
    };

    res.json({
      // existing fields (preserved for backward compat)
      tenantCount: tenants.length,
      activeTenantCount: tenants.filter(t => t.status === "active").length,
      agencyUserCount: users.filter(u => u.role !== "saas_admin").length,
      b2cUserCount: b2cUsers.length,
      totalCases: allCases.length,
      activityToday: activityLogs.filter(l => l.createdAt && new Date(l.createdAt) >= today).length,
      planBreakdown: {
        starter: tenants.filter(t => t.plan === "starter").length,
        professional: tenants.filter(t => t.plan === "professional").length,
        enterprise: tenants.filter(t => t.plan === "enterprise").length,
      },
      // NEW analytics
      window: { days, from: startNow.toISOString(), to: endExclusive.toISOString() },
      mrr,
      mrrPrev,
      newTenantsThisPeriod, newTenantsPrev,
      newCasesThisPeriod,   newCasesPrev,
      newUsersThisPeriod,   newUsersPrev,
      approvalRate:     decidedNow.rate,
      approvalRatePrev: decidedPrev.rate,
      decidedThisPeriod: decidedNow.approved + decidedNow.rejected,
      visaFunnel,
      topDestinations,
      topAgencies,
      integrationsHealth,
      generatedAt: new Date().toISOString(),
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

  // ---- saas_admin "all data" cross-tenant views ----
  // Each endpoint enriches rows with the agency name/slug so the admin
  // doesn't have to do a second lookup per row in the UI.
  app.get("/api/admin/cases", requireAdminAuth, async (_req, res) => {
    const [cases, tenants] = await Promise.all([
      storage.getAllCases(),
      storage.getAllTenants(),
    ]);
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const enriched = cases.map((c) => ({
      ...c,
      tenantName: tenantById.get(c.tenantId)?.name ?? null,
      tenantSlug: tenantById.get(c.tenantId)?.slug ?? null,
      tenantPlan: tenantById.get(c.tenantId)?.plan ?? null,
    }));
    enriched.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    res.json(enriched);
  });

  app.get("/api/admin/leads", requireAdminAuth, async (_req, res) => {
    const [leads, tenants] = await Promise.all([
      storage.getAllLeads(),
      storage.getAllTenants(),
    ]);
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const enriched = leads.map((l) => ({
      ...l,
      tenantName: tenantById.get(l.tenantId)?.name ?? null,
      tenantSlug: tenantById.get(l.tenantId)?.slug ?? null,
    }));
    enriched.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    res.json(enriched);
  });

  app.get("/api/admin/proposals", requireAdminAuth, async (_req, res) => {
    const [proposals, tenants] = await Promise.all([
      storage.getAllProposals(),
      storage.getAllTenants(),
    ]);
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const enriched = proposals.map((p) => ({
      ...p,
      tenantName: tenantById.get(p.tenantId)?.name ?? null,
      tenantSlug: tenantById.get(p.tenantId)?.slug ?? null,
    }));
    enriched.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    res.json(enriched);
  });

  app.get("/api/admin/invoices", requireAdminAuth, async (_req, res) => {
    const [invoices, tenants] = await Promise.all([
      storage.getAllInvoices(),
      storage.getAllTenants(),
    ]);
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const enriched = invoices.map((inv) => ({
      ...inv,
      tenantName: tenantById.get(inv.tenantId)?.name ?? null,
      tenantSlug: tenantById.get(inv.tenantId)?.slug ?? null,
    }));
    enriched.sort((a, b) => (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0));
    res.json(enriched);
  });

  app.get("/api/admin/payments", requireAdminAuth, async (_req, res) => {
    const [payments, invoices, tenants] = await Promise.all([
      storage.getAllPayments(),
      storage.getAllInvoices(),
      storage.getAllTenants(),
    ]);
    const tenantById = new Map(tenants.map((t) => [t.id, t]));
    const invoiceById = new Map(invoices.map((i) => [i.id, i]));
    const enriched = payments.map((p) => {
      const inv = invoiceById.get(p.invoiceId);
      return {
        ...p,
        tenantName: tenantById.get(p.tenantId)?.name ?? null,
        tenantSlug: tenantById.get(p.tenantId)?.slug ?? null,
        invoiceNumber: inv?.invoiceNumber ?? null,
        invoiceCustomer: inv?.customerName ?? null,
        invoiceCurrency: inv?.currency ?? null,
      };
    });
    enriched.sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
    res.json(enriched);
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
  // The team listing is needed by the leads + case-new pages to populate
  // their assignee dropdowns, so we open it to all team-role users of the
  // tenant — but customers signed into the same tenant must NOT be able to
  // enumerate the agency's internal staff names/emails. saas_admin bypasses.
  app.get("/api/tenants/:tenantId/staff", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const callerId = req.session?.userId;
    const caller = callerId ? await storage.getUser(callerId) : null;
    if (!caller) return res.status(401).json({ error: "Authentication required" });
    // Only team members of this tenant (or a saas_admin) may enumerate the
    // staff directory — customers signed into the same tenant must never see
    // the agency's internal staff names/emails.
    const isTeamMember = caller.tenantId === tenantId
      && ["agency_owner", "agency_manager", "agency_staff"].includes(caller.role);
    if (caller.role !== "saas_admin" && !isTeamMember) {
      return res.status(403).json({ error: "You don't have access to this agency's team" });
    }
    const users = await storage.getUsersByTenantId(tenantId);
    const staff = users
      .filter(u => ["agency_owner", "agency_staff", "agency_manager"].includes(u.role))
      .map(({ password: _, ...u }) => u)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    res.json(staff);
  });

  app.post("/api/tenants/:tenantId/staff", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    // Only an owner/manager of THIS tenant (or a saas_admin) can invite staff.
    const caller = await requireTenantStaffAdmin(req, res, tenantId);
    if (!caller) return; // helper already wrote the error response
    const { email, name, role, permissions } = req.body;
    if (!email || !name) return res.status(400).json({ error: "Email and name are required" });
    // Block creating another agency_owner via this endpoint — owners are
    // seeded during signup and only saas_admin should ever mint a new one.
    const requestedRole = (role ?? "agency_staff") as string;
    if (requestedRole === "agency_owner" && caller.role !== "saas_admin") {
      return res.status(403).json({ error: "Cannot invite a user as agency owner" });
    }
    if (!["agency_staff", "agency_manager", "agency_owner"].includes(requestedRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }
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
    // Whitelist permissions against the canonical AGENCY_PERMISSIONS set so
    // a malicious client can't inject arbitrary strings into the array.
    const safePermissions = Array.isArray(permissions)
      ? permissions.filter((p: unknown): p is string =>
          typeof p === "string" && (AGENCY_PERMISSIONS as readonly string[]).includes(p))
      : [];
    const tempPassword = Math.random().toString(36).slice(-10) + "Aa1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const user = await storage.createUser({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password: hashedPassword,
      role: requestedRole,
      tenantId,
      avatarUrl: null,
      permissions: safePermissions,
    });
    // Try to email the credentials. Fall back to returning the temp password
    // so the agency owner can hand it over manually if email isn't configured.
    const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ?? req.protocol;
    const host = req.headers.host ?? "";
    const loginUrl = host ? `${proto}://${host}/login` : "/login";
    const emailResult = await sendStaffInviteEmail({
      to: email.toLowerCase().trim(),
      name: name.trim(),
      tenantName: tenant?.name ?? "your agency",
      tempPassword,
      loginUrl,
    });
    await storage.createActivityLog({
      tenantId,
      userId: req.session.userId ?? null,
      action: "staff.invited",
      entityType: "user",
      entityId: user.id,
      details: {
        email, name,
        role: requestedRole,
        permissions: safePermissions,
        emailSent: emailResult.ok,
      },
    });
    const { password: _, ...safeUser } = user;
    res.status(201).json({
      ...safeUser,
      // Always include the temp password for the owner UI — even when email
      // succeeds the owner may want to hand it over directly. The UI keeps
      // it inside the success toast for ~10s and never persists it anywhere.
      tempPassword,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    });
  });

  app.patch("/api/tenants/:tenantId/staff/:userId", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const caller = await requireTenantStaffAdmin(req, res, tenantId);
    if (!caller) return;
    // Confirm the target user actually belongs to this tenant AND is a
    // team-role user — these "staff" endpoints must never mutate a customer
    // account (or any other non-staff role) that happens to share the tenant.
    const target = await storage.getUser(req.params.userId);
    if (!target || target.tenantId !== tenantId
        || !["agency_owner", "agency_manager", "agency_staff"].includes(target.role)) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    const { role, name, permissions } = req.body;
    const patch: { role?: string; name?: string; permissions?: string[] } = {};
    if (name !== undefined) patch.name = name;
    if (role !== undefined) {
      if (!["agency_staff", "agency_manager", "agency_owner"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      // Ownership transfers must go through a dedicated flow (or saas_admin).
      // Block both demoting an owner and promoting anyone TO owner here.
      const isOwnershipChange = target.role === "agency_owner" || role === "agency_owner";
      if (isOwnershipChange && caller.role !== "saas_admin") {
        return res.status(403).json({ error: "Ownership changes are not allowed via this endpoint" });
      }
      patch.role = role;
    }
    if (Array.isArray(permissions)) {
      patch.permissions = permissions.filter((p: unknown): p is string =>
        typeof p === "string" && (AGENCY_PERMISSIONS as readonly string[]).includes(p));
    }
    const user = await storage.updateUser(req.params.userId, patch);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.delete("/api/tenants/:tenantId/staff/:userId", requireAgencyAuth, async (req, res) => {
    const tenantId = req.params.tenantId;
    const userId = req.params.userId;
    const caller = await requireTenantStaffAdmin(req, res, tenantId);
    if (!caller) return;
    if (userId === req.session.userId) {
      return res.status(400).json({ error: "You cannot remove yourself" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.tenantId !== tenantId
        || !["agency_owner", "agency_manager", "agency_staff"].includes(user.role)) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    // Block deleting the agency owner via this endpoint — same rule as PATCH.
    if (user.role === "agency_owner" && caller.role !== "saas_admin") {
      return res.status(403).json({ error: "Cannot remove the agency owner" });
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
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
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
    if (!requireTenantAccess(req, res, req.params.tenantId)) return;
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

  // ── Agency API Platform (paid pay-per-call public APIs + dashboard CRUD)
  // Wire the Agency API Platform with Cashfree helpers so it can offer
  // tenants a self-serve wallet top-up reusing this app's existing gateway
  // integration (no second Cashfree client).
  await registerApiPlatformRoutes(app, {
    requireTenantAccess,
    cashfree: {
      getCredentials: async (tenantId: string) => {
        // Prefer tenant-scoped credentials (matches the invoice flow).
        // Fall back to platform creds via the same helper signature.
        const cfg = (await storage.getTenantPaymentGatewayConfig(tenantId))
          ?? (await storage.getPaymentGatewayConfig());
        return getCashfreeCredentials(cfg);
      },
      getRequestOrigin,
      readBody: readCashfreeBody,
    },
  });

  // ── Platform extensions: granular admin roles, support tickets, tenant
  // subscription billing. The agency pays the platform via Cashfree using
  // PLATFORM creds (not tenant-scoped) — different from the invoice flow.
  registerPlatformExtensions(app, {
    getPlatformGateway: async () => {
      const cfg = await storage.getPaymentGatewayConfig();
      const provider = (cfg?.provider === "stripe" ? "stripe" : "cashfree") as "cashfree" | "stripe";
      return {
        provider,
        cashfree: getCashfreeCredentials(cfg),
        stripe: getStripeCredentials(cfg),
      };
    },
    getRequestOrigin,
    readCashfreeBody,
  });

  return httpServer;
}
