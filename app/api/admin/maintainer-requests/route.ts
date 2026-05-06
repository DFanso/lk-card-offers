import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintainerRequests, users } from "@/db/schema";
import { AuthError, requireRole } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("admin");
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const rows = await db
    .select({
      id: maintainerRequests.id,
      status: maintainerRequests.status,
      createdAt: maintainerRequests.createdAt,
      reviewedAt: maintainerRequests.reviewedAt,
      note: maintainerRequests.note,
      userId: maintainerRequests.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(maintainerRequests)
    .leftJoin(users, eq(users.id, maintainerRequests.userId))
    .orderBy(desc(maintainerRequests.createdAt));

  return Response.json({ items: rows });
}
