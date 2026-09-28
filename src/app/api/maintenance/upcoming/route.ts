import type { NextRequest } from "next/server";
import { ok, handleError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { upcomingQuerySchema } from "@/lib/validators";
import { getUpcomingMaintenance } from "@/lib/queries/maintenance";

/**
 * GET /api/maintenance/upcoming — overdue / upcoming maintenance across the
 * caller's division scope. See docs/API_SPEC.md.
 */
export async function GET(req: NextRequest) {
  return handleError(async () => {
    const user = await requireRole();
    const query = upcomingQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    const rows = await getUpcomingMaintenance(user, query);
    return ok(rows);
  });
}
