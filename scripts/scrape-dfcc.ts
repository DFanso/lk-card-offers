import "dotenv/config";
import { load } from "cheerio";
import { eq, inArray, sql } from "drizzle-orm";
import { db, pgClient } from "../db";
import {
  banks,
  cardTypes,
  categories,
  merchants,
  offerBanks,
  offerCardTypes,
  offers,
  type OfferStatusValue,
} from "../db/schema";

const BASE = "https://www.dfcc.lk";

// DFCC category slug → our app's category slug
const CATEGORY_MAP: Record<string, string> = {
  "supermarkets-credit": "groceries",
  "dining-promotion-credit": "dining",
  "0-easy-payment-plans-promotion": "shopping",
  "clothing-and-retail-3": "shopping",
  "online-promotion": "shopping",
  utility: "fuel",
  jewellery: "shopping",
  "pinnacle-credit": "shopping",
  "hotels-credit": "travel",
  "gift-and-wellness": "shopping",
  "home-appliances-promotion-2": "electronics",
  "travel-promotion": "travel",
  "autocare-promotion": "fuel",
  "visa-offers": "shopping",
  "mastercard-offers": "shopping",
  other: "shopping",
};

const CATEGORY_PATHS = Object.keys(CATEGORY_MAP);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

type ParsedOffer = {
  merchantName: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string;
  validityRaw: string;
  discount: string | null;
  ourCategorySlug: string;
};

