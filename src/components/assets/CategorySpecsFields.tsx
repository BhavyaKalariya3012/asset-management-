"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type SpecField =
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "number" | "int"; unit?: string }
  | { key: string; label: string; kind: "select"; options: string[] };

/** Field descriptors per spec group (see docs/DATABASE.md + UI_SPEC). */
const ROAD_FIELDS: SpecField[] = [
  { key: "surface", label: "Surface", kind: "select", options: ["Bituminous", "Concrete", "WBM", "Earthen"] },
  { key: "lanes", label: "Lanes", kind: "int" },
  { key: "widthM", label: "Width (m)", kind: "number" },
  { key: "chainageFromKm", label: "Chainage from (km)", kind: "number" },
  { key: "chainageToKm", label: "Chainage to (km)", kind: "number" },
];

const BRIDGE_FIELDS: SpecField[] = [
  { key: "bridgeType", label: "Bridge type", kind: "select", options: ["RCC", "PSC", "Steel", "Masonry"] },
  { key: "spans", label: "Spans", kind: "int" },
  { key: "loadClassMT", label: "Load class (MT)", kind: "int" },
  { key: "crossing", label: "Crossing (e.g. river)", kind: "text" },
];

const CULVERT_FIELDS: SpecField[] = [
  { key: "culvertType", label: "Culvert type", kind: "select", options: ["Pipe", "Box", "Slab"] },
  { key: "spans", label: "Spans", kind: "int" },
  { key: "widthM", label: "Width (m)", kind: "number" },
];

const BUILDING_FIELDS: SpecField[] = [
  { key: "floors", label: "Floors", kind: "int" },
  { key: "builtUpAreaSqM", label: "Built-up area (sq m)", kind: "number" },
  { key: "usage", label: "Usage", kind: "select", options: ["Office", "Rest House", "Residential", "Store"] },
];

const MACHINERY_FIELDS: SpecField[] = [
  { key: "make", label: "Make", kind: "text" },
  { key: "model", label: "Model", kind: "text" },
  { key: "regNo", label: "Registration no.", kind: "text" },
  { key: "yearOfManufacture", label: "Year of manufacture", kind: "int" },
  { key: "engineHours", label: "Engine hours", kind: "int" },
];

/** Resolve the spec-field group for a category code. */
export function specFieldsForCategory(code: string | undefined): SpecField[] {
  switch (code) {
    case "SH":
    case "DR":
    case "VR":
      return ROAD_FIELDS;
    case "BR":
      return BRIDGE_FIELDS;
    case "CV":
      return CULVERT_FIELDS;
    case "BL":
    case "RQ":
      return BUILDING_FIELDS;
    case "MC":
      return MACHINERY_FIELDS;
    default:
      return [];
  }
}

export function CategorySpecsFields({
  categoryCode,
  values,
  errors,
  onChange,
}: {
  categoryCode: string | undefined;
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const fields = specFieldsForCategory(categoryCode);

  if (fields.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Select a category to see its specifications.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.key] ?? "";
        const error = errors[field.key];
        if (field.kind === "select") {
          return (
            <Select
              key={field.key}
              label={field.label}
              value={value}
              error={error}
              onChange={(e) => onChange(field.key, e.target.value)}
            >
              <option value="">—</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          );
        }
        return (
          <Input
            key={field.key}
            label={field.label}
            type={field.kind === "text" ? "text" : "number"}
            step={field.kind === "number" ? "any" : undefined}
            value={value}
            error={error}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        );
      })}
    </div>
  );
}
