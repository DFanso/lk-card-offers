import { requireRole } from "@/lib/rbac";
import { NewOfferForm } from "./new-offer-form";

export const dynamic = "force-dynamic";

export default async function NewOfferPage() {
  await requireRole("maintainer");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-base font-semibold">New offer</h1>
        <p className="text-xs text-muted-foreground">
          Direct publish — no review needed.
        </p>
      </header>
      <NewOfferForm />
    </div>
  );
}
