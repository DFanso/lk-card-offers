import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { offerSubmissions, offers } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

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

  const [allPublishedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers)
    .where(eq(offers.status, "published"));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="section-label">Maintainer</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Curate the wire
        </h1>
        <p className="max-w-xl text-xs text-muted-foreground">
          Review user submissions, publish direct offers, and keep the
          catalog fresh.
        </p>
      </header>

      <div className="grid gap-px border border-border bg-border md:grid-cols-3">
        <div className="bg-card p-5">
          <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № 01 / Queue
          </div>
          <p className="num mt-4 text-4xl font-semibold tracking-tight">
            {pendingRow?.count.toString().padStart(2, "0") ?? "00"}
          </p>
          <p className="text-xs text-muted-foreground">Pending submissions</p>
          <Link
            href="/maintainer/queue"
            className="mt-3 inline-block text-[10px] uppercase tracking-[0.18em] text-foreground underline-offset-4 hover:underline"
          >
            Open queue →
          </Link>
        </div>
        <div className="bg-card p-5">
          <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № 02 / By you
          </div>
          <p className="num mt-4 text-4xl font-semibold tracking-tight">
            {publishedRow?.count.toString().padStart(2, "0") ?? "00"}
          </p>
          <p className="text-xs text-muted-foreground">Offers you published</p>
        </div>
        <div className="bg-card p-5">
          <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № 03 / Catalog
          </div>
          <p className="num mt-4 text-4xl font-semibold tracking-tight">
            {allPublishedRow?.count.toString().padStart(2, "0") ?? "00"}
          </p>
          <p className="text-xs text-muted-foreground">Live offers</p>
        </div>
      </div>

      <div className="border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium">Publish a direct offer</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Skip the queue when you have a verified offer ready to go live.
            </p>
          </div>
          <Link href="/maintainer/offers/new">
            <Button>+ New offer</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
