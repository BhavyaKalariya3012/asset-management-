import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <FileQuestion className="h-10 w-10 text-slate-400" />
      <p className="text-lg font-semibold text-slate-800">Asset not found</p>
      <p className="max-w-sm text-sm text-slate-500">
        This asset doesn&apos;t exist or is outside your division.
      </p>
      <Link href="/assets">
        <Button variant="secondary">Back to assets</Button>
      </Link>
    </div>
  );
}
