import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    divisionId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      divisionId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    divisionId: string | null;
  }
}
