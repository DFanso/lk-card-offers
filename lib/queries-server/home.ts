import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banks,
  categories,
  merchants,
  offerBanks,
  offers,
} from "@/db/schema";

export type CategoryCount = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type BankCount = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export type HomeStats = {
  liveOffers: number;
  banks: number;
  categories: number;
  merchants: number;
};

export async function getHomeStats(): Promise<HomeStats> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [live, b, c, m] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(offers)
      .where(and(eq(offers.status, "published"), gte(offers.endDate, todayStr))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(banks)
      .where(eq(banks.isActive, true)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.isActive, true)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(merchants)
      .where(eq(merchants.isActive, true)),
  ]);
  return {
    liveOffers: live[0]?.count ?? 0,
    banks: b[0]?.count ?? 0,
    categories: c[0]?.count ?? 0,
    merchants: m[0]?.count ?? 0,
  };
}

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      count: sql<number>`count(${offers.id})::int`,
    })
    .from(categories)
    .leftJoin(
      offers,
      and(
        eq(offers.categoryId, categories.id),
        eq(offers.status, "published"),
        gte(offers.endDate, todayStr),
      ),
    )
    .where(eq(categories.isActive, true))
    .groupBy(categories.id, categories.name, categories.slug);
  return rows.sort((a, b) => b.count - a.count);
}

export async function getBankCounts(): Promise<BankCount[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: banks.id,
      name: banks.name,
      slug: banks.slug,
      count: sql<number>`count(distinct ${offerBanks.offerId})::int`,
    })
    .from(banks)
    .leftJoin(offerBanks, eq(offerBanks.bankId, banks.id))
    .leftJoin(
      offers,
      and(
        eq(offers.id, offerBanks.offerId),
        eq(offers.status, "published"),
        gte(offers.endDate, todayStr),
      ),
    )
    .where(eq(banks.isActive, true))
    .groupBy(banks.id, banks.name, banks.slug);
  return rows.sort((a, b) => b.count - a.count);
}
