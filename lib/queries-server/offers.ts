import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banks,
  cardTypes,
  categories,
  merchants,
  offerBanks,
  offerCardTypes,
  offers,
  type OfferStatusValue,
} from "@/db/schema";

export type PublicOfferListItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  status: OfferStatusValue;
  sourceUrl: string;
  merchant: { id: string; name: string } | null;
  category: { id: string; name: string; slug: string } | null;
  banks: { id: string; name: string; slug: string }[];
  cardTypes: { id: string; name: string; kind: string }[];
};

type ListOptions = {
  bankIds?: string[];
  cardTypeIds?: string[];
  categoryId?: string;
  q?: string;
  status?: OfferStatusValue;
  includeExpired?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "latest" | "ending_soon";
  endsBefore?: string;
  publishedByMaintainerId?: string;
};

export async function listOffers(opts: ListOptions = {}): Promise<{
  items: PublicOfferListItem[];
  total: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const todayStr = new Date().toISOString().slice(0, 10);

  const baseConditions = [];
  if (opts.status) {
    baseConditions.push(eq(offers.status, opts.status));
  } else if (!opts.includeExpired) {
    baseConditions.push(eq(offers.status, "published"));
    baseConditions.push(gte(offers.endDate, todayStr));
  }
  if (opts.categoryId) {
    baseConditions.push(eq(offers.categoryId, opts.categoryId));
  }
  if (opts.endsBefore) {
    baseConditions.push(lte(offers.endDate, opts.endsBefore));
  }
  if (opts.publishedByMaintainerId) {
    baseConditions.push(
      eq(offers.publishedByMaintainerId, opts.publishedByMaintainerId),
    );
  }
  if (opts.q && opts.q.trim()) {
    const term = `%${opts.q.trim().toLowerCase()}%`;
    baseConditions.push(
      or(
        like(sql`lower(${offers.title})`, term),
        like(sql`lower(${offers.description})`, term),
      )!,
    );
  }

  const matchedOfferIds = (async () => {
    if (!opts.bankIds?.length && !opts.cardTypeIds?.length) return null;
    const candidateConditions = [];
    if (opts.bankIds?.length) {
      const rows = await db
        .selectDistinct({ offerId: offerBanks.offerId })
        .from(offerBanks)
        .where(inArray(offerBanks.bankId, opts.bankIds));
      const ids = rows.map((r) => r.offerId);
      if (!ids.length) return [] as string[];
      candidateConditions.push(ids);
    }
    if (opts.cardTypeIds?.length) {
      const rows = await db
        .selectDistinct({ offerId: offerCardTypes.offerId })
        .from(offerCardTypes)
        .where(inArray(offerCardTypes.cardTypeId, opts.cardTypeIds));
      const ids = rows.map((r) => r.offerId);
      if (!ids.length) return [] as string[];
      candidateConditions.push(ids);
    }
    return candidateConditions.reduce((acc, ids) =>
      acc.filter((id) => ids.includes(id)),
    );
  })();

  const idFilter = await matchedOfferIds;
  if (idFilter && idFilter.length === 0) {
    return { items: [], total: 0 };
  }
  if (idFilter) {
    baseConditions.push(inArray(offers.id, idFilter));
  }

  const where = baseConditions.length ? and(...baseConditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers)
    .where(where);

  const rows = await db
    .select({
      id: offers.id,
      title: offers.title,
      description: offers.description,
      imageUrl: offers.imageUrl,
      startDate: offers.startDate,
      endDate: offers.endDate,
      status: offers.status,
      sourceUrl: offers.sourceUrl,
      merchantId: offers.merchantId,
      merchantName: merchants.name,
      categoryId: offers.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .leftJoin(merchants, eq(merchants.id, offers.merchantId))
    .leftJoin(categories, eq(categories.id, offers.categoryId))
    .where(where)
    .orderBy(
      ...(opts.sort === "ending_soon"
        ? [asc(offers.endDate), desc(offers.publishedAt)]
        : [desc(offers.publishedAt), desc(offers.createdAt)]),
    )
    .limit(pageSize)
    .offset(offset);

  if (!rows.length) return { items: [], total: count };

  const offerIds = rows.map((r) => r.id);
  const bankRows = await db
    .select({
      offerId: offerBanks.offerId,
      id: banks.id,
      name: banks.name,
      slug: banks.slug,
    })
    .from(offerBanks)
    .innerJoin(banks, eq(banks.id, offerBanks.bankId))
    .where(inArray(offerBanks.offerId, offerIds))
    .orderBy(asc(banks.name));
  const cardTypeRows = await db
    .select({
      offerId: offerCardTypes.offerId,
      id: cardTypes.id,
      name: cardTypes.name,
      kind: cardTypes.kind,
    })
    .from(offerCardTypes)
    .innerJoin(cardTypes, eq(cardTypes.id, offerCardTypes.cardTypeId))
    .where(inArray(offerCardTypes.offerId, offerIds))
    .orderBy(asc(cardTypes.name));

  const banksByOffer = new Map<string, PublicOfferListItem["banks"]>();
  for (const b of bankRows) {
    const arr = banksByOffer.get(b.offerId) ?? [];
    arr.push({ id: b.id, name: b.name, slug: b.slug });
    banksByOffer.set(b.offerId, arr);
  }
  const ctsByOffer = new Map<string, PublicOfferListItem["cardTypes"]>();
  for (const c of cardTypeRows) {
    const arr = ctsByOffer.get(c.offerId) ?? [];
    arr.push({ id: c.id, name: c.name, kind: c.kind });
    ctsByOffer.set(c.offerId, arr);
  }

  const items: PublicOfferListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    sourceUrl: r.sourceUrl,
    merchant: r.merchantId
      ? { id: r.merchantId, name: r.merchantName ?? "" }
      : null,
    category:
      r.categoryId && r.categoryName && r.categorySlug
        ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug }
        : null,
    banks: banksByOffer.get(r.id) ?? [],
    cardTypes: ctsByOffer.get(r.id) ?? [],
  }));

  return { items, total: count };
}

