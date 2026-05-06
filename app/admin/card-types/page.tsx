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
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Card types</h1>
      </header>
      <CardTypesClient initial={rows} />
    </div>
  );
}
