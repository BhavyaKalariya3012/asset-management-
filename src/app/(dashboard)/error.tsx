"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Group-level error boundary for dashboard pages that don't define their own
 * (dashboard, maintenance, users). Assets has its own error.tsx.
 */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <p className="text-sm font-medium text-slate-800">Something went wrong</p>
      <p className="max-w-sm text-sm text-slate-500">
        We couldn&apos;t load this page. Please try again.
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
