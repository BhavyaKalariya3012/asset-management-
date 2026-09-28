# CLAUDE.md — Project Memory (read this first, every session)

## Project
**R&B Asset Management System** for the Roads & Buildings (R&B) Department, Government of Gujarat.
Hackathon problem: *build an end-to-end infrastructure asset inventory to track and manage assets across their entire lifecycle.*
Time box: **7 hours**. Priority = working, demo-ready, deployed app. Not perfection.

## Domain context (important)
The R&B Department owns and maintains:
- **Roads**: State Highways (SH), District Roads (DR), Village Roads (VR)
- **Bridges** and **Culverts**
- **Government buildings** (offices, rest houses) and **Residential Quarters**
- **Road machinery/vehicles** (rollers, pavers, graders, tippers)

Organisation is hierarchical: Head Office (Chief Engineer) → Circle → **Division** (Executive Engineer) → Sub-division (AE/JE).
There is ONE department (R&B). The data-scoping unit is the **Division**.

Role mapping:
| App role | Real-world meaning | Data visibility |
|---|---|---|
| ADMIN | Chief Engineer / Head Office | All divisions |
| MANAGER | Executive Engineer of a Division | Own division only |
| OFFICER | Assistant / Junior Engineer | Own division only |

Use R&B vocabulary in the UI: "Division" (never "Department"), "Chainage", "Work Order", "Contractor", "Condemned / Closed" (label for DECOMMISSIONED), "Monsoon damage".

## Read these docs before coding (in order)
1. `docs/PRD.md` — what we build and what we do NOT build
2. `docs/ARCHITECTURE.md` — stack, folders, conventions
3. `docs/DATABASE.md` — Prisma schema (source of truth)
4. `docs/RBAC_LIFECYCLE.md` — roles, division scoping, status transition rules
5. `docs/API_SPEC.md` — every endpoint contract
6. `docs/UI_SPEC.md` — pages, components, design tokens
7. `docs/SEED_DATA.md` — demo data requirements
8. `docs/TASKS.md` — checklist; tick items as you finish them

## Tech stack (do not substitute)
Next.js (App Router, TypeScript) · Tailwind CSS · Next.js Route Handlers · PostgreSQL (Neon) · Prisma 6 · NextAuth v4 (Credentials, JWT sessions) · Zod · Recharts · lucide-react · bcrypt · Git/GitHub · Vercel

## Hard rules
- TypeScript strict. No `any` unless commented why.
- Validate **every** API input with Zod (schemas in `src/lib/validators.ts`).
- Check auth + role in **every** API route using `requireRole()` from `src/lib/rbac.ts`.
- **Division scoping**: every asset/maintenance/dashboard query MUST apply `divisionScope(user)` from `src/lib/rbac.ts`. ADMIN → no filter; MANAGER/OFFICER → `{ divisionId: user.divisionId }`. Accessing an asset of another division returns 404 (not 403) for non-admins.
- Status changes ONLY via `POST /api/assets/[id]/status` using `src/lib/lifecycle.ts` and a `prisma.$transaction` that also writes `StatusHistory`. Never update `Asset.status` anywhere else.
- Category-specific data lives in `Asset.specs` (JSON) and is validated with a per-category Zod schema (see `docs/API_SPEC.md`).
- Read pages = Server Components calling Prisma directly (through shared functions in `src/lib/queries/`). Mutations = API routes.
- One Prisma client from `src/lib/prisma.ts` (global singleton).
- Never commit `.env`. Keep `.env.example` updated.
- Decimals (`acquisitionCost`, `cost`) → convert to `Number` before sending to client. Dates → ISO strings.
- Every list page needs: loading state, empty state, error state.
- Reuse components from `src/components/ui/`; do not hand-style one-offs.
- Small commits with clear messages: `feat:`, `fix:`, `chore:`, `docs:`.

## Definition of done for any task
1. `npm run build` passes with zero type errors
2. Feature works manually for the relevant role(s)
3. Tick the item in `docs/TASKS.md`
4. Commit and push

## Demo credentials (seeded)
| Role | Email | Password | Division |
|---|---|---|---|
| Admin (Chief Engineer) | admin@gov.in | Admin@123 | — (all) |
| Manager (EE) | manager@gov.in | Manager@123 | R&B Division Ahmedabad |
| Officer (AE) | officer@gov.in | Officer@123 | R&B Division Ahmedabad |
| Manager (EE) | manager2@gov.in | Manager@123 | R&B Division Surat |

## Commands
```bash
npm run dev
npx prisma migrate dev --name <name>
npx prisma db seed
npx prisma studio
npm run build
```

## When unsure
Prefer the simplest implementation that satisfies the docs. If a doc is ambiguous, choose the simple option, note the decision at the bottom of `docs/TASKS.md` under "Decisions", and continue. Do not stop to ask unless blocked.
