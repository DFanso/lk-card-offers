"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  approveSubmission,
  rejectSubmission,
} from "@/lib/actions/submissions";
import { useMaintainerQueue } from "@/lib/queries/admin";
import { useBanks, useCardTypes } from "@/lib/queries/master";
import type { OfferInput } from "@/lib/validation/offer";

export function QueueClient() {
  const queue = useMaintainerQueue();
  const banks = useBanks();
  const cardTypes = useCardTypes();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["maintainer-queue"] });
  }

  function bankNames(ids: string[]) {
    return banks.data?.items.filter((b) => ids.includes(b.id)).map((b) => b.name) ?? [];
  }
  function cardTypeNames(ids: string[]) {
    return cardTypes.data?.items.filter((c) => ids.includes(c.id)).map((c) => c.name) ?? [];
  }

  if (queue.isLoading) return <p className="text-xs">Loading…</p>;
  if (queue.error) return <p className="text-xs text-destructive">Failed to load.</p>;
  const items = queue.data?.items ?? [];
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">No pending submissions.</p>;

  function decide(action: "approve" | "reject", id: string) {
    setError(null);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveSubmission(id, note || undefined)
          : await rejectSubmission(id, note || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpenId(null);
      setNote("");
      refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const payload = item.payload as Partial<OfferInput>;
        const isOpen = openId === item.id;
        return (
          <li key={item.id} className="rounded border p-3 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{payload.title ?? "Untitled"}</p>
                <p className="text-muted-foreground">
                  Submitted by {item.submittedByName ?? "—"} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {item.status}
              </Badge>
            </div>
            <p className="mt-2 line-clamp-3 text-muted-foreground">
              {payload.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {bankNames(payload.bankIds ?? []).map((n) => (
                <Badge key={n} variant="secondary" className="text-[10px]">
                  {n}
                </Badge>
              ))}
              {cardTypeNames(payload.cardTypeIds ?? []).map((n) => (
                <Badge key={n} variant="outline" className="text-[10px]">
                  {n}
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2 text-muted-foreground">
              <span>
                Valid {payload.startDate} – {payload.endDate}
              </span>
              {payload.sourceUrl && (
                <a
                  href={payload.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  source ↗
                </a>
              )}
            </div>
            {isOpen ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  rows={2}
                  placeholder="Optional note for the submitter"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <p className="text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => decide("approve", item.id)}
                  >
                    Approve & publish
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={() => decide("reject", item.id)}
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
                <Button size="sm" variant="outline" onClick={() => setOpenId(item.id)}>
                  Review
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
