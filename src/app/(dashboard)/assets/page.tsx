import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Boxes } from "lucide-react";

export const metadata = { title: "Assets · R&B AssetTrack" };

export default function AssetsPage() {
  return (
    <>
      <PageHeader title="Assets" subtitle="Roads, bridges, buildings and machinery" />
      <EmptyState
        icon={<Boxes className="h-8 w-8" />}
        title="Asset registry coming in Phase 3"
        description="Create, search, filter and manage assets across your division."
      />
    </>
  );
}
