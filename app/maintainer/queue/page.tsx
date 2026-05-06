import { requireRole } from "@/lib/rbac";
import { QueueClient } from "./queue-client";

export const dynamic = "force-dynamic";

export default async function MaintainerQueuePage() {
  await requireRole("maintainer");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">Maintainer / Queue</div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Submission queue
        </h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Approve to publish or reject with a reason. Approving auto-creates
          any new merchant the submitter referenced.
        </p>
      </header>
      <QueueClient />
    </div>
  );
}
