import "dotenv/config";
import { load } from "cheerio";
import { pgClient } from "../db";
import {
  cleanMerchantName,
  ensureBank,
  fetchHtml,
  getCardTypeIdsByKind,
  importOffer,
  isGarbageAlt,
  pruneOrphanMerchants,
  resetOffersForBank,
} from "./_shared";
import type { CardTypeKindValue } from "../db/schema";

// Apex host serves; www.* returns 403.
const BASE = "https://nationstrust.com";
const LIST_URL = `${BASE}/promotions`;

// NTB listing-grid category slug (from `.grid-item.<slug>`) → our category slug.
// Buckets we intentionally skip:
//   - general-tcs-offers : the bank's master T&Cs, not an offer
const CATEGORY_MAP: Record<string, string> = {
  supermarket: "groceries",
  clothing: "shopping",
  dining: "dining",
  "hotels-resorts": "travel",
  wellness: "shopping",
  "private-banking": "shopping",
  online: "shopping",
  "homecare-electronics": "electronics",
  automobile: "fuel",
  other: "shopping",
  "regional-offers": "shopping",
};

type BucketRef = {
  detailUrl: string;
  ourCategory: string;
  bucketCategory: string; // NTB's label (e.g. "Supermarket")
};

type ParsedRow = {
  merchantName: string;
  offerText: string;
  eligibilityText: string;
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

function parseBuckets(html: string): BucketRef[] {
  const $ = load(html);
  const out: BucketRef[] = [];
  $(".grid-item").each((_i, el) => {
    const $el = $(el);
    // The grid-item element has a class like
    // "col-lg-3 col-md-6 col-sm-12 grid-item dining". Find the slug class.
    const classes = ($el.attr("class") ?? "").split(/\s+/);
    const slugCandidates = classes.filter(
      (c) =>
        !c.startsWith("col-") &&
        c !== "grid-item" &&
        !["mb-4", "reveal"].includes(c),
    );
    const slug = slugCandidates[0];
    if (!slug) return;
    const ourCategory = CATEGORY_MAP[slug];
    if (!ourCategory) return; // skip general-tcs-offers etc.

    const href = $el.find(".promo-footer a[href]").first().attr("href") ?? "";
    if (!href) return;
    const detailUrl = href.startsWith("http") ? href : `${BASE}${href}`;
    const bucketCategory = $el.find(".promo-image .tag").first().text().trim();
    out.push({ detailUrl, ourCategory, bucketCategory });
  });
  return out;
}

const NTB_PHRASES = [
  "with your Nations Trust Bank",
  "Nations Trust Bank MasterCard",
  "Nations Trust Bank Mastercard",
  "Nations Trust Bank American Express",
];

function detectKinds(combined: string): CardTypeKindValue[] {
  const lc = combined.toLowerCase();
  // Lenient match — NTB writes things like "Credit & Debit Card" (singular).
  // Standalone "credit"/"debit" is unambiguous in this context.
  const credit = /\bcredit\b/.test(lc);
  const debit = /\bdebit\b/.test(lc);
  const amex = /\b(american express|amex)\b/.test(lc);
  const kinds: CardTypeKindValue[] = [];
  if (credit) kinds.push("credit");
  if (debit) kinds.push("debit");
  if (amex && !credit && !debit) kinds.push("other");
  return kinds.length ? kinds : ["credit"];
}

function shortenTitle(merchant: string, offerText: string): string {
  // Strip NTB's branding boilerplate so the title isn't dominated by it.
  let t = offerText;
  for (const phrase of NTB_PHRASES) {
    const re = new RegExp(phrase + "[^.,;]*", "i");
    t = t.replace(re, "");
  }
  t = t.replace(/^Enjoy\s+/i, "").replace(/\s{2,}/g, " ").trim().replace(/[,.;]+$/, "");
  // Headline shape: "{discount-snippet} at {merchant}"
  const head = t.length > 90 ? `${t.slice(0, 87)}…` : t;
  return `${head} at ${merchant}`;
}

function parseBucketDetail(
  html: string,
  bucket: BucketRef,
): { bannerImage: string | null; rows: ParsedRow[]; pageTitle: string } {
  const $ = load(html);
  const pageTitle = $("h1").first().text().trim();
  // Banner image — first big page-hero image. NTB uses `.promo-image img` style
  // earlier; on detail it's `.page-hero-content` adjacent.
  let bannerImage: string | null = null;
  const heroImg = $(".page-hero-content img, .page-hero-image img, .promo-image img")
    .first()
    .attr("src");
  if (heroImg && !isGarbageAlt(heroImg)) bannerImage = heroImg;

  const rows: ParsedRow[] = [];
  $(".saving-rate-table table tr").each((_i, tr) => {
    const cells = $(tr).find("td").toArray();
    if (cells.length < 3) return;
    const merchantRaw = $(cells[0]).text().replace(/\s+/g, " ").trim();
    const offerText = $(cells[1]).text().replace(/\s+/g, " ").trim();
    const eligibilityText = $(cells[2]).text().replace(/\s+/g, " ").trim();
    if (!merchantRaw || !offerText) return;
    // Header row uses <h3><strong>Merchant</strong></h3>; skip the header
    // and obvious data noise (offer cell mostly empty, merchant cell duplicates the header word, etc).
    if (/^merchants?(?:\s+name)?$/i.test(merchantRaw)) return;
    if (/^offer$/i.test(offerText) || /^eligibility$/i.test(eligibilityText)) return;
    rows.push({ merchantName: merchantRaw, offerText, eligibilityText });
  });

  // Mark unused parameter as used (kept for symmetry/logging).
  void bucket;
  return { bannerImage, rows, pageTitle };
}

function rowToOffer(
  row: ParsedRow,
  bucket: BucketRef,
  bannerImage: string | null,
): ParsedOffer | null {
  const merchantName = cleanMerchantName(row.merchantName);
  if (!merchantName || isGarbageAlt(merchantName)) return null;

  const combined = `${row.offerText} ${row.eligibilityText}`;
  const kinds = detectKinds(combined);

  // Validity raw — the eligibility cell is the richest source; offer text often
  // also contains "Valid till…" / "Valid from … to …".
  const validityRaw = (() => {
    const m =
      combined.match(/Valid\s+(?:from|till|until|through|between|on)[^.]{0,200}/i) ??
      combined.match(/Valid[^.]{0,200}/i);
    return m ? m[0].trim() : "";
  })();

  const description = [
    row.offerText,
    row.eligibilityText && row.eligibilityText !== row.offerText
      ? row.eligibilityText
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Anchor each merchant-row to a unique sourceUrl so the dedup check in
  // _shared.ts treats them as distinct offers.
  const slug = merchantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return {
    title: shortenTitle(merchantName, row.offerText),
    description,
    imageUrl: bannerImage,
    sourceUrl: `${bucket.detailUrl}#${slug}`,
    validityRaw,
    merchantName,
    categorySlug: bucket.ourCategory,
    kinds,
  };
}

async function main() {
  const reset = process.argv.includes("--reset");

  console.log("Scraping Nations Trust Bank promotions…");
  const bankId = await ensureBank("Nations Trust Bank", "ntb");

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

  let listingHtml: string;
  try {
    listingHtml = await fetchHtml(LIST_URL);
  } catch (err) {
    console.error("Failed to fetch NTB listing:", (err as Error).message);
    await pgClient.end();
    process.exit(1);
  }

  const buckets = parseBuckets(listingHtml);
  console.log(`Found ${buckets.length} buckets across mapped categories.`);

  let totalParsed = 0;
  let created = 0;
  let skipped = 0;
  let missingCategory = 0;

  for (const bucket of buckets) {
    process.stdout.write(`  · ${bucket.bucketCategory} (${bucket.detailUrl.split("/").pop()}) … `);
    let detailHtml: string;
    try {
      detailHtml = await fetchHtml(bucket.detailUrl);
    } catch (err) {
      console.log(`failed (${(err as Error).message})`);
      continue;
    }
    const { bannerImage, rows } = parseBucketDetail(detailHtml, bucket);
    if (rows.length === 0) {
      console.log("no merchant rows");
      continue;
    }

    let createdCount = 0;
    let skippedCount = 0;
    for (const row of rows) {
      const offer = rowToOffer(row, bucket, bannerImage);
      if (!offer) continue;
      totalParsed++;
      const cardIds = await ctIds(offer.kinds);
      if (cardIds.length === 0) continue;
      const result = await importOffer(offer, bankId, cardIds);
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
      `${rows.length} rows · ${createdCount} created · ${skippedCount} skipped`,
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
