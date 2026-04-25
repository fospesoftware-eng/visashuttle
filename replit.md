# VisaShuttle - AI-Powered Visa Processing Platform

## Overview

VisaShuttle is a multi-tenant SaaS platform for travel agencies to manage visa applications with AI-powered document processing. The platform serves four user interfaces:

1. **Public Marketing Website** - Landing pages, pricing, and signup flows
2. **SaaS Admin Dashboard** - Tenant management, visa knowledge base, AI governance
3. **Agency Dashboard** - CRM, case management, document center, reporting
4. **Customer Portal** - Self-service application tracking and document uploads
5. **Agency Public Landing Page** - Branded marketing page for each agency at `/w/:slug`

The application uses a monorepo structure with a React frontend and Express backend. Currently using in-memory storage with seed data for development (PostgreSQL-ready when needed).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme tokens extracted from brand colors
- **Theme System**: Light/dark mode with CSS variables, persisted to localStorage

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/*` prefix
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Static file serving from built assets

### Database Layer
- **Current**: In-memory storage with MemStorage class (see `server/storage.ts`)
- **Schema Location**: `shared/schema.ts` contains all type definitions
- **Seed Data**: Demo tenant, admin user, agency owner, customer, sample cases and documents
- **Production**: Ready to switch to PostgreSQL with Drizzle ORM

### Demo Credentials
- **SaaS Admin**: admin@visashuttle.com / Admin@12345
- **Agency Owner**: owner@demoagency.com / Demo@12345
- **Customer**: customer@demo.com / Demo@12345
- **Site-Wide Password**: Fospe@7561 (stored as SITE_PASSWORD env var)
- **Customer OTP (dev only)**: 123456

### Authentication Architecture
Three distinct auth systems coexist:
1. **Site Password Gate** — `SITE_PASSWORD` env var protects the entire app; stored in `req.session.siteAuthenticated`
2. **Agency/Admin Session Auth** — `POST /api/auth/login` validates email+password, sets `req.session.userId/userRole/userTenantId`; `GET /api/auth/me` returns current user; `POST /api/auth/logout` clears session
3. **Customer OTP Auth (White-label)** — `POST /api/w/:slug/auth/request-otp` → `POST /api/w/:slug/auth/verify-otp` → `req.session.wlCustomerId/wlTenantId`

### Multi-Tenancy Design
- Tenant isolation enforced via `tenantId` foreign key on all tenant-scoped records
- Roles: `saas_admin`, `agency_owner`, `agency_staff`, `customer`
- Data models: Users, Tenants, Leads, Cases, Documents, Messages, VisaTemplates, ActivityLogs

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route page components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities and providers
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   └── storage.ts    # Data access layer interface
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle database schema
└── migrations/       # Database migration files
```

### Design System
- Brand colors extracted from logo: cyan primary (#00B4D8), pink secondary, blue accent
- Typography: Inter for UI, JetBrains Mono for codes/IDs
- Component spacing follows Tailwind's 4/6/8/12/16/24 scale
- Elevation system with subtle shadows for interactive states

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and query building
- **connect-pg-simple**: Session storage in PostgreSQL

### UI Framework
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **shadcn/ui**: Pre-styled component library
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Data & Forms
- **TanStack React Query**: Server state management
- **React Hook Form**: Form handling with `@hookform/resolvers`
- **Zod**: Schema validation

### Build Tools
- **Vite**: Frontend bundling and dev server
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across the codebase

### B2C Visa Checker (Implemented)

The platform now includes a full B2C visa approval checker with:

**Routes:**
- `/` — Public homepage with visa checker hero and live sample scores
- `/join` — B2C user signup (email/password, free account)
- `/sign-in` — B2C user login
- `/check` — 14-field AI visa check form (auth-gated, inline result display)
- `/account` — User dashboard with check history and plan info
- `/pricing` — Free / Starter ($9/mo) / Pro ($29/mo) plan comparison

**Backend:**
- `server/ai.ts` — AI scoring service (OpenAI GPT → Claude → mock fallback)
- B2C auth routes: `/api/b2c/auth/register`, `/api/b2c/auth/login`, `/api/b2c/auth/logout`, `/api/b2c/auth/me`
- Check routes: `POST /api/b2c/check`, `GET /api/b2c/checks`
- AI returns: `{ approvalChance, statusLabel, summary, strengths[], riskFactors[], missingDocuments[], recommendations[], disclaimer }`

**Plans:**
- Free: 1 check (checkLimit=1)
- Starter: 5 checks/month
- Pro: 20 checks/month + deepCheckAccess

**Schema (shared/schema.ts):**
- `b2cUsers` table: id, email, password (hashed), fullName, freeChecksUsed, subscriptionPlan, checkLimit, deepCheckAccess, stripeCustomerId
- `visaChecks` table: id, userId, checkType, formData (JSON), aiProvider, approvalChance, statusLabel, aiResponse (JSON)

**Auth:**
- Session key: `req.session.b2cUserId` (separate from agency `userId`)
- Passwords hashed with bcryptjs

### Planned Integrations (not yet implemented)
- **AI Provider**: Pluggable interface supporting OpenAI-compatible APIs via `AI_BASE_URL` and `AI_API_KEY` (mock fallback active)
- **File Storage**: Abstraction for S3-compatible storage with signed URLs
- **Email**: Nodemailer for transactional emails
- **Payments**: Stripe integration for billing (Starter/Pro plan upgrade)