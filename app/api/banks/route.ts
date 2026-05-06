import { asc } from "drizzle-orm";
import { db } from "@/db";
import { banks } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(banks).orderBy(asc(banks.name));
  return Response.json({ items: rows });
}
