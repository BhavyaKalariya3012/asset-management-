"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MaintenanceForm } from "./MaintenanceForm";
import { MaintenanceList } from "./MaintenanceList";
import type { MaintenanceRecordView } from "./types";

/**
 * Maintenance card for the asset detail page: history list + a "Log
 * Maintenance" action. The button is shown only when the caller may log
 * maintenance (permission + asset not DISPOSED/PLANNED); the API is the real
 * gate.
 */
export function MaintenancePanel({
  assetId,
  records,
  canLog,
}: {
  assetId: string;
  records: MaintenanceRecordView[];
  canLog: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Maintenance"
        action={
          canLog ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Log Maintenance
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        <MaintenanceList records={records} />
      </CardBody>
      {canLog && (
        <MaintenanceForm
          assetId={assetId}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}
