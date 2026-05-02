# VisaShuttle - AI-Powered Visa Processing Platform

## Overview

VisaShuttle is a multi-tenant SaaS platform for travel agencies to manage visa applications with AI-powered document processing. The platform serves four user interfaces:

1. **Public Marketing Website** - Landing pages, pricing, and signup flows
2. **SaaS Admin Dashboard** - Tenant management, user management, visa knowledge base, AI governance, audit logs, settings
3. **Agency Dashboard** - CRM, case management, document center, accounting/billing, reporting
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

### GST (India)
- Tenants can opt in via Settings → "GST (India)" card: toggles `gstEnabled`, captures `gstin`, registered state (`gstStateCode` + `gstStateName`), and legal name. Settings PUT auto-fills the state name from the code via `INDIAN_STATE_NAME_BY_CODE` in `server/routes.ts`.
- Per-invoice fields on `invoices`: `customerGstin`, `placeOfSupplyCode`, `placeOfSupplyName`, `reverseCharge`, plus split tax columns `cgstAmount`, `sgstAmount`, `igstAmount`. Per-line item: `hsnCode` and `taxRate` (basis points, e.g. `1800` = 18%).
- Tax computation (`computeGstSplit` in `server/routes.ts`): when GST is enabled, each item's `taxRate` is applied to its amount; the resulting tax is split into CGST+SGST (intra-state, supplier state == place of supply) or full IGST (inter-state). When GST is off, behavior falls back to the flat `settings.taxRate`.
- **Per-line tax applicability**: each invoice item carries a `taxable: boolean` flag (`shared/schema.ts`, default `true`). Lines with `taxable=false` are excluded from tax computation in BOTH paths — flat-tax (only the taxable subtotal is taxed) and per-line GST (non-taxable lines contribute zero tax regardless of their `taxRate`). The POST/PATCH `/api/tenants/:tenantId/invoices` routes default `taxable` to `false` when `category === "government_fee"` and to `true` otherwise; explicit booleans in the request body always win. UI: Compose Invoice exposes a per-line "Taxable" Switch (auto-flips when category changes); when off, HSN/GST-rate inputs are disabled. Invoice detail view shows a "Non-taxable" caption beneath the description.
- New endpoints: `GET /api/gst/states` (state list), `GET /api/tenants/:tenantId/gst-reports/monthly?year=&month=` returns an `.xlsx` workbook (B2B / B2C / HSN Summary / Summary sheets, GSTR-1 style) generated with `exceljs`.
- UI: Compose Invoice dialog shows a GST Details card (customer GSTIN, place of supply, reverse charge, intra/inter badge), HSN + GST-rate inputs per line item, and a CGST/SGST/IGST breakdown in the totals. Overview tab shows a "GST monthly report" card with year/month picker and Download Excel button (only when `gstEnabled`).
- Same `MemStorage` persistence caveat applies — GST data lives in memory and resets on restart.

### Per-Tenant Payment Gateway (Cashfree)
- Each agency can configure its own Cashfree credentials, separate from the global SaaS-admin config. Schema: `tenant_payment_gateway_config` (`shared/schema.ts`) — one row per tenantId (UNIQUE), stores `mode` (test/live), `apiVersion`, test/live `clientId`+`clientSecret`, optional `webhookSecret`, and `enabled` flag.
- API: `GET/POST /api/tenants/:tenantId/payment-gateway-config` — protected by `requireTenantAccess`. GET masks all secret fields via `maskKey` and returns `hasTestCredentials`/`hasLiveCredentials`/`hasWebhookSecret`/`activeReady` booleans plus `sandboxBaseUrl`/`productionBaseUrl`/`activeBaseUrl`. POST uses bullet-guard (`String(v).includes("•")` → ignore) so masked values never overwrite real secrets.
- Storage: `MemStorage` keeps `tenantPaymentGatewayConfigByTenant: Map<tenantId, TenantPaymentGatewayConfig>`. `HybridStorage` inherits — same `MemStorage` persistence caveat applies.
- UI: `/agency/settings` → Payments tab — enable toggle, mode select (Test/Live), API version, separate cards for Test/Live credentials and Webhook Secret. Each secret has show/hide eye toggle and shows "Saved — enter new value to update" placeholder when already configured.

