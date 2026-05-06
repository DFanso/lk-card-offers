import type { DefaultSession } from "next-auth";
import type { UserRoleValue } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRoleValue;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role: UserRoleValue;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRoleValue;
  }
}