async function fetchHtml(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

function cleanMerchantName(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'") // curly → straight apostrophes
    .replace(/[“”]/g, '"')
    .replace(/\s*\([0-9]+\)\s*$/g, "")
    .replace(/\.(jpg|jpeg|png|webp|gif|svg)$/i, "")
    .replace(
      /\b(logo|main|international|web ?banner[s]?|web ?image|main image|wordmark|final|hi[- ]?res|high ?res)\b/gi,
      "",
    )
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s'])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function isGarbageAlt(alt: string): boolean {
  const lc = alt.trim().toLowerCase();
  if (!lc) return true;
  if (/^(image|img|photo|screenshot|whatsapp|copy of|untitled)\b/.test(lc)) return true;
  if (/^\d/.test(lc)) return true;
  // Date-like sequences like "2026 04 10 at 10.54"
  if (/\b\d{4}\s+\d{2}\s+\d{2}\b/.test(lc)) return true;
  // Mostly-digit or alphanumeric noise like "tc high res 01"
  const nonAlphaCount = (lc.match(/[^a-z\s]/g) ?? []).length;
  if (nonAlphaCount > 0 && nonAlphaCount / lc.length > 0.25) return true;
  return false;
}

function extractMerchantFromDescription(desc: string): string | null {
  // "20% Savings on dine-in at Cinnamon Grand Colombo with DFCC Credit Cards."
  // "Get X off at MERCHANT using DFCC…"
  const patterns: RegExp[] = [
    /\bat\s+([A-Z][A-Za-z0-9'’ &.\-]+?)\s+(?:with|using|when paying|on)\s+DFCC/i,
    /\bfrom\s+([A-Z][A-Za-z0-9'’ &.\-]+?)\s+(?:with|using|when paying|on)\s+DFCC/i,
    /^([A-Z][A-Za-z0-9'’ &.\-]+?)\s*[-–—]\s/,
  ];
  for (const p of patterns) {
    const m = desc.match(p);
    if (m) {
      const candidate = m[1].trim().replace(/\.$/, "");
      if (candidate.length >= 2 && candidate.length <= 80) return candidate;
    }
  }
  return null;
}

function parseOffersFromHtml(
  html: string,
  ourCategorySlug: string,
): ParsedOffer[] {
  const $ = load(html);
  const out: ParsedOffer[] = [];
  $(".cardOfferItem").each((_, el) => {
    const $el = $(el);
    const img = $el.find("img.offerMainImage").first();
    const imageUrl = img.attr("src") ?? null;
    const altRaw = img.attr("alt") ?? "";
    const description = $el.find(".cardOfferText").text().trim();
    const validityRaw = $el.find(".cardOfferValid").text().trim();
    const link = $el.find("a[href]").first().attr("href") ?? "";
    const sourceUrl = link.startsWith("http") ? link : `${BASE}${link}`;
    const discount = $el.find(".Offerpercentage p").text().trim() || null;

    // Prefer merchant extracted from description; fall back to alt text if it
    // isn't an auto-generated filename.
    const fromDesc = extractMerchantFromDescription(description);
    const altUsable = !isGarbageAlt(altRaw);
    let merchantName = "";
    if (fromDesc) merchantName = cleanMerchantName(fromDesc);
    else if (altUsable) merchantName = cleanMerchantName(altRaw);
    else {
      // Last resort: derive from detail page slug (e.g. /cards/cards-promotions/cinnamon-grand-colombo)
      const slug = link.split("/").filter(Boolean).pop() ?? "";
      if (slug && !/^\d+/.test(slug))
        merchantName = cleanMerchantName(slug.replace(/-/g, " "));
    }
    if (!merchantName || !description) return;
    out.push({
      merchantName,
      description,
      imageUrl,
      sourceUrl,
      validityRaw,
      discount,
      ourCategorySlug,
    });
  });
  return out;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function iso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseValidity(raw: string): { startDate: string; endDate: string } {
  const lc = raw.toLowerCase();
  // Strip ordinal suffixes
  const norm = lc.replace(/(\d+)(st|nd|rd|th)/g, "$1");

  // Pattern A: "1 march 2026 to 31 may 2026" or "15 march to 31 may 2026"
  const range = norm.match(
    /(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\s*(?:to|–|-|until|through)\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/,
  );
  if (range) {
    const d1 = parseInt(range[1], 10);
    const m1 = MONTHS[range[2]];
    const y1 = range[3] ? parseInt(range[3], 10) : parseInt(range[6], 10);
    const d2 = parseInt(range[4], 10);
    const m2 = MONTHS[range[5]];
    const y2 = parseInt(range[6], 10);
    if (m1 !== undefined && m2 !== undefined)
      return { startDate: iso(y1, m1, d1), endDate: iso(y2, m2, d2) };
  }

  // Pattern B: "1-31 may 2026" or "1 - 31 may 2026"
  const sameMonth = norm.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (sameMonth) {
    const d1 = parseInt(sameMonth[1], 10);
    const d2 = parseInt(sameMonth[2], 10);
    const m = MONTHS[sameMonth[3]];
    const y = parseInt(sameMonth[4], 10);
    if (m !== undefined)
      return { startDate: iso(y, m, d1), endDate: iso(y, m, d2) };
  }

  // Pattern C: "valid on 10 may 2026"
  const single = norm.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (single) {
    const d = parseInt(single[1], 10);
    const m = MONTHS[single[2]];
    const y = parseInt(single[3], 10);
    if (m !== undefined) {
      const date = iso(y, m, d);
      return { startDate: date, endDate: date };
    }
  }

  // Fallback: today + 30 days
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const future = new Date(today);
  future.setDate(future.getDate() + 30);
  const endDate = future.toISOString().slice(0, 10);
  return { startDate, endDate };
}

function buildTitle(offer: ParsedOffer): string {
  if (offer.discount) {
    return `${offer.discount} at ${offer.merchantName}`;
  }
  // First sentence of description, capped
  const firstSentence = offer.description.split(".")[0];
  return firstSentence.length > 120
    ? firstSentence.slice(0, 117) + "…"
    : firstSentence;
}

async function ensureBank(): Promise<string> {
  const slug = "dfcc";
  const existing = await db.select().from(banks).where(eq(banks.slug, slug)).limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(banks)
    .values({ name: "DFCC Bank", slug, isActive: true })
    .returning({ id: banks.id });
  console.log(`+ Bank: DFCC Bank`);
  return inserted[0].id;
}

async function getCreditCardTypeIds(): Promise<string[]> {
  const rows = await db
    .select({ id: cardTypes.id })
    .from(cardTypes)
    .where(eq(cardTypes.kind, "credit"));
  return rows.map((r) => r.id);
}

async function ensureCategory(slug: string): Promise<string | null> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return existing[0]?.id ?? null;
}

async function ensureMerchant(name: string): Promise<string> {
  const found = await db
    .select({ id: merchants.id })
    .from(merchants)
    .where(sql`lower(${merchants.name}) = lower(${name})`)
    .limit(1);
  if (found[0]) return found[0].id;
  const inserted = await db
    .insert(merchants)
    .values({ name, isActive: true })
    .returning({ id: merchants.id });
  console.log(`+ Merchant: ${name}`);
  return inserted[0].id;
}

async function offerExistsBySource(sourceUrl: string): Promise<boolean> {
  const rows = await db
    .select({ id: offers.id })
    .from(offers)
    .where(eq(offers.sourceUrl, sourceUrl))
    .limit(1);
  return rows.length > 0;
}

async function importOffer(
  parsed: ParsedOffer,
  bankId: string,
  cardTypeIdList: string[],
): Promise<"created" | "skipped" | "no-category"> {
  const categoryId = await ensureCategory(parsed.ourCategorySlug);
  if (!categoryId) return "no-category";
  if (await offerExistsBySource(parsed.sourceUrl)) return "skipped";

  const merchantId = await ensureMerchant(parsed.merchantName);
  const { startDate, endDate } = parseValidity(parsed.validityRaw);
  const today = new Date().toISOString().slice(0, 10);
  const status: OfferStatusValue = endDate < today ? "expired" : "published";
  const title = buildTitle(parsed);

  const inserted = await db
    .insert(offers)
    .values({
      title,
      description: parsed.description,
      imageUrl: parsed.imageUrl,
      merchantId,
      categoryId,
      startDate,
      endDate,
      status,
      sourceUrl: parsed.sourceUrl,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning({ id: offers.id });

  const offerId = inserted[0].id;
  await db
    .insert(offerBanks)
    .values({ offerId, bankId })
    .onConflictDoNothing();
  for (const ctId of cardTypeIdList) {
    await db
      .insert(offerCardTypes)
      .values({ offerId, cardTypeId: ctId })
      .onConflictDoNothing();
  }
  return "created";
}

async function resetDfccImports(bankId: string) {
  // Delete every offer ever attached to DFCC. Junction rows cascade.
  const offerIds = await db
    .select({ id: offerBanks.offerId })
    .from(offerBanks)
    .where(eq(offerBanks.bankId, bankId));
  if (offerIds.length === 0) {
    console.log("No prior DFCC offers to remove.");
    return;
  }
  const ids = offerIds.map((r) => r.id);
  await db.delete(offers).where(inArray(offers.id, ids));
  console.log(`Removed ${ids.length} prior DFCC offers.`);
}

async function pruneOrphanMerchants() {
  // Merchants with no offers and no master-data reference can be safely removed.
  const orphans = await db
    .select({ id: merchants.id, name: merchants.name })
    .from(merchants)
    .where(
      sql`not exists (select 1 from ${offers} where ${offers.merchantId} = ${merchants.id})`,
    );
  if (!orphans.length) return;
  await db.delete(merchants).where(
    inArray(
      merchants.id,
      orphans.map((o) => o.id),
    ),
  );
  console.log(`Pruned ${orphans.length} orphan merchants.`);
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");

  console.log("Scraping DFCC credit-card promotions…");
  const bankId = await ensureBank();
  const cardTypeIdList = await getCreditCardTypeIds();
  if (cardTypeIdList.length === 0) {
    throw new Error(
      "No credit card types found. Seed master data first (bun db:seed).",
    );
  }

  if (reset) {
    await resetDfccImports(bankId);
    await pruneOrphanMerchants();
  }

  let created = 0;
  let skipped = 0;
  let missingCategory = 0;
  let totalParsed = 0;

  for (const path of CATEGORY_PATHS) {
    process.stdout.write(`  · /${path} … `);
    let html: string;
    try {
      html = await fetchHtml(path);
    } catch (err) {
      console.log(`failed (${(err as Error).message})`);
      continue;
    }
    const parsed = parseOffersFromHtml(html, CATEGORY_MAP[path]);
    totalParsed += parsed.length;
    let createdCount = 0;
    let skippedCount = 0;
    for (const p of parsed) {
      const result = await importOffer(p, bankId, cardTypeIdList);
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
