import type { NextRequest } from "next/server";
import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole, divisionScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { approvalDecisionSchema } from "@/lib/validators";
import { getAssetById, serializeAssetDetail } from "@/lib/queries/assets";
import { nextStatuses } from "@/lib/lifecycle";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/assets/[id]/approval — Chief Engineer (ADMIN) approves or rejects an
 * asset registered by a Division. Only PENDING assets can be decided on.
 * A rejection requires a reason (enforced by the schema).
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handleError(async () => {
    const user = await requireRole("asset:approve");
    const { id } = await params;

    // Scoped lookup (ADMIN scope is unrestricted) → 404 if not found.
    const existing = await prisma.asset.findFirst({
      where: { id, ...divisionScope(user) },
      select: { id: true, approvalStatus: true },
    });
    if (!existing) throw ApiError.notFound("Asset not found");

    if (existing.approvalStatus !== "PENDING") {
      throw ApiError.conflict(
        "This asset has already been reviewed and is no longer pending approval."
      );
    }

    const { decision, reason } = approvalDecisionSchema.parse(await req.json());
    const approved = decision === "APPROVE";

    await prisma.asset.update({
      where: { id: existing.id },
      data: {
        approvalStatus: approved ? "APPROVED" : "REJECTED",
        approvedById: user.id,
        approvedAt: new Date(),
        rejectionReason: approved ? null : (reason ?? null),
      },
    });

    const updated = await getAssetById(user, id);
    return ok({
      ...serializeAssetDetail(updated!),
      allowedNextStatuses: nextStatuses(updated!.status),
    });
  });
}
