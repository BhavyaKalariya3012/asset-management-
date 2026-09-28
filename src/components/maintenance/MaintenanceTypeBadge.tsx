import { MaintenanceType } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";

type Tone = React.ComponentProps<typeof Badge>["tone"];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  ROUTINE: "Routine",
  PERIODIC_RENEWAL: "Periodic Renewal",
  RESURFACING: "Resurfacing",
  STRUCTURAL_REPAIR: "Structural Repair",
  EMERGENCY: "Emergency",
  INSPECTION: "Inspection",
};

const TYPE_TONES: Record<MaintenanceType, Tone> = {
  ROUTINE: "slate",
  PERIODIC_RENEWAL: "blue",
  RESURFACING: "indigo",
  STRUCTURAL_REPAIR: "amber",
  EMERGENCY: "red",
  INSPECTION: "green",
};

export function MaintenanceTypeBadge({ type }: { type: MaintenanceType }) {
  return <Badge tone={TYPE_TONES[type]}>{MAINTENANCE_TYPE_LABELS[type]}</Badge>;
}
