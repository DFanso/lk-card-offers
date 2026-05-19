import { and, asc, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { banks, categories, merchants, offers } from "@/db/schema";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

export type SearchHit =
  | { kind: "offer"; id: string; title: string; merchant?: string }
  | { kind: "merchant"; id: string; name: string }
  | { kind: "bank"; id: string; name: string; slug: string }
  | { kind: "category"; id: string; name: string; slug: string };

export type SearchResponse = {
  q: string;
  hits: SearchHit[];
};

const MAX_PER_KIND = 6;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return Response.json({ q, hits: [] } satisfies SearchResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const term = `%${q.toLowerCase()}%`;
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    const [bankRows, categoryRows, merchantRows, offerRows] = await Promise.all([
      db
        .select({ id: banks.id, name: banks.name, slug: banks.slug })
        .from(banks)
        .where(
          and(
            eq(banks.isActive, true),
            sql`(lower(${banks.name}) like ${term} or lower(${banks.slug}) like ${term})`,
          ),
        )
        .orderBy(asc(banks.name))
        .limit(MAX_PER_KIND),
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(categories)
        .where(
          and(
            eq(categories.isActive, true),
            sql`(lower(${categories.name}) like ${term} or lower(${categories.slug}) like ${term})`,
          ),
        )
        .orderBy(asc(categories.name))
        .limit(MAX_PER_KIND),
      db
        .select({ id: merchants.id, name: merchants.name })
        .from(merchants)
        .where(
          and(eq(merchants.isActive, true), ilike(merchants.name, `%${q}%`)),
        )
        .orderBy(asc(merchants.name))
        .limit(MAX_PER_KIND),
      db
        .select({
          id: offers.id,
          title: offers.title,
          merchantName: merchants.name,
        })
        .from(offers)
        .leftJoin(merchants, eq(merchants.id, offers.merchantId))
        .where(
          and(
            eq(offers.status, "published"),
            gte(offers.endDate, todayStr),
            sql`(lower(${offers.title}) like ${term} or lower(${offers.description}) like ${term})`,
          ),
        )
        .orderBy(desc(offers.publishedAt))
        .limit(MAX_PER_KIND),
    ]);

    const hits: SearchHit[] = [
      ...offerRows.map(
        (o): SearchHit => ({
          kind: "offer",
          id: o.id,
          title: o.title,
          merchant: o.merchantName ?? undefined,
        }),
      ),
      ...merchantRows.map(
        (m): SearchHit => ({ kind: "merchant", id: m.id, name: m.name }),
      ),
      ...bankRows.map(
        (b): SearchHit => ({
          kind: "bank",
          id: b.id,
          name: b.name,
          slug: b.slug,
        }),
      ),
      ...categoryRows.map(
        (c): SearchHit => ({
          kind: "category",
          id: c.id,
          name: c.name,
          slug: c.slug,
        }),
      ),
    ];

    return Response.json({ q, hits } satisfies SearchResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    log.error("search_failed", { err, q });
    return Response.json({ q, hits: [] } satisfies SearchResponse, {
      status: 500,
    });
  }
}
