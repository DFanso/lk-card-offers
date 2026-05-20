import type { Metadata } from "next";
import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import { OfferCard } from "@/components/site/offer-card";
import { OfferFilters } from "@/components/site/offer-filters";
import { Disclaimer } from "@/components/site/disclaimer";
import { Pagination } from "@/components/site/pagination";

export const revalidate = 300;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  // Treat any URL with a filter or pagination param as a faceted view —
  // canonical points to the bare /offers page and we tell Google not to
  // index the variant. Stops duplicate-content cannibalisation across
  // dozens of filter combinations.
  const hasFilters = Boolean(
    sp.bank || sp.cardType || sp.category || sp.q || sp.page,
  );
  return {
    title: "All offers",
    description:
      "All published credit and debit card offers from Sri Lankan banks — DFCC, Commercial, HNB, NDB, Nations Trust, People's Bank. Filter by bank, card type, and category.",
    alternates: { canonical: "/offers" },
    robots: hasFilters
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      url: "/offers",
      title: "All offers · LK Card Offers",
      description:
        "Every live credit and debit card offer in our catalog — filterable by bank, card type, and category.",
    },
  };
}

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
      <header className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="section-label mb-2">Catalog</div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            All offers
          </h1>
        </div>
        <div className="shrink-0 text-right text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.22em]">
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
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:tracking-[0.22em]">
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
            <Pagination
              page={page}
              totalPages={totalPages}
              buildHref={buildPageHref}
            />
          )}

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
