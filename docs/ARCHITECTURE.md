# ARCHITECTURE

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js App Router + React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js Route Handlers (`src/app/api/**/route.ts`) |
| DB | PostgreSQL on Neon |
| ORM | Prisma 6 (pin `prisma@6` and `@prisma/client@6`) |
| Auth | NextAuth v4, Credentials provider, JWT session strategy |
| Validation | Zod |
| Charts | Recharts (client components only) |
| Icons | lucide-react |
| Hashing | bcrypt |
| Deploy | Vercel + Neon |

## Folder structure
```
src/
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (dashboard)/
│  │  ├─ layout.tsx                 # sidebar + topbar, session-aware
│  │  ├─ dashboard/page.tsx
│  │  ├─ assets/
│  │  │  ├─ page.tsx                # list + filters (server component, reads searchParams)
│  │  │  ├─ new/page.tsx
│  │  │  └─ [id]/
│  │  │     ├─ page.tsx             # detail + specs + timeline + maintenance
│  │  │     └─ edit/page.tsx
│  │  ├─ maintenance/page.tsx       # upcoming / overdue
│  │  └─ users/page.tsx             # ADMIN only
│  ├─ api/
│  │  ├─ auth/[...nextauth]/route.ts
│  │  ├─ assets/route.ts
│  │  ├─ assets/[id]/route.ts
│  │  ├─ assets/[id]/status/route.ts
│  │  ├─ assets/[id]/maintenance/route.ts
│  │  ├─ assets/export/route.ts     # CSV (nice-to-have)
│  │  ├─ maintenance/upcoming/route.ts
│  │  ├─ dashboard/stats/route.ts
│  │  ├─ users/route.ts
│  │  ├─ users/[id]/route.ts
│  │  └─ meta/route.ts
│  ├─ layout.tsx
│  └─ page.tsx                      # redirect → /dashboard
├─ components/
│  ├─ ui/          Button, Input, Select, Textarea, Badge, Modal, Card, Table, Toast, Spinner, EmptyState, Pagination
│  ├─ layout/      Sidebar, Topbar
│  ├─ assets/      AssetForm, CategorySpecsFields, SpecsList, AssetTable, AssetFilters, StatusBadge, ConditionBadge, LifecycleTimeline, StatusChangeModal
│  ├─ maintenance/ MaintenanceForm, MaintenanceList
│  └─ charts/      StatusPie, CategoryBar, DivisionBar, ConditionBar, CostByMonth (all "use client")
├─ lib/
│  ├─ prisma.ts
│  ├─ auth.ts          # NextAuth options
│  ├─ session.ts       # getCurrentUser for server components
│  ├─ rbac.ts          # can(), requireRole(), divisionScope()
│  ├─ lifecycle.ts     # transitions map, STATUS_LABELS
│  ├─ validators.ts    # Zod schemas incl. specs-by-category
│  ├─ assetCode.ts     # RNB-<CAT>-0001 generator
│  ├─ queries/         # assets.ts, maintenance.ts (shared by pages + API, always scoped)
│  ├─ stats.ts         # dashboard aggregation (scoped)
│  ├─ api.ts           # ApiError, ok(), fail(), handleError()
│  └─ utils.ts         # formatCurrency (INR), formatCompactINR, formatDate, cn()
├─ types/next-auth.d.ts  # extend Session with id, role, divisionId
└─ middleware.ts         # protect routes
prisma/
├─ schema.prisma
└─ seed.ts
```

## Conventions
- **Path alias**: `@/*` → `src/*`
- **API response shape**
  - Success: `{ data: T, meta?: {...} }`
  - Error: `{ error: { code: string, message: string, details?: unknown } }`
  - Status codes: 200/201 OK, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found (also for out-of-division assets), 409 conflict, 500 server
- **Server components** fetch via `src/lib/queries/*` (which take the current user and apply `divisionScope`); pass plain serializable objects to client components.
- **Filters live in URL** (`?q=&status=&categoryId=&divisionId=&condition=&page=&sort=&order=`).
- **Currency**: INR — `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})`; compact form for KPI cards (₹ Cr / ₹ L).
- **Asset code** format: `RNB-<CATEGORY_CODE>-<0001>` generated server-side in a transaction (count per category + 1, padded; retry once on unique conflict).
- **Errors**: wrap route handlers with `handleError()`.
- **Labels**: `STATUS_LABELS` in lifecycle.ts — DECOMMISSIONED shows as "Condemned / Closed" in UI; enum values unchanged.

## Environment variables (`.env.example`)
```
DATABASE_URL="postgresql://USER:PASS@HOST/db?sslmode=require"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```
On Vercel: set the same three, `NEXTAUTH_URL` = production URL. In `package.json`: `"postinstall": "prisma generate"`, `"build": "prisma generate && next build"`.

## Security basics
- Passwords hashed with bcrypt (cost 10)
- Never return `password` from any query (use `select`)
- Middleware blocks unauthenticated access; API routes re-check independently
- Division scope enforced in the query layer, not just the UI
