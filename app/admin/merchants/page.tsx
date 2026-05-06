import { asc } from "drizzle-orm";
import { db } from "@/db";
import { merchants } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { MerchantsClient } from "./merchants-client";

export const dynamic = "force-dynamic";

export default async function AdminMerchantsPage() {
  await requireRole("admin");
  const rows = await db.select().from(merchants).orderBy(asc(merchants.name));
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 04 / Master data</div>
        <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Restaurants, retailers, and other points of sale where offers apply.
        </p>
      </header>
      <MerchantsClient initial={rows} />
    </div>
  );
}
