# SmartBuild APU Engine

## Overview

SmartBuild is a construction budget analysis and management platform (APU Engine). It allows users to create construction projects, upload Excel budget spreadsheets, analyze budget line items, track materials and pricing, and view dashboard analytics. The app targets construction professionals who need to manage "Análisis de Precios Unitarios" (Unit Price Analysis) workflows — importing budgets, matching items to commercial materials, and tracking costs vs. projected profits.

The stack is a full-stack TypeScript monorepo with a React frontend served by an Express backend, using PostgreSQL for data storage via Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure

The project uses a single repository with three main directories:
- `client/` — React SPA (Vite-powered)
- `server/` — Express API server
- `shared/` — Shared types, schemas, and route definitions used by both client and server

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite with HMR support (dev mode uses Vite middleware, production serves static build)
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state (queries and mutations)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming; dark mode by default with an orange/construction accent color scheme
- **Forms**: React Hook Form with Zod resolvers for validation
- **File Uploads**: react-dropzone for drag-and-drop Excel file uploads
- **Charts**: Recharts (via shadcn chart component)
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

Key pages:
- `/` — Dashboard with stats overview
- `/projects` — Project listing with search
- `/projects/:id` — Project detail with file upload, budget items, and analysis tabs
- `/materials` — Material library with live Sodimac/Easy price comparison, purchase status toggle
- `/financing` — Admin-only financing simulation panel (Monto_Financiar, Tasa_Mensual, Retorno_Bitcoper, burnTokens)
- `/settings` — Company settings (name, RUT, logo, firma digital for PDFs)
- `/landing` — Commercial landing page (Dark Tech design, chatbot, demo form, pricing)
- Landing page at `/` when not logged in (login via Replit Auth)

### Backend Architecture

- **Framework**: Express.js running on Node with `tsx` for TypeScript execution
- **HTTP Server**: Node's `createServer` wrapping Express
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Route Definitions**: Centralized in `shared/routes.ts` with Zod schemas for input validation and response typing. The `api` object defines method, path, input schema, and response schemas for each endpoint.
- **File Uploads**: Multer with memory storage for Excel file parsing
- **Excel Parsing**: `xlsx` library for reading uploaded spreadsheet data
- **Build**: esbuild bundles the server for production into `dist/index.cjs`; Vite builds the client into `dist/public/`

### Data Storage

- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for automatic Zod schema generation from table definitions
- **Schema Push**: `npm run db:push` uses `drizzle-kit push` to sync schema to database (no migration files needed for development)
- **Connection**: `pg` Pool connecting via `DATABASE_URL`

### Authentication

- **Provider**: Replit Auth (OIDC via OpenID Connect)
- **Session**: express-session with connect-pg-simple storing sessions in PostgreSQL `sessions` table
- **Auth files**: `server/replit_integrations/auth/` (setupAuth, isAuthenticated middleware, authStorage)
- **Client hook**: `client/src/hooks/use-auth.ts` (useAuth hook for auth state)
- **Login/Logout**: Navigate to `/api/login` and `/api/logout` (no custom forms)
- **Protection**: All `/api/` routes (except `/api/external/register` and `/api/login|logout|callback|auth`) require `isAuthenticated` middleware
- **Landing page**: Shown at `/` for unauthenticated users; authenticated users see the Dashboard

### Database Schema (7 tables)

1. **projects** — Construction projects with name, client, status (draft/processing/completed), budget totals, cost, projected profit, Excel-extracted financial fields (subtotalNeto, gastosGeneralesPercent, utilidadPercent, ivaPercent, totalExcel), and financing fields (tokenId, statusFinanciamiento)
2. **budget_items** — Line items imported from Excel spreadsheets, linked to projects. Contains original budget data (description, unit, quantity, prices) plus APU analysis fields (commercial description, market price, supplier) and scheduling fields (man-hours)
3. **materials** — Material/resource library with name, unit, and pricing info
4. **registered_customers** — Customers registered via external landing page post-Webpay payment. Fields: name, email (unique), rut, company, phone, plan, paymentStatus, webpayToken, webpayOrderId, amountPaid, isActive
5. **company_settings** — Company branding and identity (name, RUT, email, phone, logo, firma)
6. **users** — Auth users (Replit Auth). Fields: id (UUID), email, first_name, last_name, profile_image_url
7. **sessions** — Session storage for express-session (sid, sess, expire)

