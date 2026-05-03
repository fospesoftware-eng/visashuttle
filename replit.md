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
