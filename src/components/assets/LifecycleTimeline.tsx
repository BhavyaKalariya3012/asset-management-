import { AssetStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_DOT, STATUS_RING } from "@/lib/lifecycle";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type TimelineEntry = {
  id: string;
  fromStatus: AssetStatus | null;
  toStatus: AssetStatus;
  remarks: string | null;
  changedAt: string | Date;
  changedBy: { name: string };
};

/**
 * Vertical, chronological lifecycle timeline. History is rendered oldest →
 * newest; the current status node is ringed. Below the realised history the
 * remaining possible path is shown as faded steps.
 */
export function LifecycleTimeline({
  history,
  currentStatus,
  allowedNextStatuses,
}: {
  history: TimelineEntry[];
  currentStatus: AssetStatus;
  allowedNextStatuses: AssetStatus[];
}) {
  // Render oldest first (history comes in desc order from the query).
  const ordered = [...history].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );
  const lastIndex = ordered.length - 1;

  return (
    <div>
      <ol className="relative space-y-5">
        {ordered.map((entry, i) => {
          const isCurrent = i === lastIndex && entry.toStatus === currentStatus;
          const hasNext = i < lastIndex || allowedNextStatuses.length > 0;
          return (
            <li key={entry.id} className="relative flex gap-3">
              {/* Connector line */}
              {hasNext && (
                <span
                  className="absolute left-[7px] top-5 h-full w-px bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full",
                  STATUS_DOT[entry.toStatus],
                  isCurrent && cn("ring-4 ring-offset-0", STATUS_RING[entry.toStatus])
                )}
                aria-hidden="true"
              />
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {STATUS_LABELS[entry.toStatus]}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {formatDate(entry.changedAt)} · by {entry.changedBy.name}
                </p>
                {entry.remarks && (
                  <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                    {entry.remarks}
                  </p>
                )}
              </div>
            </li>
          );
        })}

        {/* Remaining possible path — faded */}
        {allowedNextStatuses.map((status, i) => {
          const hasMore = i < allowedNextStatuses.length - 1;
          return (
            <li key={`next-${status}`} className="relative flex gap-3 opacity-45">
              {hasMore && (
                <span
                  className="absolute left-[7px] top-5 h-full w-px border-l border-dashed border-slate-300"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-dashed border-slate-300 bg-white"
                )}
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500">
                  {STATUS_LABELS[status]}
                </p>
                <p className="text-xs text-slate-400">Possible next step</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
