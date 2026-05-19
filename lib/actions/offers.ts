"use server";

import { revalidatePath } from "next/cache";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  offerBanks,
  offerCardTypes,
  offers,
  type OfferStatusValue,
} from "@/db/schema";
import { offerInputSchema, type OfferInput } from "@/lib/validation/offer";
import { requireRole } from "@/lib/rbac";
import { resolveMerchantId } from "@/lib/actions/merchants-resolve";
import { log } from "@/lib/log";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

function zodFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map((p) => String(p)).join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

async function setOfferLinks(
  offerId: string,
  bankIds: string[],
  cardTypeIds: string[],
) {
  await db.delete(offerBanks).where(eq(offerBanks.offerId, offerId));
  await db.delete(offerCardTypes).where(eq(offerCardTypes.offerId, offerId));
  if (bankIds.length) {
    await db
      .insert(offerBanks)
      .values(bankIds.map((bankId) => ({ offerId, bankId })));
  }
  if (cardTypeIds.length) {
    await db
      .insert(offerCardTypes)
      .values(cardTypeIds.map((cardTypeId) => ({ offerId, cardTypeId })));
  }
}

export async function createOffer(
  input: OfferInput,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireRole("maintainer");
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = offerInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;
  const status: OfferStatusValue =
    new Date(data.endDate) < new Date() ? "expired" : "published";

  try {
    const merchantId = await resolveMerchantId({
      merchantId: data.merchantId,
      newMerchantName: data.newMerchantName,
    });

    const inserted = await db
      .insert(offers)
      .values({
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl ?? null,
        merchantId,
        categoryId: data.categoryId,
        startDate: data.startDate,
        endDate: data.endDate,
        sourceUrl: data.sourceUrl,
        locationScope: data.locationScope ?? null,
        scheduleJson: (data.scheduleJson as object | undefined) ?? null,
        status,
        createdByUserId: session.user.id,
        publishedByMaintainerId: status === "published" ? session.user.id : null,
        publishedAt: status === "published" ? new Date() : null,
      })
      .returning({ id: offers.id });

    const offerId = inserted[0].id;
    await setOfferLinks(offerId, data.bankIds, data.cardTypeIds);

    log.info("offer_created", { offerId, userId: session.user.id, status });
    revalidatePath("/");
    revalidatePath("/offers");
    revalidatePath("/maintainer");
    return { ok: true, data: { id: offerId } };
  } catch (err) {
    log.error("offer_create_failed", { err, userId: session.user.id });
    return { ok: false, error: "Could not create offer. Please try again." };
  }
}

export async function updateOffer(
  offerId: string,
  input: OfferInput,
): Promise<ActionResult> {
  try {
    await requireRole("maintainer");
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = offerInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }
  const data = parsed.data;

  const status: OfferStatusValue =
    new Date(data.endDate) < new Date() ? "expired" : "published";

  const merchantId = await resolveMerchantId({
    merchantId: data.merchantId,
    newMerchantName: data.newMerchantName,
  });

  await db
    .update(offers)
    .set({
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl ?? null,
      merchantId,
      categoryId: data.categoryId,
      startDate: data.startDate,
      endDate: data.endDate,
      sourceUrl: data.sourceUrl,
      locationScope: data.locationScope ?? null,
      scheduleJson: (data.scheduleJson as object | undefined) ?? null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(offers.id, offerId));

  await setOfferLinks(offerId, data.bankIds, data.cardTypeIds);

  revalidatePath("/");
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  revalidatePath("/maintainer");
  return { ok: true };
}

export async function deleteOffer(offerId: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  await db.delete(offers).where(eq(offers.id, offerId));
  revalidatePath("/");
  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  return { ok: true };
}

export async function expireDueOffers(): Promise<{ updated: number }> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const updated = await db
    .update(offers)
    .set({ status: "expired", updatedAt: today })
    .where(
      and(eq(offers.status, "published"), lt(offers.endDate, todayStr)),
    )
    .returning({ id: offers.id });
  return { updated: updated.length };
}

export async function getOffersCount(filter?: {
  status?: OfferStatusValue;
}): Promise<number> {
  const where = filter?.status ? eq(offers.status, filter.status) : undefined;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers)
    .where(where);
  return rows[0]?.count ?? 0;
}
