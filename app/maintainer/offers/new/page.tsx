import { requireRole } from "@/lib/rbac";
import { NewOfferForm } from "./new-offer-form";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  await requireRole("maintainer");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <div className="section-label">Maintainer / New offer</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Publish an offer
        </h1>
        <p className="max-w-xl text-xs text-muted-foreground">
          Direct publish — your submission goes live immediately.
        </p>
      </header>
      <NewOfferForm />
    </div>
  );
}
