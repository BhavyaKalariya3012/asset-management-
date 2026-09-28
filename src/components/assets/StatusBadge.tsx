import { AssetStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { STATUS_LABELS } from "@/lib/lifecycle";

type Tone = React.ComponentProps<typeof Badge>["tone"];

const STATUS_TONES: Record<AssetStatus, Tone> = {
  PLANNED: "slate",
  PROCURED: "blue",
  IN_SERVICE: "green",
  UNDER_MAINTENANCE: "amber",
  DECOMMISSIONED: "orange",
  DISPOSED: "gray",
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
