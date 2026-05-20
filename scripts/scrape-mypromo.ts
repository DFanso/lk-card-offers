import "dotenv/config";
import { load } from "cheerio";
import { pgClient } from "../db";
import {
  ensureBank,
  ensureMerchant,
  fetchHtml,
  findContentDuplicate,
  getCardTypeIdsByKind,
  importOfferMultiBank,
  isLikelyImageUrl,
  offerExistsBySource,
  pruneOrphanMerchants,
  resetOffersForBank,
  UA,
} from "./_shared";
import type { CardTypeKindValue } from "../db/schema";

/**
 * mypromo.lk scraper.
 *
 * Unlike the per-bank scrapers, mypromo.lk is an aggregator that mixes
 * promotions across every Sri Lankan issuer (BOC, Sampath, Amana, HSBC,
 * Citi, etc. — including banks we can't scrape directly). Most offers
 * specify the bank in the title; the few that don't are treated as
 * multi-bank ("any card") and attached to every bank we know about.
 *
 * Strategy:
 *   1. For each known category slug, paginate `POST /promotions/morecatpromos`
 *      (BlockNumber=1..N until empty). Collect distinct promotion URLs.
 *   2. For each detail page, parse the embedded JSON-LD `Offer` schema
 *      for the canonical title, image, validity dates, and merchant
 *      (`seller.name`). Bank affiliation comes from a regex pass over
 *      the title.
 *   3. Look up the merchant; check `offers.sourceUrl` for a mypromo→mypromo
 *      duplicate; then run `findContentDuplicate` for a cross-scraper
 *      duplicate (same merchant + similar title + endDate within ±7 days).
 *      Skip on either.
 *   4. `importOfferMultiBank` — attaches the offer to every matched bank.
 *
 * Idempotent on `offers.sourceUrl` like the other scrapers. Pass `--reset`
 * to wipe rows that came in under the synthetic "mypromo-aggregator" bank
 * (covers offers with no extractable bank affiliation).
 */

const SITE = "https://www.mypromo.lk";

const CATEGORIES = [
  "banksandcards",
  "food-and-drink",
  "supermarkets",
  "fashionandclothing",
  "hotels",
  "travel",
  "electronics",
  "beauty-and-spa",
  "homeandkitchen",
  "education",
  "credit-card-offers-discounts",
] as const;

// Map mypromo's JSON-LD `Offer.category` and BreadcrumbList leaf names to
// our category slugs. Trailing whitespace in the source is tolerated.
const CATEGORY_MAP: Array<[RegExp, string]> = [
  [/^(restaurant|fast\s*food|dining|food|cafe|bakery)/i, "dining"],
  [/^(supermarket|grocery|groceries)/i, "groceries"],
  [/^(hotel|travel|tourism|resort|villa|airline|tour)/i, "travel"],
  [/^(electronic|appliance|gadget|mobile|computer)/i, "electronics"],
  [/^(fuel|petrol|ioc|ceypetco)/i, "fuel"],
  [/^(beauty|spa|wellness|salon)/i, "shopping"],
  [/^(home|kitchen|furniture|porcelain)/i, "shopping"],
  [/^(fashion|clothing|apparel|jewellery|accessories)/i, "shopping"],
  [/^(banks?(\s+and\s+cards?)?$|cards?$)/i, "shopping"],
  [/^(education|school|stationery|book)/i, "shopping"],
];

