// Platform-side super-admin extensions added in Task #14:
//   1. Granular platform roles (read-only / finance / support) on top of
//      the existing `saas_admin` super-role.
//   2. Support ticketing — agency tenants open tickets to the platform,
//      thread of messages, status workflow.
//   3. Tenant subscription billing — admin sets the agency's plan +
//      monthly price; the agency pays via Cashfree from their settings.
//
// Wired from routes.ts via `registerPlatformExtensions(app, helpers)`.
//
// Routes split:
//   • /api/admin/tickets/*           — admin (saas_admin or platform_support)
//   • /api/agency/:tenantId/tickets/* — agency (any tenant member)
//   • /api/admin/subscriptions/*     — admin (saas_admin or platform_finance)
//   • /api/agency/:tenantId/subscription/* — agency (owner / manager)
import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { storage } from "../storage";
import {
  supportTickets, supportTicketMessages,
  tenantSubscriptions, tenantSubscriptionInvoices,
  tenants, users,
  SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_PRIORITIES, SUPPORT_TICKET_CATEGORIES,
  SUBSCRIPTION_STATUSES,
  type SupportTicket, type SupportTicketMessage,
  type TenantSubscription, type TenantSubscriptionInvoice,
} from "@workspace/db";
import { eq, and, desc, inArray, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";

// ─── Type helpers ─────────────────────────────────────────────────────────────
type CashfreeCreds = {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  apiVersion: string;
  mode: string;
};

type StripeCreds = {
  mode: "live" | "test";
  publishableKey?: string;
  secretKey?: string;
};

type PayPalCreds = {
  mode: "live" | "sandbox";
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
};

// The platform's active gateway selection + the credentials for whichever
// provider is currently configured. `provider` decides which subscription
// payment path runs at checkout time.
type PlatformGatewaySelection = {
  provider: "cashfree" | "stripe" | "paypal";
  cashfree: CashfreeCreds;
  stripe: StripeCreds;
  paypal: PayPalCreds;
};

type ExtensionsHelpers = {
  /**
   * Load the platform's payment gateway selection + credentials. We use
   * PLATFORM creds (not tenant-scoped), since the agency is paying the
   * platform — not their own customer.
   */
  getPlatformGateway: () => Promise<PlatformGatewaySelection>;
  getRequestOrigin: (req: Request) => string;
  readCashfreeBody: (res: any) => Promise<any>;
};

const PLATFORM_ROLES = new Set([
  "saas_admin", "platform_readonly", "platform_finance", "platform_support",
]);

// ─── Auth middleware ──────────────────────────────────────────────────────────
// Caller must hold one of the listed platform roles. Use this for every new
// /api/admin/* endpoint that should be reachable by sub-roles. The original
// requireAdminAuth (saas_admin only) is still used for the most sensitive
// endpoints in routes.ts.
export function requirePlatformRole(allowed: string[]) {
  const set = new Set(allowed);
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.session?.userRole;
    if (!req.session?.userId || !role || !set.has(role)) {
      res.status(403).json({ error: "Insufficient platform permissions" }); return;
    }
    next();
  };
}

// Read-side gate: a tenant member, OR a platform admin (any platform role).
// Used for GET endpoints where platform staff legitimately need a window into
// tenant data.
function callerCanAccessTenant(req: Request, tenantId: string): boolean {
  if (!req.session?.userId) return false;
  const role = req.session.userRole ?? "";
  if (PLATFORM_ROLES.has(role)) return true;
  return req.session.userTenantId === tenantId;
}

// Write-side gate: only the tenant's own members. Platform staff (even
// `saas_admin`) MUST NOT initiate payments or post tickets *as* the tenant.
// They have dedicated admin endpoints for that.
function callerIsTenantMember(req: Request, tenantId: string): boolean {
  if (!req.session?.userId) return false;
  return req.session.userTenantId === tenantId;
}

function isPlatformAdmin(req: Request): boolean {
  const role = req.session?.userRole ?? "";
  return PLATFORM_ROLES.has(role);
}

