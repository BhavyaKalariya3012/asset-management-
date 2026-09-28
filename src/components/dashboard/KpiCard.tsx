import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Compact KPI tile for the dashboard top row. Label sits on its own line above
 * the value (so it doesn't truncate), with the icon anchored top-right.
 * `danger` renders the value in red (used for Overdue Maintenance when > 0).
 */
export function KpiCard({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardBody className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium uppercase leading-tight tracking-wide text-slate-500">
            {label}
          </p>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              danger ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
            )}
          >
            {icon}
          </span>
        </div>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums",
            danger ? "text-red-600" : "text-slate-900"
          )}
        >
          {value}
        </p>
      </CardBody>
    </Card>
  );
}
