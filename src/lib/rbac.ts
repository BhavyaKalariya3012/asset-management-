import { Role } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  divisionId: string | null;
};

export type Permission =
  | "asset:create"
  | "asset:update"
  | "asset:status"
  | "asset:approve"
  | "maintenance:create"
  | "user:manage";

const MATRIX: Record<Permission, Role[]> = {
  "asset:create": ["ADMIN", "MANAGER"],
  "asset:update": ["ADMIN", "MANAGER"],
  "asset:status": ["ADMIN", "MANAGER"],
  "asset:approve": ["ADMIN"], // Chief Engineer approves assets registered by Divisions
  "maintenance:create": ["ADMIN", "MANAGER", "OFFICER"],
  "user:manage": ["ADMIN"],
};

/** Human-friendly role labels used in the UI. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Chief Engineer",
  MANAGER: "Executive Engineer",
  OFFICER: "Assistant Engineer",
};

export function can(role: Role, perm: Permission): boolean {
  return MATRIX[perm].includes(role);
}

/**
 * Prisma `where` fragment to spread into every Asset query.
 * ADMIN → no filter; MANAGER/OFFICER → their own division.
 */
export function divisionScope(user: SessionUser): { divisionId?: string } {
  if (user.role === "ADMIN") return {};
  if (!user.divisionId) return { divisionId: "__none__" }; // safety: sees nothing
  return { divisionId: user.divisionId };
}

/**
 * Guard for API route handlers.
 * Throws ApiError(401) when unauthenticated, ApiError(403) when the role lacks
 * the permission. With no perm, just requires a logged-in active user.
 */
export async function requireRole(perm?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw ApiError.unauthorized();
  if (perm && !can(user.role, perm)) {
    throw ApiError.forbidden("You don't have permission to perform this action");
  }
  return user;
}
