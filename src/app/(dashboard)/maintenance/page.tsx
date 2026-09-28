import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wrench } from "lucide-react";

export const metadata = { title: "Maintenance · R&B AssetTrack" };

export default function MaintenancePage() {
  return (
    <>
      <PageHeader
        title="Maintenance"
        subtitle="Overdue and upcoming work orders"
      />
      <EmptyState
        icon={<Wrench className="h-8 w-8" />}
        title="Maintenance tracking coming in Phase 4"
        description="Overdue, upcoming and all maintenance records with contractor and work order details."
      />
    </>
  );
}
