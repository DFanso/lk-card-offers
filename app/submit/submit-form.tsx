"use client";

import { useRouter } from "next/navigation";
import { OfferForm } from "@/components/forms/offer-form";
import { submitOffer } from "@/lib/actions/submissions";

export function SubmitForm({ userId }: { userId: string }) {
  const router = useRouter();
  return (
    <OfferForm
      submitLabel="Submit for review"
      draftKey={`form:offer:submit:${userId}`}
      onSubmit={async (values) => {
        const result = await submitOffer(values);
        if (result.ok) {
          router.push("/account");
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
