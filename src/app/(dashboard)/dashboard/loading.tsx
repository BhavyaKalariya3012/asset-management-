import { Card, CardBody } from "@/components/ui/Card";

/** Skeleton shown while the dashboard server component fetches stats. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardBody className="flex items-center gap-4 p-4">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
              </div>
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
