import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { createAssetWithCode } from "@/lib/assetCode";
import {
  assetQuerySchema,
  createAssetSchema,
  parseSpecsForCategory,
} from "@/lib/validators";
import { listAssets, serializeAssetRow } from "@/lib/queries/assets";

/** GET /api/assets — division-scoped, filtered, paginated list. */
export async function GET(req: NextRequest) {
  return handleError(async () => {
    const user = await requireRole();
    const query = assetQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    const { rows, meta } = await listAssets(user, query);
    return ok(rows.map(serializeAssetRow), meta);
  });
}

/** POST /api/assets — create asset + first StatusHistory row (asset:create). */
export async function POST(req: NextRequest) {
  return handleError(async () => {
    const user = await requireRole("asset:create");
    const body = createAssetSchema.parse(await req.json());

    // MANAGER is forced to their own division; ADMIN may choose any.
    const divisionId =
      user.role === "ADMIN" ? body.divisionId : user.divisionId;
    if (!divisionId) {
      throw ApiError.badRequest("A division is required");
    }

    // Validate referenced rows exist (and category → for code + specs schema).
    const [category, division, location] = await Promise.all([
      prisma.category.findUnique({ where: { id: body.categoryId } }),
      prisma.division.findUnique({ where: { id: divisionId } }),
      prisma.location.findUnique({ where: { id: body.locationId } }),
    ]);
    if (!category) throw ApiError.badRequest("Invalid category");
    if (!division) throw ApiError.badRequest("Invalid division");
    if (!location) throw ApiError.badRequest("Invalid location");

    const specs = parseSpecsForCategory(category.code, body.specs);

    const asset = await createAssetWithCode(prisma, category.code, (assetCode) =>
      prisma.$transaction(async (tx) => {
        const created = await tx.asset.create({
          data: {
            assetCode,
            name: body.name,
            description: body.description,
            categoryId: body.categoryId,
            divisionId,
            locationId: body.locationId,
            status: body.initialStatus,
            condition: body.condition ?? "GOOD",
            roadNumber: body.roadNumber,
            lengthKm: body.lengthKm,
            builtYear: body.builtYear,
            lastRenovatedOn: body.lastRenovatedOn,
            specs: (specs ?? undefined) as Prisma.InputJsonValue | undefined,
            acquisitionDate: body.acquisitionDate,
            acquisitionCost: body.acquisitionCost,
            createdById: user.id,
          },
        });
        await tx.statusHistory.create({
          data: {
            assetId: created.id,
            fromStatus: null,
            toStatus: body.initialStatus,
            remarks: "Asset created",
            changedById: user.id,
          },
        });
        return created;
      })
    );

    return ok(
      { ...asset, acquisitionCost: asset.acquisitionCost == null ? null : Number(asset.acquisitionCost) },
      undefined,
      201
    );
  });
}
