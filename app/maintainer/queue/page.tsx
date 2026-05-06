import { requireRole } from "@/lib/rbac";
import { QueueClient } from "./queue-client";

export const dynamic = "force-dynamic";

export default async function MaintainerQueuePage() {
  await requireRole("maintainer");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-base font-semibold">Submission queue</h1>
        <p className="text-xs text-muted-foreground">
          Approve to publish or reject with a reason.
        </p>
      </header>
      <QueueClient />
    </div>
  );
}
