import { describe, expect, it } from "vitest";
import { offerInputSchema } from "@/lib/validation/offer";

const UUID = "11111111-1111-4111-8111-111111111111";

const VALID = {
  title: "20% off dining at Cinnamon",
  description: "Save 20% on the dinner buffet for cardholders.",
  imageUrl: null,
  merchantId: UUID,
  newMerchantName: null,
  categoryId: UUID,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  sourceUrl: "https://example.lk/offer",
  locationScope: null,
  bankIds: [UUID],
  cardTypeIds: [UUID],
};

describe("offerInputSchema", () => {
  it("accepts a complete valid input", () => {
    const r = offerInputSchema.safeParse(VALID);
    expect(r.success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    const r = offerInputSchema.safeParse({ ...VALID, title: "ab" });
    expect(r.success).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    const r = offerInputSchema.safeParse({
      ...VALID,
      startDate: "2026-12-31",
      endDate: "2026-01-01",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("endDate");
    }
  });

  it("rejects passing both merchantId and newMerchantName", () => {
    const r = offerInputSchema.safeParse({
      ...VALID,
      newMerchantName: "New Place",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a brand-new merchant (no merchantId)", () => {
    const r = offerInputSchema.safeParse({
      ...VALID,
      merchantId: null,
      newMerchantName: "Fresh Cafe",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty bankIds", () => {
    const r = offerInputSchema.safeParse({ ...VALID, bankIds: [] });
    expect(r.success).toBe(false);
  });

  it("rejects empty cardTypeIds", () => {
    const r = offerInputSchema.safeParse({ ...VALID, cardTypeIds: [] });
    expect(r.success).toBe(false);
  });

  it("rejects malformed dates", () => {
    const r = offerInputSchema.safeParse({
      ...VALID,
      startDate: "2026/01/01",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-URL sourceUrl", () => {
    const r = offerInputSchema.safeParse({ ...VALID, sourceUrl: "not-a-url" });
    expect(r.success).toBe(false);
  });
});
