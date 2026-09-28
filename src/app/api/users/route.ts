import bcrypt from "bcrypt";
import { ok, handleError, ApiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { createUserSchema } from "@/lib/validators";
import { listUsers } from "@/lib/queries/users";

/** GET /api/users — list all users (no passwords). ADMIN only. */
export async function GET() {
  return handleError(async () => {
    await requireRole("user:manage");
    const users = await listUsers();
    return ok(users);
  });
}

/** POST /api/users — create a user (bcrypt hash, 409 duplicate email). ADMIN only. */
export async function POST(req: Request) {
  return handleError(async () => {
    await requireRole("user:manage");
    const body = createUserSchema.parse(await req.json());

    const divisionId = body.role === "ADMIN" ? null : body.divisionId!;

    if (divisionId) {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
        select: { id: true },
      });
      if (!division) throw ApiError.badRequest("Invalid division");
    }

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });
    if (existing) {
      throw ApiError.conflict("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const created = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: passwordHash,
        role: body.role,
        divisionId,
      },
      // Never return the password hash.
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
    });

    return ok(created, undefined, 201);
  });
}
