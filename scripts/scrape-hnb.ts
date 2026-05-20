/**
 * HNB Bank card-promotions importer.
 *
 * The hnb.lk site is a React SPA — the legacy investigation flagged it as
 * "JS-rendered, can't scrape". But it talks to a public JSON API at
 * https://venus.hnb.lk that returns the same data the React app renders.
 * One discovery thread (poking the bundle for endpoint strings) found:
 *
 *   GET https://venus.hnb.lk/api/get_all_web_card_promos?page=1&limit=1000
 *     → paginated list, 845 promotions in one shot at limit=1000.
 *     Each item: { id, title, thumb, merchant, cardType, from, to, valid }
 *
 *   Image base: https://www.hnb.lk/images/cardpromotions/ + thumb.
 *
 * Category info isn't in the list response and isn't in the detail
 * endpoint either, so we'd have to make 845 detail calls per scrape to
 * get the canonical category mapping. That's a lot of round trips for
 * something we only use for the filter chip — so we infer categories
 * from title keywords instead (installments → shopping, hotel → travel,
 * etc.). Bad classifications still surface the offer; they just land in
 * the wrong filter.
 *
 * Idempotent on `offers.sourceUrl`, like every other scraper. Pass
 * `-- --reset` to wipe and re-import from scratch.
 */
import "dotenv/config";
import { pgClient } from "../db";
import {
  cleanMerchantName,
  ensureBank,
  getCardTypeIdsByKind,
  importOffer,
  pruneOrphanMerchants,
  resetOffersForBank,
} from "./_shared";
import type { CardTypeKindValue } from "../db/schema";

const SITE = "https://www.hnb.lk";
const API = "https://venus.hnb.lk/api";
// HNB serves merchant logos from an S3 bucket fronted at
// assets.hnb.lk/atdi/. The React app constructs image URLs by string-
// concatenating this base with the `thumb` field from the API response
// (e.g. "merchants/ashadi-jewellers-logo.jpg"). Don't be fooled by
// `https://www.hnb.lk/images/cardpromotions/<thumb>` returning HTTP
// 200 — that's the React SPA serving its index.html fallback for any
// unknown route. Always verify content-type starts with `image/`.
const IMAGE_BASE = "https://assets.hnb.lk/atdi/";

// Origin/Referer matter — venus.hnb.lk gates the API on these. Plain
// curl with no headers still got 200 in testing, but match the React
// app's actual request shape so we don't get rate-limited later.
const HEADERS = {
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  origin: SITE,
  referer: `${SITE}/`,
};

type HnbItem = {
  id: number;
  title: string;
  thumb: string;
  merchant: string;
  cardType: "credit" | "debit" | "credit/debit";
  from?: string; // "2026-05-19" or "" (sometimes absent)
  to: string; //   "2026-06-30"
  valid: string; // e.g. "Valid Until", "Valid On 2026-05-21 &"
};

type HnbListResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: HnbItem[];
};

const MONTHS_LONG = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * Format an ISO date (yyyy-mm-dd) as "12 october 2026" so the shared
 * `parseValidity` helper recognises it via its existing range regex.
 * Saves us from adding an ISO-aware path to the shared parser just for
 * this one scraper.
 */
function isoToHuman(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12) return null;
  return `${d} ${MONTHS_LONG[mo - 1]} ${y}`;
}

function buildValidityRaw(item: HnbItem): string {
  const from = item.from ? isoToHuman(item.from) : null;
  const to = item.to ? isoToHuman(item.to) : null;
  if (from && to) return `${from} to ${to}`;
  if (to) return `valid till ${to}`;
  return item.valid || "";
}

function detectKinds(cardType: HnbItem["cardType"]): CardTypeKindValue[] {
  switch (cardType) {
    case "debit":
      return ["debit"];
    case "credit/debit":
      return ["credit", "debit"];
    case "credit":
    default:
      return ["credit"];
  }
}

/**
 * Title-keyword classifier. Order matters: dining / travel / electronics /
 * groceries / fuel patterns are checked before the default `shopping`,
 * which catches the long tail of "Up to X months 0% installments at Y".
 */
