import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  banks,
  cardTypes,
  categories,
  merchants,
  offerBanks,
  offerCardTypes,
  offers,
  type CardTypeKindValue,
  type OfferStatusValue,
} from "../db/schema";
import { MERCHANT_OVERRIDES } from "./merchant-overrides";

function applyMerchantOverride(name: string): string {
  return MERCHANT_OVERRIDES[name.toLowerCase()] ?? name;
}

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`Fetch ${url} failed: ${res.status}`);
  return res.text();
}

export function cleanMerchantName(raw: string): string {
  return raw
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/^\s*www\.?\s*/i, "")
    .replace(/\s*\([0-9]+\)\s*$/g, "")
    .replace(/\.(jpg|jpeg|png|webp|gif|svg)$/i, "")
    .replace(
      /\b(logo|main|international|web ?banner[s]?|web ?image|main image|wordmark|final|hi[- ]?res|high ?res|thumb)\b/gi,
      "",
    )
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s'])([a-z])/g, (_m, sep: string, ch: string) =>
      sep + ch.toUpperCase(),
    );
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function downloadImage(
  imageUrl: string,
  publicSubdir: string,
  referer?: string,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = { "user-agent": UA };
    if (referer) headers.referer = referer;
    const res = await fetch(imageUrl, { headers });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "")
      .toLowerCase()
      .split(";")[0]
      .trim();
    const fromUrl = extname(new URL(imageUrl).pathname).toLowerCase();
    const ext = MIME_TO_EXT[contentType] ?? (fromUrl || ".jpg");
    const hash = createHash("sha1").update(imageUrl).digest("hex").slice(0, 12);
    const filename = `${hash}${ext}`;
    const absPath = join(process.cwd(), "public", publicSubdir, filename);
    await mkdir(dirname(absPath), { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(absPath, buf);
    return `/${publicSubdir.replace(/\\/g, "/")}/${filename}`;
  } catch {
    return null;
  }
}

/**
 * Cheap sanity check for image URLs scraped out of HTML. Returns true when
 * the string looks like a usable image reference — i.e. starts with
 * `http(s)://` or `/`, and ends in a known image extension or the path is
 * underneath an obvious CDN/asset prefix.
 *
 * Use this instead of `isGarbageAlt` for image-src validation:
 * `isGarbageAlt` is tuned for short alt-text strings and over-rejects
 * URLs because they naturally have a high non-alpha character ratio
 * (`://`, dots, digits, etc.).
 */
export function isLikelyImageUrl(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  if (!/^(https?:\/\/|\/)/i.test(s)) return false;
  // Strip query string before checking extension.
  const pathish = s.split("?")[0].split("#")[0].toLowerCase();
  if (/\.(jpe?g|png|webp|gif|svg|avif)(\.[a-z]+)?$/i.test(pathish)) return true;
  // Allow URLs that look like they belong on a known asset/CDN host even
  // without a recognised extension (some CDNs strip the suffix).
  if (/\b(assets?|cdn|images?|media|uploads)\b/i.test(pathish)) return true;
  return false;
}

