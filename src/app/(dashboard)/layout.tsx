import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let divisionLabel = "All Divisions";
  if (user.role !== "ADMIN" && user.divisionId) {
    const division = await prisma.division.findUnique({
      where: { id: user.divisionId },
      select: { name: true },
    });
    divisionLabel = division?.name ?? "—";
  }

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      roleLabel={ROLE_LABELS[user.role]}
      divisionLabel={divisionLabel}
    >
      {children}
    </DashboardShell>
  );
}
