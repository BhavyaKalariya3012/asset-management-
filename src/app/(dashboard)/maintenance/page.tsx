import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/session";
import { getUpcomingMaintenance } from "@/lib/queries/maintenance";
import { MaintenanceTypeBadge } from "@/components/maintenance/MaintenanceTypeBadge";
import { MaintenanceType } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Maintenance · R&B AssetTrack" };

const TABS = [
  { scope: "overdue", label: "Overdue" },
  { scope: "upcoming", label: "Upcoming (30 days)" },
  { scope: "all", label: "All" },
] as const;

type Scope = (typeof TABS)[number]["scope"];

const DAYS = 30;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const scope: Scope =
    sp.scope === "overdue" || sp.scope === "upcoming" ? sp.scope : "all";

  const rows = await getUpcomingMaintenance(user, { scope, days: DAYS });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Overdue and upcoming work orders across your assets"
      />

      {user.role !== "ADMIN" && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Showing maintenance for your division only.
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = t.scope === scope;
          return (
            <Link
              key={t.scope}
              href={`/maintenance?scope=${t.scope}`}
              className={cn(
                "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-8 w-8" />}
          title={
            scope === "overdue"
              ? "No overdue maintenance"
              : scope === "upcoming"
                ? "Nothing due in the next 30 days"
                : "No scheduled maintenance"
          }
          description="Assets in service with a next-due date will appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Last performed</th>
                  <th className="px-4 py-3 font-medium">Contractor</th>
                  <th className="px-4 py-3 font-medium">Next due</th>
                  <th className="px-4 py-3 font-medium">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const overdue = r.daysOverdue != null;
                  return (
                    <tr
                      key={r.assetId}
                      className={cn(
                        "hover:bg-slate-50",
                        overdue && "bg-red-50 hover:bg-red-100/70"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/assets/${r.assetId}`}
                          className="font-medium text-indigo-700 hover:underline"
                        >
                          {r.assetCode}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {r.assetName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.categoryName}
                      </td>
                      <td className="px-4 py-3">
                        <MaintenanceTypeBadge
                          type={r.type as MaintenanceType}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(r.lastPerformedOn)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.contractor ?? "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-medium",
                          overdue ? "text-red-600" : "text-slate-700"
                        )}
                      >
                        {formatDate(r.nextDueOn)}
                      </td>
                      <td className="px-4 py-3">
                        {overdue ? (
                          <span className="font-semibold text-red-600">
                            {r.daysOverdue}d overdue
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {r.daysRemaining}d left
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
