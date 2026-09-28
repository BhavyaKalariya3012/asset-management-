import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { divisionScope, type SessionUser } from "@/lib/rbac";
import type { AssetQuery } from "@/lib/validators";

/** Relations included on list rows (category / division / location names). */
const listInclude = {
  category: { select: { id: true, name: true, code: true } },
  division: { select: { id: true, name: true, code: true, circle: true } },
  location: { select: { id: true, name: true, district: true } },
} satisfies Prisma.AssetInclude;

/** Full relations for the detail view. */
const detailInclude = {
  category: { select: { id: true, name: true, code: true, usefulLifeYears: true } },
  division: { select: { id: true, name: true, code: true, circle: true } },
  location: { select: { id: true, name: true, district: true, lat: true, lng: true } },
  createdBy: { select: { id: true, name: true } },
  history: {
    orderBy: { changedAt: "desc" },
    include: { changedBy: { select: { id: true, name: true } } },
  },
  maintenance: {
    orderBy: { performedOn: "desc" },
    include: { performedBy: { select: { id: true, name: true } } },
  },
} satisfies Prisma.AssetInclude;

export type AssetListRow = Prisma.AssetGetPayload<{ include: typeof listInclude }>;
export type AssetDetail = Prisma.AssetGetPayload<{ include: typeof detailInclude }>;

/**
 * Division-scoped, filtered, paginated asset list. `divisionId` in the query is
 * honoured only for ADMIN (non-admins are always locked to their own division
 * by divisionScope). Search `q` matches name OR assetCode OR roadNumber.
 * Shared by the list page (server component) and GET /api/assets.
 */
export async function listAssets(user: SessionUser, query: AssetQuery) {
  const { q, status, categoryId, divisionId, condition, page, pageSize, sort, order } =
    query;

  const where: Prisma.AssetWhereInput = { ...divisionScope(user) };

  if (status) where.status = status;
  if (condition) where.condition = condition;
  if (categoryId) where.categoryId = categoryId;
  // Non-admins are already pinned to their division; only ADMIN may filter.
  if (user.role === "ADMIN" && divisionId) where.divisionId = divisionId;

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { assetCode: { contains: q, mode: "insensitive" } },
      { roadNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: listInclude,
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

/**
 * Division-scoped single-asset lookup. Uses findFirst with the scope spread in,
 * so an out-of-scope id resolves to null (→ 404 for non-admins).
 */
export async function getAssetById(
  user: SessionUser,
  id: string
): Promise<AssetDetail | null> {
  return prisma.asset.findFirst({
    where: { id, ...divisionScope(user) },
    include: detailInclude,
  });
}

/** Convert a Prisma Decimal | null to a plain number | null. */
function decToNum(value: Prisma.Decimal | null): number | null {
  return value == null ? null : Number(value);
}

/**
 * Serialize a list row for JSON transport: Decimals → numbers.
 * (Dates are serialized to ISO strings automatically by NextResponse.json.)
 */
export function serializeAssetRow(row: AssetListRow) {
  return { ...row, acquisitionCost: decToNum(row.acquisitionCost) };
}

/** Serialize a detail payload: asset + maintenance Decimals → numbers. */
export function serializeAssetDetail(asset: AssetDetail) {
  return {
    ...asset,
    acquisitionCost: decToNum(asset.acquisitionCost),
    maintenance: asset.maintenance.map((m) => ({
      ...m,
      cost: decToNum(m.cost),
    })),
  };
}
