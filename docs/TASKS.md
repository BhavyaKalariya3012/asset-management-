# TASKS — tick as you go

## Phase 1 — Foundation (0:00–1:15)
- [x] create-next-app (TS, Tailwind, App Router, src dir, alias @/*)
- [x] Install deps (prisma@6, @prisma/client@6, next-auth@4, bcrypt, zod, recharts, lucide-react, clsx, tsx, @types/bcrypt)
- [x] `.env.example`, `.gitignore` (`.env` is created by the developer — values below)
- [ ] Neon DB + DATABASE_URL (manual — see "Manual steps" in Decisions)
- [x] `prisma/schema.prisma` from docs/DATABASE.md — schema authored & validated; `migrate dev --name init` is manual (needs DATABASE_URL)
- [x] `lib/prisma.ts`, `lib/api.ts`, `lib/utils.ts`, `lib/assetCode.ts`
- [x] Seed script per docs/SEED_DATA.md (divisions, users, categories, locations, ~70 assets with specs, history, maintenance) — authored & type-checked; `db seed` is manual (needs DATABASE_URL)
- [ ] GitHub repo pushed, Vercel connected, first deploy green (manual — see "Manual steps")

## Phase 2 — Auth + RBAC + Division scope + Shell (1:15–2:00)
- [x] NextAuth Credentials (`lib/auth.ts`, route, type augmentation incl. divisionId)
- [x] `lib/session.ts`, `lib/rbac.ts` (can, requireRole, divisionScope)
- [x] `middleware.ts` protecting routes (+ `/users` ADMIN-only redirect)
- [x] Login page (error handling + demo-credentials hint box)
- [x] UI primitives (Button, Input, Select, Textarea, Badge, Card, Modal, Toast, Spinner, EmptyState, Pagination, Table)
- [x] Dashboard layout: Sidebar + Topbar (role label + division), role-aware nav, mobile drawer
- [x] Root `/` redirects to `/dashboard`

## Phase 3 — Asset CRUD (2:00–3:30)
- [x] `lib/validators.ts` (asset schemas + specsSchemaByCategoryCode)
- [x] `GET /api/meta` (scoped divisions)
- [x] `lib/queries/assets.ts` (scoped)
- [x] `GET/POST /api/assets`
- [x] `GET/PATCH /api/assets/[id]`
- [x] Assets list page with URL-synced filters + pagination
- [x] `AssetForm` + `CategorySpecsFields`, new page, edit page
- [x] Asset detail page (details + SpecsList)
- [x] StatusBadge, ConditionBadge

## Phase 4 — Lifecycle + Maintenance (3:30–4:30)
- [x] `lib/lifecycle.ts` (transitions + STATUS_LABELS) — created in Phase 3 (StatusBadge needs STATUS_LABELS); Phase 4 added STATUS_DOT/STATUS_RING for the timeline
- [x] `POST /api/assets/[id]/status` with transaction (409 INVALID_TRANSITION lists allowed via STATUS_LABELS; 400 when remarks missing for DECOMMISSIONED/DISPOSED)
- [x] `StatusChangeModal` (selectable status cards, required-remarks marker, hidden without asset:status or next statuses) + `LifecycleTimeline` (chronological, ringed current, faded next path)
- [x] Maintenance schemas (contractor, workOrderNo, future/next-due refinements) + `GET/POST /api/assets/[id]/maintenance` (409 for DISPOSED/PLANNED)
- [x] `MaintenanceForm` modal + `MaintenanceList` (type badge, cost ₹, contractor, work order, performed by, overdue next-due in red) + `MaintenancePanel`
- [x] `/api/maintenance/upcoming` (latest-record-per-asset, scoped, IN_SERVICE/UNDER_MAINTENANCE only) + `/maintenance` page (Overdue/Upcoming/All tabs, overdue rows red)
- [x] Verify RBAC + division scoping — status/maintenance routes use scoped `findFirst` → 404 out of division; `requireRole` gates asset:status (403 for OFFICER) and maintenance:create (allows OFFICER)

## Phase 5 — Dashboard, polish, ship (4:30–7:00)
- [x] `lib/stats.ts` (scoped) + `/api/dashboard/stats`
- [x] 6 KPI cards + StatusPie + CategoryBar + DivisionBar (admin) + ConditionBar + CostByMonth + Attention table
- [x] `/users` admin page + `/api/users` (+ `/api/users/[id]` PATCH)
- [x] loading/error/empty states, toasts everywhere (group error boundary + maintenance/users skeletons + global 404)
- [x] Mobile pass at 390px (overflow-x-auto tables, grids stack below md, responsive KPI grid, ResponsiveContainer charts)
- [x] CSV export (`/api/assets/export` + Export CSV button, scoped + filtered)
- [x] README (overview, stack, mermaid architecture + lifecycle, RBAC table, setup, deploy, roadmap)
- [ ] Production deploy + `prisma migrate deploy` + seed prod DB (manual — see "Ship checklist" in Decisions)
- [ ] Demo rehearsal on production URL, 2× (manual — script in docs/DEMO_SCRIPT.md)

## Decisions (agent: log any assumption here)
- **Enum syntax**: `docs/DATABASE.md` shows single-line enums (`enum Role { ADMIN MANAGER OFFICER }`). Prisma 6 requires one enum value per line, so the schema uses the multi-line form. Values are identical — no behavioural change.
- **create-next-app pinned versions**: the scaffold produced Next.js 16.3.6 + React 19. `next-auth@4` peer-ranges predate these, so installs use `--legacy-peer-deps`. Revisit in Phase 2 when wiring NextAuth.
- **npm 11 script gating**: npm 11 blocks dependency install scripts by default. Approved via `npm approve-scripts prisma @prisma/client @prisma/engines bcrypt esbuild unrs-resolver` (needed for Prisma engines, bcrypt native build, and tsx/esbuild). Re-run this after a fresh `npm install` if postinstall scripts get re-gated.
- **Extra managers seeded**: added `manager4/5/6@gov.in` (Rajkot/Gandhinagar/Bhuj) so every division has a manager to attribute `StatusHistory.changedBy` and maintenance to. Documented demo creds in CLAUDE.md remain valid.
- **Locations idempotency**: `Location` has no unique key, so the seed uses find-or-create on (name, district).
- **Phase 2 — middleware vs proxy**: Next 16 deprecates the `middleware` file convention in favour of `proxy`, but the task specifies `next-auth/middleware`, so `src/middleware.ts` stays. It builds and runs (registered as "Proxy (Middleware)"). Consider migrating later.
- **Phase 2 — live login testing needs the DB**: unauthenticated redirects (`/dashboard`, `/assets`, `/maintenance`, `/users` → `/login`) and the login page + demo box were verified with a running dev server. Verifying the 4 real logins, wrong-password error, per-user Topbar role/division, and Manager→`/users` redirect requires the seeded Neon DB (set `DATABASE_URL`, then `migrate dev` + `db seed`).
- **Phase 3 — specs typing**: `specsSchemaByCategoryCode` is typed `Record<string, z.ZodObject>` per API_SPEC; Prisma's `Json` input needs a cast (`as Prisma.InputJsonValue`) when writing validated specs. On PATCH, clearing specs writes `Prisma.JsonNull`.
- **Phase 3 — verification**: `npm run build` passes (zero type errors) — the automated DoD gate. The functional checklist (division scoping, code generation, category-swap, 403s, URL-synced filters) is implemented per docs but live-testing it requires the seeded Neon DB (manual `DATABASE_URL` + `migrate` + `seed`), same constraint noted in Phase 2.
- **Phase 4 — faded upcoming path**: the timeline's "remaining possible path" renders the current status's immediate `allowedNextStatuses` as faded dashed steps (accurate for a branching machine) rather than guessing one linear canonical path.
- **Phase 4 — status endpoint response**: `POST /api/assets/[id]/status` returns `{ asset, history }` (updated asset incl. `allowedNextStatuses` + the new StatusHistory row) so the client can refresh both timeline and header from one call.
- **Phase 4 — verification**: `npm run build` passes (zero type errors). Pure lifecycle/validator logic verified with a standalone tsx script (19/19: full chain valid, PLANNED→DISPOSED rejected with allowed-list, DISPOSED terminal, remarks/length rules, maintenance future-date + nextDueOn refinements). Full end-to-end HTTP checks (403/404/409 responses, red overdue rows vs seed, per-division scoping in the browser) still require the seeded Neon DB — no local Postgres/Docker is available, same manual `DATABASE_URL` + `migrate` + `seed` constraint noted for Phases 2–3.
- **Phase 3 — list sorting UX**: sort is exposed via clickable table headers (Code, Name, Length, Cost, Updated) that write `sort`/`order` to the URL; safe-listed to the fields in `assetQuerySchema`.

## Manual steps (developer)
1. **Create Neon Postgres DB**: sign in at https://neon.tech, create a project/database, copy the pooled connection string.
2. **Create `.env`** in the project root with:
   - `DATABASE_URL="postgresql://USER:PASS@HOST/db?sslmode=require"` (from Neon)
   - `NEXTAUTH_SECRET="<output of: openssl rand -base64 32>"`
   - `NEXTAUTH_URL="http://localhost:3000"`
3. **Migrate + seed**: `npx prisma migrate dev --name init` then `npx prisma db seed`.
4. **Inspect**: `npx prisma studio` — expect ~70 assets across 6 divisions, each with specs, status history and maintenance.
5. **GitHub**: create a repo and `git remote add origin <url>` then `git push -u origin master`.
6. **Vercel**: import the repo, set env vars `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (= production URL). Build runs `prisma generate && next build`. For production DB, run `npx prisma migrate deploy` and seed once.
- **Phase 5 — build/verification**: `npm run build` passes with zero type errors (the DoD gate). Recharts v3 tightened callback typing — the pie label/tooltip use a pre-mapped `label` field and `Number(value)` coercion instead of typed formatters. Client components must not import from `@/lib/rbac` (it transitively pulls `bcrypt` via `session`→`auth`); `ROLE_LABELS` is mirrored locally in `UsersManager`. No `.env`/local Postgres available, so the runtime checks in PRD §5 (real logins, live scoping 404s, dashboard-vs-Studio counts, admin-creates-user login) require the seeded Neon DB — code paths implemented and type-checked; see the PRD §5 report below.
- **Phase 5 — PRD §5 checklist (static/code review; runtime items need the seeded DB)**:
  1. Login all roles / wrong password error — PASS (NextAuth Credentials in `auth.ts`; inactive users rejected; login page shows error). Runtime login needs DB.
  2. Manager sees only own division; Admin all; direct URL to other division → 404 — PASS (`divisionScope` spread into every query; `getAssetById` uses scoped `findFirst` → null → `notFound()`).
  3. Officer cannot see New Asset / Change Status (UI hidden AND API 403) — PASS (UI gated by `can()`; routes `requireRole("asset:create"/"asset:status")` → 403 for OFFICER).
  4. Category-specific fields shown + displayed on detail — PASS (`CategorySpecsFields` switches by category; `SpecsList` renders specs).
  5. Invalid transition rejected with clear message — PASS (`canTransition` → 409 listing allowed via STATUS_LABELS).
  6. Every transition in timeline with user/date/remarks — PASS (transactional StatusHistory write; `LifecycleTimeline`).
  7. Maintenance captures contractor + work order no. — PASS (fields in schema, form, list).
  8. Dashboard numbers match DB + respect scope — PASS by construction (`getDashboardStats` uses `divisionScope`); exact counts vs Studio need the seeded DB.
  9. Pagination + filters via URL params — PASS (`assetQuerySchema` + `AssetFilters`/`AssetPagination` URL-synced).
  10. Live on Vercel + usable at 390px — code READY (responsive layout); deploy is the manual step below.
- **Ship checklist (developer, manual — no local DB in this environment)**:
  1. Vercel → Project → Settings → Environment Variables: set `DATABASE_URL` (Neon pooled), `NEXTAUTH_SECRET` (`openssl rand -base64 32`), `NEXTAUTH_URL` (= production URL).
  2. Against prod DB: `npx prisma migrate deploy` then `npx prisma db seed`.
  3. Trigger a redeploy (build runs `prisma generate && next build`).
  4. Rehearse `docs/DEMO_SCRIPT.md` on the production URL twice; verify dashboard counts against `npx prisma studio` for both Admin and the Ahmedabad Manager.
