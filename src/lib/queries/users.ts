import prisma from "@/lib/prisma";

/**
 * List all users with their division name. Never selects `password`.
 * ADMIN-only feature — callers must gate with requireRole("user:manage").
 */
export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      divisionId: true,
      division: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export type UserListRow = Awaited<ReturnType<typeof listUsers>>[number];
