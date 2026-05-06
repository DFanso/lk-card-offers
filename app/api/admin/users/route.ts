import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AuthError, requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("super_admin");
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  return Response.json({ items: rows });
}
