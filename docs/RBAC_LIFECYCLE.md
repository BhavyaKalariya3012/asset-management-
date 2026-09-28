# RBAC + DIVISION SCOPING + LIFECYCLE RULES

## Lifecycle state machine
```
PLANNED → PROCURED → IN_SERVICE ⇄ UNDER_MAINTENANCE → DECOMMISSIONED → DISPOSED
                          └────────────────────────────↗
```

`src/lib/lifecycle.ts`:
```ts
import { AssetStatus } from "@prisma/client";

export const transitions: Record<AssetStatus, AssetStatus[]> = {
  PLANNED: ["PROCURED"],
  PROCURED: ["IN_SERVICE"],
  IN_SERVICE: ["UNDER_MAINTENANCE", "DECOMMISSIONED"],
  UNDER_MAINTENANCE: ["IN_SERVICE", "DECOMMISSIONED"],
  DECOMMISSIONED: ["DISPOSED"],
  DISPOSED: [],
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  PLANNED: "Planned",
  PROCURED: "Procured / Constructed",
  IN_SERVICE: "In Service",
  UNDER_MAINTENANCE: "Under Maintenance",
  DECOMMISSIONED: "Condemned / Closed",
  DISPOSED: "Disposed",
};

export const canTransition = (from: AssetStatus, to: AssetStatus) =>
  transitions[from].includes(to);

export const nextStatuses = (from: AssetStatus) => transitions[from];
```

### Rules
- Remarks are **required** for DECOMMISSIONED and DISPOSED, optional otherwise.
- DISPOSED is terminal: asset is read-only (no edit, no maintenance).
- Status changes are always explicit; adding a maintenance record never changes status automatically.
- History rows are **append-only**. No update/delete endpoints.

### Status colors (use everywhere via `StatusBadge`)
PLANNED slate · PROCURED blue · IN_SERVICE green · UNDER_MAINTENANCE amber · DECOMMISSIONED orange · DISPOSED gray/red

### Condition colors
EXCELLENT emerald · GOOD green · FAIR yellow · POOR orange · CRITICAL red

## Role permission matrix
| Action | ADMIN (Chief Engineer) | MANAGER (EE) | OFFICER (AE/JE) |
|---|:-:|:-:|:-:|
| View dashboard / assets / maintenance | ✅ all divisions | ✅ own division | ✅ own division |
| Create asset | ✅ any division | ✅ own division only | ❌ |
| Edit asset | ✅ | ✅ own division | ❌ |
| Change asset status | ✅ | ✅ own division | ❌ |
| Add maintenance record | ✅ | ✅ own division | ✅ own division |
| Export CSV | ✅ | ✅ (scoped) | ✅ (scoped) |
| Manage users | ✅ | ❌ | ❌ |
| Hard delete asset | not offered | not offered | not offered |

## Division scoping (MANDATORY)
`src/lib/rbac.ts` must export:
```ts
export type SessionUser = { id: string; name: string; email: string; role: Role; divisionId: string | null };

// Prisma `where` fragment to spread into every Asset query
export function divisionScope(user: SessionUser): { divisionId?: string } {
  if (user.role === "ADMIN") return {};
  if (!user.divisionId) return { divisionId: "__none__" }; // safety: sees nothing
  return { divisionId: user.divisionId };
}

// For related models: { asset: divisionScope(user) }
```
Rules:
- All list/detail/stats/maintenance queries apply `divisionScope`.
- Single-asset lookups use `findFirst({ where: { id, ...divisionScope(user) } })`; if null → **404**.
- MANAGER creating an asset: `divisionId` is forced to their own division (ignore/override client value). ADMIN chooses any division.
- The division filter in the UI is shown only to ADMIN.
- The Division dropdown in the asset form is locked (read-only) for MANAGER.

## `requireRole` contract
```ts
export type Permission =
  | "asset:create" | "asset:update" | "asset:status"
  | "maintenance:create" | "user:manage";

export function can(role: Role, perm: Permission): boolean;

// Top of each route handler. Throws ApiError(401) if no session, ApiError(403) if role lacks permission.
// With no perm: just requires a logged-in active user.
export async function requireRole(perm?: Permission): Promise<SessionUser>;
```
UI uses `can(user.role, ...)` to hide controls, but the API is the real gate.