export function isGarbageAlt(alt: string): boolean {
  const lc = alt.trim().toLowerCase();
  if (!lc) return true;
  if (/^(image|img|photo|screenshot|whatsapp|copy of|untitled|thumb)\b/.test(lc))
    return true;
  if (/^\d/.test(lc)) return true;
  if (/\b\d{4}\s+\d{2}\s+\d{2}\b/.test(lc)) return true;
  const nonAlphaCount = (lc.match(/[^a-z\s]/g) ?? []).length;
  if (nonAlphaCount > 0 && nonAlphaCount / lc.length > 0.25) return true;
  return false;
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

const pad = (n: number) => n.toString().padStart(2, "0");
const iso = (y: number, m: number, d: number) =>
  `${y}-${pad(m + 1)}-${pad(d)}`;

export function parseValidity(raw: string): {
  startDate: string;
  endDate: string;
} {
  const lc = raw.toLowerCase();
  const norm = lc.replace(/(\d+)(st|nd|rd|th)/g, "$1");

  // "valid till 31 may 2026" / "valid until 30 june 2026"
  const validTill = norm.match(/(?:till|until|through)\s+(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (validTill) {
    const d = parseInt(validTill[1], 10);
    const m = MONTHS[validTill[2]];
    const y = parseInt(validTill[3], 10);
    if (m !== undefined) {
      const today = new Date();
      const start = today.toISOString().slice(0, 10);
      return { startDate: start, endDate: iso(y, m, d) };
    }
  }

  // "1 march 2026 to 31 may 2026" / "15 march to 31 may 2026"
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

  // "1-31 may 2026"
  const sameMonth = norm.match(
    /(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/,
  );
  if (sameMonth) {
    const d1 = parseInt(sameMonth[1], 10);
    const d2 = parseInt(sameMonth[2], 10);
    const m = MONTHS[sameMonth[3]];
    const y = parseInt(sameMonth[4], 10);
    if (m !== undefined)
      return { startDate: iso(y, m, d1), endDate: iso(y, m, d2) };
  }

  // "10 may 2026"
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

  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const future = new Date(today);
  future.setDate(future.getDate() + 30);
  return { startDate, endDate: future.toISOString().slice(0, 10) };
}

export async function ensureBank(name: string, slug: string): Promise<string> {
  const existing = await db.select().from(banks).where(eq(banks.slug, slug)).limit(1);
  if (existing[0]) return existing[0].id;
  const inserted = await db
    .insert(banks)
    .values({ name, slug, isActive: true })
    .returning({ id: banks.id });
  console.log(`+ Bank: ${name}`);
  return inserted[0].id;
}

export async function getCardTypeIdsByKind(
  kinds: CardTypeKindValue[],
): Promise<string[]> {
  const rows = await db
    .select({ id: cardTypes.id })
    .from(cardTypes)
    .where(inArray(cardTypes.kind, kinds));
  return rows.map((r) => r.id);
}

export async function ensureCategoryBySlug(
  slug: string,
): Promise<string | null> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return existing[0]?.id ?? null;
}

export async function ensureMerchant(rawName: string): Promise<string> {
  const name = applyMerchantOverride(rawName);
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

export async function offerExistsBySource(sourceUrl: string): Promise<boolean> {
  const rows = await db
    .select({ id: offers.id })
    .from(offers)
    .where(eq(offers.sourceUrl, sourceUrl))
    .limit(1);
  return rows.length > 0;
}

export type ImportInput = {
  title: string;
  description: string;
  imageUrl: string | null;
  sourceUrl: string;
  validityRaw: string;
  merchantName: string;
  categorySlug: string;
};

export async function importOffer(
  input: ImportInput,
  bankId: string,
  cardTypeIdList: string[],
): Promise<"created" | "skipped" | "no-category"> {
  return importOfferMultiBank(input, [bankId], cardTypeIdList);
}

/**
 * Same as `importOffer` but attaches the offer to multiple banks. Useful
 * for scrapers like mypromo.lk where a single promotion is shared across
 * several banks (or where bank affiliation can't be pinned down and we
 * want the offer to surface under every bank's filter).
 */
export async function importOfferMultiBank(
  input: ImportInput,
  bankIds: string[],
  cardTypeIdList: string[],
): Promise<"created" | "skipped" | "no-category"> {
  if (bankIds.length === 0) return "skipped";
  const categoryId = await ensureCategoryBySlug(input.categorySlug);
  if (!categoryId) return "no-category";
  if (await offerExistsBySource(input.sourceUrl)) return "skipped";

  const merchantId = await ensureMerchant(input.merchantName);
  const { startDate, endDate } = parseValidity(input.validityRaw);
  const today = new Date().toISOString().slice(0, 10);
  const status: OfferStatusValue = endDate < today ? "expired" : "published";

  const inserted = await db
    .insert(offers)
    .values({
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      merchantId,
      categoryId,
      startDate,
      endDate,
      status,
      sourceUrl: input.sourceUrl,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning({ id: offers.id });

  const offerId = inserted[0].id;
  for (const bankId of bankIds) {
    await db
      .insert(offerBanks)
      .values({ offerId, bankId })
      .onConflictDoNothing();
  }
  for (const ctId of cardTypeIdList) {
    await db
      .insert(offerCardTypes)
      .values({ offerId, cardTypeId: ctId })
      .onConflictDoNothing();
  }
  return "created";
}

/**
 * Cross-source content dedup helper. Looks for an offer already in the DB
 * with the same merchant and a similar title that is still active in the
 * same general validity window. Designed for the mypromo.lk scraper, which
 * imports offers we may already have from first-party bank scrapers under
 * a different `sourceUrl` (so the normal `offerExistsBySource` dedup
 * doesn't fire).
 *
 * Returns the matching offer id when found, otherwise null. Match
 * criteria:
 *   - same `merchant_id` (case-insensitive merchant name match via
 *     `ensureMerchant` upstream)
 *   - `endDate` within ±7 days of the candidate's endDate
 *   - title word-overlap >= 0.5 (Jaccard on normalised tokens, excluding
 *     a small stop-word list)
 *
 * Tuned for recall on the kinds of duplicates mypromo creates — the
 * threshold is intentionally loose because mypromo rewrites titles. Some
 * dupes will still slip through; that's an acceptable trade for not
 * collapsing distinct offers from the same merchant.
 */
const TITLE_STOP_WORDS = new Set([
  "at", "the", "a", "an", "of", "on", "in", "with", "and", "or", "to", "for",
  "your", "off", "from", "by", "up", "is", "are", "this", "these", "all",
  "any", "you", "card", "cards", "bank", "banks", "credit", "debit",
  "mastercard", "visa", "amex", "exclusive", "special", "offer", "offers",
  "promotion", "promotions", "discount", "discounts", "enjoy", "get", "save",
  "savings", "deal", "deals",
]);

function normaliseTitleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !TITLE_STOP_WORDS.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  return intersect / (a.size + b.size - intersect);
}

export async function findContentDuplicate(
  merchantId: string,
  title: string,
  endDate: string,
): Promise<string | null> {
  // ±7 day window on endDate.
  const end = new Date(endDate);
  const lo = new Date(end);
  lo.setDate(lo.getDate() - 7);
  const hi = new Date(end);
  hi.setDate(hi.getDate() + 7);
  const loStr = lo.toISOString().slice(0, 10);
  const hiStr = hi.toISOString().slice(0, 10);

  const candidates = await db
    .select({ id: offers.id, title: offers.title })
    .from(offers)
    .where(
      sql`${offers.merchantId} = ${merchantId}
        and ${offers.endDate} between ${loStr} and ${hiStr}`,
    );

  if (candidates.length === 0) return null;
  const incoming = normaliseTitleTokens(title);
  for (const c of candidates) {
    if (jaccard(incoming, normaliseTitleTokens(c.title)) >= 0.5) {
      return c.id;
    }
  }
  return null;
}

export async function resetOffersForBank(bankId: string) {
  const offerIds = await db
    .select({ id: offerBanks.offerId })
    .from(offerBanks)
    .where(eq(offerBanks.bankId, bankId));
  if (offerIds.length === 0) {
    console.log("No prior offers to remove for this bank.");
    return;
  }
  const ids = offerIds.map((r) => r.id);
  await db.delete(offers).where(inArray(offers.id, ids));
  console.log(`Removed ${ids.length} prior offers.`);
}

export async function pruneOrphanMerchants() {
  const orphans = await db
    .select({ id: merchants.id })
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
