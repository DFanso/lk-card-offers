import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cardTypes } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(cardTypes).orderBy(asc(cardTypes.name));
  return Response.json({ items: rows });
}