### Per-Tenant SMS Gateway (MessageCentral)
- Each agency can configure its own MessageCentral credentials for sending OTPs/transactional SMS to its customers. Schema: `tenant_sms_config` — one row per tenantId (UNIQUE), stores `provider` (default `messagecentral`), `mcCustomerId` (C-…), `mcAuthToken` (long-lived JWT), optional `senderId`, and `enabled` flag.
- API: `GET/POST /api/tenants/:tenantId/sms-config` (protected by `requireTenantAccess`); GET masks `mcAuthToken` and returns `hasMcCredentials`/`activeReady`. POST applies bullet-guard to `mcAuthToken` so masked tokens are never written back. `POST /api/tenants/:tenantId/sms-config/test` sends a test OTP using the tenant's own credentials by reusing `sendOtp` with a tenant-scoped SmsConfig-shaped object (never falls back to the global SMS config).
- UI: `/agency/settings` → SMS tab — enable toggle, Customer ID input, Auth Token input with show/hide, optional Sender ID, plus a "Test OTP delivery" card with phone input + Send Test button.

### Accounting Module
- Tables (`shared/schema.ts`): `feeTemplates`, `invoiceSettings`, `invoices`, `invoiceItems`, `payments`. All money in INTEGER cents; `taxRate` in basis points (1800 = 18%). Currency dropdown in `client/src/pages/agency/accounting.tsx` covers global majors (USD/EUR/GBP/CAD/AUD/JPY/SGD/CHF/HKD) plus India + GCC (INR/AED/SAR/QAR/KWD/BHD/OMR).
- API base: `/api/tenants/:tenantId/{fee-templates,invoice-settings,invoices,invoices/stats}`, plus ID-based `/api/{fee-templates,invoices,payments}/:id` and `/api/invoices/:id/payments`. All accounting routes require session auth + tenant ownership (or `saas_admin` role) and validate bodies via Zod. Invoice totals are server-computed and recomputed on item changes; payment create/delete auto-updates `paidAmount` + status (draft→sent→partial→paid).
- UI page: `/agency/accounting` — Overview/Invoices/Fee Templates/Settings tabs.
- Persistence note: accounting uses `MemStorage` (cleared on restart). DB tables exist but `HybridStorage` does not yet override accounting methods — same pattern as cases/leads.

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

### Case Co-Travellers (Companions)
- New table `case_co_travellers` (`shared/schema.ts`) — one row per companion linked to a case: `id, caseId, tenantId, name, dob (text YYYY-MM-DD), relationship, passportNumber, nationality, notes, createdAt`. Allowed `relationship` values are exported as `CO_TRAVELLER_RELATIONSHIPS` (spouse, child, parent, sibling, grandparent, in_law, partner, friend, colleague, relative, other).
- Storage: `MemStorage.coTravellers: Map<string, CaseCoTraveller>` with full CRUD on `IStorage` (`getCoTravellersByCaseId`, `getCoTraveller`, `createCoTraveller`, `updateCoTraveller`, `deleteCoTraveller`). `HybridStorage` inherits — same `MemStorage` persistence caveat.
- API:
  - `GET /api/cases/:caseId/co-travellers`
  - `POST /api/cases/:caseId/co-travellers` — server enforces non-empty name, valid relationship, and DOB ≤ today; tenantId is taken from the parent case.
  - `PATCH /api/co-travellers/:id` — same validation against merged record.
  - `DELETE /api/co-travellers/:id` — 204 on success.
- UI:
  - **Create Application** (`client/src/pages/agency/case-new.tsx`): co-travellers are step 4 of the onboarding wizard; rows are POSTed sequentially after the case is created (or saved as draft).
  - **Case Detail** (`client/src/pages/agency/case-detail.tsx`): `CoTravellersCard` in the left sidebar — list with edit/delete buttons and add-dialog.

### Agency Sidebar Navigation
- `client/src/components/layouts/dashboard-layout.tsx` defines `agencyNavItems` with optional nested `children?: NavItem[]`. Two parents currently have submenus:
  - **Applications** (`/app/cases`) → child: **Pending & Completed** (`/app/cases/pending-completed`)
  - **Accounting** (`/app/accounting`) → children: **Invoices** (`/app/accounting/invoices`), **Payments** (`/app/accounting/payments`)
