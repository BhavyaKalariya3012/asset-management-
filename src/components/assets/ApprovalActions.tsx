"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";

/**
 * Chief Engineer (ADMIN) approve / reject controls for a PENDING asset.
 * Rendered on the asset detail page; hidden unless the asset is pending and the
 * viewer can approve. Rejection opens a modal requiring a reason.
 */
export function ApprovalActions({ assetId }: { assetId: string }) {
  const router = useRouter();
  const toast = useToast();

  const [approving, setApproving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  async function decide(
    decision: "APPROVE" | "REJECT",
    rejectionReason?: string
  ): Promise<boolean> {
    const res = await fetch(`/api/assets/${assetId}/approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason: rejectionReason }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 403) toast.error("You don't have permission");
      else setError(json?.error?.message ?? "Something went wrong");
      return false;
    }
    return true;
  }

  async function onApprove() {
    setApproving(true);
    setError(null);
    const okd = await decide("APPROVE");
    if (okd) {
      toast.success("Asset approved");
      router.refresh();
    } else {
      setApproving(false);
      if (error) toast.error(error);
    }
  }

  async function onReject() {
    if (!reason.trim()) {
      setError("A reason is required to reject this asset.");
      return;
    }
    setRejecting(true);
    setError(null);
    const okd = await decide("REJECT", reason.trim());
    if (okd) {
      toast.success("Asset rejected");
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } else {
      setRejecting(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={onApprove} loading={approving}>
        <Check className="h-4 w-4" />
        Approve
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          setError(null);
          setRejectOpen(true);
        }}
      >
        <X className="h-4 w-4" />
        Reject
      </Button>

      <Modal
        open={rejectOpen}
        onClose={() => {
          if (!rejecting) {
            setRejectOpen(false);
            setReason("");
            setError(null);
          }
        }}
        title="Reject asset"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRejectOpen(false);
                setReason("");
                setError(null);
              }}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={onReject} loading={rejecting}>
              Reject asset
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Explain why this asset is being rejected. The registering Division
            will see this reason.
          </p>
          <Textarea
            label="Reason (required)"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate of RNB-SH-0004; please withdraw."
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
