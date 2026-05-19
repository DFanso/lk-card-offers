import { sql } from "drizzle-orm";
import { db } from "@/db";

const startedAt = Date.now();

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "ok" | "error" = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbStatus = "error";
  }

  const body = {
    status: dbStatus === "ok" ? "ok" : "error",
    db: dbStatus,
    uptime: Math.round((Date.now() - startedAt) / 1000),
  };

  return Response.json(body, {
    status: dbStatus === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
