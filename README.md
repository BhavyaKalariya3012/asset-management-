# R&B AssetTrack — Infrastructure Asset Management

An end-to-end infrastructure asset inventory for the **Roads & Buildings (R&B) Department, Government of Gujarat**. It tracks roads, bridges, culverts, government buildings, residential quarters and road machinery across their entire lifecycle — with division-level data scoping, role-based access, a lifecycle state machine, maintenance records and a live KPI dashboard.

Built as a hackathon deliverable: working, demo-ready and deployable.

---

## Features

- **Credentials login** with three roles (Chief Engineer / Executive Engineer / Assistant Engineer).
- **Division-level data scoping** — Managers and Officers see only their own division; the Chief Engineer (Admin) sees every division. Accessing another division's asset returns 404, not 403.
- **Asset registry** for all R&B categories with **category-specific fields** (surface/lanes for roads, spans/load class for bridges, floors/usage for buildings, make/reg-no for machinery) stored as validated JSON.
- **Search, filter, sort and pagination**, all synced to the URL.
- **Lifecycle tracking** — `PLANNED → PROCURED → IN_SERVICE ⇄ UNDER_MAINTENANCE → DECOMMISSIONED → DISPOSED` — enforced by a state machine, with an immutable status history and a visual timeline.
- **Maintenance records** per asset (routine, periodic renewal, resurfacing, structural repair, emergency, inspection) with contractor, work-order number, cost and next-due date; an Overdue / Upcoming view across the division.
- **Dashboard** with R&B KPIs (total road length, bridges & culverts, buildings & quarters, total asset value, overdue maintenance), charts by status/category/division/condition, a 12-month maintenance-cost trend, an emergency-repairs counter, and a "Needs attention" list.
- **User administration** (Admin only) — create users, assign role + division, toggle active status.
- **CSV export** of the (scoped, filtered) asset list.
- **Role-based UI and API** — actions are hidden in the UI and enforced in every route handler.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| Styling | Tailwind CSS v4, Inter (`next/font`), lucide-react icons |
| Auth | NextAuth v4 (Credentials provider, JWT sessions) |
| Database | PostgreSQL (Neon) via Prisma 6 |
| Validation | Zod |
| Charts | Recharts |
| Passwords | bcrypt |
| Hosting | Vercel |

---

## Architecture

```mermaid
flowchart TD
    User([Engineer / Chief Engineer])
    subgraph Browser
      RSC[Server Components<br/>read pages]
      CC[Client Components<br/>forms, filters, charts]
    end
    subgraph Next["Next.js on Vercel"]
      MW[Proxy / Middleware<br/>route protection + /users admin gate]
      API[Route Handlers<br/>/api/*]
      NA[NextAuth<br/>Credentials + JWT]
    end
    subgraph Lib["src/lib (shared logic)"]
      RBAC[rbac.ts<br/>requireRole · can · divisionScope]
      LC[lifecycle.ts<br/>state machine]
      VAL[validators.ts<br/>Zod schemas]
      Q[queries/* · stats.ts<br/>scoped Prisma access]
    end
    DB[(PostgreSQL / Neon)]

    User --> MW --> RSC & CC
    RSC --> Q
    CC -->|fetch| API
    API --> NA
    API --> RBAC --> Q
    API --> VAL
    API --> LC
    Q --> DB
    NA --> DB
```

**Conventions**

- **Read pages** are Server Components that call Prisma through shared functions in `src/lib/queries/` and `src/lib/stats.ts`.
- **Mutations** go through `/api/*` Route Handlers. Every handler calls `requireRole()` and spreads `divisionScope(user)` into asset/maintenance/dashboard queries.
- **Status changes** happen only via `POST /api/assets/[id]/status`, inside a `prisma.$transaction` that also writes an immutable `StatusHistory` row.
- **Category specifics** live in `Asset.specs` (JSON) and are validated per-category by Zod.
- One Prisma client singleton in `src/lib/prisma.ts`.

---

## Lifecycle state machine

```mermaid
stateDiagram-v2
    [*] --> PLANNED
    [*] --> PROCURED
    [*] --> IN_SERVICE
    PLANNED --> PROCURED
    PROCURED --> IN_SERVICE
    IN_SERVICE --> UNDER_MAINTENANCE
    UNDER_MAINTENANCE --> IN_SERVICE
    IN_SERVICE --> DECOMMISSIONED
    UNDER_MAINTENANCE --> DECOMMISSIONED
    DECOMMISSIONED --> DISPOSED
    DISPOSED --> [*]
```

