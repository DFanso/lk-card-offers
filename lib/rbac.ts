import type { Session } from "next-auth";
import type { UserRoleValue } from "@/db/schema";
import { auth } from "@/lib/auth";

export const ROLE_RANK: Record<UserRoleValue, number> = {
  user: 1,
  maintainer: 2,
  admin: 3,
  super_admin: 4,
};

export function roleAtLeast(
  role: UserRoleValue | undefined | null,
  min: UserRoleValue,
): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function hasRole(
  session: Session | null,
  ...roles: UserRoleValue[]
): boolean {
  if (!session?.user?.role) return false;
  return roles.includes(session.user.role);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

export async function requireRole(min: UserRoleValue): Promise<Session> {
  const session = await requireSession();
  if (!roleAtLeast(session.user.role, min)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export function unauthorizedJson(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Internal Server Error" }, { status: 500 });
}
