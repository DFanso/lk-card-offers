import { requireSession } from "@/lib/rbac";
import { SubmitForm } from "./submit-form";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-base font-semibold">Submit an offer</h1>
        <p className="text-xs text-muted-foreground">
          Your submission will enter the maintainer queue for review.
        </p>
      </header>
      <SubmitForm />
    </div>
  );
}
