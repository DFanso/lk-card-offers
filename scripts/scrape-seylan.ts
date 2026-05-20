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
  isLikelyImageUrl,
  pruneOrphanMerchants,
  resetOffersForBank,
} from "./_shared";
import type { CardTypeKindValue } from "../db/schema";

/**
 * Seylan Bank scraper.
 *
 * Seylan's promotions live under `/promotions/cards/<category>` — 22
 * category landing pages paginated via `?page=N`. Each card is a
 * `div.col-md-4.promotion-item` containing a flyer image, an `<h5>` with
 * the merchant name, a short offer-line in body text, and a link to a
 * per-merchant detail page at `seylan.lk/<merchant-slug>-N`. The detail
 * page carries the validity text ("Valid from 07th May - 30th June 2026")
 * and card-kind mentions ("Mastercard Freedom", "Visa Platinum", …).
 *
 * We treat each card on a category page as one offer (sourceUrl = the
 * detail page URL). The category slug from the listing URL maps onto our
 * `categories` table.
 *
 * Notes:
 *   - Each promotion has a Google Calendar "add event" link with a `text`
 *     and `dates` param. The `text` is a clean copy of the merchant name
 *     (used as fallback when the `<h5>` is missing). The `dates` field is
 *     stamped from a template (`20230407T...`) and is NOT the real
 *     promotion validity — never trust it.
 *   - Seylan hotlinks images from `seylan.lk/uploads/` directly; no
 *     special headers needed.
 */

const BASE = "https://www.seylan.lk";
const LISTING_BASE = `${BASE}/promotions/cards`;

const CATEGORY_SLUGS = [
  "auto",
  "cracker-deals",
  "dining",
  "education",
  "electronics",
  "eye-care",
  "harasara",
  "health",
  "insurance",
  "jewelry",
  "kiddies",
  "lifestyle",
  "local-travel",
  "online-deals",
  "overseas-travel",
  "pay-plans",
  "salon-spa",
  "solar",
  "special-promotions",
  "style",
  "supermarket",
  "wellness",
] as const;

// Seylan category slug → our category slug. Default = shopping.
const CATEGORY_MAP: Record<string, string> = {
  dining: "dining",
  supermarket: "groceries",
  electronics: "electronics",
  "local-travel": "travel",
  "overseas-travel": "travel",
  auto: "fuel",
};

function mapCategory(seylanSlug: string): string {
  return CATEGORY_MAP[seylanSlug] ?? "shopping";
}

type ListingCard = {
  merchantName: string;
  detailUrl: string;
  flyerUrl: string | null;
  shortDescription: string;
  categorySlug: string; // our slug, mapped
};

