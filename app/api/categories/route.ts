import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  return Response.json({ items: rows });
}
