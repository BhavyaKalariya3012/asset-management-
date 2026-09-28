import { Wrench, User, FileText, CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { MaintenanceTypeBadge } from "./MaintenanceTypeBadge";
import type { MaintenanceRecordView } from "./types";

function isOverdue(nextDueOn: string | null): boolean {
  if (!nextDueOn) return false;
  const due = new Date(nextDueOn);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function MaintenanceList({
  records,
}: {
  records: MaintenanceRecordView[];
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={<Wrench className="h-8 w-8" />}
        title="No maintenance records yet"
        description="Logged inspections, repairs and renewals will appear here."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((r) => {
        const overdue = isOverdue(r.nextDueOn);
        return (
          <li
            key={r.id}
            className="rounded-lg border border-slate-200 p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MaintenanceTypeBadge type={r.type} />
                <span className="text-xs text-slate-500">
                  {formatDate(r.performedOn)}
                </span>
              </div>
              {r.cost != null && (
                <span className="text-sm font-semibold text-slate-800">
                  {formatCurrency(r.cost)}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-slate-700">{r.description}</p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {r.contractor && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {r.contractor}
                </span>
              )}
              {r.workOrderNo && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Work Order {r.workOrderNo}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                by {r.performedBy.name}
              </span>
              {r.nextDueOn && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    overdue ? "text-red-600" : "text-slate-600"
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next due {formatDate(r.nextDueOn)}
                  {overdue && " · overdue"}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