export async function getOfferById(
  id: string,
): Promise<PublicOfferListItem | null> {
  const rows = await db
    .select({
      id: offers.id,
      title: offers.title,
      description: offers.description,
      imageUrl: offers.imageUrl,
      startDate: offers.startDate,
      endDate: offers.endDate,
      status: offers.status,
      sourceUrl: offers.sourceUrl,
      merchantId: offers.merchantId,
      merchantName: merchants.name,
      categoryId: offers.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(offers)
    .leftJoin(merchants, eq(merchants.id, offers.merchantId))
    .leftJoin(categories, eq(categories.id, offers.categoryId))
    .where(eq(offers.id, id))
    .limit(1);

  const r = rows[0];
  if (!r) return null;

  const bankRows = await db
    .select({
      id: banks.id,
      name: banks.name,
      slug: banks.slug,
    })
    .from(offerBanks)
    .innerJoin(banks, eq(banks.id, offerBanks.bankId))
    .where(eq(offerBanks.offerId, id))
    .orderBy(asc(banks.name));
  const ctRows = await db
    .select({
      id: cardTypes.id,
      name: cardTypes.name,
      kind: cardTypes.kind,
    })
    .from(offerCardTypes)
    .innerJoin(cardTypes, eq(cardTypes.id, offerCardTypes.cardTypeId))
    .where(eq(offerCardTypes.offerId, id))
    .orderBy(asc(cardTypes.name));

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    sourceUrl: r.sourceUrl,
    merchant: r.merchantId
      ? { id: r.merchantId, name: r.merchantName ?? "" }
      : null,
    category:
      r.categoryId && r.categoryName && r.categorySlug
        ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug }
        : null,
    banks: bankRows,
    cardTypes: ctRows,
  };
}