function parseListingPage(html: string, seylanCategory: string): ListingCard[] {
  const $ = load(html);
  const out: ListingCard[] = [];
  const ourCategory = mapCategory(seylanCategory);

  $("div.col-md-4.promotion-item").each((_i, el) => {
    const $c = $(el);

    // Flyer: first /uploads/ image (not an icons8 chrome icon).
    const flyer = $c
      .find("img")
      .toArray()
      .map((img) => $(img).attr("src") ?? "")
      .find((s) => /\/uploads\//.test(s) && !/icons8\.com/.test(s));
    const flyerUrl = flyer && isLikelyImageUrl(flyer) ? flyer : null;

    // Detail link: an anchor that goes to a `seylan.lk/<slug>` page
    // (not `/promotions/...`, not `calendar.google`, not a share button).
    const detailUrl = $c
      .find("a[href]")
      .toArray()
      .map((a) => $(a).attr("href") ?? "")
      .find(
        (h) =>
          h.startsWith("https://www.seylan.lk/") &&
          !h.includes("/promotions/") &&
          !h.includes("calendar.google") &&
          !h.includes("#") &&
          !h.endsWith("/"),
      );
    if (!detailUrl) return;

    // Merchant name: prefer the `<h5>` headline. Fall back to the
    // Google Calendar `text` param, which is set to the same merchant.
    let merchantRaw = $c.find("h5").first().text().trim();
    if (!merchantRaw) {
      const gcal = $c
        .find("a[href*='calendar.google.com']")
        .first()
        .attr("href");
      if (gcal) {
        try {
          const t = new URL(gcal).searchParams.get("text");
          if (t) merchantRaw = t;
        } catch {
          // ignore malformed URL
        }
      }
    }
    const merchantName = cleanMerchantName(merchantRaw);
    if (!merchantName || isGarbageAlt(merchantName)) return;

    // Short description: body text within the card after stripping CSS
    // blocks, scripts, and the trailing "READ MORE" CTA.
    $c.find("style, script").remove();
    const textBlob = $c
      .text()
      .replace(/\s+/g, " ")
      .replace(/READ MORE.*$/i, "")
      .trim();
    const descMatch = textBlob.match(
      new RegExp(`${escapeRegExp(merchantRaw)}\\s+(.*)$`, "i"),
    );
    const shortDescription =
      (descMatch ? descMatch[1] : textBlob).slice(0, 280).trim();

    out.push({
      merchantName,
      detailUrl,
      flyerUrl,
      shortDescription,
      categorySlug: ourCategory,
    });
  });

  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type DetailInfo = {
  title: string;
  validityRaw: string;
  cardKinds: CardTypeKindValue[];
};

function parseDetail(html: string, fallbackTitle: string): DetailInfo {
  const $ = load(html);

  // The promo title is the first `<h2>` that isn't a section heading. The
  // detail layout uses `<h2>Merchant Name</h2>` near the top.
  let title = "";
  $("h2").each((_i, el) => {
    const t = $(el).text().trim();
    if (!title && t && !/^related|^privacy|^cookie/i.test(t)) title = t;
  });
  if (!title) title = fallbackTitle;

  // Validity — body text has a "Valid from ... - ... 2026" line.
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const m =
    bodyText.match(/Valid\s+(?:from|till|until)[^.]{0,200}/i) ??
    bodyText.match(/Valid[^.]{0,160}/i);
  const validityRaw = m ? m[0].trim() : "";

  // Card kinds: Seylan's text lists card products like "Mastercard
  // Freedom", "Visa Platinum", "Amex". Heuristics — if "credit" or
  // "debit" appears, use that. Otherwise default to credit.
  const lc = bodyText.toLowerCase();
  const credit = /\bcredit\b/.test(lc);
  const debit = /\bdebit\b/.test(lc);
  const amexOnly =
    /\bamex|american\s+express\b/.test(lc) && !credit && !debit;
  const kinds: CardTypeKindValue[] = [];
  if (credit) kinds.push("credit");
  if (debit) kinds.push("debit");
  if (amexOnly) kinds.push("other");
  if (kinds.length === 0) kinds.push("credit");

  return { title, validityRaw, cardKinds: kinds };
}

async function main() {
  const reset = process.argv.includes("--reset");

  console.log("Scraping Seylan Bank promotions…");
  const bankId = await ensureBank("Seylan Bank", "seylan");

  if (reset) {
    await resetOffersForBank(bankId);
    await pruneOrphanMerchants();
  }

  // Phase 1: walk every category page (with ?page=N until empty) and
  // collect distinct listing cards, keyed by detail URL.
  const cardsByUrl = new Map<string, ListingCard>();

  for (const cat of CATEGORY_SLUGS) {
    process.stdout.write(`  ${cat}: `);
    let pageNum = 1;
    let added = 0;
    while (pageNum < 50) {
      const url = pageNum === 1
        ? `${LISTING_BASE}/${cat}`
        : `${LISTING_BASE}/${cat}?page=${pageNum}`;
      let html: string;
      try {
        html = await fetchHtml(url);
      } catch (err) {
        // Page beyond the last one returns 404 — that's our exit signal.
        const msg = (err as Error).message;
        if (!/404/.test(msg)) console.log(`fetch failed: ${msg}`);
        break;
      }
      const cards = parseListingPage(html, cat);
      if (cards.length === 0) break;
      let pageAdded = 0;
      for (const c of cards) {
        if (!cardsByUrl.has(c.detailUrl)) pageAdded++;
        cardsByUrl.set(c.detailUrl, c);
      }
      added += pageAdded;
      if (pageAdded === 0) break; // listings can repeat after the last page
      pageNum++;
    }
    console.log(`${added} new`);
  }
  console.log(`\nTotal distinct cards: ${cardsByUrl.size}`);

  // Pre-warm card-type lookups so we don't re-query per offer.
  const ctCache = new Map<string, string[]>();
  async function ctIds(kinds: CardTypeKindValue[]): Promise<string[]> {
    const key = [...kinds].sort().join(",");
    let cached = ctCache.get(key);
    if (!cached) {
      cached = await getCardTypeIdsByKind(kinds);
      ctCache.set(key, cached);
    }
    return cached;
  }

  // Phase 2: fetch each detail page and import.
  let created = 0;
  let skipped = 0;
  let skippedNoCategory = 0;
  let parseFailed = 0;

  for (const card of cardsByUrl.values()) {
    let detailHtml: string;
    try {
      detailHtml = await fetchHtml(card.detailUrl);
    } catch (err) {
      console.log(`  fetch failed ${card.detailUrl}: ${(err as Error).message}`);
      parseFailed++;
      continue;
    }
    const detail = parseDetail(detailHtml, card.merchantName);

    const cardIds = await ctIds(detail.cardKinds);
    if (cardIds.length === 0) {
      parseFailed++;
      continue;
    }

    const description = [
      card.shortDescription,
      detail.validityRaw,
    ]
      .filter(Boolean)
      .join("\n\n") || detail.title;

    const result = await importOffer(
      {
        title: detail.title,
        description,
        imageUrl: card.flyerUrl,
        sourceUrl: card.detailUrl,
        validityRaw: detail.validityRaw,
        merchantName: card.merchantName,
        categorySlug: card.categorySlug,
      },
      bankId,
      cardIds,
    );

    if (result === "created") created++;
    else if (result === "no-category") skippedNoCategory++;
    else skipped++;
  }

  await pruneOrphanMerchants();

  console.log(
    `\nDone. ${created} created · ${skipped} skipped · ${skippedNoCategory} no-category · ${parseFailed} parse/fetch failed`,
  );
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