async function getPayPalAccessToken(paypal: PayPalCreds): Promise<string> {
  if (!paypal.clientId || !paypal.clientSecret) throw new Error("PayPal credentials are not configured");
  const auth = Buffer.from(`${paypal.clientId}:${paypal.clientSecret}`).toString("base64");
  const response = await fetch(`${paypal.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(20000),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw Object.assign(
      new Error(data?.error_description || data?.error || "Unable to authenticate with PayPal"),
      { status: response.status || 502, data },
    );
  }
  return data.access_token;
}

function getPayPalApprovalUrl(order: any): string | undefined {
  return order?.links?.find((link: any) => link?.rel === "approve" || link?.rel === "payer-action")?.href;
}

async function createPayPalOrder(paypal: PayPalCreds, payload: any): Promise<any> {
  const token = await getPayPalAccessToken(paypal);
  const response = await fetch(`${paypal.baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": randomUUID(),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.message || data?.details?.[0]?.description || "Unable to create PayPal order"), { status: response.status, data });
  return data;
}

async function capturePayPalOrder(paypal: PayPalCreds, orderId: string): Promise<any> {
  const token = await getPayPalAccessToken(paypal);
  const response = await fetch(`${paypal.baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": randomUUID(),
    },
    signal: AbortSignal.timeout(20000),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok && data?.name !== "ORDER_ALREADY_CAPTURED") throw Object.assign(new Error(data?.message || data?.details?.[0]?.description || "Unable to verify PayPal payment"), { status: response.status, data });
  if (!response.ok && data?.name === "ORDER_ALREADY_CAPTURED") return getPayPalOrder(paypal, orderId);
  return data;
}

function getPayPalCaptureId(data: any): string {
  return String(data?.purchase_units?.[0]?.payments?.captures?.[0]?.id || "");
}

function gatewayForCheckoutCurrency(currency?: string | null): "cashfree" | "paypal" {
  return String(currency || "").trim().toUpperCase() === "INR" ? "cashfree" : "paypal";
}

async function getPayPalOrder(paypal: PayPalCreds, orderId: string): Promise<any> {
  const token = await getPayPalAccessToken(paypal);
  const response = await fetch(`${paypal.baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.message || data?.details?.[0]?.description || "Unable to load PayPal order"), { status: response.status, data });
  return data;
}

const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  "AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "HUF", "ILS",
  "JPY", "MYR", "MXN", "TWD", "NZD", "NOK", "PHP", "PLN", "GBP", "SGD",
  "SEK", "CHF", "THB", "USD",
]);
const USD_FALLBACK_RATES: Record<string, number> = {
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.39,
};
const PAYPAL_ZERO_DECIMAL_CURRENCIES = new Set(["HUF", "JPY", "TWD"]);

function getPayPalCheckoutMoney(displayCurrency: string, displayAmount: number, preferredUsdAmount?: number | null) {
  const currency = String(displayCurrency || "USD").trim().toUpperCase();
  const amount = Math.max(0, Number(displayAmount) || 0);
  if (PAYPAL_SUPPORTED_CURRENCIES.has(currency)) return { currency, amount };
  const usdAmount = Number(preferredUsdAmount);
  if (Number.isFinite(usdAmount) && usdAmount > 0) return { currency: "USD", amount: usdAmount };
  const rate = USD_FALLBACK_RATES[currency] || 1;
  return { currency: "USD", amount: Math.max(1, Math.round((amount / rate) * 100) / 100) };
}

function formatPayPalAmount(currency: string, amount: number): string {
  return PAYPAL_ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase())
    ? String(Math.round(amount))
    : amount.toFixed(2);
}

// ─── Validators ───────────────────────────────────────────────────────────────
const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  category: z.enum(SUPPORT_TICKET_CATEGORIES).default("other"),
  priority: z.enum(SUPPORT_TICKET_PRIORITIES).default("normal"),
  body: z.string().trim().min(1).max(8000),
});

const ticketReplySchema = z.object({
  body: z.string().trim().min(1).max(8000),
  internalNote: z.boolean().optional(),
});

const adminTicketPatchSchema = z.object({
  status: z.enum(SUPPORT_TICKET_STATUSES).optional(),
  priority: z.enum(SUPPORT_TICKET_PRIORITIES).optional(),
  assignedToUserId: z.string().nullable().optional(),
});

