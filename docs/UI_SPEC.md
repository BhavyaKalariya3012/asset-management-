# UI SPEC

## Design tokens
- Look: clean, official, trustworthy. Light theme.
- Primary: indigo-600 (hover indigo-700). Background: slate-50. Cards: white, `rounded-xl border border-slate-200 shadow-sm`.
- Font: Inter (`next/font/google`).
- Spacing: page padding `p-6`, section gap `space-y-6`.
- Every page header: title (text-2xl font-semibold) + optional primary action on the right.
- Vocabulary: "Division", "Chainage", "Work Order", "Contractor", "Condemned / Closed". Never "Department".

## Layout
- **Sidebar** (w-64; mobile: drawer): logo + "R&B AssetTrack", subtitle "Govt. of Gujarat". Links: Dashboard, Assets, Maintenance, Users (ADMIN only). Active link highlighted.
- **Topbar**: breadcrumb, user name + role label (Chief Engineer / Executive Engineer / Assistant Engineer) + division name (or "All Divisions" for admin), Logout.

## Pages

### `/login`
Centered card, email + password, error message on failure, demo-credentials hint box (hackathon only) listing the 4 seeded users.

### `/dashboard`
- Row 1 KPI cards (6): **Total Assets**, **Total Road Length (km)**, **Bridges & Culverts**, **Buildings & Quarters**, **Total Asset Value** (compact ₹ Cr), **Overdue Maintenance** (red if > 0)
- Row 2: StatusPie (by status, use STATUS_LABELS), CategoryBar (assets by category)
- Row 3: **DivisionBar** (ADMIN only — assets/value per division; for others show ConditionBar full width instead), ConditionBar (CRITICAL red)
- Row 4: CostByMonth (maintenance cost, last 12 months), small card "Emergency repairs (12 mo)" with count
- Row 5: "Needs Attention" table (top 5): code, name, condition, reason, link
- Scope banner under header for non-admin: "Showing data for <division name>".

### `/assets`
- Header: "Assets" + `+ New Asset` (MANAGER/ADMIN) + `Export CSV`
- Filter bar: search (name / code / road number; debounced 300ms), status, category, condition, **division (ADMIN only)**, Reset. All URL-synced.
- Table columns: Code, Name, Category, Road No, Length (km), Division (ADMIN only), Status badge, Condition badge, Cost (₹), Updated
- Row click → detail. Pagination "Showing 1–10 of 62".
- Empty state: icon + "No assets match your filters" + Reset.

### `/assets/new` and `/assets/[id]/edit`
Single `AssetForm`. Two-column grid on desktop.
- Section 1 "Basic": name, category, division (MANAGER: locked to own; ADMIN: select), location, condition, description
- Section 2 "R&B details": roadNumber (shown only for SH/DR/VR), lengthKm (roads, bridges, culverts), builtYear, lastRenovatedOn
- Section 3 **"Category specifications"** — rendered by `CategorySpecsFields` and changes when the category changes:
  - Roads (SH/DR/VR): Surface (select), Lanes, Width (m), Chainage from (km), Chainage to (km)
  - Bridge (BR): Bridge type (select), Spans, Load class (MT), Crossing (e.g. river name)
  - Culvert (CV): Culvert type (select), Spans, Width (m)
  - Building / Quarters (BL/RQ): Floors, Built-up area (sq m), Usage (select)
  - Machinery (MC): Make, Model, Registration no., Year of manufacture, Engine hours
- Section 4 "Acquisition": acquisition date, cost (₹), initial status (create only)
- Inline Zod errors; spinner on submit; redirect to detail with toast.

### `/assets/[id]`
- Header: name, code, StatusBadge, ConditionBadge; actions (permission-based): Edit, **Change Status**
- Left (2/3): 
  - Details card: category, division + circle, location + district, road number, length, built year, last renovated, acquisition date/cost, description
  - **Specifications card**: `SpecsList` renders `specs` as key/value pairs with friendly labels and units (hide empty)
  - **Maintenance card**: list + "Log Maintenance" button (hidden for DISPOSED/PLANNED)
- Right (1/3): **Lifecycle Timeline** — vertical, chronological; colored dot per status (STATUS_LABELS), date, "by <name>", remarks; current status ringed; faded upcoming path.

### Maintenance form fields
Type (select), description, performed on, cost (₹), contractor, work order no., next due date.

### `/maintenance`
Tabs: Overdue (red) | Upcoming 30 days | All. Columns: Asset (link), Category, Type, Last performed, Contractor, Next due, Days overdue/remaining. Scoped by division.

### `/users` (ADMIN)
Table of users (name, email, role, division, active) + "Add User" modal (division required unless ADMIN); inline role select and active toggle.

## Shared components (build first)
`Button` (primary/secondary/danger/ghost; loading) · `Input`/`Select`/`Textarea` (label + error) · `Badge` · `Card` · `Modal` · Table primitives · `Toast` (context) · `Spinner` · `EmptyState` · `Pagination`

## States
- `loading.tsx` skeletons for list and detail; `error.tsx` with retry; 404 page
- API 403 → toast "You don't have permission"

## Responsiveness
Tables in `overflow-x-auto`. Grids collapse below `md`. Test at 390px.

## Accessibility minimum
Labels on inputs, aria-labels on icon buttons, visible focus rings, sufficient contrast.
