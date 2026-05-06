import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const offerInputSchema = z
  .object({
    title: z.string().min(3).max(160),
    description: z.string().min(10).max(4000),
    imageUrl: z.string().url().optional().nullable(),
    merchantId: z.string().uuid().optional().nullable(),
    newMerchantName: z.string().min(2).max(160).optional().nullable(),
    categoryId: z.string().uuid(),
    startDate: dateString,
    endDate: dateString,
    sourceUrl: z.string().url(),
    locationScope: z.string().max(120).optional().nullable(),
    scheduleJson: z.unknown().optional(),
    bankIds: z.array(z.string().uuid()).min(1),
    cardTypeIds: z.array(z.string().uuid()).min(1),
  })
  .refine(
    (v) => Boolean(v.merchantId) !== Boolean(v.newMerchantName?.trim()),
    {
      message: "Pick an existing merchant or enter a new merchant name (one).",
      path: ["merchantId"],
    },
  )
  .refine(
    (v) => new Date(v.startDate) <= new Date(v.endDate),
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  );

export type OfferInput = z.infer<typeof offerInputSchema>;

export const submissionInputSchema = offerInputSchema;
export type SubmissionInput = z.infer<typeof submissionInputSchema>;

export const reviewSchema = z.object({
  submissionId: z.string().uuid(),
  note: z.string().max(500).optional(),
});
