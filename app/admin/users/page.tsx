import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireRole("super_admin");
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
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Users</h1>
        <p className="text-xs text-muted-foreground">
          Promote or demote any user. You cannot demote yourself.
        </p>
      </header>
      <UsersClient initial={rows} currentUserId={session.user.id} />
    </div>
  );
}
