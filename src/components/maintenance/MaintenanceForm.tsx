"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceType } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { MAINTENANCE_TYPE_LABELS } from "./MaintenanceTypeBadge";

export function MaintenanceForm({
  assetId,
  open,
  onClose,
}: {
  assetId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [type, setType] = useState<MaintenanceType>("ROUTINE");
  const [description, setDescription] = useState("");
  const [performedOn, setPerformedOn] = useState("");
  const [cost, setCost] = useState("");
  const [contractor, setContractor] = useState("");
  const [workOrderNo, setWorkOrderNo] = useState("");
  const [nextDueOn, setNextDueOn] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setType("ROUTINE");
    setDescription("");
    setPerformedOn("");
    setCost("");
    setContractor("");
    setWorkOrderNo("");
    setNextDueOn("");
    setErrors({});
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    onClose();
    reset();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      type,
      description: description.trim(),
      performedOn,
    };
    if (cost !== "") payload.cost = Number(cost);
    if (contractor.trim()) payload.contractor = contractor.trim();
    if (workOrderNo.trim()) payload.workOrderNo = workOrderNo.trim();
    if (nextDueOn) payload.nextDueOn = nextDueOn;

    try {
      const res = await fetch(`/api/assets/${assetId}/maintenance`, {
        method: "POST",
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

      toast.success("Maintenance record logged");
      onClose();
      reset();
      router.refresh();
    } catch {
      toast.error("Network error, please try again");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Log maintenance"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="maintenance-form" loading={submitting}>
            Log record
          </Button>
        </>
      }
    >
      <form
        id="maintenance-form"
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <Select
          label="Type"
          value={type}
          error={errors.type}
          onChange={(e) => setType(e.target.value as MaintenanceType)}
        >
          {Object.values(MaintenanceType).map((t) => (
            <option key={t} value={t}>
              {MAINTENANCE_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input
          label="Performed on"
          type="date"
          value={performedOn}
          error={errors.performedOn}
          onChange={(e) => setPerformedOn(e.target.value)}
          required
        />
        <div className="md:col-span-2">
          <Textarea
            label="Description"
            rows={3}
            value={description}
            error={errors.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What work was carried out?"
            required
          />
        </div>
        <Input
          label="Cost (₹)"
          type="number"
          step="any"
          value={cost}
          error={errors.cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <Input
          label="Contractor"
          value={contractor}
          error={errors.contractor}
          onChange={(e) => setContractor(e.target.value)}
        />
        <Input
          label="Work Order no."
          value={workOrderNo}
          error={errors.workOrderNo}
          onChange={(e) => setWorkOrderNo(e.target.value)}
        />
        <Input
          label="Next due date"
          type="date"
          value={nextDueOn}
          error={errors.nextDueOn}
          onChange={(e) => setNextDueOn(e.target.value)}
        />
      </form>
    </Modal>
  );
}
