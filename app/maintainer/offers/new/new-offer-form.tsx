"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/forms/offer-form";
import { createOffer } from "@/lib/actions/offers";

export function NewOfferForm({ userId }: { userId: string }) {
  const router = useRouter();
  return (
    <OfferForm
      submitLabel="Publish offer"
      draftKey={`form:offer:new:${userId}`}
      onSubmit={async (values) => {
        const result = await createOffer(values);
        if (result.ok) {
          router.push("/maintainer");
          return { ok: true };
        }
        return {
          ok: false,
          error: result.error,
          fieldErrors: result.fieldErrors,
        };
      }}
    />
  );
}
