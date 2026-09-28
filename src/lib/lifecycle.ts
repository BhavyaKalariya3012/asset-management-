import { AssetStatus } from "@prisma/client";

/**
 * Asset lifecycle state machine (see docs/RBAC_LIFECYCLE.md).
 * PLANNED → PROCURED → IN_SERVICE ⇄ UNDER_MAINTENANCE → DECOMMISSIONED → DISPOSED
 */
export const transitions: Record<AssetStatus, AssetStatus[]> = {
  PLANNED: ["PROCURED"],
  PROCURED: ["IN_SERVICE"],
  IN_SERVICE: ["UNDER_MAINTENANCE", "DECOMMISSIONED"],
  UNDER_MAINTENANCE: ["IN_SERVICE", "DECOMMISSIONED"],
  DECOMMISSIONED: ["DISPOSED"],
  DISPOSED: [],
};

/** Friendly labels used everywhere via StatusBadge / timeline. */
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
