// Agency API Platform — paid public APIs for agencies to resell.
// Two products: Deep Check API and Visa Requirement API.
//
// Routes split:
//   • /api/v1/*          — public, key-authenticated, billed per call
//   • /api/api-pricing   — public price table, no auth (used by docs/marketing)
//   • /api/agency/api/*  — authenticated agency dashboard CRUD
//   • /api/admin/api/*   — saas-admin price configuration
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
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiKey?: { id: string; tenantId: string; parentTenantId: string | null };
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
        endpoint: slug,
        priceCents: cfg.priceCents,
        currency: "USD",
        description: cfg.description,
        active: true,
      });
    }
  }
}

async function getPriceCents(endpoint: ApiEndpointSlug): Promise<{ priceCents: number; currency: string }> {
  const rows = await db.select().from(apiPricing).where(eq(apiPricing.endpoint, endpoint)).limit(1);
  if (rows.length === 0) {
    return { priceCents: DEFAULT_PRICES[endpoint].priceCents, currency: "USD" };
  }
  return { priceCents: rows[0].priceCents, currency: rows[0].currency };
}

async function getOrCreateWallet(tenantId: string) {
  const rows = await db.select().from(tenantWallet).where(eq(tenantWallet.tenantId, tenantId)).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(tenantWallet).values({ tenantId, balanceCents: 0, currency: "USD" }).returning();
  return inserted[0];
}

