# VisaShuttle - AI-Powered Visa Processing Platform

## Overview

VisaShuttle is a multi-tenant SaaS platform for travel agencies to manage visa applications with AI-powered document processing. The platform serves four user interfaces:

1. **Public Marketing Website** - Landing pages, pricing, and signup flows
2. **SaaS Admin Dashboard** - Tenant management, visa knowledge base, AI governance
3. **Agency Dashboard** - CRM, case management, document center, reporting
4. **Customer Portal** - Self-service application tracking and document uploads

The application uses a monorepo structure with a React frontend and Express backend, connected to PostgreSQL for data persistence.

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
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod

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

### Planned Integrations (not yet implemented)
- **AI Provider**: Pluggable interface supporting OpenAI-compatible APIs via `AI_BASE_URL` and `AI_API_KEY`
- **File Storage**: Abstraction for S3-compatible storage with signed URLs
- **Email**: Nodemailer for transactional emails
- **Payments**: Stripe integration for billing