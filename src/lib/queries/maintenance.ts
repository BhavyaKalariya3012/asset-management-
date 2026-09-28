import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { divisionScope, type SessionUser } from "@/lib/rbac";
import type { UpcomingQuery } from "@/lib/validators";

/** Relations included on a maintenance record row. */
const recordInclude = {
  performedBy: { select: { id: true, name: true } },
} satisfies Prisma.MaintenanceRecordInclude;

export type MaintenanceRow = Prisma.MaintenanceRecordGetPayload<{
  include: typeof recordInclude;
}>;

/** List a single asset's maintenance records (desc by performedOn). */
export async function listAssetMaintenance(assetId: string) {
  return prisma.maintenanceRecord.findMany({
    where: { assetId },
    include: recordInclude,
    orderBy: { performedOn: "desc" },
  });
}

/** Serialize a maintenance record for JSON transport (Decimal → number). */
export function serializeMaintenance(row: MaintenanceRow) {
  return { ...row, cost: row.cost == null ? null : Number(row.cost) };
}

export type UpcomingMaintenanceRow = {
  assetId: string;
  assetCode: string;
  assetName: string;
  status: string;
  categoryName: string;
  categoryCode: string;
  divisionName: string;
  divisionCode: string;
  type: string;
  lastPerformedOn: string;
  contractor: string | null;
  nextDueOn: string;
  daysOverdue: number | null;
  daysRemaining: number | null;
};

/** Midnight (local) for a given date, used for whole-day diffing. */
function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Upcoming / overdue maintenance across assets, using the "latest record per
 * asset" definition from docs/DATABASE.md:
 *   - only assets in IN_SERVICE / UNDER_MAINTENANCE
 *   - take each asset's most recent maintenance record; if it has a nextDueOn,
 *     the asset is overdue (nextDueOn < today) or upcoming (within `days`).
 * Division-scoped. Sorted by nextDueOn ascending (most urgent first).
 */
export async function getUpcomingMaintenance(
  user: SessionUser,
  query: UpcomingQuery
): Promise<UpcomingMaintenanceRow[]> {
  const { scope, days } = query;

  const assets = await prisma.asset.findMany({
    where: {
      ...divisionScope(user),
      status: { in: ["IN_SERVICE", "UNDER_MAINTENANCE"] },
    },
    select: {
      id: true,
      assetCode: true,
      name: true,
      status: true,
      category: { select: { name: true, code: true } },
      division: { select: { name: true, code: true } },
      maintenance: {
        orderBy: { performedOn: "desc" },
        take: 1,
        select: {
          type: true,
          performedOn: true,
          contractor: true,
          nextDueOn: true,
        },
      },
    },
  });

  const today = startOfDay(new Date());
  const rows: UpcomingMaintenanceRow[] = [];

  for (const a of assets) {
    const latest = a.maintenance[0];
    if (!latest || !latest.nextDueOn) continue;

    const diffDays = Math.round((startOfDay(latest.nextDueOn) - today) / DAY_MS);
    const overdue = diffDays < 0;

    rows.push({
      assetId: a.id,
      assetCode: a.assetCode,
      assetName: a.name,
      status: a.status,
      categoryName: a.category.name,
      categoryCode: a.category.code,
      divisionName: a.division.name,
      divisionCode: a.division.code,
      type: latest.type,
      lastPerformedOn: latest.performedOn.toISOString(),
      contractor: latest.contractor,
      nextDueOn: latest.nextDueOn.toISOString(),
      daysOverdue: overdue ? -diffDays : null,
      daysRemaining: overdue ? null : diffDays,
    });
  }

  let filtered = rows;
  if (scope === "overdue") {
    filtered = rows.filter((r) => r.daysOverdue != null);
  } else if (scope === "upcoming") {
    filtered = rows.filter(
      (r) => r.daysRemaining != null && r.daysRemaining <= days
    );
  }

  filtered.sort(
    (a, b) => new Date(a.nextDueOn).getTime() - new Date(b.nextDueOn).getTime()
  );
  return filtered;
}
