import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, pgClient } from "../db";
import { merchants, offers } from "../db/schema";
import { MERCHANT_OVERRIDES } from "./merchant-overrides";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`Merchant normalize ${DRY_RUN ? "(dry run)" : ""}`);
  console.log("Step 1: apply canonical-casing overrides…");

  let renamed = 0;
  for (const [key, canonical] of Object.entries(MERCHANT_OVERRIDES)) {
    const rows = await db
      .select({ id: merchants.id, name: merchants.name })
      .from(merchants)
      .where(sql`lower(${merchants.name}) = lower(${key})`);
    for (const r of rows) {
      if (r.name === canonical) continue;
      console.log(`  rename ${r.name} → ${canonical}`);
      if (!DRY_RUN) {
        await db
          .update(merchants)
          .set({ name: canonical })
          .where(eq(merchants.id, r.id));
      }
      renamed++;
    }
  }
  console.log(`  ${renamed} merchants renamed.`);

  console.log("Step 2: merge case-insensitive duplicates…");
  const all = await db
    .select({ id: merchants.id, name: merchants.name })
    .from(merchants);
  const groups = new Map<string, { id: string; name: string }[]>();
  for (const m of all) {
    const key = m.name.toLowerCase();
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  let merged = 0;
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // Prefer the entry with a canonical override match if any; otherwise keep the
    // oldest one (smallest id is arbitrary, but stable across runs).
    group.sort((a, b) => a.id.localeCompare(b.id));
    const [keeper, ...dupes] = group;
    console.log(
      `  merge into ${keeper.name}: ${dupes.map((d) => d.name).join(", ")}`,
    );
    if (!DRY_RUN) {
      for (const d of dupes) {
        await db
          .update(offers)
          .set({ merchantId: keeper.id })
          .where(eq(offers.merchantId, d.id));
        await db.delete(merchants).where(eq(merchants.id, d.id));
      }
    }
    merged += dupes.length;
  }
  console.log(`  ${merged} duplicate merchants merged.`);

  if (DRY_RUN) {
    console.log("Dry run — no changes written. Re-run without --dry-run to apply.");
  }
  await pgClient.end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
