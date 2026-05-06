import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintainerRequests, users } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { MaintainerRequestsClient } from "./maintainer-requests-client";

export const dynamic = "force-dynamic";

export default async function AdminMaintainerRequestsPage() {
  await requireRole("admin");
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
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 05 / Access</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Maintainer requests
        </h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Approve or reject users who have requested elevated access to publish
          and review offers.
        </p>
      </header>
      <MaintainerRequestsClient initial={rows} />
    </div>
  );
}
