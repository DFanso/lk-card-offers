"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveMaintainerRequest,
  rejectMaintainerRequest,
} from "@/lib/actions/users";

export type RequestRow = {
  id: string;
  status: string;
  createdAt: Date | string;
  reviewedAt: Date | string | null;
  note: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
};

export function MaintainerRequestsClient({
  initial,
}: {
  initial: RequestRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = initial.find((r) => r.id === openId) ?? null;

  function decide(action: "approve" | "reject") {
    if (!openId) return;
    setError(null);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveMaintainerRequest(openId, note || undefined)
          : await rejectMaintainerRequest(openId, note || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpenId(null);
      setNote("");
      router.refresh();
    });
  }

  if (initial.length === 0) {
    return (
      <div className="border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
        No requests yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {initial.map((r) => (
          <article
            key={r.id}
            className="border border-border bg-card p-4 transition-colors hover:border-foreground/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{r.userName ?? "—"}</p>
                <p className="text-[11px] text-muted-foreground">{r.userEmail}</p>
              </div>
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
            </div>
            {r.note && (
              <p className="mt-3 border-l-2 border-border pl-3 text-[11px] italic text-muted-foreground">
                {r.note}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="num">
                Submitted {new Date(r.createdAt).toLocaleDateString()}
              </span>
              {r.status === "pending" && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setOpenId(r.id);
                    setNote("");
                    setError(null);
                  }}
                >
                  Review
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review request</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3">
              <div className="text-xs">
                <p className="font-medium">{open.userName}</p>
                <p className="text-muted-foreground">{open.userEmail}</p>
              </div>
              {open.note && (
                <p className="border-l-2 border-border pl-3 text-[11px] italic text-muted-foreground">
                  {open.note}
                </p>
              )}
              <Textarea
                rows={3}
                placeholder="Optional note for the requester"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && <p className="text-[11px] text-destructive">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => decide("reject")}
            >
              Reject
            </Button>
            <Button disabled={pending} onClick={() => decide("approve")}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
