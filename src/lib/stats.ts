import { AssetStatus, Condition } from "@prisma/client";
import prisma from "@/lib/prisma";
import { divisionScope, type SessionUser } from "@/lib/rbac";
import { getUpcomingMaintenance } from "@/lib/queries/maintenance";

/** Category codes that represent road assets (contribute to totalRoadKm). */
const ROAD_CODES = new Set(["SH", "DR", "VR"]);
/** Bridge + culvert codes. */
const BRIDGE_CODES = new Set(["BR", "CV"]);
/** Building + residential-quarters codes. */
const BUILDING_CODES = new Set(["BL", "RQ"]);

export type DashboardStats = {
  totals: {
    assets: number;
    totalValue: number;
    totalRoadKm: number;
    bridges: number;
    buildings: number;
    inService: number;
    underMaintenance: number;
    overdueMaintenance: number;
    emergencyRepairs12m: number;
  };
  byStatus: { status: AssetStatus; count: number }[];
  byCategory: { category: string; count: number; value: number }[];
  byDivision: { division: string; count: number; value: number }[];
  byCondition: { condition: Condition; count: number }[];
  maintenanceCostByMonth: { month: string; cost: number }[];
  attention: {
    id: string;
    assetCode: string;
    name: string;
    condition: Condition;
    reason: string;
  }[];
};

/** `YYYY-MM` key for a date. */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Division-scoped dashboard statistics (see docs/API_SPEC.md).
 * ADMIN → all divisions; MANAGER/OFFICER → own division only.
 * Runs a small set of queries with Promise.all and aggregates in memory
 * (asset volume is modest), keeping every read scoped.
 */
export async function getDashboardStats(
  user: SessionUser
): Promise<DashboardStats> {
  const scope = divisionScope(user);
  const isAdmin = user.role === "ADMIN";

  // 12-month window (start of the month 11 months ago).
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [assets, maintenance, overdue] = await Promise.all([
    prisma.asset.findMany({
      where: scope,
      select: {
        id: true,
        assetCode: true,
        name: true,
        status: true,
        condition: true,
        lengthKm: true,
        acquisitionCost: true,
        category: { select: { name: true, code: true } },
        division: { select: { name: true } },
      },
    }),
    prisma.maintenanceRecord.findMany({
      where: {
        asset: scope,
        performedOn: { gte: windowStart },
      },
      select: { type: true, cost: true, performedOn: true },
    }),
    // Reuses the scoped "latest record per asset" overdue logic.
    getUpcomingMaintenance(user, { scope: "overdue", days: 30 }),
  ]);

  // ---- Totals + grouped counts (single in-memory pass) -------------------
  let totalValue = 0;
  let totalRoadKm = 0;
  let bridges = 0;
  let buildings = 0;

  const statusCounts = new Map<AssetStatus, number>();
  const conditionCounts = new Map<Condition, number>();
  const categoryAgg = new Map<string, { count: number; value: number }>();
  const divisionAgg = new Map<string, { count: number; value: number }>();

  for (const a of assets) {
    const value = a.acquisitionCost == null ? 0 : Number(a.acquisitionCost);
    totalValue += value;

    const code = a.category.code;
    if (ROAD_CODES.has(code) && a.lengthKm != null) totalRoadKm += a.lengthKm;
    if (BRIDGE_CODES.has(code)) bridges += 1;
    if (BUILDING_CODES.has(code)) buildings += 1;

    statusCounts.set(a.status, (statusCounts.get(a.status) ?? 0) + 1);
    conditionCounts.set(
      a.condition,
      (conditionCounts.get(a.condition) ?? 0) + 1
    );

    const cat = categoryAgg.get(a.category.name) ?? { count: 0, value: 0 };
    cat.count += 1;
    cat.value += value;
    categoryAgg.set(a.category.name, cat);

    if (isAdmin) {
      const div = divisionAgg.get(a.division.name) ?? { count: 0, value: 0 };
      div.count += 1;
      div.value += value;
      divisionAgg.set(a.division.name, div);
    }
  }

  const byStatus = (Object.values(AssetStatus) as AssetStatus[]).map(
    (status) => ({ status, count: statusCounts.get(status) ?? 0 })
  );

  const byCondition = (Object.values(Condition) as Condition[]).map(
    (condition) => ({ condition, count: conditionCounts.get(condition) ?? 0 })
  );

  const byCategory = [...categoryAgg.entries()]
    .map(([category, { count, value }]) => ({ category, count, value }))
    .sort((a, b) => b.count - a.count);

  const byDivision = isAdmin
    ? [...divisionAgg.entries()]
        .map(([division, { count, value }]) => ({ division, count, value }))
        .sort((a, b) => b.count - a.count)
    : [];

  // ---- Maintenance cost by month (last 12 months, zero-filled) ----------
  const monthOrder: string[] = [];
  const monthCost = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1);
    const key = monthKey(d);
    monthOrder.push(key);
    monthCost.set(key, 0);
  }

  let emergencyRepairs12m = 0;
  for (const m of maintenance) {
    if (m.type === "EMERGENCY") emergencyRepairs12m += 1;
    const key = monthKey(m.performedOn);
    if (monthCost.has(key)) {
      monthCost.set(key, monthCost.get(key)! + (m.cost == null ? 0 : Number(m.cost)));
    }
  }
  const maintenanceCostByMonth = monthOrder.map((month) => ({
    month,
    cost: monthCost.get(month) ?? 0,
  }));

  // ---- Needs attention (top 5): CRITICAL/POOR or overdue maintenance ----
  const overdueIds = new Set(overdue.map((o) => o.assetId));
  const attentionCandidates = assets
    .map((a) => {
      const isCritical = a.condition === "CRITICAL";
      const isPoor = a.condition === "POOR";
      const isOverdue = overdueIds.has(a.id);
      if (!isCritical && !isPoor && !isOverdue) return null;
      // Priority: critical > overdue > poor.
      const priority = isCritical ? 0 : isOverdue ? 1 : 2;
      const reasons: string[] = [];
      if (isCritical) reasons.push("Critical condition");
      else if (isPoor) reasons.push("Poor condition");
      if (isOverdue) reasons.push("Overdue maintenance");
      return {
        id: a.id,
        assetCode: a.assetCode,
        name: a.name,
        condition: a.condition,
        reason: reasons.join(" · "),
        priority,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)
    .map(({ priority: _priority, ...rest }) => rest);

  const inService = statusCounts.get("IN_SERVICE") ?? 0;
  const underMaintenance = statusCounts.get("UNDER_MAINTENANCE") ?? 0;

  return {
    totals: {
      assets: assets.length,
      totalValue,
      totalRoadKm: Math.round(totalRoadKm * 100) / 100,
      bridges,
      buildings,
      inService,
      underMaintenance,
      overdueMaintenance: overdue.length,
      emergencyRepairs12m,
    },
    byStatus,
    byCategory,
    byDivision,
    byCondition,
    maintenanceCostByMonth,
    attention: attentionCandidates,
  };
}
