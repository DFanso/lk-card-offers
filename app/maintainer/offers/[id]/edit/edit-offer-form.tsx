"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/forms/offer-form";
import { updateOffer } from "@/lib/actions/offers";
import type { OfferInput } from "@/lib/validation/offer";

export function EditOfferForm({
  offerId,
  initial,
}: {
  offerId: string;
  initial: OfferInput;
}) {
  const router = useRouter();
  return (
    <OfferForm
      initial={initial}
      submitLabel="Save changes"
      onSubmit={async (values) => {
        const result = await updateOffer(offerId, values);
        if (result.ok) {
          router.push(`/offers/${offerId}`);
          return { ok: true };
        }
        return { ok: false, error: result.error };
      }}
    />
  );
}
