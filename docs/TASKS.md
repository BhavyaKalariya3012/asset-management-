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
- [x] `lib/lifecycle.ts` (transitions + STATUS_LABELS) — created in Phase 3 (StatusBadge needs STATUS_LABELS)
- [ ] `POST /api/assets/[id]/status` with transaction
- [ ] `StatusChangeModal` + `LifecycleTimeline`
- [ ] Maintenance schemas (contractor, workOrderNo) + `GET/POST /api/assets/[id]/maintenance`
- [ ] `MaintenanceForm` modal + `MaintenanceList`
- [ ] `/api/maintenance/upcoming` + `/maintenance` page
- [ ] Verify RBAC + division scoping (Manager Surat cannot open an Ahmedabad asset)

## Phase 5 — Dashboard, polish, ship (4:30–7:00)
- [ ] `lib/stats.ts` (scoped) + `/api/dashboard/stats`
- [ ] 6 KPI cards + StatusPie + CategoryBar + DivisionBar (admin) + ConditionBar + CostByMonth + Attention table
- [ ] `/users` admin page + `/api/users`
- [ ] loading/error/empty states, toasts everywhere
- [ ] Mobile pass at 390px
- [ ] CSV export (nice-to-have)
- [ ] README
- [ ] Production deploy + `prisma migrate deploy` + seed prod DB
- [ ] Demo rehearsal on production URL, 2×

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
