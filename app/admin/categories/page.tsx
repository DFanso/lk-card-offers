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
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 03 / Master data</div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Top-level categories and sub-categories used to organize offers in
          the public listing.
        </p>
      </header>
      <CategoriesClient initial={rows} />
    </div>
  );
}
