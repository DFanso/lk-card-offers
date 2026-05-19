import Link from "next/link";
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
  const pendingSubmissionsCount = submissions.filter(
    (s) => s.status === "pending_review",
  ).length;

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
          <span className="num flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № 02 · {submissions.length.toString().padStart(2, "0")}
            {pendingSubmissionsCount > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider"
              >
                {pendingSubmissionsCount} pending
              </Badge>
            )}
          </span>
        </div>
        <Separator />
        {submissions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            You have not submitted any offers yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {submissions.map((s) => {
              const payload = s.payload as { title?: string };
              return (
                <li
                  key={s.id}
                  className="space-y-2 border border-border bg-card px-3 py-3 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        {payload.title ?? "Untitled"}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground num">
                        Submitted {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        s.status === "approved"
                          ? "secondary"
                          : s.status === "rejected"
                          ? "destructive"
                          : "outline"
                      }
                      className="shrink-0 text-[10px] uppercase tracking-wider"
                    >
                      {s.status}
                    </Badge>
                  </div>
                  {(s.reviewedAt || s.reviewNote || s.resultingOfferId) && (
                    <div className="space-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      {s.reviewedAt && (
                        <p className="num">
                          Reviewed {new Date(s.reviewedAt).toLocaleString()}
                        </p>
                      )}
                      {s.reviewNote && (
                        <p className="italic">“{s.reviewNote}”</p>
                      )}
                      {s.resultingOfferId && s.status === "approved" && (
                        <Link
                          href={`/offers/${s.resultingOfferId}`}
                          className="inline-block text-[10px] uppercase tracking-[0.22em] text-foreground underline-offset-4 hover:underline"
                        >
                          View published offer →
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
