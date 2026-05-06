import { asc } from "drizzle-orm";
import { db } from "@/db";
import { banks } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { BanksClient } from "./banks-client";

export const dynamic = "force-dynamic";

export default async function AdminBanksPage() {
  await requireRole("admin");
  const rows = await db.select().from(banks).orderBy(asc(banks.name));
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 01 / Master data</div>
        <h1 className="text-2xl font-semibold tracking-tight">Banks</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Banks referenced by live offers cannot be hard-deleted; they will be
          soft-deactivated instead so existing offers remain consistent.
        </p>
      </header>
      <BanksClient initial={rows} />
    </div>
  );
}
