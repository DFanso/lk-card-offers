"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  banks,
  cardTypes,
  categories,
  merchants,
  offerBanks,
  offerCardTypes,
  offers,
} from "@/db/schema";
import {
  bankInputSchema,
  cardTypeInputSchema,
  categoryInputSchema,
  merchantInputSchema,
} from "@/lib/validation/master";
import { requireRole } from "@/lib/rbac";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function isUsedByActiveOffer(
  predicate: "bank" | "cardType" | "merchant" | "category",
  id: string,
): Promise<boolean> {
  if (predicate === "bank") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(offerBanks)
      .innerJoin(offers, eq(offers.id, offerBanks.offerId))
      .where(
        and(eq(offerBanks.bankId, id), eq(offers.status, "published")),
      );
    return (rows[0]?.count ?? 0) > 0;
  }
  if (predicate === "cardType") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(offerCardTypes)
      .innerJoin(offers, eq(offers.id, offerCardTypes.offerId))
      .where(
        and(eq(offerCardTypes.cardTypeId, id), eq(offers.status, "published")),
      );
    return (rows[0]?.count ?? 0) > 0;
  }
  if (predicate === "merchant") {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(offers)
      .where(and(eq(offers.merchantId, id), eq(offers.status, "published")));
    return (rows[0]?.count ?? 0) > 0;
  }
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(offers)
    .where(and(eq(offers.categoryId, id), eq(offers.status, "published")));
  return (rows[0]?.count ?? 0) > 0;
}

// Banks
export async function createBank(input: unknown): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = bankInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db
    .insert(banks)
    .values({ ...parsed.data, logoUrl: parsed.data.logoUrl ?? null });
  revalidatePath("/admin/banks");
  return { ok: true };
}

export async function updateBank(id: string, input: unknown): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = bankInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db
    .update(banks)
    .set({ ...parsed.data, logoUrl: parsed.data.logoUrl ?? null })
    .where(eq(banks.id, id));
  revalidatePath("/admin/banks");
  return { ok: true };
}

export async function deleteBank(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (await isUsedByActiveOffer("bank", id)) {
    await db.update(banks).set({ isActive: false }).where(eq(banks.id, id));
    revalidatePath("/admin/banks");
    return { ok: true, data: undefined };
  }
  await db.delete(banks).where(eq(banks.id, id));
  revalidatePath("/admin/banks");
  return { ok: true };
}

// Card types
export async function createCardType(input: unknown): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = cardTypeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db.insert(cardTypes).values(parsed.data);
  revalidatePath("/admin/card-types");
  return { ok: true };
}

export async function updateCardType(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = cardTypeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db.update(cardTypes).set(parsed.data).where(eq(cardTypes.id, id));
  revalidatePath("/admin/card-types");
  return { ok: true };
}

export async function deleteCardType(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (await isUsedByActiveOffer("cardType", id)) {
    await db
      .update(cardTypes)
      .set({ isActive: false })
      .where(eq(cardTypes.id, id));
    revalidatePath("/admin/card-types");
    return { ok: true };
  }
  await db.delete(cardTypes).where(eq(cardTypes.id, id));
  revalidatePath("/admin/card-types");
  return { ok: true };
}

// Merchants
export async function createMerchant(input: unknown): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = merchantInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db.insert(merchants).values({
    ...parsed.data,
    logoUrl: parsed.data.logoUrl ?? null,
    contact: parsed.data.contact ?? null,
    locationSummary: parsed.data.locationSummary ?? null,
  });
  revalidatePath("/admin/merchants");
  return { ok: true };
}

export async function updateMerchant(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = merchantInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db
    .update(merchants)
    .set({
      ...parsed.data,
      logoUrl: parsed.data.logoUrl ?? null,
      contact: parsed.data.contact ?? null,
      locationSummary: parsed.data.locationSummary ?? null,
    })
    .where(eq(merchants.id, id));
  revalidatePath("/admin/merchants");
  return { ok: true };
}

export async function deleteMerchant(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (await isUsedByActiveOffer("merchant", id)) {
    await db
      .update(merchants)
      .set({ isActive: false })
      .where(eq(merchants.id, id));
    revalidatePath("/admin/merchants");
    return { ok: true };
  }
  await db.delete(merchants).where(eq(merchants.id, id));
  revalidatePath("/admin/merchants");
  return { ok: true };
}

// Categories
export async function createCategory(input: unknown): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await db.insert(categories).values({
    ...parsed.data,
    parentId: parsed.data.parentId ?? null,
  });
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.parentId === id) {
    return { ok: false, error: "Category cannot be its own parent" };
  }
  await db
    .update(categories)
    .set({ ...parsed.data, parentId: parsed.data.parentId ?? null })
    .where(eq(categories.id, id));
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (await isUsedByActiveOffer("category", id)) {
    await db
      .update(categories)
      .set({ isActive: false })
      .where(eq(categories.id, id));
    revalidatePath("/admin/categories");
    return { ok: true };
  }
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/categories");
  return { ok: true };
}
