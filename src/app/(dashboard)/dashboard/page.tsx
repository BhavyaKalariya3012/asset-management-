import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata = { title: "Dashboard · R&B AssetTrack" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="R&B infrastructure overview"
      />
      <Card>
        <CardBody>
          <p className="text-sm text-slate-500">
            KPIs, charts and the attention list arrive in Phase 5.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
