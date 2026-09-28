import type { NextRequest } from "next/server";
import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole, divisionScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { maintenanceCreateSchema } from "@/lib/validators";
import {
  listAssetMaintenance,
  serializeMaintenance,
} from "@/lib/queries/maintenance";

type Params = { params: Promise<{ id: string }> };

/** GET /api/assets/[id]/maintenance — scoped list, desc by performedOn. */
export async function GET(_req: NextRequest, { params }: Params) {
  return handleError(async () => {
    const user = await requireRole();
    const { id } = await params;

    const asset = await prisma.asset.findFirst({
      where: { id, ...divisionScope(user) },
      select: { id: true },
    });
    if (!asset) throw ApiError.notFound("Asset not found");

    const records = await listAssetMaintenance(id);
    return ok(records.map(serializeMaintenance));
  });
}

/** POST /api/assets/[id]/maintenance — log a record (maintenance:create). */
export async function POST(req: NextRequest, { params }: Params) {
  return handleError(async () => {
    const user = await requireRole("maintenance:create");
    const { id } = await params;

    const asset = await prisma.asset.findFirst({
      where: { id, ...divisionScope(user) },
      select: { id: true, status: true },
    });
    if (!asset) throw ApiError.notFound("Asset not found");

    if (asset.status === "DISPOSED" || asset.status === "PLANNED") {
      throw ApiError.conflict(
        asset.status === "DISPOSED"
          ? "Disposed assets are read-only; maintenance cannot be logged."
          : "Maintenance cannot be logged for a planned asset that is not yet in service."
      );
    }

    const body = maintenanceCreateSchema.parse(await req.json());

    const created = await prisma.maintenanceRecord.create({
      data: {
        assetId: id,
        type: body.type,
        description: body.description,
        cost: body.cost,
        contractor: body.contractor,
        workOrderNo: body.workOrderNo,
        performedOn: body.performedOn,
        nextDueOn: body.nextDueOn,
        performedById: user.id,
      },
      include: { performedBy: { select: { id: true, name: true } } },
    });

    return ok(serializeMaintenance(created), undefined, 201);
  });
}
