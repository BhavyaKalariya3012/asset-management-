# DEMO SCRIPT — R&B AssetTrack (4 minutes)

Goal: prove an end-to-end infrastructure asset lifecycle system with real R&B vocabulary, role-based access and division scoping. Follow the clicks exactly; the seed data is arranged so every screen looks rich.

**Before you start:** open the deployed URL, be logged out, have the four demo credentials handy (they're on the login page's hint box). Keep Prisma Studio closed but ready in case a judge asks to verify numbers.

---

## 0:00 — 0:30 · Admin login + state-wide dashboard
1. On `/login`, enter **admin@gov.in / Admin@123**, click **Sign in**.
2. Land on `/dashboard`.
   - **Say:** "This is the Chief Engineer's head-office view — every division in the state. We're tracking around 70 assets: total road length in kilometres, bridges and culverts, buildings and quarters, total asset value in crores, and overdue maintenance flagged in red."
3. Point at the charts.
   - **Say:** "Assets by status, by category, and — because I'm the Chief Engineer — a by-division comparison. The condition chart flags critical assets in red, and the 12-month line shows maintenance spend with a monsoon-season bump."
4. Point at **Needs attention**.
   - **Say:** "The system surfaces the five assets that need action — critical condition or overdue maintenance."

## 0:30 — 1:10 · Division scoping (the core idea)
1. Click the user menu → **Logout**. Log in as **manager@gov.in / Manager@123**.
2. Land on `/dashboard`.
   - **Say:** "Same app, but I'm now the Executive Engineer for the Ahmedabad division. Notice the banner — 'Showing data for R&B Division Ahmedabad'. The by-division chart is gone, and every number is scoped to my division only. This isn't hidden in the UI — it's enforced in the database layer."
3. Go to **Assets**. 
   - **Say:** "Only Ahmedabad assets. If I try to open another division's asset by its direct URL…"
4. In the address bar, paste a Surat asset URL (grab one earlier as admin), e.g. `/assets/<surat-id>`.
   - **Say:** "…I get a 404 — not even a 'forbidden', because as far as my division is concerned, that asset doesn't exist."

## 1:10 — 2:20 · Register a road asset + lifecycle
1. Assets → **New Asset**.
2. Fill in:
   - Name: `SH-1 Ahmedabad–Mehsana Section (km 40–60)`
   - Category: **State Highway** — watch the road-specific fields appear.
   - Division is locked to Ahmedabad. Location: pick one.
   - Road number `SH-1`, Length `20`.
   - Specs: Surface **Bituminous**, Lanes `4`, Width `14`.
   - Initial status: **Planned**. Click **Create asset**.
   - **Say:** "Category-specific fields — surface, lanes, width for a road; a bridge would ask for spans and load class instead. It starts life as Planned."
3. On the detail page, click **Change Status** → select **Procured / Constructed** → Confirm.
4. Click **Change Status** again → **In Service** → Confirm.
   - **Say:** "The lifecycle is a state machine. I can only move to allowed next states — I can't jump a road straight to Disposed."
5. Point at the **Lifecycle timeline** on the right.
   - **Say:** "Every transition is recorded immutably — who, when, and remarks — and rendered as a timeline."

## 2:20 — 3:10 · Maintenance
1. On the same asset, in the Maintenance card click **Log Maintenance**.
2. Fill in:
   - Type **Resurfacing**, Performed on today, Description `Bituminous resurfacing km 40–52`.
   - Cost `4500000`, Contractor `Patel Constructions`, Work Order `RNB/AMD/2025-26/0512`, Next due ~6 months out.
   - Click **Log record**.
   - **Say:** "Maintenance captures the contractor and work-order number — how R&B actually tracks field work — plus the next-due date."
3. Go to **Maintenance** in the sidebar → **Overdue** tab.
   - **Say:** "Across the division, overdue work orders are flagged in red, and there's an upcoming-30-days view for planning."

## 3:10 — 4:00 · Restricted access (Officer) + close
1. Logout. Log in as **officer@gov.in / Officer@123**.
2. Go to **Assets**.
   - **Say:** "The Assistant Engineer sees the same division data but has no 'New Asset' button, and on an asset there's no 'Change Status'. It's not just hidden — the API returns 403 if you try to call it directly. Officers can still log maintenance and inspections, which is their real job."
3. Note there's no **Users** link (admin-only).
4. **Close:** "So: role-based access, strict division scoping, a real asset lifecycle with immutable history, maintenance tracking, and a KPI dashboard — deployed and seeded with realistic Gujarat R&B data."

---

## Likely judge questions

**Q: How does this scale to other departments (Water, Health, Education…)?**
The data model is deliberately generic: assets belong to a **Division**, carry a **Category**, and store category-specific attributes in a flexible JSON `specs` field validated per category. Onboarding another department means adding its categories and their spec schemas — no schema migration for each new asset type. The lifecycle state machine and the maintenance model are department-agnostic. The one thing we'd add for true multi-department use is a Department entity above Division (today there's a single R&B tenant), plus per-department category sets — that's a contained change because scoping already flows through one `divisionScope()` helper that every query uses.

**Q: How is data secured?**
Three layers. (1) **Authentication** — NextAuth with hashed passwords (bcrypt); sessions are signed JWTs, and inactive users can't log in. (2) **Authorisation** — every API route calls `requireRole()`, and permissions are checked against a role matrix; the UI hides actions a role can't perform, but the server enforces them regardless (returns 403). (3) **Division scoping** — enforced at the data layer: `divisionScope(user)` is spread into every asset, maintenance and dashboard query, so a Manager literally cannot read or write another division's data; out-of-scope lookups return 404. All input is validated with Zod before it touches the database, and status changes are transactional so history can never drift from the asset's actual state.

**Q: What stops an invalid status change or bad data?**
Transitions are validated against an explicit state machine (`lifecycle.ts`) — an illegal move returns `409` with the list of allowed statuses. Every request body is parsed by a Zod schema (types, ranges, required fields, cross-field rules like "next-due must be after performed-on"). The status update and its history row are written in a single Prisma transaction, so the audit trail is always consistent.
