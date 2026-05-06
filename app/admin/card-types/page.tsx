import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cardTypes } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { CardTypesClient } from "./card-types-client";

export const dynamic = "force-dynamic";

export default async function AdminCardTypesPage() {
  await requireRole("admin");
  const rows = await db.select().from(cardTypes).orderBy(asc(cardTypes.name));
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 02 / Master data</div>
        <h1 className="text-2xl font-semibold tracking-tight">Card types</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Logical card products (Visa Credit, Amex, etc.) used to scope offer
          eligibility.
        </p>
      </header>
      <CardTypesClient initial={rows} />
    </div>
  );
}
