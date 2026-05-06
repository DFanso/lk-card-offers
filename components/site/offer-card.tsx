import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicOfferListItem } from "@/lib/queries-server/offers";

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-LK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function OfferCard({ offer }: { offer: PublicOfferListItem }) {
  return (
    <Card className="h-full overflow-hidden">
      {offer.imageUrl && (
        <Link href={`/offers/${offer.id}`} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="aspect-[16/9] w-full object-cover"
            loading="lazy"
          />
        </Link>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">
            <Link href={`/offers/${offer.id}`} className="hover:underline">
              {offer.title}
            </Link>
          </CardTitle>
          {offer.category && (
            <Badge variant="outline" className="text-[10px]">
              {offer.category.name}
            </Badge>
          )}
        </div>
        {offer.merchant && (
          <p className="text-xs text-muted-foreground">{offer.merchant.name}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-xs text-muted-foreground">
          {offer.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {offer.banks.map((b) => (
            <Badge key={b.id} variant="secondary" className="text-[10px]">
              {b.name}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {offer.cardTypes.map((c) => (
            <Badge key={c.id} variant="outline" className="text-[10px]">
              {c.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
          <span>{formatDateRange(offer.startDate, offer.endDate)}</span>
          <a
            href={offer.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Source ↗
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
