import "dotenv/config";
import { load, type CheerioAPI } from "cheerio";
import { pgClient } from "../db";
import {
  cleanMerchantName,
  downloadImage,
  ensureBank,
  fetchHtml,
  getCardTypeIdsByKind,
  importOffer,
  isGarbageAlt,
  pruneOrphanMerchants,
  resetOffersForBank,
} from "./_shared";
import type { CardTypeKindValue } from "../db/schema";

type PageDef = {
  url: string;
  ourCategory: string;
  kinds: CardTypeKindValue[];
};

// Each category page on People's Bank renders the same .offer-card layout.
// Credit categories live under /promotion-category/<slug>/. Debit categories
// each have their own slug-based path.
const PAGES: PageDef[] = [
  // Credit
  { url: "https://www.peoplesbank.lk/promotion-category/leisure/?cardType=credit_card", ourCategory: "travel", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/restaurants/?cardType=credit_card", ourCategory: "dining", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/online-stores/?cardType=credit_card", ourCategory: "shopping", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/home-care-electronics/?cardType=credit_card", ourCategory: "electronics", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/supermarkets/?cardType=credit_card", ourCategory: "groceries", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/jewellers/?cardType=credit_card", ourCategory: "shopping", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/auto-mobile/?cardType=credit_card", ourCategory: "fuel", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/travel/?cardType=credit_card", ourCategory: "travel", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/mastercard/?cardType=credit_card", ourCategory: "shopping", kinds: ["credit"] },
  { url: "https://www.peoplesbank.lk/promotion-category/visa/?cardType=credit_card", ourCategory: "shopping", kinds: ["credit"] },
  // Debit
  { url: "https://www.peoplesbank.lk/leisure-debit-card/?cardType=debit_card", ourCategory: "travel", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/online-stores-debit-card/?cardType=debit_card", ourCategory: "shopping", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/electronics-debit-card/?cardType=debit_card", ourCategory: "electronics", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/restaurants-debit-card/?cardType=debit_card", ourCategory: "dining", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/jewelry-debit-card/?cardType=debit_card", ourCategory: "shopping", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/shoes-leather-debit-card/?cardType=debit_card", ourCategory: "shopping", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/healthcare-debit-card/?cardType=debit_card", ourCategory: "shopping", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/opticians-debit-card/?cardType=debit_card", ourCategory: "shopping", kinds: ["debit"] },
  { url: "https://www.peoplesbank.lk/debit-card-others/?cardType=debit_card", ourCategory: "shopping", kinds: ["debit"] },
];

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

function stripCardSuffix(title: string): string {
  // "Dine Restaurant-Radisson Hotel Colombo – 40% Off – Credit"
  // Strip the trailing " – Credit" / " – Debit"
  return title
    .replace(/\s*[–—-]\s*(credit|debit)\s*$/i, "")
    .trim();
}

function extractMerchantFromTitle(title: string): string | null {
  // "Dine Restaurant-Radisson Hotel Colombo – 40% Off – Credit"
  // → "Dine Restaurant-Radisson Hotel Colombo"
  const stripped = stripCardSuffix(title);
  const parts = stripped.split(/\s*[–—]\s*/);
  if (parts.length >= 2) {
    // First part is usually the merchant; later parts are discount text.
    const candidate = parts[0].trim();
    if (candidate.length >= 2) return candidate;
  }
  // If no em-dash separator, the whole stripped string is the candidate.
  return stripped || null;
}

function parseOffers($: CheerioAPI, page: PageDef): ParsedOffer[] {
  const out: ParsedOffer[] = [];
  $(".offer-card").each((_, el) => {
    const $el = $(el);
    const share = $el.find(".icon-btn.share-btn").first();

    const rawTitle =
      (share.attr("data-title") ?? "").trim() ||
      $el.find(".promo-short").first().text().trim();
    if (!rawTitle) return;

    const sourceUrl =
      (share.attr("data-permalink") ?? "").trim() ||
      $el.find('a[href*="peoplesbank.lk/promotion/"]').first().attr("href") ||
      "";
    if (!sourceUrl) return;

    const description = (
      (share.attr("data-description") ?? "").trim() ||
      $el.find(".merchant-name").text().replace(/\s*\.\.\.\s*See more.*$/i, "").trim()
    ).replace(/\s+/g, " ");

    const validityRaw =
      (share.attr("data-notes") ?? "").trim() ||
      $el.find(".valid-date").text().replace(/[()]/g, "").trim();

    const imageUrl = $el.find(".offer-image img").first().attr("src") ?? null;

    const merchantRaw =
      (share.attr("data-location") ?? "").trim() ||
      extractMerchantFromTitle(rawTitle) ||
      "";
    const merchantName = cleanMerchantName(merchantRaw);
    if (!merchantName || isGarbageAlt(merchantName)) return;

    const cleanTitle = stripCardSuffix(rawTitle);

    out.push({
      title: cleanTitle,
      description: description || cleanTitle,
      imageUrl,
      sourceUrl,
      validityRaw,
      merchantName,
      categorySlug: page.ourCategory,
      kinds: page.kinds,
    });
  });
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");

  console.log("Scraping People's Bank special offers…");
  const bankId = await ensureBank("People's Bank", "peoples-bank");

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

  let totalParsed = 0,
    created = 0,
    skipped = 0,
    missingCategory = 0;

  for (const page of PAGES) {
    const tag = page.url.replace("https://www.peoplesbank.lk", "");
    process.stdout.write(`  · ${tag} … `);
    let html: string;
    try {
      html = await fetchHtml(page.url);
    } catch (err) {
      console.log(`failed (${(err as Error).message})`);
      continue;
    }
    const $ = load(html);
    const parsed = parseOffers($, page);
    totalParsed += parsed.length;

    const cardIds = await ctIds(page.kinds);
    if (cardIds.length === 0) {
      console.log(`skipped (no card types match ${page.kinds.join(",")})`);
      continue;
    }

    let createdCount = 0,
      skippedCount = 0;
    for (const p of parsed) {
      // Download image locally — peoplesbank.lk blocks hotlinking via referer.
      let localImage: string | null = null;
      if (p.imageUrl) {
        localImage = await downloadImage(
          p.imageUrl,
          "uploads/scraped/peoples",
          "https://www.peoplesbank.lk/",
        );
      }
      const toImport = { ...p, imageUrl: localImage };
      const result = await importOffer(toImport, bankId, cardIds);
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
