# VisaShuttle - AI-Powered Visa Processing Platform

## Overview

VisaShuttle is a multi-tenant SaaS platform for travel agencies to manage visa applications with AI-powered document processing. The platform serves four user interfaces:

1. **Public Marketing Website** - Landing pages, pricing, and signup flows
2. **SaaS Admin Dashboard** - Tenant management, user management, visa knowledge base, AI governance, audit logs, settings
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
- **B2C Demo User**: demo@visashuttle.com / Demo@12345 (seeded on every restart)
- **B2C Test User**: test@visashuttle.com / Test@12345 (pro plan, deepCheckAccess: true)
- **Site-Wide Password**: Fospe@7561 (stored as SITE_PASSWORD env var)
- **Customer OTP (dev only)**: 123456

### SMS Gateway (OTP for B2C Registration)
- **Default provider**: MSG91 (`server/sms.ts`)
- **Secondary providers**: Zavu, MessageCentral
- **Config storage**: `sms_config` DB table (managed via admin settings → Integrations tab)
- **Admin UI**: `/admin/settings` → Integrations tab → SMS Gateway card
- **API routes**: `POST /api/admin/sms-config` (save), `GET /api/admin/sms-config` (load), `POST /api/admin/sms-config/test` (send test OTP)
- **OTP routes**: `POST /api/b2c/otp/send`, `POST /api/b2c/otp/verify`
- **Credentials fallback**: DB config → `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` env vars
- **MSG91 required fields**: Auth Key + OTP Template ID (create at control.msg91.com)
- **Zavu required fields**: API Key
- **MessageCentral required fields**: Customer ID (C-...) + Password — token is fetched per-request via `/auth/v1/authentication`; verificationId stored in session between send/verify calls
- **Phone stored on**: `b2c_users.phone` (nullable) + `b2c_users.phone_verified` (boolean)

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
- Brand palette: Electric Blue #4055FF (primary), Hot Pink #FF2060 (secondary), Mid-Purple #9033F5 (accent)
- Gradient: `linear-gradient(135deg,#4055FF,#9033F5,#FF2060)` used on key CTAs and wizard submit button
- Typography: Inter for UI, JetBrains Mono for codes/IDs
- Component spacing follows Tailwind's 4/6/8/12/16/24 scale
- Elevation system with subtle shadows for interactive states
- `Sel` (custom select): brand-blue ring + tinted background when a value is selected

### Visa Wizard Conditional Logic (check.tsx)
The 8-step wizard has smart conditional fields:
- **Step 1**: "Number of Children" shown only for Married / Divorced / Widowed / Separated marital statuses
- **Step 2**: Visa-type specific sub-sections — Student (institution, study level, acceptance letter), Work (hiring company, job offer), Business (inviting company), Spouse/Family (host relationship + host status), Transit (final destination)
- **Step 3**: Employment-type specific fields — Employed (job title, company, years, salary slips), Self-employed (business type, registration), Student (school, scholarship, enrollment letter), Retired (prev profession, pension docs), Unemployed (amber warning)
- **Step 6**: Conditional documents — leave approval only for employed, hotel/itinerary for tourist/visit, invitation letter for business/family, enrollment letter for students

### AI Engine (server/ai.ts)
- Primary: OpenAI GPT-4o-mini (`OPENAI_API_KEY` env var)
- Fallback: Claude Haiku (`ANTHROPIC_API_KEY` env var)
- Final fallback: detailed mock scoring engine
- All conditional fields (institution name, job offer, host status, scholarship, etc.) are included in the prompt
- System prompt includes per-visa-type and per-employment-type scoring guidelines

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

### B2C Visa Checker (Implemented — Fully Updated)

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