function categoryFor(title: string): string {
  const t = title.toLowerCase();
  if (/\b(hotel|resort|spa|villa|kandalama|sigiriya|sanctuary|stay|bb\s|hb\s|fb\s|\sbb\b|\shb\b|\sfb\b|bb\s*&|hb\s*&|fb\s*&)\b/.test(t))
    return "travel";
  if (/\b(restaurant|cafe|café|dine|dining|buffet|lunch|dinner|kfc|pizza|subway|burger|coffee|bistro|grill|tea house|food)\b/.test(t))
    return "dining";
  if (/\b(supermarket|keells|cargills|arpico|glomark|spar|grocer)\b/.test(t))
    return "groceries";
  if (/\b(electronics|appliances|abans|softlogic|singer|damro|laptop|tv\b|fridge|air conditioner|smart ?phone|mobile store|mobile centre|panasonic|samsung|lg\b|sony)\b/.test(t))
    return "electronics";
  if (/\b(fuel|ioc|ceypetco|petrol|gas station)\b/.test(t))
    return "fuel";
  return "shopping";
}

/**
 * HTML entity unescape for the few characters the API leaves encoded
 * (`&amp;`, `&#x27;`, etc.). Cheaper than pulling in a real library.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function buildImageUrl(thumb: string | null | undefined): string | null {
  if (!thumb) return null;
  // Thumb paths can contain spaces, commas, and unicode — encode each
  // segment but keep the `/` separators intact.
  const encoded = thumb
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return IMAGE_BASE + encoded;
}

async function fetchAll(): Promise<HnbItem[]> {
  // Single-shot fetch with a generous limit; the API caps at "all" for
  // limit values larger than the dataset. If the dataset grows past
  // 2000, switch to a page loop.
  const url = `${API}/get_all_web_card_promos?page=1&limit=2000`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`HNB API ${res.status} for ${url}`);
  }
  const json = (await res.json()) as HnbListResponse;
  if (!Array.isArray(json.data)) {
    throw new Error("HNB API: data is not an array");
  }
  if (json.total > json.data.length) {
    console.warn(
      `! HNB returned ${json.data.length} of ${json.total} — bump the limit or add paging.`,
    );
  }
  return json.data;
}

async function main() {
  const reset = process.argv.includes("--reset");
  console.log("Scraping HNB card promotions…");
  const bankId = await ensureBank("Hatton National Bank", "hnb");

  if (reset) {
    await resetOffersForBank(bankId);
    await pruneOrphanMerchants();
  }

  const items = await fetchAll();
  console.log(`Fetched ${items.length} promotions from venus.hnb.lk.`);

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

  // Tally per heuristic category so we can spot bad classifications in
  // the run output.
  const perCategory = new Map<string, number>();
  let created = 0;
  let skipped = 0;
  let missingCategory = 0;
  let skippedShape = 0;

  for (const item of items) {
    const title = decodeEntities(item.title).trim();
    const merchantRaw = decodeEntities(item.merchant || "").trim();
    if (!title || !merchantRaw) {
      skippedShape++;
      continue;
    }
    const merchantName = cleanMerchantName(merchantRaw);
    if (!merchantName) {
      skippedShape++;
      continue;
    }

    const kinds = detectKinds(item.cardType);
    const cardIds = await ctIds(kinds);
    if (cardIds.length === 0) {
      console.warn(
        `  skip "${title}" — no card-type rows match ${kinds.join(",")}`,
      );
      continue;
    }

    const categorySlug = categoryFor(title);
    perCategory.set(categorySlug, (perCategory.get(categorySlug) ?? 0) + 1);

    const result = await importOffer(
      {
        title,
        description: [title, merchantName, decodeEntities(item.valid)]
          .filter(Boolean)
          .join(" — "),
        imageUrl: buildImageUrl(item.thumb),
        // Frontend route the HNB SPA uses for offer detail. Stable per
        // id and unique → safe dedup key.
        sourceUrl: `${SITE}/card-promotion/search/${item.id}`,
        validityRaw: buildValidityRaw(item),
        merchantName,
        categorySlug,
      },
      bankId,
      cardIds,
    );

    if (result === "created") created++;
    else if (result === "skipped") skipped++;
    else if (result === "no-category") missingCategory++;
  }

  await pruneOrphanMerchants();

  console.log(
    `\nDone. ${items.length} parsed · ${created} created · ${skipped} skipped · ${missingCategory} missing-category · ${skippedShape} shape-skipped`,
  );
  console.log("Category distribution:");
  for (const [slug, count] of [...perCategory.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${slug.padEnd(12)} ${count}`);
  }
  await pgClient.end();
}

main().catch(async (err) => {
  console.error(err);
  await pgClient.end().catch(() => {});
  process.exit(1);
});
