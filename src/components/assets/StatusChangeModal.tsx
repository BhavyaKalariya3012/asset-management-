"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AssetStatus } from "@prisma/client";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { STATUS_LABELS, STATUS_DOT } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";

/** Transitions into these statuses require remarks. */
const REMARKS_REQUIRED: AssetStatus[] = ["DECOMMISSIONED", "DISPOSED"];

export function StatusChangeModal({
  assetId,
  currentStatus,
  allowedNextStatuses,
  canChange,
}: {
  assetId: string;
  currentStatus: AssetStatus;
  allowedNextStatuses: AssetStatus[];
  canChange: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AssetStatus | null>(null);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Hide entirely if the role lacks permission or there is nowhere to go.
  if (!canChange || allowedNextStatuses.length === 0) return null;

  const remarksRequired = selected != null && REMARKS_REQUIRED.includes(selected);

  function reset() {
    setSelected(null);
    setRemarks("");
    setError(null);
    setSubmitting(false);
  }

  function close() {
    if (submitting) return;
    setOpen(false);
    reset();
  }

  async function confirm() {
    if (!selected) {
      setError("Select the status to move to.");
      return;
    }
    if (remarksRequired && !remarks.trim()) {
      setError(`Remarks are required to mark this asset as ${STATUS_LABELS[selected]}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toStatus: selected,
          remarks: remarks.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          toast.error("You don't have permission");
        } else {
          setError(json?.error?.message ?? "Something went wrong");
        }
        setSubmitting(false);
        return;
      }

      toast.success(`Status changed to ${STATUS_LABELS[selected]}`);
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Network error, please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <RefreshCw className="h-4 w-4" />
        Change Status
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Change asset status"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirm} loading={submitting} disabled={!selected}>
              Confirm change
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[currentStatus])}
              />
              {STATUS_LABELS[currentStatus]}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">
              {selected ? STATUS_LABELS[selected] : "Select next status"}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Move this asset to:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allowedNextStatuses.map((status) => {
                const active = selected === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelected(status);
                      setError(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      active
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn("h-3 w-3 shrink-0 rounded-full", STATUS_DOT[status])}
                    />
                    <span className="font-medium text-slate-800">
                      {STATUS_LABELS[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label={remarksRequired ? "Remarks (required)" : "Remarks (optional)"}
            rows={3}
            value={remarks}
            placeholder={
              remarksRequired
                ? "Explain why this asset is being condemned / disposed…"
                : "Add a note about this change…"
            }
            onChange={(e) => setRemarks(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
