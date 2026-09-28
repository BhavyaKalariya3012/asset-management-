import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole, divisionScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { updateAssetSchema, parseSpecsForCategory } from "@/lib/validators";
import { getAssetById, serializeAssetDetail } from "@/lib/queries/assets";
import { nextStatuses } from "@/lib/lifecycle";

type Params = { params: Promise<{ id: string }> };

/** GET /api/assets/[id] — scoped detail with history + maintenance. */
export async function GET(_req: NextRequest, { params }: Params) {
  return handleError(async () => {
    const user = await requireRole();
    const { id } = await params;
    const asset = await getAssetById(user, id);
    if (!asset) throw ApiError.notFound("Asset not found");

    return ok({
      ...serializeAssetDetail(asset),
      allowedNextStatuses: nextStatuses(asset.status),
    });
  });
}

/** PATCH /api/assets/[id] — update fields (asset:update). No status changes. */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handleError(async () => {
    const user = await requireRole("asset:update");
    const { id } = await params;

    const raw = (await req.json()) as Record<string, unknown>;
    if ("status" in raw) {
      throw ApiError.badRequest(
        "Status cannot be changed here; use the status endpoint"
      );
    }
    if ("initialStatus" in raw) {
      throw ApiError.badRequest("initialStatus cannot be changed");
    }

    // Scoped existence check → 404 if missing / out of scope.
    const existing = await prisma.asset.findFirst({
      where: { id, ...divisionScope(user) },
      include: { category: { select: { code: true } } },
    });
    if (!existing) throw ApiError.notFound("Asset not found");
    if (existing.status === "DISPOSED") {
      throw ApiError.conflict("Disposed assets are read-only");
    }

    const body = updateAssetSchema.parse(raw);

    // Non-admins may not move an asset to another division.
    if (body.divisionId !== undefined && user.role !== "ADMIN") {
      throw ApiError.forbidden("You cannot change the division of an asset");
    }

    // Resolve the effective category code (may change) to validate specs.
    let categoryCode = existing.category.code;
    if (body.categoryId && body.categoryId !== existing.categoryId) {
      const cat = await prisma.category.findUnique({
        where: { id: body.categoryId },
        select: { code: true },
      });
      if (!cat) throw ApiError.badRequest("Invalid category");
      categoryCode = cat.code;
    }

    // Validate referenced rows that are being changed.
    if (body.locationId) {
      const loc = await prisma.location.findUnique({
        where: { id: body.locationId },
        select: { id: true },
      });
      if (!loc) throw ApiError.badRequest("Invalid location");
    }
    if (body.divisionId) {
      const div = await prisma.division.findUnique({
        where: { id: body.divisionId },
        select: { id: true },
      });
      if (!div) throw ApiError.badRequest("Invalid division");
    }

    const specs =
      body.specs !== undefined
        ? parseSpecsForCategory(categoryCode, body.specs)
        : undefined;

    await prisma.asset.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        categoryId: body.categoryId,
        divisionId: body.divisionId,
        locationId: body.locationId,
        condition: body.condition,
        roadNumber: body.roadNumber,
        lengthKm: body.lengthKm,
        builtYear: body.builtYear,
        lastRenovatedOn: body.lastRenovatedOn,
        specs:
          body.specs !== undefined
            ? ((specs ?? Prisma.JsonNull) as Prisma.InputJsonValue)
            : undefined,
        acquisitionDate: body.acquisitionDate,
        acquisitionCost: body.acquisitionCost,
      },
    });

    const updated = await getAssetById(user, id);
    return ok({
      ...serializeAssetDetail(updated!),
      allowedNextStatuses: nextStatuses(updated!.status),
    });
  });
}
