"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  approveSubmission,
  rejectSubmission,
} from "@/lib/actions/submissions";
import { useMaintainerQueue, type QueueItem } from "@/lib/queries/admin";
import { useBanks, useCardTypes } from "@/lib/queries/master";
import type { OfferInput } from "@/lib/validation/offer";

function formatDate(d: string) {
  return new Date(d)
    .toLocaleDateString("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

export function QueueClient() {
  const queue = useMaintainerQueue();
  const banks = useBanks();
  const cardTypes = useCardTypes();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const items = queue.data?.items ?? [];
  const open = items.find((i) => i.id === openId) ?? null;
  const openPayload = open ? (open.payload as Partial<OfferInput>) : null;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["maintainer-queue"] });
  }

  function bankNames(ids: string[]) {
    return banks.data?.items.filter((b) => ids.includes(b.id)).map((b) => b.name) ?? [];
  }
  function cardTypeNames(ids: string[]) {
    return cardTypes.data?.items.filter((c) => ids.includes(c.id)).map((c) => c.name) ?? [];
  }

  function decide(action: "approve" | "reject") {
    if (!openId) return;
    setError(null);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveSubmission(openId, note || undefined)
          : await rejectSubmission(openId, note || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpenId(null);
      setNote("");
      refresh();
    });
  }

  if (queue.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (queue.error)
    return (
      <div className="border border-destructive/40 bg-destructive/5 p-4 text-xs text-destructive">
        Failed to load queue.
      </div>
    );
  if (items.length === 0)
    return (
      <div className="border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
        Queue is clear. Nothing pending review.
      </div>
    );

  return (
    <>
      <div className="grid gap-3">
        {items.map((item, i) => (
          <QueueRow
            key={item.id}
            item={item}
            index={i + 1}
            bankNames={bankNames}
            cardTypeNames={cardTypeNames}
            onReview={() => {
              setOpenId(item.id);
              setNote("");
              setError(null);
            }}
          />
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review submission</DialogTitle>
          </DialogHeader>
          {openPayload && (
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium">{openPayload.title}</p>
                <p className="mt-1 text-muted-foreground">
                  {openPayload.description}
                </p>
              </div>
              {openPayload.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={openPayload.imageUrl}
                  alt={openPayload.title ?? ""}
                  className="aspect-[16/9] w-full border border-border object-cover"
                />
              )}
              {openPayload.newMerchantName && !openPayload.merchantId && (
                <div className="border border-dashed border-border bg-muted/30 p-2">
                  <span className="section-label">New merchant requested</span>
                  <p className="mt-1 font-medium">
                    {openPayload.newMerchantName}
                  </p>
                </div>
              )}
              <Textarea
                rows={3}
                placeholder="Optional review note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              {error && (
                <p className="text-[11px] text-destructive">{error}</p>
              )}
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
              Approve & publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function QueueRow({
  item,
  index,
  bankNames,
  cardTypeNames,
  onReview,
}: {
  item: QueueItem;
  index: number;
  bankNames: (ids: string[]) => string[];
  cardTypeNames: (ids: string[]) => string[];
  onReview: () => void;
}) {
  const payload = item.payload as Partial<OfferInput>;
  return (
    <article className="border border-border bg-card transition-colors hover:border-foreground/30">
      <div className="flex flex-col items-stretch gap-0 sm:flex-row">
        {payload.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={payload.imageUrl}
            alt={payload.title ?? ""}
            className="aspect-[16/9] w-full shrink-0 border-b border-border object-cover sm:aspect-[4/3] sm:w-40 sm:border-b-0 sm:border-r"
          />
        ) : (
          <div className="aspect-[16/9] w-full shrink-0 border-b border-border bg-muted/40 sm:aspect-[4/3] sm:w-40 sm:border-b-0 sm:border-r" />
        )}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                № {index.toString().padStart(3, "0")} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </div>
              <h3 className="mt-1 truncate text-sm font-medium">
                {payload.title ?? "Untitled"}
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Submitted by {item.submittedByName ?? "—"}
                {item.submittedByEmail && (
                  <>
                    {" · "}
                    <span>{item.submittedByEmail}</span>
                  </>
                )}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {item.status}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {payload.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {bankNames(payload.bankIds ?? []).map((n) => (
              <Badge key={n} variant="secondary" className="text-[10px]">
                {n.split(" ")[0]}
              </Badge>
            ))}
            {cardTypeNames(payload.cardTypeIds ?? []).map((n) => (
              <Badge key={n} variant="outline" className="text-[10px]">
                {n}
              </Badge>
            ))}
          </div>
          {payload.newMerchantName && !payload.merchantId && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              New merchant:{" "}
              <span className="font-medium text-foreground">
                {payload.newMerchantName}
              </span>
            </p>
          )}
          <div className="mt-auto flex items-end justify-between pt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="num">
              {payload.startDate && formatDate(payload.startDate)} →{" "}
              {payload.endDate && formatDate(payload.endDate)}
            </span>
            <Button size="sm" variant="outline" onClick={onReview}>
              Review →
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
