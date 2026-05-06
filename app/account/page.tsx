import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintainerRequests, offerSubmissions, users } from "@/db/schema";
import { requireSession } from "@/lib/rbac";
import { RequestMaintainerForm } from "./request-maintainer-form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireSession();
  const [submissions, requests, currentRow] = await Promise.all([
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
    db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  ]);

  const currentRole = currentRow[0]?.role ?? session.user.role;
  const pendingRequest = requests.find((r) => r.status === "pending");

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="section-label">Account</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {session.user.name}
        </h1>
        <p className="text-xs text-muted-foreground">
          {session.user.email} ·{" "}
          <Badge
            variant="outline"
            className="ml-1 text-[10px] uppercase tracking-wider"
          >
            {currentRole}
          </Badge>
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Become a maintainer</h2>
          <span className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № 01
          </span>
        </div>
        <Separator />
        {currentRole !== "user" ? (
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
          <ul className="space-y-1.5 pt-2 text-xs">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 border border-border bg-card px-3 py-2"
              >
                <Badge
                  variant={
                    r.status === "approved"
                      ? "secondary"
                      : r.status === "rejected"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-[10px] uppercase tracking-wider"
                >
                  {r.status}
                </Badge>
                <span className="text-muted-foreground num">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                {r.note && (
                  <span className="text-muted-foreground italic">
                    — {r.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">My submissions</h2>
          <span className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № 02 · {submissions.length.toString().padStart(2, "0")}
          </span>
        </div>
        <Separator />
        {submissions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            You have not submitted any offers yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {submissions.map((s) => {
              const payload = s.payload as { title?: string };
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between border border-border bg-card px-3 py-2 text-xs"
                >
                  <span className="truncate font-medium">
                    {payload.title ?? "Untitled"}
                  </span>
                  <Badge
                    variant={
                      s.status === "approved"
                        ? "secondary"
                        : s.status === "rejected"
                        ? "destructive"
                        : "outline"
                    }
                    className="ml-3 shrink-0 text-[10px] uppercase tracking-wider"
                  >
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
