import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PublicOfferListItem } from "@/lib/queries-server/offers";

function formatDateShort(d: string) {
  return new Date(d)
    .toLocaleDateString("en-LK", { day: "2-digit", month: "short" })
    .toUpperCase();
}

function daysLeft(end: string) {
  const ms = new Date(end).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  return days;
}

function hashHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

export function OfferCard({
  offer,
  index,
}: {
  offer: PublicOfferListItem;
  index?: number;
}) {
  const remaining = daysLeft(offer.endDate);
  const id = (index ?? 0).toString().padStart(3, "0");

  return (
    <article className="group relative flex h-full flex-col border border-border bg-card transition-colors hover:border-foreground/40">
      <div className="absolute -top-px left-0 right-0 flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="bg-card pr-2 num">№ {id}</span>
        <span className="bg-card pl-2">
          {offer.category?.name ?? "Uncategorized"}
        </span>
      </div>

      {offer.imageUrl ? (
        <Link
          href={`/offers/${offer.id}`}
          className="relative block border-b border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </Link>
      ) : (
        <Link
          href={`/offers/${offer.id}`}
          className="relative block aspect-[16/9] w-full overflow-hidden border-b border-border"
          aria-label={offer.title}
          style={{
            background: `linear-gradient(135deg, hsl(${hashHue(offer.id)} 35% 28%) 0%, hsl(${(hashHue(offer.id) + 40) % 360} 30% 18%) 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_11px,rgba(255,255,255,0.6)_11px,rgba(255,255,255,0.6)_12px)]" />
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between text-[10px] uppercase tracking-[0.22em] text-white/70 num">
            <span>{(offer.merchant?.name ?? "offer").slice(0, 24)}</span>
            <span>№ {offer.id.slice(0, 6)}</span>
          </div>
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4 pt-6">
        {offer.merchant && (
          <div className="section-label">{offer.merchant.name}</div>
        )}
        <Link href={`/offers/${offer.id}`} className="block">
          <h3 className="text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {offer.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {offer.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {offer.banks.slice(0, 3).map((b) => (
            <Badge key={b.id} variant="secondary" className="text-[10px]">
              {b.name.split(" ")[0]}
            </Badge>
          ))}
          {offer.banks.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{offer.banks.length - 3}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="num">
            {formatDateShort(offer.startDate)} → {formatDateShort(offer.endDate)}
          </span>
          {remaining > 0 ? (
            <span className="num text-foreground">
              {remaining}d left
            </span>
          ) : (
            <span className="text-destructive">expired</span>
          )}
        </div>
      </div>
    </article>
  );
}
