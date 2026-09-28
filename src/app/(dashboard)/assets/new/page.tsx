import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { AssetForm } from "@/components/assets/AssetForm";

export const metadata = { title: "New Asset · R&B AssetTrack" };

export default async function NewAssetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user.role, "asset:create")) redirect("/assets");

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

  return (
    <div className="space-y-6">
      <PageHeader title="New Asset" subtitle="Register a new R&B asset" />
      <AssetForm
        mode="create"
        categories={categories}
        divisions={divisions}
        locations={locations}
        isAdmin={isAdmin}
        lockedDivisionId={isAdmin ? null : user.divisionId}
      />
    </div>
  );
}