// Atomically debit the tenant wallet ONLY if balance is sufficient. Returns
// the new balance (cents) on success, or null when there isn't enough.
async function tryDebitWallet(tenantId: string, amountCents: number, refType: string, reference: string, notes?: string): Promise<number | null> {
  return await db.transaction(async (tx: any) => {
    const updated = await tx
      .update(tenantWallet)
      .set({
        balanceCents: dsql`${tenantWallet.balanceCents} - ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(tenantWallet.tenantId, tenantId), dsql`${tenantWallet.balanceCents} >= ${amountCents}`))
      .returning();
    if (updated.length === 0) return null;
    const balanceAfter = updated[0].balanceCents;
    await tx.insert(tenantWalletLedger).values({
      tenantId,
      amountCents: -amountCents,
      balanceAfterCents: balanceAfter,
      type: refType,
      reference,
      notes: notes ?? null,
    });
    return balanceAfter;
  });
}

async function creditWallet(tenantId: string, amountCents: number, refType: string, reference: string, notes?: string): Promise<number> {
  await getOrCreateWallet(tenantId);
  return await db.transaction(async (tx: any) => {
    const updated = await tx
      .update(tenantWallet)
      .set({ balanceCents: dsql`${tenantWallet.balanceCents} + ${amountCents}`, updatedAt: new Date() })
      .where(eq(tenantWallet.tenantId, tenantId))
      .returning();
    const balanceAfter = updated[0]?.balanceCents ?? 0;
    await tx.insert(tenantWalletLedger).values({
      tenantId,
      amountCents,
      balanceAfterCents: balanceAfter,
      type: refType,
      reference,
      notes: notes ?? null,
    });
    return balanceAfter;
  });
}

async function logUsage(opts: {
  tenantId: string;
  apiKeyId: string;
  endpoint: ApiEndpointSlug;
  status: number;
  costCents: number;
  latencyMs: number;
  errorCode?: string | null;
  ip?: string | null;
}): Promise<string> {
  const inserted = await db.insert(apiUsage).values({
    tenantId: opts.tenantId,
    apiKeyId: opts.apiKeyId,
    endpoint: opts.endpoint,
    status: opts.status,
    costCents: opts.costCents,
    latencyMs: opts.latencyMs,
    errorCode: opts.errorCode ?? null,
    ip: opts.ip ?? null,
  }).returning({ id: apiUsage.id });
  return inserted[0]?.id ?? "";
}

// ── middleware ────────────────────────────────────────────────────────────
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
  // Best-effort lastUsedAt update; do not block on failure.
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id)).catch(() => {});
  req.apiKey = { id: row.id, tenantId: row.tenantId, parentTenantId: row.parentTenantId ?? null };
  next();
}

// Agency dashboard auth re-uses the existing session-based check via a hook
// passed in from registerRoutes (so we can call its private helper).
type RequireTenantAccessFn = (req: Request, res: Response, tenantId: string) => boolean;

// ── public v1 endpoints ───────────────────────────────────────────────────
const deepCheckBodySchema = z.object({
  formData: z.record(z.string(), z.any()),
});
const visaReqBodySchema = z.object({
  nationality: z.string().min(2),
  destinationCountry: z.string().min(2),
  visaType: z.string().optional(),
});

export async function registerApiPlatformRoutes(
  app: Express,
  helpers: { requireTenantAccess: RequireTenantAccessFn },
) {
  await ensurePricingSeeded().catch((err) => {
    console.warn("[api-platform] pricing seed skipped:", err?.message);
  });

  // ── Public price table — used by /api docs + pricing pages ──────────────
  app.get("/api/api-pricing", async (_req, res) => {
    const rows = await db.select().from(apiPricing).where(eq(apiPricing.active, true)).orderBy(apiPricing.endpoint);
    res.json({
      currency: "USD",
      endpoints: rows.map((r: any) => ({
        endpoint: r.endpoint,
        priceCents: r.priceCents,
        currency: r.currency,
        description: r.description,
      })),
    });
  });

  // ── POST /api/v1/deep-check ─────────────────────────────────────────────
  app.post("/api/v1/deep-check", requireApiKey, async (req, res) => {
    const startedAt = Date.now();
    const ak = req.apiKey!;
    const parsed = deepCheckBodySchema.safeParse(req.body);
    if (!parsed.success) {
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 400, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "bad_request", ip: req.ip });
      return res.status(400).json({ error: { code: "bad_request", message: "Invalid request body. Expected { formData: {...} }" } });
    }
    const formData = parsed.data.formData as DeepCheckFormData;
    if (!formData.nationality || !formData.destinationCountry || !formData.visaType) {
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 400, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "bad_request", ip: req.ip });
      return res.status(400).json({ error: { code: "bad_request", message: "formData must include nationality, destinationCountry, visaType" } });
    }
    const { priceCents, currency } = await getPriceCents("deep-check");
    await getOrCreateWallet(ak.tenantId);

    // Pre-debit. Refund if upstream fails.
    const balanceAfter = await tryDebitWallet(ak.tenantId, priceCents, "api_debit", `deep-check:${ak.id}`, "Deep Check API call");
    if (balanceAfter === null) {
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 402, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "insufficient_balance", ip: req.ip });
      return res.status(402).json({ error: { code: "insufficient_balance", message: "Wallet balance is below the per-call price. Top up to continue." } });
    }

    try {
      const aiConfig = await storage.getPlatformAiConfig();
      const deep = await runDeepCheck(formData, aiConfig);
      const { result } = deep;
      // Mask provider/model from clients.
      const latency = Date.now() - startedAt;

      // Settle: log usage first so we have a stable id; only after the usage
      // row is committed do we credit the reseller. If logUsage throws, the
      // outer catch refunds the child and no commission is ever paid.
      const usageId = await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 200, costCents: priceCents, latencyMs: latency, ip: req.ip });
      const link = await db.select().from(resellerLinks).where(and(eq(resellerLinks.childTenantId, ak.tenantId), eq(resellerLinks.active, true))).limit(1);
      if (link.length > 0 && link[0].commissionCents > 0) {
        // Reference includes usage id for idempotency / audit trail.
        await creditWallet(link[0].parentTenantId, link[0].commissionCents, "reseller_commission", `usage:${usageId}`, "Reseller commission");
      }
      return res.json({
        meta: {
          endpoint: "deep-check",
          costCents: priceCents,
          currency,
          balanceCents: balanceAfter,
          latencyMs: latency,
        },
        result,
      });
    } catch (err: any) {
      // Refund on upstream failure.
      await creditWallet(ak.tenantId, priceCents, "api_refund", `deep-check:${ak.id}`, "Refund: upstream error");
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "deep-check", status: 502, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "upstream_error", ip: req.ip });
      const code = /Anthropic API key not configured/i.test(String(err?.message)) ? "ai_not_configured" : "upstream_error";
      return res.status(code === "ai_not_configured" ? 503 : 502).json({ error: { code, message: code === "ai_not_configured" ? "Deep Check is temporarily unavailable." : "Deep Check failed to complete. Please retry." } });
    }
  });

  // ── POST /api/v1/visa-requirements ──────────────────────────────────────
  app.post("/api/v1/visa-requirements", requireApiKey, async (req, res) => {
    const startedAt = Date.now();
    const ak = req.apiKey!;
    const parsed = visaReqBodySchema.safeParse(req.body);
    if (!parsed.success) {
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 400, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "bad_request", ip: req.ip });
      return res.status(400).json({ error: { code: "bad_request", message: "Required fields: nationality, destinationCountry. Optional: visaType" } });
    }
    const { nationality, destinationCountry, visaType } = parsed.data;
    const { priceCents, currency } = await getPriceCents("visa-requirements");
    await getOrCreateWallet(ak.tenantId);

    const balanceAfter = await tryDebitWallet(ak.tenantId, priceCents, "api_debit", `visa-requirements:${ak.id}`, "Visa Requirement API call");
    if (balanceAfter === null) {
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 402, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "insufficient_balance", ip: req.ip });
      return res.status(402).json({ error: { code: "insufficient_balance", message: "Wallet balance is below the per-call price. Top up to continue." } });
    }

    try {
      const allowedTypes = getCountryVisaTypes(destinationCountry);
      const entry = getEntryRequirement(nationality, destinationCountry);
      const templates = await storage.getAllVisaTemplates();
      const matched = templates.find(
        (t) =>
          t.country?.toLowerCase() === destinationCountry.toLowerCase() &&
          (!visaType || t.visaType?.toLowerCase() === visaType.toLowerCase()),
      );
      const latency = Date.now() - startedAt;
      // Settle: log usage first; credit reseller only after usage is committed
      // so a logUsage failure (which triggers refund) cannot mint commission.
      const usageId = await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 200, costCents: priceCents, latencyMs: latency, ip: req.ip });
      const link = await db.select().from(resellerLinks).where(and(eq(resellerLinks.childTenantId, ak.tenantId), eq(resellerLinks.active, true))).limit(1);
      if (link.length > 0 && link[0].commissionCents > 0) {
        await creditWallet(link[0].parentTenantId, link[0].commissionCents, "reseller_commission", `usage:${usageId}`, "Reseller commission");
      }
      return res.json({
        meta: { endpoint: "visa-requirements", costCents: priceCents, currency, balanceCents: balanceAfter, latencyMs: latency },
        result: {
          nationality,
          destinationCountry,
          visaType: visaType ?? null,
          entryRequirement: entry,
          allowedVisaTypes: allowedTypes,
          template: matched
            ? {
                visaType: matched.visaType,
                processingTime: (matched as any).processingTime ?? null,
                validity: (matched as any).validity ?? null,
                fee: (matched as any).fee ?? null,
                requiredDocuments: (matched as any).requiredDocuments ?? [],
                notes: (matched as any).notes ?? null,
              }
            : null,
        },
      });
    } catch (err: any) {
      await creditWallet(ak.tenantId, priceCents, "api_refund", `visa-requirements:${ak.id}`, "Refund: internal error");
      await logUsage({ tenantId: ak.tenantId, apiKeyId: ak.id, endpoint: "visa-requirements", status: 500, costCents: 0, latencyMs: Date.now() - startedAt, errorCode: "internal_error", ip: req.ip });
      return res.status(500).json({ error: { code: "internal_error", message: "Visa Requirement lookup failed." } });
    }
  });

  // ── Agency dashboard: keys CRUD ─────────────────────────────────────────
  // List keys for a tenant
  app.get("/api/agency/:tenantId/api/keys", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.tenantId, req.params.tenantId)).orderBy(desc(apiKeys.createdAt));
    res.json(rows.map((r: any) => ({ ...r, hashedSecret: undefined })));
  });

  // Create key — returns the FULL secret exactly once.
  app.post("/api/agency/:tenantId/api/keys", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const body = z.object({ name: z.string().min(1).max(80), scopes: z.array(z.string()).optional() }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "name is required" }); return; }
    const { prefix, secret, full, hashed } = generateApiKeySecret();
    const inserted = await db.insert(apiKeys).values({
      tenantId: req.params.tenantId,
      name: body.data.name,
      prefix,
      hashedSecret: hashed,
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

  // Manual top-up (test/dev). In production this is gated by saas_admin role,
  // and the public Cashfree-backed top-up is the customer-facing path.
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

  app.get("/api/agency/:tenantId/api/usage", async (req, res) => {
    if (!helpers.requireTenantAccess(req, res, req.params.tenantId)) return;
    const limit = Math.min(parseInt(String(req.query.limit ?? "200"), 10) || 200, 1000);
    const rows = await db.select().from(apiUsage)
      .where(eq(apiUsage.tenantId, req.params.tenantId))
      .orderBy(desc(apiUsage.createdAt))
      .limit(limit);
    // Aggregate KPIs.
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
    res.json(rows);
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
        endpoint: slug,
        priceCents: body.data.priceCents,
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
