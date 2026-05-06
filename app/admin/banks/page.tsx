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
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Banks</h1>
        <p className="text-xs text-muted-foreground">
          Banks referenced by live offers cannot be hard-deleted; they will be
          soft-deactivated instead.
        </p>
      </header>
      <BanksClient initial={rows} />
    </div>
  );
}
