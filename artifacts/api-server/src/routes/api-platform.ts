// Agency API Platform — paid public APIs for agencies to resell.
// Two products: Deep Check API and Visa Requirement API.
//
// Routes split:
//   • /api/v1/*               — public, key-authenticated, billed per call
//   • /api                    — public marketing HTML (server-rendered)
//   • /api/api-pricing        — public price table JSON (no auth)
//   • /api/agency/api/*       — authenticated agency dashboard CRUD
//   • /api/admin/api/*        — saas-admin price configuration
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { runDeepCheck, type DeepCheckFormData } from "../ai";
import { getCountryVisaTypes } from "../shared/visa-catalog";
import { getEntryRequirement } from "../shared/visa-free";
import {
  apiKeys, apiUsage, apiPricing, tenantWallet, tenantWalletLedger, resellerLinks,
  API_ENDPOINTS, type ApiEndpointSlug,
} from "@workspace/db";
import { eq, and, desc, sql as dsql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as dbSchema from "@workspace/db";
import { randomBytes, randomUUID, createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

// Drizzle transaction handle. `db` itself is typed `any` in this codebase
// because of the conditional pool init in db.ts, so we reach into the
// concrete drizzle node-postgres type to recover proper tx typing for
// callbacks here without leaking `any`.
type DbTx = Parameters<Parameters<NodePgDatabase<typeof dbSchema>["transaction"]>[0]>[0];

type ApiKeyRow = typeof apiKeys.$inferSelect;
type LedgerRow = typeof tenantWalletLedger.$inferSelect;
type PricingRow = typeof apiPricing.$inferSelect;

// The Express session type isn't augmented with our custom userEmail /
// userName fields in this package, but they're populated by the auth
// middleware. This narrow accessor returns a string when the field is
// present and a string, otherwise undefined — without leaking `any`.
function getSessionField(req: Request, key: "userEmail" | "userName"): string | undefined {
  const session = req.session as unknown as Record<string, unknown> | undefined;
  const v = session?.[key];
  return typeof v === "string" ? v : undefined;
}

// Default per-call prices (cents, USD) — seeded if the row is missing.
const DEFAULT_PRICES: Record<ApiEndpointSlug, { priceCents: number; description: string }> = {
  "deep-check": {
    priceCents: 199,
    description: "AI-powered embassy-style visa risk assessment with dimension scores, risk register, and action plan.",
  },
  "visa-requirements": {
    priceCents: 25,
    description: "Visa requirement lookup: required documents, visa types, processing time, and visa-free / e-visa status.",
  },
};

// Per-key rate limit: 60 requests/minute. Hitting it returns 429 + Retry-After.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const rlBuckets = new Map<string, { count: number; windowStart: number }>();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKey?: { id: string; tenantId: string; parentTenantId: string | null; scopes: string[] };
    }
  }
}

