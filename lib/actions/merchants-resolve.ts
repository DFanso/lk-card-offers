import { sql } from "drizzle-orm";
import { db } from "@/db";
import { merchants } from "@/db/schema";

export async function resolveMerchantId(input: {
  merchantId?: string | null;
  newMerchantName?: string | null;
}): Promise<string> {
  if (input.merchantId) return input.merchantId;
  const name = input.newMerchantName?.trim();
  if (!name) throw new Error("Merchant is required");

  const existing = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(sql`lower(${merchants.name}) = lower(${name})`)
    .limit(1);
  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(merchants)
    .values({ name })
    .returning({ id: merchants.id });
  return inserted[0].id;
}