- Parent click both navigates to the parent route AND auto-expands its submenu. A separate chevron button on the right toggles expand/collapse manually. Manual collapse persists; auto-expand only flips groups to open (never auto-closes), so the user's collapsed state is respected until they navigate back into that branch.
- `isItemActive(location, href)` matches exact OR prefix `href + "/"` / `href + "?"`, so parent rows highlight whenever a child route is active. Active state is set when `isItemActive(parent)` OR any child is active.
- When the sidebar is in icon-only collapsed mode, children and the chevron are hidden — the parent icon still highlights for any descendant route.
- Mobile sidebar (sheet) always renders children inline (no toggle) for simpler touch UX.
- New routes wire to existing pages with props rather than duplicate page files:
  - `/app/cases/pending-completed` → `<CasesPage defaultStatusFilter="pending-completed" pageTitle="Pending & Completed" />`
  - `/app/accounting/invoices` → `<AccountingPage defaultTab="invoices" />`
  - `/app/accounting/payments` → `<AccountingPage defaultTab="payments" />`

### Accounting (Invoices, Payments, Templates, Settings)
- `client/src/pages/agency/accounting.tsx` accepts `defaultTab` and uses a `useEffect` to re-sync internal tab state when the prop changes (so the sidebar's Invoices/Payments items switch tabs even within the same mounted page).
- Tabs: **Overview** (KPIs + GST report download) · **Invoices** (compose/list/detail dialog with payment recording) · **Payments** (new — tenant-wide list) · **Fee Templates** · **Settings**.
- **Payments tab** (`PaymentsTab`):
  - Fetches `GET /api/tenants/:tenantId/payments` (new server route at `server/routes.ts` ~line 1564) which calls `requireTenantAccess` then `storage.getPaymentsByTenantId(tenantId)`.
  - Joins to invoices in-memory (via `useMemo` Map keyed by `invoiceId`) for invoice number / customer name / customer email lookup.
  - Search by invoice #, customer, or reference; method filter (cash/card/bank_transfer/online/other).
  - Three KPI cards: count, collected sum (filtered), distinct invoices with payments.
  - Delete button uses `DELETE /api/payments/:id` and invalidates `payments`, `invoices`, and `invoices/stats` query keys (storage's `deletePayment` recomputes the parent invoice's `paidAmount` and `status`).

### Applications: Pending & Completed view
- `client/src/pages/agency/cases.tsx` accepts `defaultStatusFilter`, `pageTitle`, `pageSubtitle` props (defaults preserve the original "all" view at `/app/cases`).
- `PENDING_COMPLETED_STATUSES = ["pending","in_progress","documents_required","under_review","submitted","approved"]`.
- When `defaultStatusFilter === "pending-completed"`, a "scope" gate filters out drafts and rejected applications even if the user changes the in-page status dropdown. The dropdown also swaps to a constrained option set (no Drafts / Rejected) and labels Approved as "Approved (Completed)".

### Case Onboarding Wizard & Drafts
- `client/src/pages/agency/case-new.tsx` is a **6-step stepper**: Destination & Visa → Applicant → Travel Details → Co-Travellers → **Documents** → Review. Destination is selected before Visa Type (visa-type select is disabled until a destination is picked).
- **Destination autocomplete**: destination uses an in-file `CountryCombobox` (themed with `bg-popover`, `text-popover-foreground`, `hover-elevate`, dark-mode safe) with a 190+ comprehensive country list; typing filters live, the value is cleared automatically when the user types something that no longer matches, and Schengen Area is included.
- **Documents step (5)**: pulls a tailored checklist from `client/src/data/document-checklists.ts` (`getDocumentChecklist(country, visaType)`) which merges 4 layers — UNIVERSAL → BY_VISA_TYPE → BY_COUNTRY → BY_COUNTRY_VISA — deduped by `type` (later layers override earlier). Each item shows a Recommended/Optional badge and description. Required items default checked. "Select all", "Reset to recommended", and "Clear" buttons. A `seededKeyRef` makes sure user toggles aren't blown away on re-renders, but defaults reseed when destination/visa type changes.
- **On submit/draft**: after creating the case + co-travellers, each *checked* checklist item is POSTed to `POST /api/cases/:caseId/documents` with `{tenantId, name, type, status: "pending", fileUrl: null, notes: <description>}`. They appear automatically in the case-detail Document Center, where existing Approve/Reject/Re-upload buttons take over.
- Per-step validation runs on Next; users can also click an earlier step in the stepper to jump back. Jumping forward is blocked unless intermediate steps are valid. Step 5 has no hard validation (agency may submit with empty checklist).
- "Save as Draft" button is available on every step once destination + visa type are filled. Drafts POST to the same `/api/tenants/:tenantId/cases` endpoint with `status: "draft"`; missing applicant name is auto-filled with `"Untitled draft"`. Date validators still apply so bad dates can't be persisted. Drafts also persist any selected checklist items.
- "Submit Application" on the Review step posts with `status: "pending"` after running full validation across all steps. Both flows redirect to the case detail page.
- `StatusBadge` (`client/src/components/status-badge.tsx`) handles `draft` (slate, dashed border) and `submitted` (blue) statuses. Cases list (`client/src/pages/agency/cases.tsx`) exposes a "Drafts" filter option so partially-onboarded applications are easy to find.
- Null-safety: `applicantName` is nullable for drafts; `cases.tsx`, `dashboard.tsx`, `case-detail.tsx` all guard `.toLowerCase()` / `.split()` calls and fall back to "Untitled draft" / "applicant" / "Applicant" for display.

### Date Validation (forms + API)
- All travel dates must be today or later; all DOBs (applicant + co-traveller) must be in the past or today.
- Server: helpers `validateCaseDates` and `validateCoTraveller` in `server/routes.ts`; applied to POST/PATCH `/api/tenants/:tenantId/cases`, PATCH `/api/cases/:id`, POST/PATCH `/api/cases/:caseId/co-travellers` & `/api/co-travellers/:id`. Returns `400 { error: "..." }` on violation.
- Client: `case-new.tsx` sets `min={today}` on travel-date inputs and `max={today}` on DOB inputs (applicant + co-travellers), plus a pre-submit `validate()` pass; `case-detail.tsx` co-traveller dialog mirrors the same constraints.

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

### B2B SaaS Features (Multi-Tenant Agency Dashboard)

**Agency Self-Registration (`/agency-register`)**
- 3-step multi-form: Agency Details → Admin Account → Review & Launch
- Creates tenant (plan=starter) + agency_owner user in one `POST /api/agency-register` call
- Sets session + stores slug in localStorage on success
- Linked from all CTAs on `/business` marketing page

**Staff/Team Management**
- `GET/POST /api/tenants/:tenantId/staff` — list and add staff members
- `PATCH/DELETE /api/tenants/:tenantId/staff/:userId` — update/remove staff
- Plan limits enforced: Starter 3, Professional 10, Enterprise unlimited
- Temp password generated on invite, shown to admin immediately
- Full UI in Settings → Team tab (add/remove dialogs, role badges, usage bar)

**Billing & Usage Tracking**
- `GET /api/tenants/:tenantId/usage` — returns plan + usage counters + limits
- Settings → Billing tab shows: current plan card with features, usage progress bars (staff/cases/leads), plan comparison grid with upgrade buttons
- Amber warning when usage ≥ 80% of any limit

**Plan Enforcement (Route-level)**
- Lead creation (`POST /api/tenants/:tenantId/leads`) — enforces per-plan lead limits
- Case creation (`POST /api/tenants/:tenantId/cases`) — enforces monthly case limits (resets each calendar month)
- Staff creation — enforces staff member limits
- Returns HTTP 403 with user-friendly message when limit reached

**Real Analytics API**
- `GET /api/tenants/:tenantId/analytics` — cases over time (30d), leads over time, destination breakdown, visa type breakdown, lead stage distribution
- Agency Reports page wired to real API (charts replace all mock data)

**Admin Dashboard — Real Weekly Chart**
- `GET /api/admin/weekly-activity` — returns last 7 days of case + activity log counts
- Admin dashboard "Platform Activity (This Week)" chart now uses real data with loading skeleton

**All Mock Pages Wired to Real APIs**
- Leads page: create/edit/delete/stage-move via real API + search/filter
- Documents page: status stats, change-status actions, real document list
- Reports page: all charts driven by `/api/tenants/:tenantId/analytics`

### Accounting Sidebar Restructure (May 2026)
- Sidebar nav: **Accounting** → only two children now: **Invoices** (`/app/accounting/invoices`) and **Settings** (`/app/accounting/settings`). Old `/app/accounting/payments` was removed; payments now live under Settings → Payments.
- Routes (`client/src/App.tsx`): `/app/accounting` and `/app/accounting/invoices` both render `<AccountingPage view="invoices" />` (a clean Invoices-only page, no extra tabs). `/app/accounting/settings[/payments|/templates|/invoice-template]` render `<AccountingPage view="settings" defaultSettingsTab=... />` which exposes a 4-tab hub: **Overview**, **Payments**, **Fee Templates**, **Invoice Template**.
- `AccountingPage` props: `view: "invoices" | "settings"` + `defaultSettingsTab`. Old `defaultTab` prop replaced.
- "Invoice Template" tab is the renamed Settings tab — it contains all branding (Logo URL, accent color), currency, tax, GST, and payment instructions.

### Fee Templates, Wizard Fees Step & Invoice Branding (May 2026)
- **Fee templates – multi-country**: `feeTemplates.destinationCountries: text().array()` (`shared/schema.ts`) lets a single template apply to multiple countries; legacy single-country `destinationCountry` remains for backward compat. UI: `FeeTemplateDialog` (Accounting → Templates) replaces the country dropdown with a popover + checkbox multi-select and chip remove. Cards show all matching country chips. Compose Invoice + case wizard merge `[destinationCountries[], destinationCountry]` when filtering matches.
- **Case wizard "Fees" step (case-new.tsx)**: 7-step wizard now (Fees inserted at step 6, Review = step 7). Loads tenant invoice settings + fee templates; shows a template Select filtered by destination country. Per-line editor (description / category / qty / unit price), live subtotal + GST tax + total displayed in tenant currency. Validation: partial-row guard (description xor unit price). On case create, if any valid fee lines exist, automatically POSTs a draft invoice to `/api/tenants/:tenantId/invoices` linked to the new case.
- **Tenant currency propagation**: All currency-rendering call sites in `accounting.tsx` (invoices list, detail dialog, invoice items, totals, templates tab) now use `(settings?.currency ?? invoice.currency)` so the tenant's chosen currency drives every display, even on legacy invoices created in a different currency.
- **Invoice branding (logoUrl + accent color)**: `invoiceSettings.logoUrl` + `invoiceSettings.invoiceAccentColor` (`shared/schema.ts`). Settings → Invoices tab adds a Logo URL input (with live preview, broken-image graceful hide) and a color picker + hex input for accent color. The InvoiceDetailDialog renders the logo in the header, the accent color as a top strip, and exposes **Download PDF** + **Email invoice** buttons.
- **Server PDF + email** (`server/routes.ts`):
  - `GET /api/invoices/:id/pdf` — pdfkit-rendered A4 invoice with accent strip, optional logo, From/Bill-to, items table, totals (Subtotal, Tax, Total, Paid, Balance Due), and footer (payment terms / bank details / footer text). Uses `storage.getInvoiceItems(inv.id)` (header + items fetched separately).
  - `POST /api/invoices/:id/email` — when `RESEND_API_KEY` is set, sends via Resend with the PDF attached as base64; otherwise returns a `mailto:` fallback the dialog opens automatically. `RESEND_FROM` env var (or `settings.companyEmail`) controls the From address.
  - **SSRF mitigation**: `isSafePublicUrl` + `fetchSafeImage` guard the tenant-supplied `logoUrl` — HTTPS only, blocks `localhost`/private CIDRs (10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, multicast/reserved), IPv6 loopback/link-local/ULA, follows-no-redirects, 4s timeout, content-type whitelist (PNG/JPEG), 2 MB cap.
- **Email invoice dialog**: `EmailInvoiceDialog` in `accounting.tsx` — To/Subject/Message inputs, default email pre-filled from invoice, "send" calls the email endpoint and either toasts success or auto-opens the returned `mailto:` URL.
- Dependencies: `pdfkit` + `@types/pdfkit`.

### Planned Integrations (not yet implemented)
- **AI Provider**: Pluggable interface supporting OpenAI-compatible APIs via `AI_BASE_URL` and `AI_API_KEY` (mock fallback active)
- **File Storage**: Abstraction for S3-compatible storage with signed URLs
- **Email**: Nodemailer for transactional emails
- **Payments**: Stripe integration for billing (Starter/Pro plan upgrade)