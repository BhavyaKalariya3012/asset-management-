import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { getAssetById } from "@/lib/queries/assets";
import { AssetForm, type AssetFormInitial } from "@/components/assets/AssetForm";

export const metadata = { title: "Edit Asset · R&B AssetTrack" };

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "asset:update")) redirect("/assets");

  const { id } = await params;
  const asset = await getAssetById(user, id);
  if (!asset) notFound();

  // DISPOSED assets are read-only.
  if (asset.status === "DISPOSED") redirect(`/assets/${id}`);

  const isAdmin = user.role === "ADMIN";

  const [categories, divisions, locations] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.division.findMany({
      where: isAdmin ? {} : { id: user.divisionId ?? "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      select: { id: true, name: true, district: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initial: AssetFormInitial = {
    name: asset.name,
    description: asset.description,
    categoryId: asset.categoryId,
    divisionId: asset.divisionId,
    locationId: asset.locationId,
    condition: asset.condition,
    roadNumber: asset.roadNumber,
    lengthKm: asset.lengthKm,
    builtYear: asset.builtYear,
    lastRenovatedOn: asset.lastRenovatedOn
      ? asset.lastRenovatedOn.toISOString()
      : null,
    acquisitionDate: asset.acquisitionDate
      ? asset.acquisitionDate.toISOString()
      : null,
    acquisitionCost:
      asset.acquisitionCost == null ? null : Number(asset.acquisitionCost),
    specs: (asset.specs as Record<string, unknown> | null) ?? null,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Asset" subtitle={asset.assetCode} />
      <AssetForm
        mode="edit"
        assetId={asset.id}
        categories={categories}
        divisions={divisions}
        locations={locations}
        isAdmin={isAdmin}
        lockedDivisionId={isAdmin ? null : user.divisionId}
        initial={initial}
      />
    </div>
  );
}
