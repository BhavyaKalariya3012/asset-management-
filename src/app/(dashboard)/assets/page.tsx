import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Boxes } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { assetQuerySchema } from "@/lib/validators";
import { listAssets, serializeAssetRow } from "@/lib/queries/assets";
import { AssetFilters } from "@/components/assets/AssetFilters";
import { AssetTable, type AssetRow } from "@/components/assets/AssetTable";
import { AssetPagination } from "@/components/assets/AssetPagination";

export const metadata = { title: "Assets · R&B AssetTrack" };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";
  const query = assetQuerySchema.parse(await searchParams);

  const [{ rows, meta }, categories, divisions] = await Promise.all([
    listAssets(user, query),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    isAdmin
      ? prisma.division.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const tableRows = rows.map(serializeAssetRow) as unknown as AssetRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assets"
        subtitle="Roads, bridges, buildings and machinery"
        action={
          can(user.role, "asset:create") ? (
            <Link href="/assets/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Asset
              </Button>
            </Link>
          ) : undefined
        }
      />

      <AssetFilters
        categories={categories}
        divisions={divisions}
        isAdmin={isAdmin}
      />

      {tableRows.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title="No assets match your filters"
          description="Try adjusting or resetting the filters above."
        />
      ) : (
        <div className="space-y-2">
          <AssetTable rows={tableRows} isAdmin={isAdmin} />
          <AssetPagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
          />
        </div>
      )}
    </div>
  );
}
