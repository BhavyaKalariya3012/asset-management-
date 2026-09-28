import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { updateUserSchema } from "@/lib/validators";

/**
 * PATCH /api/users/[id] — update role / division / active state. ADMIN only.
 * Rules: an admin cannot deactivate themselves; a non-ADMIN role must have a
 * division (same rule as create). Never returns the password hash.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleError(async () => {
    const admin = await requireRole("user:manage");
    const { id } = await params;
    const body = updateUserSchema.parse(await req.json());

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, divisionId: true },
    });
    if (!target) throw ApiError.notFound("User not found");

    // An admin cannot deactivate their own account.
    if (body.isActive === false && target.id === admin.id) {
      throw ApiError.badRequest("You cannot deactivate your own account");
    }

    // Resolve the effective role/division after this patch to enforce the
    // "non-admin needs a division" rule.
    const nextRole = body.role ?? target.role;
    let nextDivisionId =
      body.divisionId !== undefined ? body.divisionId : target.divisionId;

    if (nextRole === "ADMIN") {
      // Head office has no division.
      nextDivisionId = null;
    } else if (!nextDivisionId) {
      throw ApiError.badRequest("A division is required for Managers and Officers");
    }

    if (nextDivisionId) {
      const division = await prisma.division.findUnique({
        where: { id: nextDivisionId },
        select: { id: true },
      });
      if (!division) throw ApiError.badRequest("Invalid division");
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: nextRole,
        divisionId: nextDivisionId,
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        divisionId: true,
        division: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  });
}