// Bank identifier patterns. Order matters — longer / more specific
// keywords first so e.g. "National Savings Bank" doesn't fall through to a
// future "Bank" wildcard. Each entry yields a (name, slug) we'll ensure
// in the DB via `ensureBank`.
type BankRule = { re: RegExp; slug: string; name: string };
const BANK_PATTERNS: BankRule[] = [
  { re: /\b(amana\s*bank|amana)\b/i,                                 slug: "amana",        name: "Amana Bank" },
  { re: /\b(bank\s+of\s+ceylon|\bboc\b)/i,                           slug: "boc",          name: "Bank of Ceylon" },
  { re: /\b(sampath(\s+bank)?)\b/i,                                  slug: "sampath",      name: "Sampath Bank" },
  { re: /\b(national\s+savings\s+bank|\bnsb\b)/i,                    slug: "nsb",          name: "National Savings Bank" },
  { re: /\b(cargills(\s+bank)?)\b/i,                                 slug: "cargills",     name: "Cargills Bank" },
  { re: /\b(hsbc)\b/i,                                               slug: "hsbc",         name: "HSBC" },
  { re: /\b(citi(\s*bank)?)\b/i,                                     slug: "citi",         name: "Citibank" },
  { re: /\b(american\s+express|\bamex\b)/i,                          slug: "amex",         name: "American Express" },
  { re: /\b(pan\s+asia(\s+bank(ing\s+corporation)?)?|\bpabc\b)/i,    slug: "pan-asia",     name: "Pan Asia Banking Corporation" },
  { re: /\b(seylan(\s+bank)?)\b/i,                                   slug: "seylan",       name: "Seylan Bank" },
  { re: /\b(union\s+bank)\b/i,                                       slug: "union-bank",   name: "Union Bank of Colombo" },
  { re: /\b(dfcc(\s+bank)?)\b/i,                                     slug: "dfcc",         name: "DFCC Bank" },
  { re: /\b(ndb(\s+bank)?)\b/i,                                      slug: "ndb",          name: "NDB Bank" },
  { re: /\b(hatton\s+national\s+bank|\bhnb\b)/i,                     slug: "hnb",          name: "Hatton National Bank" },
  { re: /\b(nations\s+trust(\s+bank)?|\bntb\b)/i,                    slug: "ntb",          name: "Nations Trust Bank" },
  { re: /\b(commercial\s+bank|combank)\b/i,                          slug: "commercial-bank", name: "Commercial Bank of Ceylon" },
  { re: /\b(people'?s(\s+bank)?)\b/i,                                slug: "peoples",      name: "People's Bank" },
];

function detectBanks(title: string): BankRule[] {
  const matched = BANK_PATTERNS.filter((b) => b.re.test(title));
  // Dedup by slug — `Sampath Bank` matches both the "Sampath" rule and
  // any other rule that incidentally has `bank` in it.
  const seen = new Set<string>();
  return matched.filter((r) => {
    if (seen.has(r.slug)) return false;
    seen.add(r.slug);
    return true;
  });
}

function detectCardKinds(title: string): CardTypeKindValue[] {
  const lc = title.toLowerCase();
  const credit = /\bcredit\b/.test(lc);
  const debit = /\bdebit\b/.test(lc);
  const amex = /\b(american\s+express|amex)\b/.test(lc);
  const kinds: CardTypeKindValue[] = [];
  if (credit) kinds.push("credit");
  if (debit) kinds.push("debit");
  if (amex && !credit && !debit) kinds.push("other");
  // Default to credit when the title is silent. mypromo offers without a
  // card-kind keyword are usually "any card", which in practice means
  // credit cards are eligible.
  return kinds.length ? kinds : ["credit"];
}

function mapCategory(rawCategory: string | null): string {
  const c = (rawCategory ?? "").trim();
  for (const [re, slug] of CATEGORY_MAP) {
    if (re.test(c)) return slug;
  }
  return "shopping";
}

type ParsedOffer = {
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
  merchantName: string;
  categoryRaw: string | null;
  validFrom: string | null;
  validTo: string | null;
};

/**
 * Hit `POST /promotions/morecatpromos` until it returns an empty chunk,
 * collecting distinct promotion URLs. The HTML chunks come back wrapped
 * in JSON: `{ "HTMLString": "...", "NoMoreData": bool }`.
 */
async function collectPromoUrlsForCategory(
  category: string,
): Promise<string[]> {
  const urls = new Set<string>();
  for (let block = 1; block < 200; block++) {
    const res = await fetch(`${SITE}/promotions/morecatpromos`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${SITE}/promotions/${category}`,
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
      body: `BlockNumber=${block}&Category=${encodeURIComponent(category)}`,
    });
    if (!res.ok) {
      // mypromo returns a non-JSON HTML 500 page when something's off.
      // Stop walking this category rather than poisoning the run.
      console.log(`  block ${block}: HTTP ${res.status} — stopping`);
      break;
    }
    let payload: { HTMLString?: string; NoMoreData?: boolean };
    try {
      payload = (await res.json()) as { HTMLString?: string; NoMoreData?: boolean };
    } catch {
      console.log(`  block ${block}: non-JSON response — stopping`);
      break;
    }
    const html = payload.HTMLString ?? "";
    const matches = html.matchAll(/href="(\/[A-Za-z0-9_-]+\/promotion\/[0-9]+\/[^"#?]+)"/g);
    let added = 0;
    for (const m of matches) {
      if (!urls.has(m[1])) added++;
      urls.add(m[1]);
    }
    if (added === 0 || payload.NoMoreData) break;
  }
  return [...urls];
}

type LdOffer = {
  "@type"?: string;
  name?: string;
  description?: string;
  image?: string | string[];
  category?: string;
  validFrom?: string;
  priceValidUntil?: string;
  seller?: { name?: string };
};

function parseDetail(html: string, url: string): ParsedOffer | null {
  const $ = load(html);
  let offer: LdOffer | null = null;
  let breadcrumbLeaf: string | null = null;

  $("script[type='application/ld+json']").each((_i, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed["@type"] === "Offer") offer = parsed as LdOffer;
      if (parsed && parsed["@type"] === "BreadcrumbList") {
        const items = (parsed.itemListElement ?? []) as Array<{ name?: string }>;
        const last = items[items.length - 1];
        if (last?.name) breadcrumbLeaf = last.name.trim();
      }
    } catch {
      // Some mypromo pages embed a stray malformed JSON-LD block — skip
      // it silently and keep looking at the others.
    }
  });

  if (!offer) return null;
  const o = offer as LdOffer;

  const title = (o.name ?? $("h1.promotion-page-title").first().text())
    .trim()
    .replace(/\s*\|\s*[^|]+$/, ""); // strip trailing " | Merchant Name"
  if (!title) return null;

  const merchantName = (o.seller?.name ?? "").replace(/\s+Sri\s+Lanka$/i, "").trim();
  if (!merchantName) return null;

  const imageRaw = Array.isArray(o.image) ? o.image[0] : o.image;
  const imageUrl = imageRaw && isLikelyImageUrl(imageRaw) ? imageRaw : null;

  return {
    url,
    title,
    description: (o.description ?? "").trim(),
    imageUrl,
    merchantName,
    categoryRaw: o.category?.trim() || breadcrumbLeaf,
    validFrom: o.validFrom ?? null,
    validTo: o.priceValidUntil ?? null,
  };
}

/**
 * Build the `validityRaw` string `parseValidity` in `_shared` expects.
 * It already understands "valid till 31 may 2026" / "from … to …", so we
 * just synthesise a human form from the ISO dates.
 */
function isoToHuman(iso: string): string | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const monthName = new Date(`${y}-${mo}-${d}T00:00:00Z`).toLocaleString("en-US", { month: "long" });
  return `${parseInt(d, 10)} ${monthName} ${y}`;
}

function buildValidityRaw(p: ParsedOffer): string {
  const from = p.validFrom ? isoToHuman(p.validFrom) : null;
  const to = p.validTo ? isoToHuman(p.validTo) : null;
  if (from && to) return `${from} to ${to}`;
  if (to) return `valid till ${to}`;
  return "";
}

async function main() {
  const reset = process.argv.includes("--reset");

  console.log("Scraping mypromo.lk…");

  // Synthetic catch-all bank used for offers where we can't extract a
  // specific issuer from the title. Lets the offer still appear in the
  // catalog rather than being silently dropped.
  const catchAllBankId = await ensureBank("Any bank (mypromo)", "mypromo-any");

  if (reset) {
    await resetOffersForBank(catchAllBankId);
    await pruneOrphanMerchants();
  }

  // Pre-warm the card-type lookup so we don't re-query for every offer.
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

  // Pre-resolve every bank we might need so we're not racing ensureBank
  // calls. The catch-all is already done above.
  const bankIdBySlug = new Map<string, string>();
  bankIdBySlug.set("mypromo-any", catchAllBankId);
  for (const rule of BANK_PATTERNS) {
    if (bankIdBySlug.has(rule.slug)) continue;
    const id = await ensureBank(rule.name, rule.slug);
    bankIdBySlug.set(rule.slug, id);
  }

  // Phase 1 — enumerate all promotion URLs across categories.
  const seen = new Set<string>();
  for (const cat of CATEGORIES) {
    process.stdout.write(`Listing /promotions/${cat}… `);
    const urls = await collectPromoUrlsForCategory(cat);
    let added = 0;
    for (const u of urls) {
      if (!seen.has(u)) added++;
      seen.add(u);
    }
    console.log(`${urls.length} promos (${added} new)`);
  }
  console.log(`Total distinct promo URLs: ${seen.size}`);

  // Phase 2 — fetch each detail page and import.
  let created = 0;
  let skippedSource = 0;
  let skippedDup = 0;
  let skippedParse = 0;
  let skippedCategory = 0;

  for (const path of seen) {
    const fullUrl = `${SITE}${path}`;
    if (await offerExistsBySource(fullUrl)) {
      skippedSource++;
      continue;
    }

    let html: string;
    try {
      html = await fetchHtml(fullUrl);
    } catch (err) {
      console.log(`  fetch failed ${path}: ${(err as Error).message}`);
      skippedParse++;
      continue;
    }

    const parsed = parseDetail(html, fullUrl);
    if (!parsed || !parsed.validTo) {
      skippedParse++;
      continue;
    }

    const banks = detectBanks(parsed.title);
    const bankIds = banks.length
      ? banks.map((b) => bankIdBySlug.get(b.slug)!).filter(Boolean)
      : [catchAllBankId];

    const kinds = detectCardKinds(parsed.title);
    const cardIds = await ctIds(kinds);
    if (cardIds.length === 0) {
      skippedParse++;
      continue;
    }

    const categorySlug = mapCategory(parsed.categoryRaw);

    // Cross-source dedup — same merchant + similar title + endDate within
    // a fortnight of an existing offer. Cheap insurance against importing
    // the same DFCC/HNB/NTB/etc. offer we already have from the
    // first-party scraper.
    const merchantId = await ensureMerchant(parsed.merchantName);
    const dup = await findContentDuplicate(
      merchantId,
      parsed.title,
      parsed.validTo,
    );
    if (dup) {
      skippedDup++;
      continue;
    }

    const result = await importOfferMultiBank(
      {
        title: parsed.title,
        description: parsed.description || parsed.title,
        imageUrl: parsed.imageUrl,
        sourceUrl: fullUrl,
        validityRaw: buildValidityRaw(parsed),
        merchantName: parsed.merchantName,
        categorySlug,
      },
      bankIds,
      cardIds,
    );

    if (result === "created") created++;
    else if (result === "no-category") skippedCategory++;
    else skippedSource++;
  }

  await pruneOrphanMerchants();

  console.log(
    `\nDone. ${created} created · ${skippedSource} dup-by-source · ${skippedDup} dup-by-content · ${skippedCategory} no-category · ${skippedParse} parse/fetch failed`,
  );
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
