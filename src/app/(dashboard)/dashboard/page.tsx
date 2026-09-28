import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  Ruler,
  Building2,
  Home,
  IndianRupee,
  AlertTriangle,
  Siren,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import {
  StatusPie,
  CategoryBar,
  DivisionBar,
  ConditionBar,
  CostByMonth,
} from "@/components/dashboard/charts";
import { ConditionBadge } from "@/components/assets/ConditionBadge";
import { getCurrentUser } from "@/lib/session";
import { getDashboardStats } from "@/lib/stats";
import prisma from "@/lib/prisma";
import { formatCompactINR } from "@/lib/utils";

export const metadata = { title: "Dashboard · R&B AssetTrack" };

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";
  const stats = await getDashboardStats(user);
  const { totals } = stats;

  let divisionLabel = "";
  if (!isAdmin && user.divisionId) {
    const division = await prisma.division.findUnique({
      where: { id: user.divisionId },
      select: { name: true },
    });
    divisionLabel = division?.name ?? "your division";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="R&B infrastructure overview"
      />

      {!isAdmin && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Showing data for <span className="font-medium">{divisionLabel}</span>.
        </p>
      )}

      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Total Assets"
          value={totals.assets}
          icon={<Boxes className="h-5 w-5" />}
        />
        <KpiCard
          label="Total Road Length"
          value={`${totals.totalRoadKm.toLocaleString("en-IN")} km`}
          icon={<Ruler className="h-5 w-5" />}
        />
        <KpiCard
          label="Bridges & Culverts"
          value={totals.bridges}
          icon={<Building2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Buildings & Quarters"
          value={totals.buildings}
          icon={<Home className="h-5 w-5" />}
        />
        <KpiCard
          label="Total Asset Value"
          value={formatCompactINR(totals.totalValue)}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <KpiCard
          label="Overdue Maintenance"
          value={totals.overdueMaintenance}
          icon={<AlertTriangle className="h-5 w-5" />}
          danger={totals.overdueMaintenance > 0}
        />
      </div>

      {/* Row 2 — status + category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Assets by status">
          <StatusPie data={stats.byStatus} />
        </ChartCard>
        <ChartCard title="Assets by category">
          <CategoryBar data={stats.byCategory} />
        </ChartCard>
      </div>

      {/* Row 3 — division (admin) + condition */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isAdmin ? (
          <>
            <ChartCard title="Assets by division">
              <DivisionBar data={stats.byDivision} />
            </ChartCard>
            <ChartCard title="Assets by condition">
              <ConditionBar data={stats.byCondition} />
            </ChartCard>
          </>
        ) : (
          <div className="lg:col-span-2">
            <ChartCard title="Assets by condition">
              <ConditionBar data={stats.byCondition} />
            </ChartCard>
          </div>
        )}
      </div>

      {/* Row 4 — maintenance cost trend + emergency repairs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Maintenance cost (last 12 months)">
            <CostByMonth data={stats.maintenanceCostByMonth} />
          </ChartCard>
        </div>
        <Card>
          <CardHeader title="Emergency repairs (12 mo)" />
          <CardBody className="flex h-[260px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Siren className="h-7 w-7" />
            </span>
            <p className="text-4xl font-semibold text-slate-900">
              {totals.emergencyRepairs12m}
            </p>
            <p className="text-sm text-slate-500">
              Emergency / monsoon-damage repairs logged in the last 12 months.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Row 5 — needs attention */}
      <Card>
        <CardHeader title="Needs attention" />
        {stats.attention.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Nothing needs attention"
              description="No assets are in poor/critical condition or overdue for maintenance."
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.attention.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {a.assetCode}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.name}</td>
                    <td className="px-4 py-3">
                      <ConditionBadge condition={a.condition} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.reason}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/assets/${a.id}`}
                        className="text-sm font-medium text-indigo-700 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
