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

const URL = "https://www.combank.lk/rewards-promotions";

// ComBank section id → our app's category slug.
const CATEGORY_MAP: Record<string, string> = {
  "seasonal-offers": "shopping",
  "food-restaurants": "dining",
  leisure: "shopping",
  "online-shopping": "shopping",
  "furniture-appliances": "electronics",
  "mobile-electronic-equipment": "electronics",
  supermarket: "groceries",
  "fashion-jewellery": "shopping",
  healthcare: "shopping",
  education: "shopping",
  travel: "travel",
  auto: "fuel",
  "premium-card-offers": "shopping",
  "other-offers": "shopping",
  "automatic-bill-settlements": "fuel",
  "q-payment-app-offers": "shopping",
  "max-loyalty-rewards": "shopping",
  "product-promotions": "shopping",
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

function extractBackgroundUrl(style: string | undefined): string | null {
  if (!style) return null;
  const m = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
  return m ? m[1] : null;
}

function detectKindsFromTitle(title: string): CardTypeKindValue[] {
  const lc = title.toLowerCase();
  const credit = /\bcredit cards?\b/.test(lc);
  const debit = /\bdebit cards?\b/.test(lc);
  if (credit && debit) return ["credit", "debit"];
  if (debit) return ["debit"];
  // Default to credit — page is /rewards-promotions and most are credit
  return ["credit"];
}

const GENERIC_MERCHANT_PATTERNS = [
  /\b(your|favourite|favorite|online|payments?|insurance|premiums|bills?|hospital|education|future|tomorrow|journey|holiday|destination|reload|exclusive|free|easy|premium|platinum|festive|moments?|going|going|art|dining|deals?)\b/i,
];

function isGenericMerchant(name: string): boolean {
  const lc = name.trim().toLowerCase();
  if (lc.split(/\s+/).length >= 5) return true;
  if (/\b(make|enjoy|get|grab|reload|pay|settle|embark|step|access|brighten|explore|go)\b/i.test(lc))
    return true;
  if (GENERIC_MERCHANT_PATTERNS.some((p) => p.test(lc))) return true;
  return false;
}

function extractMerchantFromTitle(title: string): string | null {
  const patterns: RegExp[] = [
    /\bat\s+([A-Z][A-Za-z0-9'’ &.\-]+?)\s+(?:with|using)\s+ComBank/i,
    /\bfrom\s+([A-Z][A-Za-z0-9'’ &.\-]+?)\s+(?:with|using)\s+ComBank/i,
    /\bwith\s+([A-Z][A-Za-z0-9'’ &.\-]+?)\s+(?:using|when paying)\s+ComBank/i,
    /\bvia\s+([A-Z][A-Za-z0-9'’ &.\-]+?)\s+(?:and|with|using)\s+(?:get|earn|win|ComBank)/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) {
      const candidate = m[1].trim().replace(/\.$/, "");
      if (candidate.length >= 2 && candidate.length <= 80) return candidate;
    }
  }
  return null;
}

function merchantFromUrlSlug(href: string): string | null {
  const slug = href.split("/").filter(Boolean).pop();
  if (!slug) return null;
  // Highest-precision pattern: "...-at-MERCHANT-with-combank-..."
  const at = slug.match(/-at-([a-z0-9-]+?)-with-combank-/i);
  if (at) return at[1].replace(/-/g, " ");
  const from = slug.match(/-from-([a-z0-9-]+?)-with-combank-/i);
  if (from) return from[1].replace(/-/g, " ");
  const withM = slug.match(/-with-([a-z0-9-]+?)-using-combank-/i);
  if (withM) return withM[1].replace(/-/g, " ");
  return null;
}

function parseOffers(html: string): ParsedOffer[] {
  const $ = load(html);
  const out: ParsedOffer[] = [];

  $("div.offers-row[id]").each((_, sectionEl) => {
    const $section = $(sectionEl);
    const sectionId = $section.attr("id") ?? "";
    const categorySlug = CATEGORY_MAP[sectionId];
    if (!categorySlug) return;

    $section.find("a.reward").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") ?? "";
      if (!href) return;
      const sourceUrl = href.startsWith("http")
        ? href
        : `https://www.combank.lk${href.startsWith("/") ? "" : "/"}${href}`;

      const title = $el.find(".reward-content h3").first().text().trim();
      const validityRaw = $el.find(".valid-date").first().text().trim();
      const imageUrl =
        extractBackgroundUrl($el.find(".reward-image").attr("style")) ?? null;

      // Discount text: <p>Up to</p><p class="percentage">20%</p><p>Off</p>
      const discountParts: string[] = [];
      $el.find(".offer-tag p").each((_, p) => {
        discountParts.push($(p).text().trim());
      });
      const discount = discountParts.filter(Boolean).join(" ");

      if (!title) return;

      const kinds = detectKindsFromTitle(title);

      let merchantName: string | null = merchantFromUrlSlug(href);
      if (!merchantName) merchantName = extractMerchantFromTitle(title);
      if (!merchantName) return;
      const cleanMerchant = cleanMerchantName(merchantName);
      if (!cleanMerchant || isGarbageAlt(cleanMerchant)) return;
      if (isGenericMerchant(cleanMerchant)) return;

      const description = discount
        ? `${title} (${discount.toLowerCase()}).`
        : `${title}.`;

      out.push({
        title,
        description,
        imageUrl,
        sourceUrl,
        validityRaw,
        merchantName: cleanMerchant,
        categorySlug,
        kinds,
      });
    });
  });

  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");

  console.log("Scraping ComBank rewards & promotions…");
  const bankId = await ensureBank("Commercial Bank of Ceylon", "commercial-bank");

  if (reset) {
    await resetOffersForBank(bankId);
    await pruneOrphanMerchants();
  }

  const html = await fetchHtml(URL);
  const parsed = parseOffers(html);
  console.log(`Parsed ${parsed.length} offers.`);

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

  let created = 0,
    skipped = 0,
    missingCategory = 0;
  for (const p of parsed) {
    const cardIds = await ctIds(p.kinds);
    if (cardIds.length === 0) {
      console.warn(`Skipping ${p.title}: no card types match ${p.kinds.join(",")}`);
      continue;
    }
    const result = await importOffer(p, bankId, cardIds);
    if (result === "created") created++;
    else if (result === "skipped") skipped++;
    else if (result === "no-category") missingCategory++;
  }

  await pruneOrphanMerchants();

  console.log(
    `\nDone. ${parsed.length} parsed · ${created} created · ${skipped} skipped · ${missingCategory} missing-category`,
  );
  await pgClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