Invalid transitions (e.g. `PLANNED → DISPOSED`) are rejected with `409 INVALID_TRANSITION` and a message listing the allowed next statuses. Moving to `DECOMMISSIONED` / `DISPOSED` requires remarks. In the UI, `DECOMMISSIONED` is labelled **"Condemned / Closed"**.

---

## Roles, permissions & division scoping

| App role | Real-world | Sees | Create / edit assets | Change status | Log maintenance | Manage users |
|---|---|---|---|---|---|---|
| ADMIN | Chief Engineer / Head Office | All divisions | ✅ | ✅ | ✅ | ✅ |
| MANAGER | Executive Engineer | Own division | ✅ | ✅ | ✅ | ❌ |
| OFFICER | Assistant / Junior Engineer | Own division | ❌ | ❌ | ✅ | ❌ |

`divisionScope(user)` returns `{}` for ADMIN (no filter) and `{ divisionId: user.divisionId }` for everyone else. It is spread into every asset, maintenance and dashboard query, so scoping is enforced at the data layer — not just hidden in the UI. Requesting an out-of-division asset by direct URL resolves to `null` → **404**.

---

## Getting started (local)

### Prerequisites
- Node.js 20+
- A PostgreSQL database (a free [Neon](https://neon.tech) project works well)

### 1. Install
```bash
npm install
```

### 2. Environment
Create `.env` in the project root (see `.env.example`):
```bash
DATABASE_URL="postgresql://USER:PASS@HOST/db?sslmode=require"   # Neon pooled connection string
NEXTAUTH_SECRET="<output of: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Migrate + seed
```bash
npx prisma migrate dev --name init
npx prisma db seed
```
The seed creates 6 divisions, the demo users, 8 categories, 10 locations and ~70 assets across all divisions — each with category specs, a valid status history and maintenance records (including overdue, upcoming and monsoon-season emergency repairs).

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000. Inspect the data anytime with `npx prisma studio`.

---

## Demo credentials

| Role | Email | Password | Division |
|---|---|---|---|
| Admin (Chief Engineer) | `admin@gov.in` | `Admin@123` | — (all divisions) |
| Manager (Executive Engineer) | `manager@gov.in` | `Manager@123` | R&B Division Ahmedabad |
| Officer (Assistant Engineer) | `officer@gov.in` | `Officer@123` | R&B Division Ahmedabad |
| Manager (Executive Engineer) | `manager2@gov.in` | `Manager@123` | R&B Division Surat |

---

## Deployment (Vercel + Neon)

1. Push the repo to GitHub and import it into Vercel.
2. Set the environment variables in the Vercel project: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (= the production URL, e.g. `https://your-app.vercel.app`).
3. The build command is `prisma generate && next build` (already in `package.json`).
4. Against the production database, run the migration and seed once:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. Redeploy. The app is now live with seeded demo data.

---

## Project layout

```
src/
  app/
    (auth)/login            login page
    (dashboard)/            authenticated shell (sidebar + topbar)
      dashboard/            KPI + charts dashboard
      assets/               list · new · [id] · [id]/edit
      maintenance/          overdue / upcoming / all
      users/                admin-only user management
    api/                    route handlers (assets, status, maintenance, dashboard, users, meta, export)
  components/               ui primitives, assets, maintenance, dashboard, users, layout
  lib/                      prisma, auth, rbac, session, lifecycle, validators, stats, queries/
prisma/                     schema.prisma, seed.ts
docs/                       PRD, architecture, database, RBAC, API/UI specs, tasks, demo script
```

---

## What I'd build next

- **Map view** — plot assets by lat/lng (locations already carry coordinates) with condition-coloured markers.
- **QR codes / printable asset sheets** — a scannable code per asset linking to its detail page for field inspections.
- **GIS integration** — align road chainage with a GIS layer for accurate section mapping.
- **Notifications** — email/SMS alerts for overdue maintenance and upcoming due dates.
- **Depreciation** — real straight-line/WDV depreciation using `usefulLifeYears` and acquisition cost.
- **Audit log** — a full change trail for every mutation (who changed what, when), beyond the status history.
- **Document uploads** — attach work orders, inspection photos and completion certificates to assets and maintenance records.
