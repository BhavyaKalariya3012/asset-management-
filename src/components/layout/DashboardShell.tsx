"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({
  role,
  name,
  roleLabel,
  divisionLabel,
  children,
}: {
  role: Role;
  name: string;
  roleLabel: string;
  divisionLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={name}
          roleLabel={roleLabel}
          divisionLabel={divisionLabel}
          onMenuClick={() => setOpen(true)}
        />
        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
