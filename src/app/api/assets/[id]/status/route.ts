import type { NextRequest } from "next/server";
import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole, divisionScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { statusChangeSchema } from "@/lib/validators";
import { getAssetById, serializeAssetDetail } from "@/lib/queries/assets";
import { canTransition, nextStatuses, STATUS_LABELS } from "@/lib/lifecycle";

type Params = { params: Promise<{ id: string }> };

/** Statuses that require remarks when transitioning into them. */
const REMARKS_REQUIRED = new Set(["DECOMMISSIONED", "DISPOSED"]);

/**
 * POST /api/assets/[id]/status — the ONLY place Asset.status may change.
 * asset:status permission; scoped lookup; validates the transition; writes the
 * status update + a StatusHistory row in a single transaction.
 */
export async function POST(req: NextRequest, { params }: Params) {
  return handleError(async () => {
    const user = await requireRole("asset:status");
    const { id } = await params;

    // Scoped existence check → 404 if missing / out of scope (not 403).
    const existing = await prisma.asset.findFirst({
      where: { id, ...divisionScope(user) },
      select: { id: true, status: true },
    });
    if (!existing) throw ApiError.notFound("Asset not found");

    const { toStatus, remarks } = statusChangeSchema.parse(await req.json());

    // Validate the transition against the lifecycle state machine.
    if (!canTransition(existing.status, toStatus)) {
      const allowed = nextStatuses(existing.status);
      const message =
        allowed.length === 0
          ? `${STATUS_LABELS[existing.status]} is a terminal status; no further changes are allowed.`
          : `Cannot change status from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[toStatus]}. Allowed next: ${allowed
              .map((s) => STATUS_LABELS[s])
              .join(", ")}.`;
      throw new ApiError(409, "INVALID_TRANSITION", message, {
        from: existing.status,
        allowed,
      });
    }

    // Remarks are mandatory for terminal / condemnation transitions.
    if (REMARKS_REQUIRED.has(toStatus) && !remarks) {
      throw ApiError.badRequest(
        `Remarks are required when marking an asset as ${STATUS_LABELS[toStatus]}.`,
        [{ path: ["remarks"], message: "Remarks are required" }]
      );
    }

    const [, newHistory] = await prisma.$transaction([
      prisma.asset.update({
        where: { id: existing.id },
        data: { status: toStatus },
      }),
      prisma.statusHistory.create({
        data: {
          assetId: existing.id,
          fromStatus: existing.status,
          toStatus,
          remarks: remarks ?? null,
          changedById: user.id,
        },
        include: { changedBy: { select: { id: true, name: true } } },
      }),
    ]);

    const updated = await getAssetById(user, id);
    return ok({
      asset: {
        ...serializeAssetDetail(updated!),
        allowedNextStatuses: nextStatuses(updated!.status),
      },
      history: newHistory,
    });
  });
}
