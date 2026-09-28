import { ok, handleError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { getDashboardStats } from "@/lib/stats";

/**
 * GET /api/dashboard/stats — division-scoped KPI + chart data.
 * Any authenticated role; logic lives in src/lib/stats.ts and is reused by the
 * dashboard server component.
 */
export async function GET() {
  return handleError(async () => {
    const user = await requireRole();
    const stats = await getDashboardStats(user);
    return ok(stats);
  });
}
