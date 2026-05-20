/**
 * One-shot fixup: re-derive `imageUrl` for every Nations Trust Bank offer
 * already in the database.
 *
 *   bun scripts/fix-ntb-images.ts            # dry-run, prints proposed updates
 *   bun scripts/fix-ntb-images.ts --apply    # actually writes to the DB
 *
 * Why this exists: an early version of `scripts/scrape-ntb.ts` used a
 * selector chain that matched the generic site chrome (`home-dark.svg`)
 * instead of the per-promotion banner. The scraper is idempotent on
 * `offers.sourceUrl`, so a normal re-scrape skips existing rows and
 * leaves the wrong image in place. This script rewrites them in-place.
 *
 * After this lands you can delete this file — future scrapes pick up the
 * right banner automatically.
 */
import "dotenv/config";
import { load } from "cheerio";
import { eq } from "drizzle-orm";
import { db, pgClient } from "../db";
import { banks, offerBanks, offers } from "../db/schema";
import { fetchHtml, isLikelyImageUrl } from "./_shared";

async function main() {
  const apply = process.argv.includes("--apply");

  const bank = await db
    .select({ id: banks.id })
    .from(banks)
    .where(eq(banks.slug, "ntb"))
    .limit(1);
  if (!bank[0]) {
    console.log("No NTB bank row — nothing to do.");
    await pgClient.end();
    return;
  }

  const rows = await db
    .select({
      id: offers.id,
      title: offers.title,
      imageUrl: offers.imageUrl,
      sourceUrl: offers.sourceUrl,
    })
    .from(offers)
    .innerJoin(offerBanks, eq(offerBanks.offerId, offers.id))
    .where(eq(offerBanks.bankId, bank[0].id));

  console.log(`Found ${rows.length} NTB offers.`);

  // Each row's sourceUrl is `<detailUrl>#<merchant-slug>`. Many rows
  // share the same detail page → cache the banner per detail URL.
  const bannerByDetail = new Map<string, string | null>();
  let fetched = 0;
  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const row of rows) {
    const detailUrl = row.sourceUrl.split("#")[0];
    let banner = bannerByDetail.get(detailUrl);
    if (banner === undefined) {
      try {
        const html = await fetchHtml(detailUrl);
        const $ = load(html);
        const src = $(".promo-brand-image img").first().attr("src");
        banner = src && isLikelyImageUrl(src) ? src : null;
      } catch (err) {
        console.log(`  fetch failed ${detailUrl}: ${(err as Error).message}`);
        banner = null;
      }
      bannerByDetail.set(detailUrl, banner);
      fetched++;
    }

    if (!banner) {
      missing++;
      continue;
    }
    if (row.imageUrl === banner) {
      unchanged++;
      continue;
    }

    updated++;
    if (apply) {
      await db.update(offers).set({ imageUrl: banner }).where(eq(offers.id, row.id));
    } else {
      console.log(`  [dry-run] ${row.title.slice(0, 60)}`);
      console.log(`            was: ${row.imageUrl}`);
      console.log(`            new: ${banner}`);
    }
  }

  console.log(
    `\nFetched ${fetched} detail pages. ${updated} ${apply ? "updated" : "would-update"} · ${unchanged} unchanged · ${missing} missing banner.`,
  );
  if (!apply && updated > 0) {
    console.log("\nRe-run with --apply to write changes.");
  }

  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
