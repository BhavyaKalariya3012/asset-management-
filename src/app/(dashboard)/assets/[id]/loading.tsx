export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