### Storage Layer

- `IStorage` interface defines all data access methods
- `DatabaseStorage` class implements the interface using Drizzle queries
- Exported as a singleton `storage` instance used by route handlers

### Price Engine (`server/price-engine.ts`)

A comprehensive Chilean construction materials price simulation engine:
- 35+ product catalog entries covering acero, cemento, madera, planchas, cerámica, tuberías, cables, ventanas, puertas, aislación, and more
- Each product has both Sodimac and Easy variants with brand names, SKUs, and realistic CLP prices
- Fuzzy keyword matching to map budget item descriptions to catalog products
- Daily price variation simulation (±5%) based on date + SKU hash
- Stock availability simulation per store
- `searchPrice(query)` returns both store prices, brands, stock status, and best price/supplier
- `searchPriceBatch(queries)` for bulk operations

### API Endpoints

- `GET/POST /api/projects` — List and create projects
- `GET /api/projects/:id` — Get single project
- `POST /api/projects/:id/upload` — Upload Excel budget file
- `POST /api/projects/:id/sync-prices` — Sync all budget items with market prices from Sodimac/Easy engine
- `GET /api/dashboard/stats` — Dashboard statistics (includes storeMixSavings, utilityPercent param)
- `GET /api/projects/:id/financials` — Project financial comparison (Excel vs Live, margen de maniobra)
- `GET /api/projects/:id/items` — List budget items for a project (includes per-item sodimacPrice, easyPrice, brand, stock)
- `PUT /api/items/:id` — Update a budget item
- `POST /api/projects/:id/analyze` — Cross-reference budget items with price engine (same as sync-prices)
- `GET /api/materials` — List materials (with live Sodimac/Easy prices from price engine)
- `PUT /api/materials/:id/status` — Toggle material purchase status
- `POST /api/external/register` — **External API** (requires X-API-Key header with SMARTBUILD_API_KEY) — Register new user from landing page after Webpay payment
- `GET /api/users` — List registered users (returns sanitized fields only)
- `GET /api/settings/api-key` — Check API key configuration status (masked key)

### Production Security

- **Frontend Obfuscation**: Production build runs javascript-obfuscator on all JS bundles (control flow flattening, string array encoding, dead code injection, identifier mangling). Configured in `script/build.ts`.
- **Origin Validation**: Price-sensitive endpoints (materials list, sync-prices, financials, analyze) use `requireSameOrigin` middleware in production to block requests from unauthorized origins. Configure `ALLOWED_ORIGINS` env var with comma-separated domains.
- **Log Sanitization**: All debug console.log statements removed from routes. Production mode suppresses API response body logging. Only essential error logging retained.
- **Console Output Disabled**: Obfuscator sets `disableConsoleOutput: true` to strip console.* calls from frontend production bundles.

### Dev vs Production

- **Development**: Vite dev server runs as Express middleware with HMR; `tsx` executes server directly
- **Production**: Client is pre-built by Vite into `dist/public/`, server is bundled by esbuild into `dist/index.cjs`, Express serves static files with SPA fallback. Post-build obfuscation applied to JS assets.

## External Dependencies

### Required Services
- **PostgreSQL Database**: Must be provisioned and accessible via `DATABASE_URL` environment variable. Used for all persistent data storage.

### Key NPM Packages
- **drizzle-orm / drizzle-kit / drizzle-zod**: ORM, migration tooling, and Zod schema generation
- **express**: HTTP server framework
- **multer**: Multipart form data / file upload handling
- **xlsx**: Excel file parsing for budget imports
- **zod**: Schema validation (shared between client and server)
- **@tanstack/react-query**: Async server state management on the client
- **wouter**: Client-side routing
- **react-hook-form**: Form state management
- **shadcn/ui + Radix UI**: Component library
- **recharts**: Chart/graph visualization
- **react-dropzone**: File drag-and-drop UI
- **date-fns**: Date formatting utilities
- **connect-pg-simple**: PostgreSQL session store (available but may not be actively used yet)
- **nanoid**: ID generation utilities

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal`: Runtime error overlay in development
- `@replit/vite-plugin-cartographer`: Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner`: Dev banner indicator (dev only)