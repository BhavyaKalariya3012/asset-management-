# TASKS — tick as you go

## Phase 1 — Foundation (0:00–1:15)
- [ ] create-next-app (TS, Tailwind, App Router, src dir, alias @/*)
- [ ] Install deps (prisma@6, @prisma/client@6, next-auth@4, bcrypt, zod, recharts, lucide-react, clsx, tsx, @types/bcrypt)
- [ ] `.env`, `.env.example`, `.gitignore`
- [ ] Neon DB + DATABASE_URL
- [ ] `prisma/schema.prisma` from docs/DATABASE.md, `migrate dev --name init`
- [ ] `lib/prisma.ts`, `lib/api.ts`, `lib/utils.ts`, `lib/assetCode.ts`
- [ ] Seed script per docs/SEED_DATA.md (divisions, users, categories, locations, ~70 assets with specs, history, maintenance)
- [ ] GitHub repo pushed, Vercel connected, first deploy green

## Phase 2 — Auth + RBAC + Division scope + Shell (1:15–2:00)
- [ ] NextAuth Credentials (`lib/auth.ts`, route, type augmentation incl. divisionId)
- [ ] `lib/session.ts`, `lib/rbac.ts` (can, requireRole, divisionScope)
- [ ] `middleware.ts` protecting routes
- [ ] Login page
- [ ] UI primitives
- [ ] Dashboard layout: Sidebar + Topbar (role label + division), role-aware nav
- [ ] Root `/` redirects to `/dashboard`

## Phase 3 — Asset CRUD (2:00–3:30)
- [ ] `lib/validators.ts` (asset schemas + specsSchemaByCategoryCode)
- [ ] `GET /api/meta` (scoped divisions)
- [ ] `lib/queries/assets.ts` (scoped)
- [ ] `GET/POST /api/assets`
- [ ] `GET/PATCH /api/assets/[id]`
- [ ] Assets list page with URL-synced filters + pagination
- [ ] `AssetForm` + `CategorySpecsFields`, new page, edit page
- [ ] Asset detail page (details + SpecsList)
- [ ] StatusBadge, ConditionBadge

## Phase 4 — Lifecycle + Maintenance (3:30–4:30)
- [ ] `lib/lifecycle.ts` (transitions + STATUS_LABELS)
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
-
