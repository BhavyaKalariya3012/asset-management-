import { MaintenanceType } from "@prisma/client";

/** Serialized maintenance record as sent to the client (cost → number). */
export type MaintenanceRecordView = {
  id: string;
  type: MaintenanceType;
  description: string;
  cost: number | null;
  contractor: string | null;
  workOrderNo: string | null;
  performedOn: string;
  nextDueOn: string | null;
  performedBy: { name: string };
};
