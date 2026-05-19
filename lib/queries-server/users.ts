import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type UserRoleValue } from "@/db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt: Date;
};

type ListUsersOptions = {
  q?: string;
  role?: UserRoleValue;
  page?: number;
  pageSize?: number;
};

export async function listAdminUsers(opts: ListUsersOptions = {}): Promise<{
  items: AdminUserRow[];
  total: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (opts.role) conditions.push(eq(users.role, opts.role));
  if (opts.q && opts.q.trim()) {
    const term = `%${opts.q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${users.email})`, term),
        like(sql`lower(${users.name})`, term),
      )!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(where);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(asc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items: rows, total: count };
}
