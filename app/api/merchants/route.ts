import { asc } from "drizzle-orm";
import { db } from "@/db";
import { merchants } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(merchants).orderBy(asc(merchants.name));
  return Response.json({ items: rows });
}
