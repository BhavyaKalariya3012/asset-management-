import { ok, handleError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";

/**
 * GET /api/meta — dropdown data for forms/filters. Any authenticated role.
 * Divisions: ADMIN sees all; MANAGER/OFFICER see only their own.
 */
export async function GET() {
  return handleError(async () => {
    const user = await requireRole();

    const [categories, divisions, locations] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.division.findMany({
        where:
          user.role === "ADMIN"
            ? {}
            : { id: user.divisionId ?? "__none__" },
        select: { id: true, name: true, code: true, circle: true },
        orderBy: { name: "asc" },
      }),
      prisma.location.findMany({
        select: { id: true, name: true, district: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return ok({ categories, divisions, locations });
  });
}
