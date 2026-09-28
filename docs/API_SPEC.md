# API SPEC

All routes require a session unless stated. Error shape: `{ error: { code, message, details? } }`.
**All asset-related reads/writes are division-scoped** (see docs/RBAC_LIFECYCLE.md).

## Auth
`/api/auth/[...nextauth]` — NextAuth Credentials. Session: `user: { id, name, email, role, divisionId }`.

## Meta
### `GET /api/meta`
Dropdown data. Any role.
```json
{ "data": {
  "categories": [{"id","name","code"}],
  "divisions": [{"id","name","code","circle"}],   // ADMIN: all; others: only own
  "locations": [{"id","name","district"}]
} }
```

## Assets
### `GET /api/assets`
Query: `q`, `status`, `categoryId`, `divisionId` (ignored for non-admin), `condition`, `page`(1), `pageSize`(10, max 50), `sort`(`createdAt|name|acquisitionCost|assetCode|lengthKm`), `order`(`asc|desc`).
`q` matches `name` OR `assetCode` OR `roadNumber` (case-insensitive contains).
Response: `{ data: Asset[], meta: { page, pageSize, total, totalPages } }` with category, division, location names included.

### `POST /api/assets` — `asset:create`
Body (`createAssetSchema`):
```
name: string 3..120
description?: string ≤ 1000
categoryId, locationId: string (must exist)
divisionId: string (MANAGER: forced to own; ADMIN: required)
condition?: Condition (default GOOD)
roadNumber?: string ≤ 20 (only meaningful for SH/DR/VR)
lengthKm?: number ≥ 0
builtYear?: int 1900..currentYear
lastRenovatedOn?: ISO date
specs?: object — validated by the schema for the chosen category (see below); unknown keys stripped
acquisitionDate?: ISO date
acquisitionCost?: number ≥ 0
initialStatus?: PLANNED | PROCURED | IN_SERVICE (default PLANNED)
```
Behavior: generate `assetCode` (`RNB-<CAT>-0001`); in ONE transaction create asset + first StatusHistory row. 201 with asset.

**Specs validation**: in `validators.ts` export `specsSchemaByCategoryCode: Record<string, ZodObject>`; look up the category by id, then `parse` specs with the matching schema (all fields optional). Categories SH/DR/VR share `roadSpecs`; BL/RQ share `buildingSpecs`. Keys per docs/DATABASE.md.

### `GET /api/assets/[id]`
Scoped `findFirst`; 404 if not found/out of scope. Returns asset with category, division, location, createdBy(name), `history` (desc, with changedBy name), `maintenance` (desc, with performedBy name), `allowedNextStatuses`.

### `PATCH /api/assets/[id]` — `asset:update`
Partial of create schema **excluding** `initialStatus` and `divisionId` (non-admin cannot move assets between divisions; ADMIN may change divisionId). Rejects `status` if present. If categoryId changes, re-validate specs. 409 if DISPOSED.

## Lifecycle
### `POST /api/assets/[id]/status` — `asset:status`
Body: `{ toStatus: AssetStatus, remarks?: string ≤ 500 }`
- 404 if missing / out of scope
- 409 `INVALID_TRANSITION` if `!canTransition(current, toStatus)`; message lists allowed statuses
- 400 if remarks missing for DECOMMISSIONED/DISPOSED
- `prisma.$transaction([asset.update, statusHistory.create])`
- Returns updated asset + new history row

## Maintenance
### `GET /api/assets/[id]/maintenance` — list (scoped, desc by performedOn)

### `POST /api/assets/[id]/maintenance` — `maintenance:create`
Body:
```
type: MaintenanceType
description: string 5..500
cost?: number ≥ 0
contractor?: string ≤ 120
workOrderNo?: string ≤ 60
performedOn: ISO date (not in future)
nextDueOn?: ISO date (> performedOn)
```
404 if out of scope; 409 if asset is DISPOSED or PLANNED.

### `GET /api/maintenance/upcoming`
Query: `scope=overdue|upcoming|all` (default all), `days=30`.
Latest record per asset that has `nextDueOn`, scoped, including asset code/name/status/division, type, last performed, nextDueOn, `daysOverdue|daysRemaining`. Only assets in IN_SERVICE / UNDER_MAINTENANCE.

## Dashboard
### `GET /api/dashboard/stats` (scoped; logic in `src/lib/stats.ts`, reused by the dashboard server component)
```json
{ "data": {
  "totals": {
    "assets": 0, "totalValue": 0,
    "totalRoadKm": 0, "bridges": 0, "buildings": 0,
    "inService": 0, "underMaintenance": 0, "overdueMaintenance": 0,
    "emergencyRepairs12m": 0
  },
  "byStatus": [{ "status": "IN_SERVICE", "count": 0 }],
  "byCategory": [{ "category": "State Highway", "count": 0, "value": 0 }],
  "byDivision": [{ "division": "R&B Division Surat", "count": 0, "value": 0 }],   // ADMIN only; [] otherwise
  "byCondition": [{ "condition": "GOOD", "count": 0 }],
  "maintenanceCostByMonth": [{ "month": "2026-01", "cost": 0 }],
  "attention": [{ "id","assetCode","name","condition","reason" }]
} }
```
- `totalRoadKm` = sum of `lengthKm` for categories SH/DR/VR.
- `bridges` = count of BR + CV; `buildings` = count of BL + RQ.
- `emergencyRepairs12m` = count of EMERGENCY records in last 12 months.
- ≤ 7 queries, run with `Promise.all`.

## Users — ADMIN only (`user:manage`)
### `GET /api/users` → list (no passwords) with division name
### `POST /api/users` → `{ name, email, password(min 8), role, divisionId }` — divisionId required unless role = ADMIN; bcrypt hash; 409 duplicate email
### `PATCH /api/users/[id]` → `{ role?, divisionId?, isActive? }` (admin cannot deactivate self; same division rule)

## CSV export (nice-to-have)
### `GET /api/assets/export` → same filters + scope as list, no pagination, `text/csv`, `Content-Disposition: attachment; filename=rnb-assets.csv`
Columns: Code, Name, Category, Division, Location, District, Road No, Length (km), Status, Condition, Cost, Built Year.
