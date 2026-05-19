"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteOffer } from "@/lib/actions/offers";
import type { PublicOfferListItem } from "@/lib/queries-server/offers";

function shortDate(d: string) {
  return new Date(d)
    .toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "2-digit" })
    .toUpperCase();
}

function statusVariant(status: string) {
  if (status === "published") return "secondary" as const;
  if (status === "expired") return "outline" as const;
  if (status === "rejected") return "destructive" as const;
  return "outline" as const;
}

export function OffersClient({
  items,
  total,
  offset,
  pageSize,
}: {
  items: PublicOfferListItem[];
  total: number;
  offset: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOffer, setConfirmOffer] = useState<PublicOfferListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirmOffer) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteOffer(confirmOffer.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOffer(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Showing{" "}
        <span className="num text-foreground">
          {(offset + 1).toString().padStart(3, "0")}–
          {Math.min(offset + pageSize, total).toString().padStart(3, "0")}
        </span>{" "}
        of <span className="num text-foreground">{total}</span>
      </div>

      <div className="hidden border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-[10px] uppercase tracking-[0.18em]"></TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Title</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Merchant</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Banks</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Valid</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-[0.18em]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell>
                  {offer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={offer.imageUrl}
                      alt=""
                      className="h-8 w-12 border border-border object-cover"
                    />
                  ) : (
                    <div className="h-8 w-12 border border-dashed border-border bg-muted/40" />
                  )}
                </TableCell>
                <TableCell className="max-w-[280px]">
                  <Link
                    href={`/offers/${offer.id}`}
                    target="_blank"
                    className="block truncate font-medium hover:underline"
                  >
                    {offer.title}
                  </Link>
                  {offer.category && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {offer.category.name}
                    </p>
                  )}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                  {offer.merchant?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[180px] flex-wrap gap-1">
                    {offer.banks.slice(0, 2).map((b) => (
                      <Badge
                        key={b.id}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {b.name.split(" ")[0]}
                      </Badge>
                    ))}
                    {offer.banks.length > 2 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{offer.banks.length - 2}
                      </Badge>
                    )}
                    {offer.banks.length === 0 && (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariant(offer.status)}
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {offer.status}
                  </Badge>
                </TableCell>
                <TableCell className="num text-[10px] uppercase tracking-wider text-muted-foreground">
                  {shortDate(offer.startDate)} → {shortDate(offer.endDate)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/maintainer/offers/${offer.id}/edit`}>
                    <Button size="xs" variant="ghost">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setError(null);
                      setConfirmOffer(offer);
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No offers match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {items.length === 0 ? (
          <p className="border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            No offers match.
          </p>
        ) : (
          items.map((offer) => (
            <article
              key={offer.id}
              className="flex gap-3 border border-border bg-card p-3 text-xs"
            >
              {offer.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={offer.imageUrl}
                  alt=""
                  className="h-16 w-20 shrink-0 border border-border object-cover"
                />
              ) : (
                <div className="h-16 w-20 shrink-0 border border-dashed border-border bg-muted/40" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/offers/${offer.id}`}
                    target="_blank"
                    className="block truncate font-medium hover:underline"
                  >
                    {offer.title}
                  </Link>
                  <Badge
                    variant={statusVariant(offer.status)}
                    className="shrink-0 text-[10px] uppercase tracking-wider"
                  >
                    {offer.status}
                  </Badge>
                </div>
                {offer.merchant && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {offer.merchant.name}
                  </p>
                )}
                <p className="num text-[10px] uppercase tracking-wider text-muted-foreground">
                  {shortDate(offer.startDate)} → {shortDate(offer.endDate)}
                </p>
                <div className="flex justify-end gap-1 border-t border-border/60 pt-1.5">
                  <Link href={`/maintainer/offers/${offer.id}/edit`}>
                    <Button size="xs" variant="ghost">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setError(null);
                      setConfirmOffer(offer);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <AlertDialog
        open={confirmOffer !== null}
        onOpenChange={(o) => !o && setConfirmOffer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOffer ? (
                <>
                  <span className="font-medium text-foreground">
                    {confirmOffer.title}
                  </span>
                  {confirmOffer.merchant && (
                    <> at {confirmOffer.merchant.name}</>
                  )}
                  . This permanently removes the offer and any pending
                  submission references. Cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
