import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import { OfferCard } from "@/components/site/offer-card";
import { OfferFilters } from "@/components/site/offer-filters";
import { Disclaimer } from "@/components/site/disclaimer";
import { Button } from "@/components/ui/button";

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
  const pageSize = 12;

  const { items, total } = await listOffers({
    bankIds: bankIds.length ? bankIds : undefined,
    cardTypeIds: cardTypeIds.length ? cardTypeIds : undefined,
    categoryId,
    q,
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    bankIds.forEach((id) => params.append("bank", id));
    cardTypeIds.forEach((id) => params.append("cardType", id));
    if (categoryId) params.set("category", categoryId);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `/offers?${params.toString()}`;
  };

  const offset = (page - 1) * pageSize;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-border pb-4">
        <div>
          <div className="section-label mb-2">Catalog</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            All offers
          </h1>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <div className="num text-foreground text-base font-medium">
            {total.toString().padStart(3, "0")}
          </div>
          <div>results</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <OfferFilters />
        <div className="space-y-6">
          {items.length === 0 ? (
            <div className="border border-dashed border-border bg-muted/20 p-12 text-center">
              <p className="text-xs text-muted-foreground">
                No offers match your filters.
              </p>
              <Link
                href="/offers"
                className="mt-3 inline-block text-[10px] uppercase tracking-[0.22em] underline"
              >
                Reset filters →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>
                  Showing{" "}
                  <span className="num text-foreground">
                    {(offset + 1).toString().padStart(3, "0")}–
                    {Math.min(offset + pageSize, total)
                      .toString()
                      .padStart(3, "0")}
                  </span>{" "}
                  of <span className="num text-foreground">{total}</span>
                </span>
                <span className="num">
                  Page {page} / {totalPages}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {items.map((offer, i) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    index={offset + i + 1}
                  />
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-border pt-6">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                const isCurrent = p === page;
                return (
                  <Link key={p} href={buildPageHref(p)}>
                    <Button
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      className="num min-w-8"
                    >
                      {p.toString().padStart(2, "0")}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
