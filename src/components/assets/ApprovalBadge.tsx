import { ApprovalStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

type Tone = React.ComponentProps<typeof Badge>["tone"];

const APPROVAL_TONES: Record<ApprovalStatus, Tone> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={APPROVAL_TONES[status]}>{APPROVAL_LABELS[status]}</Badge>;
}
