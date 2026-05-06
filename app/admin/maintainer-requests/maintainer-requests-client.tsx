"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

  function decide(action: "approve" | "reject", id: string) {
    setError(null);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveMaintainerRequest(id, note || undefined)
          : await rejectMaintainerRequest(id, note || undefined);
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
    return <p className="text-xs text-muted-foreground">No requests yet.</p>;
  }

  return (
    <ul className="space-y-3 text-xs">
      {initial.map((r) => {
        const isOpen = openId === r.id;
        return (
          <li key={r.id} className="rounded border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.userName ?? "—"}</p>
                <p className="text-muted-foreground">{r.userEmail}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {r.status}
              </Badge>
            </div>
            {r.note && (
              <p className="mt-2 text-muted-foreground">Note: {r.note}</p>
            )}
            {r.status === "pending" && (
              isOpen ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Optional note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  {error && <p className="text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={pending}
                      onClick={() => decide("approve", r.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={pending}
                      onClick={() => decide("reject", r.id)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setOpenId(null);
                        setNote("");
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>
                    Review
                  </Button>
                </div>
              )
            )}
          </li>
        );
      })}
    </ul>
  );
}
