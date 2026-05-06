import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { offerSubmissions, users } from "@/db/schema";
import { requireRole, AuthError } from "@/lib/rbac";

export async function GET() {
  try {
    await requireRole("maintainer");
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const rows = await db
    .select({
      id: offerSubmissions.id,
      payload: offerSubmissions.payload,
      status: offerSubmissions.status,
      createdAt: offerSubmissions.createdAt,
      submittedById: offerSubmissions.submittedByUserId,
      submittedByName: users.name,
      submittedByEmail: users.email,
    })
    .from(offerSubmissions)
    .leftJoin(users, eq(users.id, offerSubmissions.submittedByUserId))
    .where(eq(offerSubmissions.status, "pending_review"))
    .orderBy(desc(offerSubmissions.createdAt));

  return Response.json({ items: rows });
}
