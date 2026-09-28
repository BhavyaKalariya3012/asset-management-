import { EmptyState } from "@/components/ui/EmptyState";

/** Friendly label + optional unit for each spec key across all categories. */
const SPEC_LABELS: Record<string, { label: string; unit?: string }> = {
  surface: { label: "Surface" },
  lanes: { label: "Lanes" },
  widthM: { label: "Width", unit: "m" },
  chainageFromKm: { label: "Chainage from", unit: "km" },
  chainageToKm: { label: "Chainage to", unit: "km" },
  bridgeType: { label: "Bridge type" },
  spans: { label: "Spans" },
  loadClassMT: { label: "Load class", unit: "MT" },
  crossing: { label: "Crossing" },
  culvertType: { label: "Culvert type" },
  floors: { label: "Floors" },
  builtUpAreaSqM: { label: "Built-up area", unit: "sq m" },
  usage: { label: "Usage" },
  make: { label: "Make" },
  model: { label: "Model" },
  regNo: { label: "Registration no." },
  yearOfManufacture: { label: "Year of manufacture" },
  engineHours: { label: "Engine hours" },
};

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function SpecsList({ specs }: { specs: unknown }) {
  const entries =
    specs && typeof specs === "object"
      ? Object.entries(specs as Record<string, unknown>).filter(
          ([, v]) => !isEmpty(v)
        )
      : [];

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No specifications recorded"
        description="Category-specific details will appear here once added."
      />
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        const meta = SPEC_LABELS[key] ?? { label: key };
        return (
          <div key={key} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-sm text-slate-500">{meta.label}</dt>
            <dd className="text-sm font-medium text-slate-900">
              {String(value)}
              {meta.unit ? ` ${meta.unit}` : ""}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
