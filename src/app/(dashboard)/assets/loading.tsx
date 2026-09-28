export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
