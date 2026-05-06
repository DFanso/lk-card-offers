import { z } from "zod";

export const bankInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  logoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const cardTypeInputSchema = z.object({
  name: z.string().min(2).max(80),
  kind: z.enum(["credit", "debit", "other"]),
  isActive: z.boolean().optional(),
});

export const merchantInputSchema = z.object({
  name: z.string().min(2).max(160),
  logoUrl: z.string().url().optional().nullable(),
  contact: z.string().max(160).optional().nullable(),
  locationSummary: z.string().max(240).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});
