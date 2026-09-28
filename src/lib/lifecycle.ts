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

/**
 * Tailwind background classes for the coloured status dot used in the timeline
 * and status cards. Mirrors the StatusBadge tones (see docs/RBAC_LIFECYCLE.md).
 */
export const STATUS_DOT: Record<AssetStatus, string> = {
  PLANNED: "bg-slate-400",
  PROCURED: "bg-blue-500",
  IN_SERVICE: "bg-green-500",
  UNDER_MAINTENANCE: "bg-amber-500",
  DECOMMISSIONED: "bg-orange-500",
  DISPOSED: "bg-gray-500",
};

/** Ring colour matching each status dot, used to highlight the current node. */
export const STATUS_RING: Record<AssetStatus, string> = {
  PLANNED: "ring-slate-300",
  PROCURED: "ring-blue-300",
  IN_SERVICE: "ring-green-300",
  UNDER_MAINTENANCE: "ring-amber-300",
  DECOMMISSIONED: "ring-orange-300",
  DISPOSED: "ring-gray-300",
};

export const canTransition = (from: AssetStatus, to: AssetStatus) =>
  transitions[from].includes(to);

export const nextStatuses = (from: AssetStatus) => transitions[from];
