import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/session";
import { can } from "@/lib/rbac";
import { getAssetById } from "@/lib/queries/assets";
import { nextStatuses } from "@/lib/lifecycle";
import { StatusBadge } from "@/components/assets/StatusBadge";
import { ConditionBadge } from "@/components/assets/ConditionBadge";
import { SpecsList } from "@/components/assets/SpecsList";
import { StatusChangeModal } from "@/components/assets/StatusChangeModal";
import {
  LifecycleTimeline,
  type TimelineEntry,
} from "@/components/assets/LifecycleTimeline";
import { MaintenancePanel } from "@/components/maintenance/MaintenancePanel";
import type { MaintenanceRecordView } from "@/components/maintenance/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Asset · R&B AssetTrack" };

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const asset = await getAssetById(user, id);
  if (!asset) notFound();

  const isDisposed = asset.status === "DISPOSED";
  const canEdit = can(user.role, "asset:update") && !isDisposed;
  const canStatus = can(user.role, "asset:status");
  const allowedNextStatuses = nextStatuses(asset.status);
  const canLogMaintenance =
    can(user.role, "maintenance:create") &&
    asset.status !== "DISPOSED" &&
    asset.status !== "PLANNED";

  const cost =
    asset.acquisitionCost == null ? null : Number(asset.acquisitionCost);

  const historyEntries: TimelineEntry[] = asset.history.map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    remarks: h.remarks,
    changedAt: h.changedAt.toISOString(),
    changedBy: { name: h.changedBy.name },
  }));

  const maintenanceRecords: MaintenanceRecordView[] = asset.maintenance.map(
    (m) => ({
      id: m.id,
      type: m.type,
      description: m.description,
      cost: m.cost == null ? null : Number(m.cost),
      contractor: m.contractor,
      workOrderNo: m.workOrderNo,
      performedOn: m.performedOn.toISOString(),
      nextDueOn: m.nextDueOn ? m.nextDueOn.toISOString() : null,
      performedBy: { name: m.performedBy.name },
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {asset.name}
            </h1>
            <StatusBadge status={asset.status} />
            <ConditionBadge condition={asset.condition} />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {asset.assetCode} · {asset.category.name}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/assets/${asset.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          <StatusChangeModal
            assetId={asset.id}
            currentStatus={asset.status}
            allowedNextStatuses={allowedNextStatuses}
            canChange={canStatus}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (2/3): details + specs + maintenance */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl>
                <DetailRow label="Category" value={asset.category.name} />
                <DetailRow
                  label="Division"
                  value={`${asset.division.name} · ${asset.division.circle}`}
                />
                <DetailRow
                  label="Location"
                  value={`${asset.location.name}, ${asset.location.district}`}
                />
                <DetailRow label="Road number" value={asset.roadNumber} />
                <DetailRow
                  label="Length"
                  value={asset.lengthKm != null ? `${asset.lengthKm} km` : null}
                />
                <DetailRow label="Built year" value={asset.builtYear} />
                <DetailRow
                  label="Last renovated"
                  value={
                    asset.lastRenovatedOn
                      ? formatDate(asset.lastRenovatedOn)
                      : null
                  }
                />
                <DetailRow
                  label="Acquisition date"
                  value={
                    asset.acquisitionDate
                      ? formatDate(asset.acquisitionDate)
                      : null
                  }
                />
                <DetailRow
                  label="Acquisition cost"
                  value={cost != null ? formatCurrency(cost) : null}
                />
                <DetailRow label="Created by" value={asset.createdBy.name} />
              </dl>
              {asset.description && (
                <p className="mt-4 text-sm text-slate-600">
                  {asset.description}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Specifications" />
            <CardBody>
              <SpecsList specs={asset.specs} />
            </CardBody>
          </Card>

          <MaintenancePanel
            assetId={asset.id}
            records={maintenanceRecords}
            canLog={canLogMaintenance}
          />
        </div>

        {/* Right column (1/3): lifecycle timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Lifecycle" />
            <CardBody>
              <LifecycleTimeline
                history={historyEntries}
                currentStatus={asset.status}
                allowedNextStatuses={allowedNextStatuses}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