// ── helpers ───────────────────────────────────────────────────────────────
function generateApiKeySecret(): { prefix: string; secret: string; full: string; hashed: string } {
  // vs_<8-char-prefix>_<48-char-secret>
  const prefix = randomBytes(6).toString("base64url").slice(0, 8);
  const secret = randomBytes(32).toString("base64url");
  const full = `vs_${prefix}_${secret}`;
  const hashed = createHash("sha256").update(secret).digest("hex");
  return { prefix, secret, full, hashed };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

async function ensurePricingSeeded() {
  for (const slug of API_ENDPOINTS) {
    const existing = await db.select().from(apiPricing).where(eq(apiPricing.endpoint, slug)).limit(1);
    if (existing.length === 0) {
      const cfg = DEFAULT_PRICES[slug];
      await db.insert(apiPricing).values({
        endpoint: slug, priceCents: cfg.priceCents, currency: "USD",
        description: cfg.description, active: true,
      });
    }
  }
}

async function getPriceCents(endpoint: ApiEndpointSlug): Promise<{ priceCents: number; currency: string }> {
  const rows = await db.select().from(apiPricing).where(eq(apiPricing.endpoint, endpoint)).limit(1);
  if (rows.length === 0) return { priceCents: DEFAULT_PRICES[endpoint].priceCents, currency: "USD" };
  return { priceCents: rows[0].priceCents, currency: rows[0].currency };
}

async function getOrCreateWallet(tenantId: string) {
  const rows = await db.select().from(tenantWallet).where(eq(tenantWallet.tenantId, tenantId)).limit(1);
  if (rows.length > 0) return rows[0];
  // INSERT ... ON CONFLICT DO NOTHING-style race-safe creation. The unique
  // constraint on tenant_id ensures only one wallet per tenant.
  try {
    const inserted = await db.insert(tenantWallet).values({ tenantId, balanceCents: 0, currency: "USD" }).returning();
    return inserted[0];
  } catch {
    const again = await db.select().from(tenantWallet).where(eq(tenantWallet.tenantId, tenantId)).limit(1);
    return again[0];
  }
}

// Read-only wallet balance check. Used for cheap pre-flight 402 before we
// invoke the (expensive) upstream provider.
async function readWalletBalance(tenantId: string): Promise<number> {
  const w = await getOrCreateWallet(tenantId);
  return w?.balanceCents ?? 0;
}

// ATOMIC settlement: in a single Drizzle transaction:
//   1. Conditional UPDATE balance -= priceCents (only if balance >= priceCents)
//   2. INSERT api_usage row (status=200)
//   3. INSERT tenant_wallet_ledger row referencing the api_usage.id
// Either all three commit or all three roll back. Returns null when the
// balance was raced down below the price between pre-check and settlement.
async function settleSuccessAtomic(opts: {
  tenantId: string;
  apiKeyId: string;
  endpoint: ApiEndpointSlug;
  priceCents: number;
  latencyMs: number;
  ip?: string | null;
}): Promise<{ balanceAfter: number; usageId: string } | null> {
  return await db.transaction(async (tx: DbTx) => {
    const updated = await tx
      .update(tenantWallet)
      .set({
        balanceCents: dsql`${tenantWallet.balanceCents} - ${opts.priceCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(tenantWallet.tenantId, opts.tenantId), dsql`${tenantWallet.balanceCents} >= ${opts.priceCents}`))
      .returning();
    if (updated.length === 0) return null;
    const balanceAfter = updated[0].balanceCents;
    const usage = await tx.insert(apiUsage).values({
      tenantId: opts.tenantId, apiKeyId: opts.apiKeyId, endpoint: opts.endpoint,
      status: 200, costCents: opts.priceCents, latencyMs: opts.latencyMs, ip: opts.ip ?? null,
    }).returning({ id: apiUsage.id });
    const usageId = usage[0].id;
    await tx.insert(tenantWalletLedger).values({
      tenantId: opts.tenantId, amountCents: -opts.priceCents, balanceAfterCents: balanceAfter,
      type: "api_debit", reference: `usage:${usageId}`, notes: `${opts.endpoint} API call`,
    });
    return { balanceAfter, usageId };
  });
}

// Used for rejected/error calls — logs a usage row OUTSIDE any wallet tx,
// since costCents is 0 in these cases (the wallet was never debited).
async function logRejectedCall(opts: {
  tenantId: string; apiKeyId: string; endpoint: ApiEndpointSlug;
  status: number; latencyMs: number; errorCode: string; ip?: string | null;
}) {
  await db.insert(apiUsage).values({
    tenantId: opts.tenantId, apiKeyId: opts.apiKeyId, endpoint: opts.endpoint,
    status: opts.status, costCents: 0, latencyMs: opts.latencyMs,
    errorCode: opts.errorCode, ip: opts.ip ?? null,
  });
}

async function creditWallet(tenantId: string, amountCents: number, refType: string, reference: string, notes?: string): Promise<number> {
  await getOrCreateWallet(tenantId);
  return await db.transaction(async (tx: DbTx) => {
    const updated = await tx
      .update(tenantWallet)
      .set({ balanceCents: dsql`${tenantWallet.balanceCents} + ${amountCents}`, updatedAt: new Date() })
      .where(eq(tenantWallet.tenantId, tenantId))
      .returning();
    const balanceAfter = updated[0]?.balanceCents ?? 0;
    await tx.insert(tenantWalletLedger).values({
      tenantId, amountCents, balanceAfterCents: balanceAfter,
      type: refType, reference, notes: notes ?? null,
    });
    return balanceAfter;
  });
}

// ── auth + rate limit middleware ──────────────────────────────────────────
async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.header("authorization") || "";
  const m = /^Bearer\s+(vs_([A-Za-z0-9_-]{6,16})_([A-Za-z0-9_-]+))\s*$/.exec(auth);
  if (!m) {
    res.status(401).json({ error: { code: "unauthorized", message: "Missing or malformed Authorization header. Expected: Authorization: Bearer vs_<prefix>_<secret>" } });
    return;
  }
  const prefix = m[2];
  const secret = m[3];
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.prefix, prefix)).limit(1);
  if (rows.length === 0) {
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid API key" } });
    return;
  }
  const row = rows[0];
  if (row.status !== "active") {
    res.status(401).json({ error: { code: "unauthorized", message: "API key revoked" } });
    return;
  }
  const expected = createHash("sha256").update(secret).digest("hex");
  if (!safeEqualHex(expected, row.hashedSecret)) {
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid API key" } });
    return;
  }
  // Best-effort lastUsedAt; do not block on failure.
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id)).catch(() => {});
  req.apiKey = {
    id: row.id, tenantId: row.tenantId, parentTenantId: row.parentTenantId ?? null,
    scopes: row.scopes ?? [],
  };
  next();
}

// Per-endpoint scope guard. Apply AFTER requireApiKey. An empty scope list is
// treated as "any endpoint" so legacy keys aren't broken; non-empty scopes
// are enforced strictly. Returns 403 with `forbidden_scope` on mismatch.
function requireScope(scope: ApiEndpointSlug) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ak = req.apiKey;
    if (!ak) { res.status(401).json({ error: { code: "unauthorized", message: "Missing API key" } }); return; }
    if (ak.scopes.length > 0 && !ak.scopes.includes(scope)) {
      res.status(403).json({
        error: { code: "forbidden_scope", message: `This API key is not authorized for ${scope}.` },
      });
      return;
    }
    next();
  };
}

function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ak = req.apiKey!;
  const now = Date.now();
  let b = rlBuckets.get(ak.id);
  if (!b || now - b.windowStart > RATE_WINDOW_MS) {
    b = { count: 0, windowStart: now };
    rlBuckets.set(ak.id, b);
  }
  b.count++;
  if (b.count > RATE_LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - b.windowStart)) / 1000));
    res.setHeader("Retry-After", String(retryAfterSec));
    res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.status(429).json({ error: { code: "rate_limited", message: `Rate limit ${RATE_LIMIT}/min exceeded. Retry in ${retryAfterSec}s.` } });
    return;
  }
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - b.count)));
  next();
}

type RequireTenantAccessFn = (req: Request, res: Response, tenantId: string) => boolean;

// Cashfree helper plumbing — passed in from routes.ts so we don't fork a
// second integration. Kept minimal: just enough to create + verify an order.
export interface CashfreeHelpers {
  /** Read tenant-scoped Cashfree credentials (or platform fallback). */
  getCredentials: (tenantId: string) => Promise<{
    mode: "live" | "test";
    baseUrl: string;
    apiVersion: string;
    clientId?: string;
    clientSecret?: string;
  }>;
  getRequestOrigin: (req: Request) => string;
  readBody: (response: globalThis.Response) => Promise<any>;
}

// ── public v1 endpoints ───────────────────────────────────────────────────
const deepCheckBodySchema = z.object({ formData: z.record(z.string(), z.any()) });
const visaReqBodySchema = z.object({
  nationality: z.string().min(2),
  destinationCountry: z.string().min(2),
  visaType: z.string().optional(),
});

const BRAND_GRADIENT = "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)";

export async function registerApiPlatformRoutes(
  app: Express,
  helpers: { requireTenantAccess: RequireTenantAccessFn; cashfree?: CashfreeHelpers },
) {
  await ensurePricingSeeded().catch((err) => {
    console.warn("[api-platform] pricing seed skipped:", err?.message);
  });

  // ── Public marketing HTML at GET /api ───────────────────────────────────
  // The api-server is mounted at /api by the path-based proxy, so this is
  // the canonical pricing landing page. Indexable, no auth.
  app.get("/api", async (_req, res) => {
    let prices: { endpoint: string; priceCents: number; description: string | null }[] = [];
    try {
      const rows = await db.select().from(apiPricing).where(eq(apiPricing.active, true)).orderBy(apiPricing.endpoint);
      prices = rows.map((r: PricingRow) => ({ endpoint: r.endpoint as ApiEndpointSlug, priceCents: r.priceCents, description: r.description }));
    } catch { /* fall through with empty list */ }
    const cards = prices.map((p) => `
      <div class="card">
        <div class="badge">Production</div>
        <h2>${p.endpoint.replace(/-/g, " ")}</h2>
        <div class="price">$${(p.priceCents / 100).toFixed(2)} <span>/ call</span></div>
        <p>${p.description ?? ""}</p>
        <code>POST /api/v1/${p.endpoint}</code>
      </div>`).join("");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>VisaShuttle API — Pay-per-call visa intelligence</title>
<meta name="description" content="Embed visa intelligence into your product. Pay per call, no subscriptions. Deep Check API and Visa Requirement API."/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="canonical" href="/api"/>
<link href="https://rsms.me/inter/inter.css" rel="stylesheet"/>
<style>
  :root { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
  body { margin:0; background:#0b0d12; color:#fff; line-height:1.5; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 64px 24px; }
  .eyebrow { font-size:12px; letter-spacing:.2em; text-transform:uppercase;
    background: ${BRAND_GRADIENT}; -webkit-background-clip:text; background-clip:text;
    color:transparent; font-weight:600; margin-bottom:12px; }
  h1 { font-size: 56px; line-height:1.05; margin: 0 0 12px; letter-spacing:-0.02em; font-weight:700; }
  .lede { color:#aab; max-width:640px; font-size:18px; }
  .grid { display:grid; gap:20px; grid-template-columns: 1fr; margin-top:48px; }
  @media(min-width:720px){ .grid{ grid-template-columns: 1fr 1fr; } }
  .card { background:#11141b; border:1px solid #1d212c; border-radius:14px; padding:24px; }
  .card h2 { margin: 0 0 8px; font-size:22px; text-transform:capitalize; }
  .card .badge { font-size:11px; letter-spacing:.18em; text-transform:uppercase;
    background: ${BRAND_GRADIENT}; -webkit-background-clip:text; background-clip:text;
    color:transparent; font-weight:600; margin-bottom:8px; }
  .card .price { font-size:40px; font-weight:700; background:${BRAND_GRADIENT};
    -webkit-background-clip:text; background-clip:text; color:transparent; }
  .card .price span { font-size:14px; color:#889; -webkit-text-fill-color:#889; }
  .card p { color:#aab; }
  .card code { display:inline-block; padding:6px 10px; background:#0b0d12; border-radius:6px;
    font-size:12px; border:1px solid #1d212c; }
  .cta { margin-top:48px; display:flex; gap:12px; flex-wrap:wrap; }
  .btn { padding:12px 22px; border-radius:10px; text-decoration:none; font-weight:600; display:inline-block; }
  .btn-primary { background:${BRAND_GRADIENT}; color:#fff; }
  .btn-ghost { border:1px solid #2a2f3a; color:#fff; }
</style></head><body>
<main class="wrap">
  <div class="eyebrow">Developer APIs</div>
  <h1>Pay-per-call visa intelligence.</h1>
  <p class="lede">Embed embassy-grade risk scoring and country requirement lookups into your product. No subscription, no minimum.</p>
  <div class="grid">${cards || "<p>Pricing loading…</p>"}</div>
  <div class="cta">
    <a class="btn btn-primary" href="/agency-register">Get an API key</a>
    <a class="btn btn-ghost" href="/docs/api">Read the docs</a>
  </div>
</main>
</body></html>`);
  });

  // ── Public price table JSON ─────────────────────────────────────────────
  app.get("/api/api-pricing", async (_req, res) => {
    const rows = await db.select().from(apiPricing).where(eq(apiPricing.active, true)).orderBy(apiPricing.endpoint);
    res.json({
      currency: "USD",
      endpoints: rows.map((r: PricingRow) => ({
        endpoint: r.endpoint, priceCents: r.priceCents, currency: r.currency, description: r.description,
      })),
    });
  });

  // ── POST /api/v1/deep-check ─────────────────────────────────────────────
  app.post("/api/v1/deep-check", requireApiKey, requireScope("deep-check"), rateLimit, async (req, res) => {
    const startedAt = Date.now();
    const ak = req.apiKey!;
    const parsed = deepCheckBodySchema.safeParse(req.body);
    if (!parsed.success) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 400, latencyMs: Date.now() - startedAt, errorCode: "bad_request", ip: req.ip });
      res.status(400).json({ error: { code: "bad_request", message: "Invalid request body. Expected { formData: {...} }" } });
      return;
    }
    const formData = parsed.data.formData as DeepCheckFormData;
    if (!formData.nationality || !formData.destinationCountry || !formData.visaType) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 400, latencyMs: Date.now() - startedAt, errorCode: "bad_request", ip: req.ip });
      res.status(400).json({ error: { code: "bad_request", message: "formData must include nationality, destinationCountry, visaType" } });
      return;
    }
    const { priceCents, currency } = await getPriceCents("deep-check");

    // Cheap pre-flight balance check — avoids an expensive upstream call when
    // the wallet is empty. Authoritative balance check happens atomically
    // inside settleSuccessAtomic.
    const preBalance = await readWalletBalance(ak.tenantId);
    if (preBalance < priceCents) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 402, latencyMs: Date.now() - startedAt, errorCode: "insufficient_balance", ip: req.ip });
      res.status(402).json({ error: { code: "insufficient_balance", message: "Wallet balance is below the per-call price. Top up to continue." } });
      return;
    }

    // Run upstream FIRST. If it fails, we never debit and never log a 200 row.
    let result;
    try {
      const aiConfig = await storage.getPlatformAiConfig();
      const deep = await runDeepCheck(formData, aiConfig);
      result = deep.result;
    } catch (err: unknown) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 502, latencyMs: Date.now() - startedAt, errorCode: "upstream_error", ip: req.ip });
      const message = err instanceof Error ? err.message : String(err);
      const code = /Anthropic API key not configured/i.test(message) ? "ai_not_configured" : "upstream_error";
      res.status(code === "ai_not_configured" ? 503 : 502).json({ error: { code, message: code === "ai_not_configured" ? "Deep Check is temporarily unavailable." : "Deep Check failed to complete. Please retry." } });
      return;
    }
    const latency = Date.now() - startedAt;

    // Atomic settlement: debit + usage row + ledger entry, all-or-nothing.
    const settled = await settleSuccessAtomic({
      tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", priceCents, latencyMs: latency, ip: req.ip,
    });
    if (!settled) {
      // Race: balance dropped below price between pre-check and settle.
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 402, latencyMs: latency, errorCode: "insufficient_balance", ip: req.ip });
      res.status(402).json({ error: { code: "insufficient_balance", message: "Wallet balance is below the per-call price. Top up to continue." } });
      return;
    }

    // Reseller commission, posted ONLY after the success row is committed.
    // Idempotency: ledger reference includes api_usage.id so a retry of the
    // same usage row would never produce a second commission entry.
    const link = await db.select().from(resellerLinks)
      .where(and(eq(resellerLinks.childTenantId, ak.tenantId), eq(resellerLinks.active, true)))
      .limit(1);
    if (link.length > 0 && link[0].commissionCents > 0) {
      await creditWallet(link[0].parentTenantId, link[0].commissionCents, "reseller_commission", `usage:${settled.usageId}`, "Reseller commission")
        .catch((e) => console.warn("[api-platform] commission credit failed:", e?.message));
    }

    res.json({
      meta: {
        endpoint: "deep-check", costCents: priceCents, currency,
        balanceCents: settled.balanceAfter, latencyMs: latency, usageId: settled.usageId,
      },
      result,
    });
  });

  // ── POST /api/v1/visa-requirements ──────────────────────────────────────
  app.post("/api/v1/visa-requirements", requireApiKey, requireScope("visa-requirements"), rateLimit, async (req, res) => {
    const startedAt = Date.now();
    const ak = req.apiKey!;
    const parsed = visaReqBodySchema.safeParse(req.body);
    if (!parsed.success) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 400, latencyMs: Date.now() - startedAt, errorCode: "bad_request", ip: req.ip });
      res.status(400).json({ error: { code: "bad_request", message: "Required fields: nationality, destinationCountry. Optional: visaType" } });
      return;
    }
    const { nationality, destinationCountry, visaType } = parsed.data;
    const { priceCents, currency } = await getPriceCents("visa-requirements");

    const preBalance = await readWalletBalance(ak.tenantId);
    if (preBalance < priceCents) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 402, latencyMs: Date.now() - startedAt, errorCode: "insufficient_balance", ip: req.ip });
      res.status(402).json({ error: { code: "insufficient_balance", message: "Wallet balance is below the per-call price. Top up to continue." } });
      return;
    }

    let payload;
    try {
      const allowedTypes = getCountryVisaTypes(destinationCountry);
      const entry = getEntryRequirement(nationality, destinationCountry);
      const templates = await storage.getAllVisaTemplates();
      const matched = templates.find(
        (t) =>
          t.country?.toLowerCase() === destinationCountry.toLowerCase() &&
          (!visaType || t.visaType?.toLowerCase() === visaType.toLowerCase()),
      );
      payload = {
        nationality, destinationCountry, visaType: visaType ?? null,
        entryRequirement: entry, allowedVisaTypes: allowedTypes,
        template: matched ? {
          visaType: matched.visaType,
          processingTime: matched.processingTime ?? null,
          // Validity is not a schema column today; surface it in the response
          // so consumers can begin parsing it once the template editor adds
          // it. Pulled from the requirements blob if present, else null.
          validity:
            (matched.requirements && typeof matched.requirements === "object" && "validity" in matched.requirements
              ? (matched.requirements as { validity?: string | null }).validity
              : null) ?? null,
          fee: matched.fees ?? null,
          requiredDocuments:
            (matched.requirements && typeof matched.requirements === "object" && "documents" in matched.requirements
              ? (matched.requirements as { documents?: string[] }).documents
              : null) ?? [],
          notes: matched.notes ?? null,
        } : null,
      };
    } catch {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 500, latencyMs: Date.now() - startedAt, errorCode: "internal_error", ip: req.ip });
      res.status(500).json({ error: { code: "internal_error", message: "Visa Requirement lookup failed." } });
      return;
    }
    const latency = Date.now() - startedAt;

    const settled = await settleSuccessAtomic({
      tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", priceCents, latencyMs: latency, ip: req.ip,
    });
    if (!settled) {
      await logRejectedCall({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 402, latencyMs: latency, errorCode: "insufficient_balance", ip: req.ip });
      res.status(402).json({ error: { code: "insufficient_balance", message: "Wallet balance is below the per-call price. Top up to continue." } });
      return;
    }

    const link = await db.select().from(resellerLinks)
      .where(and(eq(resellerLinks.childTenantId, ak.tenantId), eq(resellerLinks.active, true)))
      .limit(1);
    if (link.length > 0 && link[0].commissionCents > 0) {
      await creditWallet(link[0].parentTenantId, link[0].commissionCents, "reseller_commission", `usage:${settled.usageId}`, "Reseller commission")
        .catch((e) => console.warn("[api-platform] commission credit failed:", e?.message));
    }

    res.json({
      meta: {
        endpoint: "visa-requirements", costCents: priceCents, currency,
        balanceCents: settled.balanceAfter, latencyMs: latency, usageId: settled.usageId,
      },
      result: payload,
    });
  });

  // ── Agency dashboard CRUD ───────────────────────────────────────────────
  app.get("/api/agency/:tenantId/api/keys", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.tenantId, req.params.tenantId)).orderBy(desc(apiKeys.createdAt));
    res.json(rows.map((r: ApiKeyRow) => ({ ...r, hashedSecret: undefined })));
  });

  // Create key — full secret returned exactly once.
  app.post("/api/agency/:tenantId/api/keys", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const body = z.object({ name: z.string().min(1).max(80), scopes: z.array(z.string()).optional() }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "name is required" }); return; }
    const { prefix, full, hashed } = generateApiKeySecret();
    const inserted = await db.insert(apiKeys).values({
      tenantId: req.params.tenantId, name: body.data.name, prefix, hashedSecret: hashed,
      scopes: body.data.scopes ?? ["deep-check", "visa-requirements"],
      createdBy: req.session?.userId ?? null,
    }).returning();
    res.status(201).json({ key: { ...inserted[0], hashedSecret: undefined }, secret: full, prefix, oneTime: true });
  });

  // Revoke key
  app.post("/api/agency/:tenantId/api/keys/:id/revoke", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const rows = await db.select().from(apiKeys).where(and(eq(apiKeys.id, req.params.id), eq(apiKeys.tenantId, req.params.tenantId))).limit(1);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(apiKeys).set({ status: "revoked", revokedAt: new Date() }).where(eq(apiKeys.id, req.params.id));
    res.json({ ok: true });
  });

  // ── Wallet + usage ──────────────────────────────────────────────────────
  app.get("/api/agency/:tenantId/api/wallet", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const wallet = await getOrCreateWallet(req.params.tenantId);
    const ledger = await db.select().from(tenantWalletLedger)
      .where(eq(tenantWalletLedger.tenantId, req.params.tenantId))
      .orderBy(desc(tenantWalletLedger.createdAt))
      .limit(100);
    res.json({ wallet, ledger });
  });

  // Saas-admin manual top-up (test/dev). Production tenants use the public
  // Cashfree-backed flow below.
  app.post("/api/agency/:tenantId/api/wallet/topup", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    if (req.session?.userRole !== "saas_admin") {
      res.status(403).json({ error: "Manual top-up requires saas admin. Use the gateway top-up flow instead." });
      return;
    }
    const body = z.object({ amountCents: z.number().int().positive(), notes: z.string().optional() }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "amountCents is required" }); return; }
    const balance = await creditWallet(req.params.tenantId, body.data.amountCents, "topup", `manual:${Date.now()}`, body.data.notes ?? "Manual top-up");
    res.json({ balanceCents: balance });
  });

  // ── Cashfree-backed wallet top-up — reuses the platform Cashfree integration
  // already configured for invoice/proposal payments. Two-step flow:
  //   1. /initiate-topup creates a Cashfree order tagged with the tenantId
  //      and returns a paymentSessionId for the frontend SDK.
  //   2. /confirm-topup verifies the order with Cashfree; on PAID, credits
  //      the wallet ONCE (idempotent on the order id via the ledger
  //      reference column).
  app.post("/api/agency/:tenantId/api/wallet/initiate-topup", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    if (!helpers.cashfree) { res.status(503).json({ error: "Wallet top-up is not configured." }); return; }
    const body = z.object({ amountCents: z.number().int().positive() }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "amountCents is required" }); return; }
    const cashfree = await helpers.cashfree.getCredentials(req.params.tenantId);
    if (!cashfree.clientId || !cashfree.clientSecret) {
      res.status(503).json({ error: "Online payments are not configured for this agency." });
      return;
    }
    const orderId = `WAL_${req.params.tenantId.slice(0, 8)}_${Date.now()}`;
    const requestId = randomUUID();
    const origin = helpers.cashfree.getRequestOrigin(req);
    const payload = {
      order_id: orderId,
      // Cashfree wants the major-unit amount, not cents.
      order_amount: body.data.amountCents / 100,
      order_currency: "USD",
      order_note: `VisaShuttle API wallet top-up`,
      customer_details: {
        customer_id: req.params.tenantId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45),
        customer_email: getSessionField(req, "userEmail") || "noreply@visashuttle.app",
        customer_name: getSessionField(req, "userName") || "Agency",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${origin}/app/business/api/usage?topup_order=${orderId}`,
      },
      order_tags: { product: "wallet_topup", tenant_id: req.params.tenantId, amount_cents: String(body.data.amountCents) },
    };
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
      res.status(503).json({ error: "Payment gateway is temporarily unreachable." });
      return;
    }
    const data = await helpers.cashfree.readBody(gatewayRes);
    if (!gatewayRes.ok) {
      res.status(gatewayRes.status >= 500 ? 503 : gatewayRes.status).json({ error: data?.message || "Unable to create top-up order" });
      return;
    }
    res.json({
      orderId: data.order_id || orderId,
      paymentSessionId: data.payment_session_id,
      mode: cashfree.mode,
      amountCents: body.data.amountCents,
      currency: "USD",
    });
  });

  app.post("/api/agency/:tenantId/api/wallet/confirm-topup", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    if (!helpers.cashfree) { res.status(503).json({ error: "Wallet top-up is not configured." }); return; }
    const orderId = String(req.body?.orderId || "").trim();
    if (!orderId || !/^WAL_[a-zA-Z0-9_-]+$/.test(orderId)) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }
    // Idempotency: refuse to credit twice for the same Cashfree order.
    const existing = await db.select().from(tenantWalletLedger)
      .where(and(eq(tenantWalletLedger.tenantId, req.params.tenantId), eq(tenantWalletLedger.reference, `cashfree:${orderId}`)))
      .limit(1);
    if (existing.length > 0) {
      const wallet = await getOrCreateWallet(req.params.tenantId);
      res.json({ paid: true, alreadyRecorded: true, balanceCents: wallet?.balanceCents ?? 0 });
      return;
    }
    const cashfree = await helpers.cashfree.getCredentials(req.params.tenantId);
    if (!cashfree.clientId || !cashfree.clientSecret) {
      res.status(503).json({ error: "Gateway not configured" });
      return;
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
      res.status(503).json({ error: "Gateway temporarily unreachable" });
      return;
    }
    const data = await helpers.cashfree.readBody(gatewayRes);
    if (!gatewayRes.ok) {
      res.status(gatewayRes.status >= 500 ? 503 : gatewayRes.status).json({ error: data?.message || "Unable to verify payment" });
      return;
    }
    // Strict tenant binding. Every order minted by /initiate-topup carries
    // an `order_tags.tenant_id` matching the tenant that requested it.
    // We REQUIRE this tag to be present and equal to the URL tenant — even
    // a paid Cashfree order from a different tenant cannot be used to
    // credit this wallet.
    const tagTenantId = data?.order_tags?.tenant_id;
    if (!tagTenantId || tagTenantId !== req.params.tenantId) {
      res.status(400).json({ error: "Order does not belong to this tenant" });
      return;
    }
    const isPaid = data.order_status === "PAID";
    if (!isPaid) { res.json({ paid: false, status: data.order_status }); return; }
    const amountCents = Math.round((data.order_amount ?? 0) * 100) || parseInt(data?.order_tags?.amount_cents ?? "0", 10) || 0;
    if (amountCents <= 0) {
      res.status(400).json({ error: "Order amount missing" });
      return;
    }
    const balance = await creditWallet(req.params.tenantId, amountCents, "topup", `cashfree:${orderId}`, `Cashfree ${cashfree.mode} top-up`);
    res.json({ paid: true, balanceCents: balance });
  });

  app.get("/api/agency/:tenantId/api/usage", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const limit = Math.min(parseInt(String(req.query.limit ?? "200"), 10) || 200, 1000);
    const rows = await db.select().from(apiUsage)
      .where(eq(apiUsage.tenantId, req.params.tenantId))
      .orderBy(desc(apiUsage.createdAt))
      .limit(limit);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let callsToday = 0, callsMonth = 0, spendMonth = 0;
    for (const r of rows) {
      const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (t >= startOfDay) callsToday++;
      if (t >= startOfMonth) {
        callsMonth++;
        spendMonth += r.costCents;
      }
    }
    res.json({ usage: rows, kpis: { callsToday, callsMonth, spendCentsMonth: spendMonth } });
  });

  // ── Resellers ────────────────────────────────────────────────────────────
  app.get("/api/agency/:tenantId/api/resellers", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const rows = await db.select().from(resellerLinks)
      .where(eq(resellerLinks.parentTenantId, req.params.tenantId))
      .orderBy(desc(resellerLinks.createdAt));
    // Per-link earnings: sum of reseller_commission ledger rows on the parent
    // wallet whose commission entries reference the child tenant via the
    // shared `usage:` reference. Quick aggregate via a single query.
    const earningsRows = await db
      .select({
        amountCents: tenantWalletLedger.amountCents,
        notes: tenantWalletLedger.notes,
        createdAt: tenantWalletLedger.createdAt,
      })
      .from(tenantWalletLedger)
      .where(and(
        eq(tenantWalletLedger.tenantId, req.params.tenantId),
        eq(tenantWalletLedger.type, "reseller_commission"),
      ));
    const totalCommissionCents = earningsRows.reduce(
      (s: number, r: Pick<LedgerRow, "amountCents" | "notes" | "createdAt">) => s + (r.amountCents ?? 0),
      0,
    );
    res.json({ links: rows, totalCommissionCents });
  });

  app.post("/api/agency/:tenantId/api/resellers", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const body = z.object({
      childTenantId: z.string().min(1),
      commissionCents: z.number().int().min(0),
    }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "childTenantId and commissionCents required" }); return; }
    if (body.data.childTenantId === req.params.tenantId) {
      res.status(400).json({ error: "Cannot reseller-link a tenant to itself" });
      return;
    }
    const target = await storage.getTenant(body.data.childTenantId);
    if (!target) { res.status(404).json({ error: "Child tenant not found" }); return; }
    const existing = await db.select().from(resellerLinks).where(eq(resellerLinks.childTenantId, body.data.childTenantId)).limit(1);
    if (existing.length > 0) {
      const upd = await db.update(resellerLinks)
        .set({ parentTenantId: req.params.tenantId, commissionCents: body.data.commissionCents, active: true })
        .where(eq(resellerLinks.id, existing[0].id))
        .returning();
      res.json(upd[0]);
      return;
    }
    const ins = await db.insert(resellerLinks).values({
      parentTenantId: req.params.tenantId,
      childTenantId: body.data.childTenantId,
      commissionCents: body.data.commissionCents,
      active: true,
    }).returning();
    res.status(201).json(ins[0]);
  });

  // Mint a sub-key for a reseller's child tenant. The reseller is the
  // CALLER (parent), the sub-key debits the CHILD wallet on use, and a
  // commission credits the reseller's wallet automatically (via the
  // resellerLinks row used by /api/v1/* settlement). The full secret is
  // returned exactly once.
  app.post("/api/agency/:tenantId/api/resellers/:childTenantId/keys", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const body = z.object({
      name: z.string().min(1).max(80),
      commissionCents: z.number().int().min(0).optional(),
    }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "name is required" }); return; }
    const childTenantId = req.params.childTenantId;
    if (childTenantId === req.params.tenantId) {
      res.status(400).json({ error: "A reseller cannot mint sub-keys for itself" });
      return;
    }
    const target = await storage.getTenant(childTenantId);
    if (!target) { res.status(404).json({ error: "Child tenant not found" }); return; }
    // Upsert reseller link with the (optional) per-mint markup. This is the
    // commission the parent earns per call against the child's sub-keys.
    const existing = await db.select().from(resellerLinks).where(eq(resellerLinks.childTenantId, childTenantId)).limit(1);
    if (existing.length === 0) {
      await db.insert(resellerLinks).values({
        parentTenantId: req.params.tenantId, childTenantId,
        commissionCents: body.data.commissionCents ?? 0, active: true,
      });
    } else if (existing[0].parentTenantId !== req.params.tenantId) {
      res.status(409).json({ error: "Child tenant is already linked to a different reseller" });
      return;
    } else if (typeof body.data.commissionCents === "number") {
      await db.update(resellerLinks)
        .set({ commissionCents: body.data.commissionCents, active: true })
        .where(eq(resellerLinks.id, existing[0].id));
    }
    // Mint the API key on the CHILD tenant so its calls debit the child
    // wallet. Track the parent for audit.
    const { prefix, full, hashed } = generateApiKeySecret();
    const inserted = await db.insert(apiKeys).values({
      tenantId: childTenantId,
      parentTenantId: req.params.tenantId,
      name: body.data.name,
      prefix, hashedSecret: hashed,
      scopes: ["deep-check", "visa-requirements"],
      createdBy: req.session?.userId ?? null,
    }).returning();
    res.status(201).json({
      key: { ...inserted[0], hashedSecret: undefined },
      secret: full, prefix, oneTime: true,
    });
  });

  app.delete("/api/agency/:tenantId/api/resellers/:id", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    await db.update(resellerLinks).set({ active: false }).where(and(eq(resellerLinks.id, req.params.id), eq(resellerLinks.parentTenantId, req.params.tenantId)));
    res.json({ ok: true });
  });

  // ── Saas-admin price configuration ──────────────────────────────────────
  app.put("/api/admin/api-pricing/:endpoint", async (req, res) => {
    if (!req.session?.userId || req.session?.userRole !== "saas_admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const slug = req.params.endpoint as ApiEndpointSlug;
    if (!API_ENDPOINTS.includes(slug)) { res.status(400).json({ error: "Unknown endpoint" }); return; }
    const body = z.object({ priceCents: z.number().int().min(0), description: z.string().optional(), active: z.boolean().optional() }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "priceCents required" }); return; }
    const existing = await db.select().from(apiPricing).where(eq(apiPricing.endpoint, slug)).limit(1);
    if (existing.length === 0) {
      const ins = await db.insert(apiPricing).values({
        endpoint: slug, priceCents: body.data.priceCents,
        description: body.data.description ?? DEFAULT_PRICES[slug].description,
        active: body.data.active ?? true,
      }).returning();
      res.json(ins[0]);
      return;
    }
    const upd = await db.update(apiPricing)
      .set({
        priceCents: body.data.priceCents,
        description: body.data.description ?? existing[0].description,
        active: body.data.active ?? existing[0].active,
        updatedAt: new Date(),
      })
      .where(eq(apiPricing.endpoint, slug))
      .returning();
    res.json(upd[0]);
  });
}
