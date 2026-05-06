import Link from "next/link";
import { notFound } from "next/navigation";
import { getOfferById } from "@/lib/queries-server/offers";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/site/disclaimer";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offer = await getOfferById(id);
  if (!offer) notFound();

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link href="/offers" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to offers
      </Link>
      {offer.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.imageUrl}
          alt={offer.title}
          className="aspect-[16/9] w-full rounded border object-cover"
          loading="lazy"
        />
      )}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          {offer.category && (
            <Badge variant="outline" className="text-[10px]">
              {offer.category.name}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {offer.status}
          </Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{offer.title}</h1>
        {offer.merchant && (
          <p className="text-sm text-muted-foreground">{offer.merchant.name}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Valid {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
        </p>
      </header>

      <p className="whitespace-pre-line text-sm leading-relaxed">
        {offer.description}
      </p>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Eligible banks
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {offer.banks.length ? (
            offer.banks.map((b) => (
              <Badge key={b.id} variant="secondary" className="text-[11px]">
                {b.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Card types
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {offer.cardTypes.length ? (
            offer.cardTypes.map((c) => (
              <Badge key={c.id} variant="outline" className="text-[11px]">
                {c.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </section>

      <a
        href={offer.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs underline"
      >
        View official source ↗
      </a>

      <Disclaimer />
    </article>
  );
}
