import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireRole } from "@/lib/rbac";
import { CategoriesClient } from "./categories-client";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Categories</h1>
      </header>
      <CategoriesClient initial={rows} />
    </div>
  );
}
