import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { offerSubmissions, offers } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MaintainerDashboard() {
  const session = await requireRole("maintainer");

  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offerSubmissions)
    .where(eq(offerSubmissions.status, "pending_review"));

  const [publishedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers)
    .where(
      and(
        eq(offers.status, "published"),
        eq(offers.publishedByMaintainerId, session.user.id),
      ),
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-base font-semibold">Maintainer dashboard</h1>
        <p className="text-xs text-muted-foreground">
          Review user submissions and publish direct offers.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Pending submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{pendingRow?.count ?? 0}</p>
            <Link
              href="/maintainer/queue"
              className="mt-1 inline-block text-xs underline"
            >
              Open queue →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              Offers I published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{publishedRow?.count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs text-muted-foreground">
              New direct offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/maintainer/offers/new" className="text-xs underline">
              Create offer →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
