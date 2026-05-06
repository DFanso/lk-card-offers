"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  offerBanks,
  offerCardTypes,
  offerSubmissions,
  offers,
  type OfferStatusValue,
} from "@/db/schema";
import { submissionInputSchema, type SubmissionInput } from "@/lib/validation/offer";
import { requireRole, requireSession } from "@/lib/rbac";
import { resolveMerchantId } from "@/lib/actions/merchants-resolve";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function submitOffer(
  input: SubmissionInput,
): Promise<ActionResult<{ id: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const parsed = submissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const inserted = await db
    .insert(offerSubmissions)
    .values({
      submittedByUserId: session.user.id,
      payload: parsed.data,
      status: "pending_review",
    })
    .returning({ id: offerSubmissions.id });

  revalidatePath("/account");
  revalidatePath("/maintainer/queue");
  return { ok: true, data: { id: inserted[0].id } };
}

export async function approveSubmission(
  submissionId: string,
  note?: string,
): Promise<ActionResult<{ offerId: string }>> {
  let session;
  try {
    session = await requireRole("maintainer");
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const found = await db
    .select()
    .from(offerSubmissions)
    .where(eq(offerSubmissions.id, submissionId))
    .limit(1);

  const submission = found[0];
  if (!submission) return { ok: false, error: "Submission not found" };
  if (submission.status !== "pending_review") {
    return { ok: false, error: "Submission already reviewed" };
  }

  const payloadParsed = submissionInputSchema.safeParse(submission.payload);
  if (!payloadParsed.success) {
    return { ok: false, error: "Submission payload invalid" };
  }
  const data = payloadParsed.data;

  const status: OfferStatusValue =
    new Date(data.endDate) < new Date() ? "expired" : "published";

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
      createdByUserId: submission.submittedByUserId,
      publishedByMaintainerId: status === "published" ? session.user.id : null,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning({ id: offers.id });

  const offerId = inserted[0].id;
  if (data.bankIds.length) {
    await db
      .insert(offerBanks)
      .values(data.bankIds.map((bankId) => ({ offerId, bankId })));
  }
  if (data.cardTypeIds.length) {
    await db
      .insert(offerCardTypes)
      .values(
        data.cardTypeIds.map((cardTypeId) => ({ offerId, cardTypeId })),
      );
  }

  await db
    .update(offerSubmissions)
    .set({
      status: "approved",
      approvedByMaintainerId: session.user.id,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
      resultingOfferId: offerId,
    })
    .where(eq(offerSubmissions.id, submissionId));

  revalidatePath("/maintainer/queue");
  revalidatePath("/offers");
  return { ok: true, data: { offerId } };
}

export async function rejectSubmission(
  submissionId: string,
  note?: string,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("maintainer");
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  await db
    .update(offerSubmissions)
    .set({
      status: "rejected",
      approvedByMaintainerId: session.user.id,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
    })
    .where(eq(offerSubmissions.id, submissionId));

  revalidatePath("/maintainer/queue");
  return { ok: true };
}
