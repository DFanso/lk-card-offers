import Link from "next/link";
import { notFound } from "next/navigation";
import { getOfferById } from "@/lib/queries-server/offers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Disclaimer } from "@/components/site/disclaimer";

function formatDate(d: string) {
  return new Date(d)
    .toLocaleDateString("en-LK", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

function daysLeft(end: string) {
  return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer = await getOfferById(id);
  if (!offer) notFound();

  const remaining = daysLeft(offer.endDate);

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/offers"
        className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to offers
      </Link>

      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          {offer.category && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {offer.category.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
            {offer.status}
          </Badge>
          {remaining > 0 ? (
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="num text-foreground">{remaining}</span> days remaining
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.22em] text-destructive">
              Expired
            </span>
          )}
        </div>
        {offer.merchant && (
          <div className="section-label">{offer.merchant.name}</div>
        )}
        <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          {offer.title}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground num">
          Valid {formatDate(offer.startDate)} → {formatDate(offer.endDate)}
        </p>
      </header>

      {offer.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.imageUrl}
          alt={offer.title}
          className="aspect-[16/9] w-full border border-border object-cover"
          loading="lazy"
        />
      )}

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="section-label mb-3">Details</div>
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {offer.description}
          </p>
          <div className="mt-6">
            <a href={offer.sourceUrl} target="_blank" rel="noreferrer">
              <Button variant="outline">
                View official source ↗
              </Button>
            </a>
          </div>
        </div>

        <aside className="space-y-6 border-t border-border pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <section>
            <div className="section-label mb-3">Eligible banks</div>
            {offer.banks.length ? (
              <ul className="space-y-1">
                {offer.banks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between border-b border-border/60 py-1.5 text-xs"
                  >
                    <span>{b.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {b.slug}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </section>

          <Separator />

          <section>
            <div className="section-label mb-3">Card types</div>
            {offer.cardTypes.length ? (
              <div className="flex flex-wrap gap-1.5">
                {offer.cardTypes.map((c) => (
                  <Badge
                    key={c.id}
                    variant="outline"
                    className="text-[11px]"
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </section>
        </aside>
      </div>

      <Disclaimer />
    </article>
  );
}
