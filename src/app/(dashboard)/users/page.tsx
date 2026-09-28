import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import prisma from "@/lib/prisma";
import { listUsers } from "@/lib/queries/users";
import { UsersManager } from "@/components/users/UsersManager";

export const metadata = { title: "Users · R&B AssetTrack" };

export default async function UsersPage() {
  // Defence in depth: middleware also guards this, but re-check on the server.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, divisions] = await Promise.all([
    listUsers(),
    prisma.division.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    divisionId: u.divisionId,
    divisionName: u.division?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage engineers, their roles and divisions"
      />
      <UsersManager
        initialUsers={rows}
        divisions={divisions}
        currentUserId={user.id}
      />
    </div>
  );
}
