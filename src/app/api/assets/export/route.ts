import type { NextRequest } from "next/server";
import { handleError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { assetQuerySchema } from "@/lib/validators";
import { listAssetsForExport } from "@/lib/queries/assets";
import { STATUS_LABELS } from "@/lib/lifecycle";

const CONDITION_LABELS: Record<string, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  CRITICAL: "Critical",
};

/** RFC-4180 CSV field: quote and escape when needed. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS = [
  "Code",
  "Name",
  "Category",
  "Division",
  "Location",
  "District",
  "Road No",
  "Length (km)",
  "Status",
  "Condition",
  "Cost",
  "Built Year",
];

/**
 * GET /api/assets/export — division-scoped CSV of the asset list, honouring the
 * same filters as GET /api/assets (no pagination). See docs/API_SPEC.md.
 */
export async function GET(req: NextRequest) {
  return handleError(async () => {
    const user = await requireRole();
    const query = assetQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    const rows = await listAssetsForExport(user, query);

    const lines = [COLUMNS.join(",")];
    for (const a of rows) {
      lines.push(
        [
          a.assetCode,
          a.name,
          a.category.name,
          a.division.name,
          a.location.name,
          a.location.district,
          a.roadNumber ?? "",
          a.lengthKm ?? "",
          STATUS_LABELS[a.status] ?? a.status,
          CONDITION_LABELS[a.condition] ?? a.condition,
          a.acquisitionCost == null ? "" : Number(a.acquisitionCost),
          a.builtYear ?? "",
        ]
          .map(csvCell)
          .join(",")
      );
    }

    // Prepend BOM so Excel reads UTF-8 correctly.
    const csv = "\uFEFF" + lines.join("\r\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rnb-assets.csv"',
      },
    });
  });
}
