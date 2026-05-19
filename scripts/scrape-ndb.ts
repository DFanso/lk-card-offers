import "dotenv/config";
import { load } from "cheerio";
import { pgClient } from "../db";
import {
  cleanMerchantName,
  ensureBank,
  fetchHtml,
  getCardTypeIdsByKind,
  importOffer,
  pruneOrphanMerchants,
  resetOffersForBank,
} from "./_shared";
import type { CardTypeKindValue } from "../db/schema";

const BASE = "https://www.ndbbank.com";

// NDB category slug → our app's category slug
const CATEGORY_MAP: Record<string, string> = {
  "privilege-weekend": "shopping",
  "clothing-accessories": "shopping",
  "restaurants-pubs": "dining",
  supermarkets: "groceries",
  "special-ipp-promotions": "shopping",
  "travel-transport": "travel",
  "hotels-villas": "travel",
  "other-offers": "shopping",
};

type ParsedOffer = {
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string;
  validityRaw: string;
  merchantName: string;
  categorySlug: string;
  kinds: CardTypeKindValue[];
};

function detectKinds(typeText: string): CardTypeKindValue[] {
  const lc = typeText.toLowerCase();
  const credit = /\bcredit\b/.test(lc);
  const debit = /\bdebit\b/.test(lc);
  if (credit && debit) return ["credit", "debit"];
  if (debit) return ["debit"];
  return ["credit"];
}

function parseOffers(html: string, categorySlug: string): ParsedOffer[] {
  const $ = load(html);
  const out: ParsedOffer[] = [];

  // Each offer is an <a> wrapping a `.card.offer-card`.
  $("a[href*='/cards/card-offers/offer-details/']").each((_, anchor) => {
    const $a = $(anchor);
    const href = $a.attr("href") ?? "";
    const sourceUrl = href.startsWith("http") ? href : `${BASE}${href}`;

    const card = $a.find(".card.offer-card").first();
    if (card.length === 0) return;

    const title = card.find("h5.card-title").first().text().trim();
    if (!title) return;

    // The merchant name is the next .card-title <p> below the h5.
    const merchantRaw = card
      .find(".card-body p.card-title")
      .first()
      .text()
      .trim();
    if (!merchantRaw) return;
    const merchantName = cleanMerchantName(merchantRaw);
    if (!merchantName) return;

    // Card kind line e.g. "Credit Cards" / "Debit Cards"
    const typeText = card.find(".card-body p.text-muted").first().text().trim();
    const kinds = detectKinds(typeText);

    // Validity line e.g. "Until 31st May 2026"
    const validityRaw = card
      .find(".offer-date")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // Main banner image — first .card-img-top that is NOT .offercompanylogo
    let imageUrl: string | null = null;
    card.find("img.card-img-top").each((_i, img) => {
      const $img = $(img);
      if ($img.hasClass("offercompanylogo")) return;
      const src = ($img.attr("src") ?? "").trim();
      if (src && !imageUrl) imageUrl = src;
    });

    const description = `${title} — ${merchantName}. ${
      validityRaw || "See NDB site for validity."
    }`;

    out.push({
      title,
      description,
      imageUrl,
      sourceUrl,
      validityRaw,
      merchantName,
      categorySlug,
      kinds,
    });
  });

  return out;
}

async function main() {
  const reset = process.argv.includes("--reset");

  console.log("Scraping NDB card offers…");
  const bankId = await ensureBank("NDB Bank", "ndb");

  if (reset) {
    await resetOffersForBank(bankId);
    await pruneOrphanMerchants();
  }

  const cardTypeCache = new Map<string, string[]>();
  async function ctIds(kinds: CardTypeKindValue[]): Promise<string[]> {
    const key = [...kinds].sort().join(",");
    let cached = cardTypeCache.get(key);
    if (!cached) {
      cached = await getCardTypeIdsByKind(kinds);
      cardTypeCache.set(key, cached);
    }
    return cached;
  }

  let totalParsed = 0;
  let created = 0;
  let skipped = 0;
  let missingCategory = 0;

  for (const [slug, ourCategory] of Object.entries(CATEGORY_MAP)) {
    process.stdout.write(`  · /${slug} … `);
    let html: string;
    try {
      html = await fetchHtml(`${BASE}/cards/card-offers/${slug}`);
    } catch (err) {
      console.log(`failed (${(err as Error).message})`);
      continue;
    }
    const parsed = parseOffers(html, ourCategory);
    totalParsed += parsed.length;
    let createdCount = 0;
    let skippedCount = 0;
    for (const p of parsed) {
      const cardIds = await ctIds(p.kinds);
      if (cardIds.length === 0) {
        console.warn(`    skip ${p.title}: no card types for ${p.kinds.join(",")}`);
        continue;
      }
      const result = await importOffer(p, bankId, cardIds);
      if (result === "created") {
        created++;
        createdCount++;
      } else if (result === "skipped") {
        skipped++;
        skippedCount++;
      } else if (result === "no-category") {
        missingCategory++;
      }
    }
    console.log(
      `${parsed.length} found · ${createdCount} created · ${skippedCount} skipped`,
    );
  }

  await pruneOrphanMerchants();

  console.log(
    `\nDone. ${totalParsed} parsed · ${created} created · ${skipped} skipped · ${missingCategory} missing-category`,
  );
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
