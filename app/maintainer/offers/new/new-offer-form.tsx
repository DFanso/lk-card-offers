"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/forms/offer-form";
import { createOffer } from "@/lib/actions/offers";

export function NewOfferForm() {
  const router = useRouter();
  return (
    <OfferForm
      submitLabel="Publish offer"
      onSubmit={async (values) => {
        const result = await createOffer(values);
        if (result.ok) {
          router.push("/maintainer");
          return { ok: true };
        }
        return { ok: false, error: result.error };
      }}
    />
  );
}
