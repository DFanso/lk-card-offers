import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintainerRequests, offerSubmissions } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { RequestMaintainerForm } from "./request-maintainer-form";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireSession();
  const [submissions, requests] = await Promise.all([
    db
      .select()
      .from(offerSubmissions)
      .where(eq(offerSubmissions.submittedByUserId, session.user.id))
      .orderBy(desc(offerSubmissions.createdAt)),
    db
      .select()
      .from(maintainerRequests)
      .where(eq(maintainerRequests.userId, session.user.id))
      .orderBy(desc(maintainerRequests.createdAt)),
  ]);

  const pendingRequest = requests.find((r) => r.status === "pending");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-base font-semibold">Account</h1>
        <p className="text-xs text-muted-foreground">
          Signed in as {session.user.email} ·{" "}
          <span className="font-medium">{session.user.role}</span>
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Become a maintainer</h2>
        {session.user.role !== "user" ? (
          <p className="text-xs text-muted-foreground">
            You already have elevated access.
          </p>
        ) : pendingRequest ? (
          <p className="text-xs text-muted-foreground">
            Your request is pending review.
          </p>
        ) : (
          <RequestMaintainerForm />
        )}
        {requests.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {r.status}
                </Badge>
                <span>
                  {new Date(r.createdAt).toLocaleString()} {r.note ? `– ${r.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">My submissions</h2>
        {submissions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            You have not submitted any offers yet.
          </p>
        ) : (
          <ul className="space-y-1 text-xs">
            {submissions.map((s) => {
              const payload = s.payload as { title?: string };
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded border px-2 py-1.5"
                >
                  <span className="truncate">{payload.title ?? "Untitled"}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {s.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
