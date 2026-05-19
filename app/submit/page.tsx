import { requireSession } from "@/lib/rbac";
import { SubmitForm } from "./submit-form";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const session = await requireSession();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <div className="section-label">Contribute</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Submit an offer
        </h1>
        <p className="max-w-prose text-xs text-muted-foreground">
          Your submission will enter the maintainer queue for review. Approved
          offers go live on the public catalog.
        </p>
      </header>
      <SubmitForm userId={session.user.id} />
    </div>
  );
}
