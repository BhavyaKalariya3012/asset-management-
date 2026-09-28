import { Condition } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

type Tone = React.ComponentProps<typeof Badge>["tone"];

const CONDITION_TONES: Record<Condition, Tone> = {
  EXCELLENT: "emerald",
  GOOD: "green",
  FAIR: "yellow",
  POOR: "orange",
  CRITICAL: "red",
};

const CONDITION_LABELS: Record<Condition, string> = {
  EXCELLENT: "Excellent",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
  CRITICAL: "Critical",
};

export function ConditionBadge({ condition }: { condition: Condition }) {
  return <Badge tone={CONDITION_TONES[condition]}>{CONDITION_LABELS[condition]}</Badge>;
}