const adminSubscriptionPatchSchema = z.object({
  plan: z.string().min(1).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  monthlyPriceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  currentPeriodStart: z.string().datetime().nullable().optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

function defaultPlanPrice(plan: string) {
  const prices: Record<string, number> = {
    lite: 199900,
    go: 399900,
    power: 799900,
    starter: 199900,
    professional: 399900,
    enterprise: 799900,
  };
  return prices[plan] ?? prices.lite;
}

const customizerEstimateSchema = z.object({
  prompt: z.string().trim().min(10).max(5000),
  imageBase64: z.string().max(7_500_000).optional(),
  imageMimeType: z.string().startsWith("image/").optional(),
});

function fallbackCustomizationEstimate(prompt: string) {
  const lower = prompt.toLowerCase();
  const signals = [
    lower.includes("new menu"),
    lower.includes("new module"),
    lower.includes("payment"),
    lower.includes("api"),
    lower.includes("field"),
    lower.includes("report"),
    lower.includes("dashboard"),
    lower.includes("automation"),
    lower.includes("upload"),
  ].filter(Boolean).length;
  const estimatedHours = Math.min(80, Math.max(8, 8 + signals * 6 + Math.ceil(prompt.length / 450) * 4));
  const priceCents = estimatedHours * 250000;
  const days = Math.max(2, Math.ceil(estimatedHours / 6));
  return {
    summary: "AI-prepared customization estimate based on the submitted requirement.",
    effortLevel: estimatedHours >= 48 ? "High" : estimatedHours >= 24 ? "Medium" : "Low",
    estimatedHours,
    timeline: `${days}-${days + 2} working days`,
    priceCents,
    currency: "INR",
    phases: [
      { name: "Requirement mapping", duration: "0.5-1 day", work: "Clarify scope, screens, fields, and affected workflows." },
      { name: "AI development", duration: `${Math.max(1, days - 1)}-${days + 1} days`, work: "Implement dashboard UI, API changes, validation, and integration." },
      { name: "Testing and release", duration: "0.5-1 day", work: "Run build checks, verify flows, and prepare deployment notes." },
    ],
    assumptions: [
      "Estimate assumes the requested change fits the current Visa Shuttle architecture.",
      "Final delivery may change if third-party APIs, database migrations, or external approvals are required.",
      "Development is AI-assisted and reviewed before release.",
    ],
  };
}

async function estimateCustomizationWithAnthropic(prompt: string, imageBase64?: string, imageMimeType?: string) {
  const cfg = await storage.getPlatformAiConfig().catch(() => undefined);
  const apiKey = cfg?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  const model = cfg?.anthropicModel || process.env.ANTHROPIC_MODEL || "claude-opus-4-5";
  if (!apiKey) return { ...fallbackCustomizationEstimate(prompt), provider: "heuristic" };

  const content: any[] = [
    {
      type: "text",
      text: `You are estimating a Visa Shuttle agency-dashboard customization.

Requirement:
${prompt}

Return ONLY valid JSON with this exact shape:
{
  "summary": "one sentence",
  "effortLevel": "Low|Medium|High",
  "estimatedHours": 16,
  "timeline": "3-5 working days",
  "priceCents": 40000,
  "currency": "INR",
  "phases": [{"name":"...","duration":"...","work":"..."}],
  "assumptions": ["..."]
}

Pricing rule: priceCents = estimatedHours * 250000 (INR paise, equal to INR 2,500/hour). Assume all development is AI-assisted, but include review/testing time. Be practical for a production SaaS app.`,
    },
  ];
  if (imageBase64 && imageMimeType) {
    const cleaned = imageBase64.includes(",") ? imageBase64.split(",").pop()! : imageBase64;
    content.push({
      type: "image",
      source: { type: "base64", media_type: imageMimeType, data: cleaned },
    });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.2,
      messages: [{ role: "user", content }],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Anthropic estimate failed (${response.status})`);
  }
  const data: any = await response.json();
  const text = data?.content?.find((part: any) => part?.type === "text")?.text ?? "";
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  const parsed = JSON.parse(jsonText);
  return { ...fallbackCustomizationEstimate(prompt), ...parsed, provider: "anthropic" };
}

// ─── Registration ─────────────────────────────────────────────────────────────
export function registerPlatformExtensions(app: Express, helpers: ExtensionsHelpers) {
  const { getPlatformGateway, getRequestOrigin, readCashfreeBody } = helpers;

  // Roles allowed to read admin endpoints (everyone except agency users).
  const adminReadRoles = ["saas_admin", "platform_readonly", "platform_finance", "platform_support"];
  const adminTicketRoles = ["saas_admin", "platform_support"];
  const adminBillingRoles = ["saas_admin", "platform_finance"];

  app.post("/api/agency/:tenantId/customizer/estimate", async (req, res) => {
    try {
      if (!callerIsTenantMember(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const parsed = customizerEstimateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid customization request" }); return;
      }
      const estimate = await estimateCustomizationWithAnthropic(
        parsed.data.prompt,
        parsed.data.imageBase64,
        parsed.data.imageMimeType,
      );
      res.json(estimate);
    } catch (e: any) {
      res.status(502).json({ error: e?.message ?? "Failed to estimate customization" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUPPORT TICKETS — admin side
  // ───────────────────────────────────────────────────────────────────────────

  // GET /api/admin/tickets — cross-tenant list with filters
  app.get("/api/admin/tickets", requirePlatformRole(adminReadRoles), async (req, res) => {
    try {
      const status = String(req.query.status || "").trim();
      const tenantId = String(req.query.tenantId || "").trim();
      const conditions: any[] = [];
      if (status && (SUPPORT_TICKET_STATUSES as readonly string[]).includes(status)) {
        conditions.push(eq(supportTickets.status, status));
      }
      if (tenantId) {
        conditions.push(eq(supportTickets.tenantId, tenantId));
      }
      const where = conditions.length ? and(...conditions) : undefined;

      const rows = await db.select({
        id: supportTickets.id,
        tenantId: supportTickets.tenantId,
        subject: supportTickets.subject,
        category: supportTickets.category,
        status: supportTickets.status,
        priority: supportTickets.priority,
        createdByUserId: supportTickets.createdByUserId,
        assignedToUserId: supportTickets.assignedToUserId,
        lastMessageAt: supportTickets.lastMessageAt,
        lastMessageBy: supportTickets.lastMessageBy,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        createdByName: users.name,
        createdByEmail: users.email,
      })
        .from(supportTickets)
        .leftJoin(tenants, eq(tenants.id, supportTickets.tenantId))
        .leftJoin(users, eq(users.id, supportTickets.createdByUserId))
        .where(where as any)
        .orderBy(desc(supportTickets.lastMessageAt));

      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load tickets" });
    }
  });

  // GET /api/admin/tickets/:id — full thread for admins
  app.get("/api/admin/tickets/:id", requirePlatformRole(adminReadRoles), async (req, res) => {
    try {
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, String(req.params.id))).limit(1);
      if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
      const [tenantRow] = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, plan: tenants.plan })
        .from(tenants).where(eq(tenants.id, ticket.tenantId)).limit(1);
      const messages = await db.select().from(supportTicketMessages)
        .where(eq(supportTicketMessages.ticketId, ticket.id))
        .orderBy(supportTicketMessages.createdAt);
      res.json({ ticket, tenant: tenantRow ?? null, messages });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load ticket" });
    }
  });

  // POST /api/admin/tickets/:id/messages — admin replies
  app.post("/api/admin/tickets/:id/messages", requirePlatformRole(adminTicketRoles), async (req, res) => {
    try {
      const parse = ticketReplySchema.safeParse(req.body);
      if (!parse.success) { res.status(400).json({ error: parse.error.issues[0]?.message ?? "Invalid request" }); return; }
      const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, String(req.params.id))).limit(1);
      if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
      if (ticket.status === "closed") {
        res.status(400).json({ error: "Ticket is closed. Reopen it first." }); return;
      }

      const userId = req.session!.userId!;
      const adminUser = await storage.getUser(userId);
      const now = new Date();

      const [msg] = await db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        authorUserId: userId,
        authorRole: "admin",
        authorName: adminUser?.name ?? null,
        body: parse.data.body,
        internalNote: parse.data.internalNote ?? false,
      } as any).returning();

      // Public replies advance the workflow (open→pending) and bump the
      // last-message marker. Internal notes don't change the state.
      if (!msg.internalNote) {
        await db.update(supportTickets)
          .set({
            status: ticket.status === "open" ? "pending" : ticket.status,
            lastMessageAt: now,
            lastMessageBy: "admin",
            updatedAt: now,
          })
          .where(eq(supportTickets.id, ticket.id));
      }
      res.json({ message: msg });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to post reply" });
    }
  });

  // PATCH /api/admin/tickets/:id — change status / priority / assignee
  app.patch("/api/admin/tickets/:id", requirePlatformRole(adminTicketRoles), async (req, res) => {
    try {
      const parse = adminTicketPatchSchema.safeParse(req.body);
      if (!parse.success) { res.status(400).json({ error: parse.error.issues[0]?.message ?? "Invalid request" }); return; }
      const update: Record<string, any> = { updatedAt: new Date() };
      if (parse.data.status !== undefined) update.status = parse.data.status;
      if (parse.data.priority !== undefined) update.priority = parse.data.priority;
      if (parse.data.assignedToUserId !== undefined) update.assignedToUserId = parse.data.assignedToUserId;
      const [updated] = await db.update(supportTickets).set(update)
        .where(eq(supportTickets.id, String(req.params.id))).returning();
      if (!updated) { res.status(404).json({ error: "Ticket not found" }); return; }
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to update ticket" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUPPORT TICKETS — agency side
  // ───────────────────────────────────────────────────────────────────────────

  // GET /api/agency/:tenantId/tickets — agency's own tickets
  app.get("/api/agency/:tenantId/tickets", async (req, res) => {
    try {
      if (!callerCanAccessTenant(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const rows = await db.select().from(supportTickets)
        .where(eq(supportTickets.tenantId, String(req.params.tenantId)))
        .orderBy(desc(supportTickets.lastMessageAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load tickets" });
    }
  });

  // POST /api/agency/:tenantId/tickets — open a new ticket (creates the
  // first message in the same transaction).
  app.post("/api/agency/:tenantId/tickets", async (req, res) => {
    try {
      if (!callerIsTenantMember(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const parse = createTicketSchema.safeParse(req.body);
      if (!parse.success) { res.status(400).json({ error: parse.error.issues[0]?.message ?? "Invalid request" }); return; }
      const userId = req.session!.userId!;
      const author = await storage.getUser(userId);

      const [ticket] = await db.insert(supportTickets).values({
        tenantId: String(req.params.tenantId),
        subject: parse.data.subject,
        category: parse.data.category,
        priority: parse.data.priority,
        createdByUserId: userId,
      } as any).returning();

      await db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        authorUserId: userId,
        authorRole: isPlatformAdmin(req) ? "admin" : "agency",
        authorName: author?.name ?? null,
        body: parse.data.body,
      } as any);

      // Refresh the last-message marker.
      await db.update(supportTickets).set({
        lastMessageAt: ticket.createdAt ?? new Date(),
        lastMessageBy: isPlatformAdmin(req) ? "admin" : "agency",
      }).where(eq(supportTickets.id, ticket.id));

      res.json(ticket);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to create ticket" });
    }
  });

  // GET /api/agency/:tenantId/tickets/:id — full thread for the agency.
  // Internal admin notes are filtered out before returning.
  app.get("/api/agency/:tenantId/tickets/:id", async (req, res) => {
    try {
      if (!callerCanAccessTenant(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const [ticket] = await db.select().from(supportTickets)
        .where(and(eq(supportTickets.id, String(req.params.id)), eq(supportTickets.tenantId, String(req.params.tenantId))))
        .limit(1);
      if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
      const messages = await db.select().from(supportTicketMessages)
        .where(eq(supportTicketMessages.ticketId, ticket.id))
        .orderBy(supportTicketMessages.createdAt);
      const visible = isPlatformAdmin(req) ? messages : messages.filter((m: SupportTicketMessage) => !m.internalNote);
      res.json({ ticket, messages: visible });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load ticket" });
    }
  });

  // POST /api/agency/:tenantId/tickets/:id/messages — agency reply
  app.post("/api/agency/:tenantId/tickets/:id/messages", async (req, res) => {
    try {
      if (!callerIsTenantMember(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const parse = ticketReplySchema.safeParse(req.body);
      if (!parse.success) { res.status(400).json({ error: parse.error.issues[0]?.message ?? "Invalid request" }); return; }
      const [ticket] = await db.select().from(supportTickets)
        .where(and(eq(supportTickets.id, String(req.params.id)), eq(supportTickets.tenantId, String(req.params.tenantId))))
        .limit(1);
      if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
      if (ticket.status === "closed") { res.status(400).json({ error: "Ticket is closed" }); return; }

      const userId = req.session!.userId!;
      const author = await storage.getUser(userId);
      const now = new Date();
      const [msg] = await db.insert(supportTicketMessages).values({
        ticketId: ticket.id,
        authorUserId: userId,
        authorRole: "agency",
        authorName: author?.name ?? null,
        body: parse.data.body,
      } as any).returning();

      // Agency replies move pending→open (waiting on us again).
      await db.update(supportTickets).set({
        status: ticket.status === "pending" ? "open" : (ticket.status === "resolved" ? "open" : ticket.status),
        lastMessageAt: now,
        lastMessageBy: "agency",
        updatedAt: now,
      }).where(eq(supportTickets.id, ticket.id));

      res.json({ message: msg });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to post reply" });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TENANT SUBSCRIPTION BILLING
  // ───────────────────────────────────────────────────────────────────────────

  // Helper: create a subscription row on demand if missing. Mirrors the
  // tenant.plan and gives free price (0) so the agency sees something.
  async function ensureSubscription(tenantId: string): Promise<TenantSubscription> {
    const [existing] = await db.select().from(tenantSubscriptions)
      .where(eq(tenantSubscriptions.tenantId, tenantId)).limit(1);
    if (existing) return existing;
    const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const plan = tenantRow?.plan ?? "lite";
    const [created] = await db.insert(tenantSubscriptions).values({
      tenantId, plan, status: "trialing", monthlyPriceCents: defaultPlanPrice(plan), currency: "INR",
    } as any).returning();
    return created;
  }

  // GET /api/admin/subscriptions — list every agency's subscription, with
  // tenant info and most-recent invoice.
  app.get("/api/admin/subscriptions", requirePlatformRole(adminReadRoles), async (_req, res) => {
    try {
      const rows = await db.select({
        sub: tenantSubscriptions,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        tenantStatus: tenants.status,
      })
        .from(tenantSubscriptions)
        .leftJoin(tenants, eq(tenants.id, tenantSubscriptions.tenantId))
        .orderBy(desc(tenantSubscriptions.updatedAt));

      // Tenants without a subscription row yet — surface them so the admin
      // can set a price for them.
      const allTenants = await db.select().from(tenants);
      const haveIds = new Set(rows.map((r: any) => r.sub.tenantId));
      const orphans = allTenants.filter((t: any) => !haveIds.has(t.id)).map((t: any) => ({
        sub: null,
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        tenantStatus: t.status,
        plan: t.plan,
      }));

      res.json({ subscriptions: rows, unconfigured: orphans });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load subscriptions" });
    }
  });

  // PATCH /api/admin/subscriptions/:tenantId — admin sets plan/price/status
  app.patch("/api/admin/subscriptions/:tenantId", requirePlatformRole(adminBillingRoles), async (req, res) => {
    try {
      const parse = adminSubscriptionPatchSchema.safeParse(req.body);
      if (!parse.success) { res.status(400).json({ error: parse.error.issues[0]?.message ?? "Invalid request" }); return; }
      const sub = await ensureSubscription(String(req.params.tenantId));

      const update: Record<string, any> = { updatedAt: new Date() };
      const d = parse.data;
      if (d.plan !== undefined) update.plan = d.plan;
      if (d.status !== undefined) update.status = d.status;
      if (d.monthlyPriceCents !== undefined) update.monthlyPriceCents = d.monthlyPriceCents;
      if (d.currency !== undefined) update.currency = d.currency;
      if (d.trialEndsAt !== undefined) update.trialEndsAt = d.trialEndsAt ? new Date(d.trialEndsAt) : null;
      if (d.currentPeriodStart !== undefined) update.currentPeriodStart = d.currentPeriodStart ? new Date(d.currentPeriodStart) : null;
      if (d.currentPeriodEnd !== undefined) update.currentPeriodEnd = d.currentPeriodEnd ? new Date(d.currentPeriodEnd) : null;
      if (d.notes !== undefined) update.notes = d.notes;

      const [updated] = await db.update(tenantSubscriptions).set(update)
        .where(eq(tenantSubscriptions.id, sub.id)).returning();

      // Mirror tenant.plan when the admin changes the plan label.
      if (d.plan && d.plan !== sub.plan) {
        await db.update(tenants).set({ plan: d.plan }).where(eq(tenants.id, sub.tenantId));
      }
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to update subscription" });
    }
  });

  // GET /api/admin/subscriptions/:tenantId/invoices — admin views billing log
  app.get("/api/admin/subscriptions/:tenantId/invoices", requirePlatformRole(adminReadRoles), async (req, res) => {
    try {
      const rows = await db.select().from(tenantSubscriptionInvoices)
        .where(eq(tenantSubscriptionInvoices.tenantId, String(req.params.tenantId)))
        .orderBy(desc(tenantSubscriptionInvoices.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load invoices" });
    }
  });

  // GET /api/agency/:tenantId/subscription — agency reads its own
  app.get("/api/agency/:tenantId/subscription", async (req, res) => {
    try {
      if (!callerCanAccessTenant(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const sub = await ensureSubscription(String(req.params.tenantId));
      const invoices = await db.select().from(tenantSubscriptionInvoices)
        .where(eq(tenantSubscriptionInvoices.tenantId, String(req.params.tenantId)))
        .orderBy(desc(tenantSubscriptionInvoices.createdAt))
        .limit(24);
      res.json({ subscription: sub, invoices });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to load subscription" });
    }
  });

  // POST /api/agency/:tenantId/subscription/initiate-payment — creates a
  // pending subscription invoice and routes INR through Cashfree, all other
  // currencies through PayPal.
  app.post("/api/agency/:tenantId/subscription/initiate-payment", async (req, res) => {
    try {
      if (!callerIsTenantMember(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const sub = await ensureSubscription(String(req.params.tenantId));
      if (sub.monthlyPriceCents <= 0) {
        res.status(400).json({ error: "No price configured. Please contact support." }); return;
      }
      let gw: PlatformGatewaySelection;
      try { gw = await getPlatformGateway(); }
      catch { res.status(503).json({ error: "Online payment isn't configured yet. Please contact support." }); return; }
      const checkoutProvider: PlatformGatewaySelection["provider"] = gatewayForCheckoutCurrency(sub.currency);

      // Compute the upcoming period: starts when the current one ends, or
      // today if there's no current period.
      const now = new Date();
      const periodStart = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const [invoice] = await db.insert(tenantSubscriptionInvoices).values({
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        amountCents: sub.monthlyPriceCents,
        currency: sub.currency,
        status: "pending",
        provider: checkoutProvider,
        periodStart, periodEnd,
      } as any).returning();

      const orderId = `SUB_${invoice.id.slice(0, 8)}_${Date.now()}`;
      const origin = getRequestOrigin(req);
      const tenantUser = await storage.getUser(req.session!.userId!);

      // ── Stripe branch ────────────────────────────────────────────────────
      if (checkoutProvider === "stripe") {
        const stripe = gw.stripe;
        if (!stripe.secretKey) {
          res.status(503).json({ error: "Stripe isn't configured yet. Please contact support." }); return;
        }
        // Stripe expects amounts in the smallest currency unit. We already
        // store `amountCents` so just pass it through.
        const successUrl = `${origin}/app/settings?tab=subscription&order_id=${orderId}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${origin}/app/settings?tab=subscription&order_id=${orderId}&provider=stripe&canceled=1`;
        const params = new URLSearchParams();
        params.append("mode", "payment");
        params.append("success_url", successUrl);
        params.append("cancel_url", cancelUrl);
        params.append("client_reference_id", orderId);
        if (tenantUser?.email) params.append("customer_email", tenantUser.email);
        params.append("line_items[0][price_data][currency]", String(sub.currency).toLowerCase());
        params.append("line_items[0][price_data][unit_amount]", String(sub.monthlyPriceCents));
        params.append("line_items[0][price_data][product_data][name]", `Visa Shuttle subscription — ${sub.plan}`);
        params.append("line_items[0][quantity]", "1");
        params.append("metadata[invoice_id]", invoice.id);
        params.append("metadata[tenant_id]", sub.tenantId);
        params.append("metadata[order_id]", orderId);

        let stripeRes;
        try {
          stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripe.secretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
            signal: AbortSignal.timeout(20000),
          });
        } catch {
          res.status(503).json({ error: "Payment gateway temporarily unreachable" }); return;
        }
        const sdata: any = await stripeRes.json().catch(() => ({}));
        if (!stripeRes.ok) {
          res.status(stripeRes.status >= 500 ? 503 : stripeRes.status).json({
            error: sdata?.error?.message || "Unable to create Stripe checkout session",
          });
          return;
        }
        await db.update(tenantSubscriptionInvoices).set({
          stripeSessionId: sdata.id,
          cashfreeOrderId: orderId, // keep our own order id stored for /confirm lookup
        }).where(eq(tenantSubscriptionInvoices.id, invoice.id));

        res.json({
          provider: "stripe",
          invoiceId: invoice.id,
          orderId,
          sessionId: sdata.id,
          checkoutUrl: sdata.url,
          mode: stripe.mode,
          amount: sub.monthlyPriceCents,
          currency: sub.currency,
        });
        return;
      }

      // ── PayPal branch ────────────────────────────────────────────────────
      if (checkoutProvider === "paypal") {
        const paypal = gw.paypal;
        if (!paypal.clientId || !paypal.clientSecret) {
          res.status(503).json({ error: "PayPal isn't configured yet. Please contact support." }); return;
        }
        try {
          const displayAmount = sub.monthlyPriceCents / 100;
          const paypalMoney = getPayPalCheckoutMoney(sub.currency, displayAmount);
          const paypalOrder = await createPayPalOrder(paypal, {
            intent: "CAPTURE",
            purchase_units: [{
              reference_id: orderId,
              custom_id: invoice.id,
              invoice_id: orderId,
              description: `Visa Shuttle subscription - ${sub.plan}`,
              amount: {
                currency_code: paypalMoney.currency,
                value: formatPayPalAmount(paypalMoney.currency, paypalMoney.amount),
              },
            }],
            payment_source: {
              paypal: {
                experience_context: {
                  brand_name: "Visa Shuttle",
                  shipping_preference: "NO_SHIPPING",
                  user_action: "PAY_NOW",
                  return_url: `${origin}/app/settings?tab=subscription&order_id=${orderId}&provider=paypal`,
                  cancel_url: `${origin}/app/settings?tab=subscription&order_id=${orderId}&provider=paypal&canceled=1`,
                },
              },
            },
          });
          const approvalUrl = getPayPalApprovalUrl(paypalOrder);
          if (!approvalUrl) { res.status(502).json({ error: "PayPal did not return an approval URL" }); return; }
          await db.update(tenantSubscriptionInvoices).set({
            paypalOrderId: paypalOrder.id,
            cashfreeOrderId: orderId,
          }).where(eq(tenantSubscriptionInvoices.id, invoice.id));

          res.json({
            provider: "paypal",
            invoiceId: invoice.id,
            orderId,
            paypalOrderId: paypalOrder.id,
            approvalUrl,
            mode: paypal.mode,
            amount: sub.monthlyPriceCents,
            currency: sub.currency,
            gatewayAmount: Math.round(paypalMoney.amount * 100),
            gatewayCurrency: paypalMoney.currency,
          });
          return;
        } catch (e: any) {
          res.status(e?.status >= 500 ? 503 : e?.status || 502).json({ error: e?.message || "Unable to create PayPal order" });
          return;
        }
      }

      // ── Cashfree branch (default) ────────────────────────────────────────
      const cashfree = gw.cashfree;
      if (!cashfree.clientId || !cashfree.clientSecret) {
        res.status(503).json({ error: "Online payment isn't configured yet. Please contact support." }); return;
      }
      const requestId = randomUUID();
      const payload = {
        order_id: orderId,
        order_amount: sub.monthlyPriceCents / 100,
        order_currency: sub.currency,
        order_note: `Visa Shuttle subscription — ${sub.plan}`,
        customer_details: {
          customer_id: sub.tenantId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 45),
          customer_email: tenantUser?.email || "noreply@visashuttle.app",
          customer_name: tenantUser?.name || "Agency",
          customer_phone: "9999999999",
        },
        order_meta: {
          return_url: `${origin}/app/settings?tab=subscription&order_id=${orderId}`,
        },
        order_tags: { product: "subscription", invoice_id: invoice.id, tenant_id: sub.tenantId },
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
        res.status(503).json({ error: "Payment gateway temporarily unreachable" }); return;
      }
      const data = await readCashfreeBody(gatewayRes);
      if (!gatewayRes.ok) {
        res.status(gatewayRes.status >= 500 ? 503 : gatewayRes.status).json({
          error: data?.message || "Unable to create payment order",
        });
        return;
      }
      // Stash the gateway order id on the invoice for later confirm.
      await db.update(tenantSubscriptionInvoices).set({ cashfreeOrderId: data.order_id || orderId })
        .where(eq(tenantSubscriptionInvoices.id, invoice.id));

      res.json({
        provider: "cashfree",
        invoiceId: invoice.id,
        orderId: data.order_id || orderId,
        paymentSessionId: data.payment_session_id,
        mode: cashfree.mode,
        amount: sub.monthlyPriceCents,
        currency: sub.currency,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to initiate payment" });
    }
  });

  // POST /api/agency/:tenantId/subscription/confirm — verify the gateway
  // order/session and, if PAID, mark the invoice + advance the subscription
  // period. Branches on the invoice's stored `provider`.
  app.post("/api/agency/:tenantId/subscription/confirm", async (req, res) => {
    try {
      if (!callerIsTenantMember(req, String(req.params.tenantId))) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
      const orderId = String(req.body?.orderId || "").trim();
      if (!orderId || !/^SUB_[a-zA-Z0-9_-]+$/.test(orderId)) {
        res.status(400).json({ error: "Invalid order id" }); return;
      }
      const [invoice] = await db.select().from(tenantSubscriptionInvoices)
        .where(eq(tenantSubscriptionInvoices.cashfreeOrderId, orderId)).limit(1);
      if (!invoice || invoice.tenantId !== String(req.params.tenantId)) {
        res.status(404).json({ error: "Order not found" }); return;
      }
      if (invoice.status === "paid") {
        res.json({ paid: true, invoice, alreadyRecorded: true }); return;
      }
      let gw: PlatformGatewaySelection;
      try { gw = await getPlatformGateway(); }
      catch { res.status(503).json({ error: "Gateway not configured" }); return; }

      const provider = invoice.provider || "cashfree";

      // ── Stripe verification ──────────────────────────────────────────────
      if (provider === "stripe") {
        const stripe = gw.stripe;
        if (!stripe.secretKey) {
          res.status(503).json({ error: "Stripe not configured" }); return;
        }
        if (!invoice.stripeSessionId) {
          res.status(400).json({ error: "No Stripe session for this invoice" }); return;
        }
        let stripeRes;
        try {
          stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(invoice.stripeSessionId)}`, {
            headers: { "Authorization": `Bearer ${stripe.secretKey}` },
            signal: AbortSignal.timeout(20000),
          });
        } catch {
          res.status(503).json({ error: "Gateway temporarily unreachable" }); return;
        }
        const sdata: any = await stripeRes.json().catch(() => ({}));
        if (!stripeRes.ok) {
          res.status(stripeRes.status >= 500 ? 503 : stripeRes.status).json({
            error: sdata?.error?.message || "Unable to verify payment",
          });
          return;
        }
        // Defence-in-depth: confirm the session belongs to this invoice.
        const sessionInvoiceId = sdata?.metadata?.invoice_id;
        if (sessionInvoiceId && sessionInvoiceId !== invoice.id) {
          res.status(400).json({ error: "Session does not match invoice" }); return;
        }
        const isPaid = sdata.payment_status === "paid";
        if (!isPaid) { res.json({ paid: false, status: sdata.payment_status || sdata.status }); return; }

        const now = new Date();
        const [updatedInvoice] = await db.update(tenantSubscriptionInvoices).set({
          status: "paid",
          paidAt: now,
          stripePaymentIntentId: typeof sdata.payment_intent === "string" ? sdata.payment_intent : null,
        }).where(eq(tenantSubscriptionInvoices.id, invoice.id)).returning();

        await db.update(tenantSubscriptions).set({
          status: "active",
          currentPeriodStart: invoice.periodStart ?? now,
          currentPeriodEnd: invoice.periodEnd ?? null,
          updatedAt: now,
        }).where(eq(tenantSubscriptions.id, invoice.subscriptionId));

        res.json({ paid: true, invoice: updatedInvoice });
        return;
      }

      // ── PayPal verification ──────────────────────────────────────────────
      if (provider === "paypal") {
        const paypal = gw.paypal;
        if (!paypal.clientId || !paypal.clientSecret) {
          res.status(503).json({ error: "PayPal not configured" }); return;
        }
        if (!invoice.paypalOrderId) {
          res.status(400).json({ error: "No PayPal order for this invoice" }); return;
        }
        let pdata: any;
        try {
          pdata = await capturePayPalOrder(paypal, invoice.paypalOrderId);
        } catch (e: any) {
          res.status(e?.status >= 500 ? 503 : e?.status || 502).json({ error: e?.message || "Unable to verify PayPal payment" });
          return;
        }
        const capture = pdata?.purchase_units?.[0]?.payments?.captures?.[0];
        const customId = String(capture?.custom_id || pdata?.purchase_units?.[0]?.custom_id || "");
        if (customId && customId !== invoice.id) {
          res.status(400).json({ error: "PayPal order does not match invoice" }); return;
        }
        const isPaid = pdata?.status === "COMPLETED" || capture?.status === "COMPLETED";
        if (!isPaid) { res.json({ paid: false, status: pdata?.status || capture?.status }); return; }

        const now = new Date();
        const [updatedInvoice] = await db.update(tenantSubscriptionInvoices).set({
          status: "paid",
          paidAt: now,
          paypalCaptureId: getPayPalCaptureId(pdata),
        }).where(eq(tenantSubscriptionInvoices.id, invoice.id)).returning();

        await db.update(tenantSubscriptions).set({
          status: "active",
          currentPeriodStart: invoice.periodStart ?? now,
          currentPeriodEnd: invoice.periodEnd ?? null,
          updatedAt: now,
        }).where(eq(tenantSubscriptions.id, invoice.subscriptionId));

        res.json({ paid: true, invoice: updatedInvoice });
        return;
      }

      // ── Cashfree verification (default) ──────────────────────────────────
      const cashfree = gw.cashfree;
      // Preflight: refuse early with a clear error if creds aren't configured
      // for this mode. Mirrors the guard in initiate-payment / deep-check.
      if (!cashfree.clientId || !cashfree.clientSecret) {
        res.status(503).json({ error: "Cashfree gateway is not configured for this environment" });
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
        res.status(503).json({ error: "Gateway temporarily unreachable" }); return;
      }
      const data = await readCashfreeBody(gatewayRes);
      if (!gatewayRes.ok) {
        res.status(gatewayRes.status >= 500 ? 503 : gatewayRes.status).json({
          error: data?.message || "Unable to verify payment",
        });
        return;
      }
      const tagInvoiceId = data?.order_tags?.invoice_id;
      if (tagInvoiceId && tagInvoiceId !== invoice.id) {
        res.status(400).json({ error: "Order does not match invoice" }); return;
      }
      const isPaid = data.order_status === "PAID";
      if (!isPaid) { res.json({ paid: false, status: data.order_status }); return; }

      const now = new Date();
      const [updatedInvoice] = await db.update(tenantSubscriptionInvoices).set({
        status: "paid",
        paidAt: now,
        cashfreePaymentId: String(data?.cf_order_id ?? data?.cf_payment_id ?? ""),
      }).where(eq(tenantSubscriptionInvoices.id, invoice.id)).returning();

      // Advance the subscription period.
      await db.update(tenantSubscriptions).set({
        status: "active",
        currentPeriodStart: invoice.periodStart ?? now,
        currentPeriodEnd: invoice.periodEnd ?? null,
        updatedAt: now,
      }).where(eq(tenantSubscriptions.id, invoice.subscriptionId));

      res.json({ paid: true, invoice: updatedInvoice });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? "Failed to confirm payment" });
    }
  });
}
