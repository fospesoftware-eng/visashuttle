# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **Build**: esbuild (server bundle), Vite (frontend)

## Artifacts

### VisaShuttle (`artifacts/visa-shuttle`, preview `/`)
Full-stack multi-tenant SaaS for travel agencies managing visa applications.
- React + Vite + Tailwind v3 + Wouter + TanStack Query
- Ported from `.migration-backup/client/`
- Key deps: `@dnd-kit/*`, `flag-icons`, `qrcode`, `recharts`, `framer-motion`
- Uses `vite-plugin-node-polyfills` for `buffer`/`events`/`crypto` (required by `qrcode`)
- Theme: Electric Blue → Purple → Hot Pink (CSS variables in `src/index.css`)
- Imports types from `@workspace/db` (type-only, safe for browser)

### API Server (`artifacts/api-server`, preview `/api`)
Express 5 backend serving all API routes.
- Session auth via `express-session` + `connect-pg-simple`
- Main routes: `src/routes/routes.ts` (5816 lines, ported from migration backup)
- Shared utilities in `src/shared/` (visa-free.ts, destinations.ts, visa-catalog.ts)
- AI features: `src/ai.ts` (visa check, deep check, passport scan)
- SMS: `src/sms.ts` (OTP via Twilio)
- Agency API Platform: `src/routes/api-platform.ts` — paid pay-per-call public APIs (`/api/v1/deep-check`, `/api/v1/visa-requirements`) gated by Bearer keys (`vs_<prefix>_<secret>`, sha256-hashed, one-time reveal). Per-call wallet debit with refund-on-error and reseller commission credit. Tables: `apiKeys`, `apiUsage`, `apiPricing`, `tenantWallet`, `tenantWalletLedger`, `resellerLinks`. UI under `/app/business/api/*` (Business sidebar group); public pages `/api-pricing`, `/api-docs`. Default prices: deep-check $1.99, visa-requirements $0.25.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs (lib/db)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database

- PostgreSQL (Replit managed), accessed via `DATABASE_URL`
- Schema managed by `lib/db/src/schema/schema.ts` (Drizzle + drizzle-zod)
- `lib/db/src/index.ts` lazy-initializes the DB so the package can be imported in the browser (for types/constants) without throwing
- Push schema: `pnpm --filter @workspace/db run push`

## Important Notes

- `@workspace/db` exports both DB client AND schema. Server uses the client; browser uses type/constant exports only. The lazy-init pattern in `lib/db/src/index.ts` makes this safe.
- The original app (`migration-backup/`) had no `zod/v4` — routes.ts uses `zod` (v3 API).
- OpenAPI spec was intentionally skipped for this migration; the existing fetch-based API layer is preserved as-is.
- Tailwind v3 (not v4) — using postcss setup, not `@tailwindcss/vite` plugin.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Platform extensions (super-admin features)

`artifacts/api-server/src/routes/platform-extensions.ts` registers admin/agency
routes for support tickets and tenant subscription billing. Wired from
`routes.ts` via `registerPlatformExtensions(app, helpers)`.

- `PLATFORM_ROLES` (in `lib/db/src/schema/schema.ts`): `saas_admin`,
  `platform_finance`, `platform_support`, `platform_readonly`. Stored in
  `users.role` exactly like the existing `saas_admin`.
- `requireAdminAuth` (routes.ts) accepts all 4 roles on GET; only `saas_admin`
  on non-GET. Use `requirePlatformRole([...])` for finer admin gates.
- Agency-write endpoints use `callerIsTenantMember` (strict — platform staff
  must use admin endpoints to act on a tenant's behalf).
- Tenant subscription billing uses PLATFORM payment gateway selected in
  `payment_gateway_config.provider` (`cashfree` | `stripe`).
  `storage.getPaymentGatewayConfig()` exposes both credential blocks; the
  super-admin Settings → Payment Gateway card edits both. Initiate-payment
  branches by `gw.provider` and writes `tenant_subscription_invoices.provider`
  so confirm verifies via the matching gateway (legacy rows default to
  `cashfree`). Order id prefix `SUB_`, return URL
  `/app/settings?tab=subscription&order_id=…` (Stripe also appends
  `&session_id=…`; cancel URL adds `&canceled=1`).
- Internal admin notes (`support_ticket_messages.internal_note=true`) are
  filtered out for non-platform readers in
  `GET /api/agency/:tenantId/tickets/:id`.
