"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/forms/offer-form";
import { submitOffer } from "@/lib/actions/submissions";

export function SubmitForm() {
  const router = useRouter();
  return (
    <OfferForm
      submitLabel="Submit for review"
      onSubmit={async (values) => {
        const result = await submitOffer(values);
        if (result.ok) {
          router.push("/account");
          return { ok: true };
        }
        return { ok: false, error: result.error };
      }}
    />
  );
}
