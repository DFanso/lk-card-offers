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
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Merchants</h1>
      </header>
      <MerchantsClient initial={rows} />
    </div>
  );
}
