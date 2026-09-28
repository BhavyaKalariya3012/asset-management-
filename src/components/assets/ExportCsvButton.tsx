"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Downloads the current asset list as CSV, honouring the active filters from
 * the URL (pagination params are dropped — export returns all matches).
 */
export function ExportCsvButton() {
  const searchParams = useSearchParams();

  function onExport() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("pageSize");
    const qs = params.toString();
    window.location.href = `/api/assets/export${qs ? `?${qs}` : ""}`;
  }

  return (
    <Button variant="secondary" onClick={onExport}>
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
