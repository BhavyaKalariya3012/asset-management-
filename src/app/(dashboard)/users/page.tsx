import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

export const metadata = { title: "Users · R&B AssetTrack" };

export default async function UsersPage() {
  // Defence in depth: middleware also guards this, but re-check on the server.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <>
      <PageHeader title="Users" subtitle="Manage engineers and their divisions" />
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title="User management coming in Phase 5"
        description="Add users, assign roles and divisions, toggle active status."
      />
    </>
  );
}
