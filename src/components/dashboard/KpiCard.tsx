import { Card, CardBody } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Compact KPI tile for the dashboard top row. `danger` renders the value in red
 * (used for Overdue Maintenance when > 0).
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
      <CardBody className="flex items-center gap-4 p-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
            danger ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-xl font-semibold",
              danger ? "text-red-600" : "text-slate-900"
            )}
          >
            {value}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
