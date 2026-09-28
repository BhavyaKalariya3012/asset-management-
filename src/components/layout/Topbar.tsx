"use client";

import { signOut } from "next-auth/react";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Topbar({
  name,
  roleLabel,
  divisionLabel,
  onMenuClick,
}: {
  name: string;
  roleLabel: string;
  divisionLabel: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">
            {roleLabel} · {divisionLabel}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
