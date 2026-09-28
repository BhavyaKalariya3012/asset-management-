import { Card, CardBody } from "@/components/ui/Card";

/** Skeleton shown while the dashboard server component fetches stats. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardBody className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-200" />
              </div>
              <div className="mt-3 h-6 w-1/2 animate-pulse rounded bg-slate-200" />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardBody>
              <div className="h-[260px] animate-pulse rounded bg-slate-100" />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
