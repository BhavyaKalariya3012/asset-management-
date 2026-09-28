"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetStatus, Condition } from "@prisma/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { STATUS_LABELS } from "@/lib/lifecycle";
import { ROAD_CATEGORY_CODES } from "@/lib/validators";
import {
  CategorySpecsFields,
  specFieldsForCategory,
} from "./CategorySpecsFields";

type Option = { id: string; name: string };
type CategoryOption = { id: string; name: string; code: string };
type LocationOption = { id: string; name: string; district: string };

export type AssetFormInitial = {
  name?: string;
  description?: string | null;
  categoryId?: string;
  divisionId?: string;
  locationId?: string;
  condition?: Condition;
  roadNumber?: string | null;
  lengthKm?: number | null;
  builtYear?: number | null;
  lastRenovatedOn?: string | null;
  acquisitionDate?: string | null;
  acquisitionCost?: number | null;
  specs?: Record<string, unknown> | null;
};

const CONDITION_LABELS: Record<Condition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  CRITICAL: "Critical",
};

const CREATE_STATUSES: AssetStatus[] = [
  AssetStatus.PLANNED,
  AssetStatus.PROCURED,
  AssetStatus.IN_SERVICE,
];

/** ISO datetime → YYYY-MM-DD for <input type="date">. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function AssetForm({
  mode,
  assetId,
  categories,
  divisions,
  locations,
  isAdmin,
  lockedDivisionId,
  initial,
}: {
  mode: "create" | "edit";
  assetId?: string;
  categories: CategoryOption[];
  divisions: Option[];
  locations: LocationOption[];
  isAdmin: boolean;
  lockedDivisionId: string | null;
  initial?: AssetFormInitial;
}) {
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [divisionId, setDivisionId] = useState(
    initial?.divisionId ?? lockedDivisionId ?? ""
  );
  const [locationId, setLocationId] = useState(initial?.locationId ?? "");
  const [condition, setCondition] = useState<Condition>(
    initial?.condition ?? "GOOD"
  );
  const [roadNumber, setRoadNumber] = useState(initial?.roadNumber ?? "");
  const [lengthKm, setLengthKm] = useState(
    initial?.lengthKm != null ? String(initial.lengthKm) : ""
  );
  const [builtYear, setBuiltYear] = useState(
    initial?.builtYear != null ? String(initial.builtYear) : ""
  );
  const [lastRenovatedOn, setLastRenovatedOn] = useState(
    toDateInput(initial?.lastRenovatedOn)
  );
  const [acquisitionDate, setAcquisitionDate] = useState(
    toDateInput(initial?.acquisitionDate)
  );
  const [acquisitionCost, setAcquisitionCost] = useState(
    initial?.acquisitionCost != null ? String(initial.acquisitionCost) : ""
  );
  const [initialStatus, setInitialStatus] = useState<AssetStatus>("PLANNED");
  const [specs, setSpecs] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (initial?.specs) {
      for (const [k, v] of Object.entries(initial.specs)) {
        if (v !== null && v !== undefined) out[k] = String(v);
      }
    }
    return out;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const categoryCode = useMemo(
    () => categories.find((c) => c.id === categoryId)?.code,
    [categories, categoryId]
  );
  const isRoad = categoryCode
    ? (ROAD_CATEGORY_CODES as readonly string[]).includes(categoryCode)
    : false;
  const showLength =
    !!categoryCode && ["SH", "DR", "VR", "BR", "CV"].includes(categoryCode);
  const divisionLocked = !isAdmin && !!lockedDivisionId;

  function setSpec(key: string, value: string) {
    setSpecs((prev) => ({ ...prev, [key]: value }));
  }

  function buildSpecsPayload(): Record<string, unknown> {
    const fields = specFieldsForCategory(categoryCode);
    const out: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = specs[field.key];
      if (raw === undefined || raw === "") continue;
      if (field.kind === "int") {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) out[field.key] = n;
      } else if (field.kind === "number") {
        const n = Number(raw);
        if (!Number.isNaN(n)) out[field.key] = n;
      } else {
        out[field.key] = raw;
      }
    }
    return out;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      categoryId,
      locationId,
      condition,
    };
    if (description.trim()) payload.description = description.trim();
    if (isRoad && roadNumber.trim()) payload.roadNumber = roadNumber.trim();
    if (lengthKm !== "") payload.lengthKm = Number(lengthKm);
    if (builtYear !== "") payload.builtYear = parseInt(builtYear, 10);
    if (lastRenovatedOn) payload.lastRenovatedOn = lastRenovatedOn;
    if (acquisitionDate) payload.acquisitionDate = acquisitionDate;
    if (acquisitionCost !== "") payload.acquisitionCost = Number(acquisitionCost);

    const specsPayload = buildSpecsPayload();
    if (Object.keys(specsPayload).length > 0) payload.specs = specsPayload;

    // ADMIN sends divisionId; MANAGER's is forced server-side on create.
    if (mode === "create") {
      payload.initialStatus = initialStatus;
      if (isAdmin) payload.divisionId = divisionId;
      else payload.divisionId = lockedDivisionId;
    } else if (isAdmin) {
      payload.divisionId = divisionId;
    }

    try {
      const url =
        mode === "create" ? "/api/assets" : `/api/assets/${assetId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          toast.error("You don't have permission");
        } else if (json?.error?.details && Array.isArray(json.error.details)) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of json.error.details) {
            const key = Array.isArray(issue.path)
              ? issue.path[issue.path.length - 1]
              : issue.path;
            if (key != null) fieldErrors[String(key)] = issue.message;
          }
          setErrors(fieldErrors);
          toast.error("Please fix the highlighted fields");
        } else {
          toast.error(json?.error?.message ?? "Something went wrong");
        }
        setSubmitting(false);
        return;
      }

      const id = mode === "create" ? json.data.id : assetId;
      if (mode === "create") {
        const pending = json.data?.approvalStatus === "PENDING";
        toast.success(
          pending
            ? "Asset submitted for Chief Engineer approval"
            : "Asset created"
        );
      } else {
        toast.success("Asset updated");
      }
      router.push(`/assets/${id}`);
      router.refresh();
    } catch {
      toast.error("Network error, please try again");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Section 1 — Basic */}
      <Card>
        <CardHeader title="Basic" />
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Name"
            value={name}
            error={errors.name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Select
            label="Category"
            value={categoryId}
            error={errors.categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Division"
            value={divisionId}
            error={errors.divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            disabled={divisionLocked}
            required
          >
            <option value="">Select division</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            label="Location"
            value={locationId}
            error={errors.locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="">Select location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.district}
              </option>
            ))}
          </Select>
          <Select
            label="Condition"
            value={condition}
            error={errors.condition}
            onChange={(e) => setCondition(e.target.value as Condition)}
          >
            {Object.values(Condition).map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c]}
              </option>
            ))}
          </Select>
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              rows={3}
              value={description}
              error={errors.description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {/* Section 2 — R&B details */}
      <Card>
        <CardHeader title="R&B details" />
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {isRoad && (
            <Input
              label="Road number"
              placeholder="SH-1, MDR-12"
              value={roadNumber}
              error={errors.roadNumber}
              onChange={(e) => setRoadNumber(e.target.value)}
            />
          )}
          {showLength && (
            <Input
              label="Length (km)"
              type="number"
              step="any"
              value={lengthKm}
              error={errors.lengthKm}
              onChange={(e) => setLengthKm(e.target.value)}
            />
          )}
          <Input
            label="Built year"
            type="number"
            value={builtYear}
            error={errors.builtYear}
            onChange={(e) => setBuiltYear(e.target.value)}
          />
          <Input
            label="Last renovated on"
            type="date"
            value={lastRenovatedOn}
            error={errors.lastRenovatedOn}
            onChange={(e) => setLastRenovatedOn(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Section 3 — Category specifications */}
      <Card>
        <CardHeader title="Category specifications" />
        <CardBody>
          <CategorySpecsFields
            categoryCode={categoryCode}
            values={specs}
            errors={errors}
            onChange={setSpec}
          />
        </CardBody>
      </Card>

      {/* Section 4 — Acquisition */}
      <Card>
        <CardHeader title="Acquisition" />
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Acquisition date"
            type="date"
            value={acquisitionDate}
            error={errors.acquisitionDate}
            onChange={(e) => setAcquisitionDate(e.target.value)}
          />
          <Input
            label="Acquisition cost (₹)"
            type="number"
            step="any"
            value={acquisitionCost}
            error={errors.acquisitionCost}
            onChange={(e) => setAcquisitionCost(e.target.value)}
          />
          {mode === "create" && (
            <Select
              label="Initial status"
              value={initialStatus}
              onChange={(e) => setInitialStatus(e.target.value as AssetStatus)}
            >
              {CREATE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === "create" ? "Create asset" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
