import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import { OfferCard } from "@/components/site/offer-card";
import { OfferFilters } from "@/components/site/offer-filters";
import { Disclaimer } from "@/components/site/disclaimer";

export const dynamic = "force-dynamic";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const bankIds = ([] as string[]).concat(sp.bank ?? []);
  const cardTypeIds = ([] as string[]).concat(sp.cardType ?? []);
  const categoryId = typeof sp.category === "string" ? sp.category : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;

  const { items, total } = await listOffers({
    bankIds: bankIds.length ? bankIds : undefined,
    cardTypeIds: cardTypeIds.length ? cardTypeIds : undefined,
    categoryId,
    q,
    page,
    pageSize: 12,
  });

  const totalPages = Math.max(1, Math.ceil(total / 12));

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    bankIds.forEach((id) => params.append("bank", id));
    cardTypeIds.forEach((id) => params.append("cardType", id));
    if (categoryId) params.set("category", categoryId);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/offers?${params.toString()}`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <OfferFilters />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">All offers</h1>
          <span className="text-xs text-muted-foreground">
            {total} result{total === 1 ? "" : "s"}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center text-xs text-muted-foreground">
            No offers match your filters.
            <br />
            <Link href="/offers" className="underline">
              Reset filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 text-xs">
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              return (
                <Link
                  key={p}
                  href={buildPageHref(p)}
                  className={
                    p === page
                      ? "rounded border bg-muted px-2 py-1"
                      : "rounded border px-2 py-1 text-muted-foreground hover:text-foreground"
                  }
                >
                  {p}
                </Link>
              );
            })}
          </div>
        )}

        <Disclaimer />
      </div>
    </div>
  );
}
