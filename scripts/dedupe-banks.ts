/**
 * One-off cleanup: merge duplicate bank rows.
 *
 * Some scrapers used to call `ensureBank(name, slug)` with a slug that
 * didn't match the canonical seed slug — e.g. scrape-peoples.ts created
 * `peoples-bank` while db/seed.ts inserts `peoples`. Both rows have the
 * same name, so the filter UI shows the bank twice and the offers are
 * scattered across two ids.
 *
 * This script finds banks whose names are equal under case-insensitive
 * trim, picks the canonical row by slug (preferring the value from the
 * SEED_SLUGS list below — those match db/seed.ts), reassigns every
 * `offer_banks.bank_id` from the dupes to the canonical row (skipping
 * conflicts on the composite PK), and then deletes the dupe rows.
 *
 * Idempotent — safe to run more than once.
 *
 * Usage:
 *   bun scripts/dedupe-banks.ts              # apply
 *   bun scripts/dedupe-banks.ts --dry-run    # report only
 */
import "dotenv/config";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pgClient } from "../db";
import { banks, offerBanks } from "../db/schema";

const DRY_RUN = process.argv.includes("--dry-run");

// Slugs db/seed.ts uses. When a duplicate group contains one of these,
// it wins. Otherwise the lowest createdAt wins.
const SEED_SLUGS = new Set([
  "commercial-bank",
  "hnb",
  "sampath",
  "boc",
  "ndb",
  "nsb",
  "ntb",
  "pan-asia",
  "dfcc",
  "peoples",
]);

type BankRow = { id: string; name: string; slug: string; createdAt: Date };

function pickCanonical(group: BankRow[]): BankRow {
  const seeded = group.find((b) => SEED_SLUGS.has(b.slug));
  if (seeded) return seeded;
  // Fallback: oldest row (smallest createdAt timestamp).
  return [...group].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )[0];
}

async function main() {
  console.log(`Bank dedupe ${DRY_RUN ? "(dry run)" : ""}`);

  const all = await db
    .select({
      id: banks.id,
      name: banks.name,
      slug: banks.slug,
      createdAt: banks.createdAt,
    })
    .from(banks);

  // Group by normalized name (case-insensitive, trimmed).
  const groups = new Map<string, BankRow[]>();
  for (const b of all) {
    const key = b.name.trim().toLowerCase();
    const arr = groups.get(key) ?? [];
    arr.push(b);
    groups.set(key, arr);
  }

  let mergedRows = 0;
  let reassignedLinks = 0;
  let deletedDupes = 0;

  for (const [name, group] of groups) {
    if (group.length < 2) continue;

    const canonical = pickCanonical(group);
    const dupes = group.filter((b) => b.id !== canonical.id);

    console.log(
      `\n• "${name}" — ${group.length} rows, keeping slug=${canonical.slug}`,
    );
    for (const d of dupes) {
      console.log(`    drop slug=${d.slug} (id=${d.id})`);
    }

    if (DRY_RUN) {
      mergedRows += dupes.length;
      continue;
    }

    // Reassign offer_banks links from each dupe → canonical. The
    // composite PK on (offerId, bankId) means a straight UPDATE can fail
    // if the offer is already linked to the canonical bank — handle that
    // by deleting the redundant link instead of updating.
    for (const d of dupes) {
      // Step 1: drop dupe links that already exist on the canonical side.
      // (db.execute with postgres-js returns a RowList without rowCount, so
      // we use .length.)
      const dropped = await db.execute(sql`
        DELETE FROM ${offerBanks}
        WHERE ${offerBanks.bankId} = ${d.id}
          AND ${offerBanks.offerId} IN (
            SELECT ${offerBanks.offerId} FROM ${offerBanks}
            WHERE ${offerBanks.bankId} = ${canonical.id}
          )
      `);
      // Step 2: re-point the remaining dupe links at the canonical bank.
      const updated = await db
        .update(offerBanks)
        .set({ bankId: canonical.id })
        .where(eq(offerBanks.bankId, d.id))
        .returning({ offerId: offerBanks.offerId });

      reassignedLinks += updated.length;
      console.log(
        `    reassigned ${updated.length} links (also pruned ${dropped.length ?? 0} redundant)`,
      );
    }

    // Now safe to delete the dupe rows.
    const dupeIds = dupes.map((d) => d.id);
    await db.delete(banks).where(inArray(banks.id, dupeIds));
    deletedDupes += dupeIds.length;
    mergedRows += dupes.length;
  }

  console.log(
    `\nDone. ${mergedRows} duplicate rows ${DRY_RUN ? "found" : "merged"} · ${reassignedLinks} links reassigned · ${deletedDupes} rows deleted`,
  );
  await pgClient.end();
}

main().catch(async (err) => {
  console.error(err);
  await pgClient.end().catch(() => {});
  process.exit(1);
});
