import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/site/disclaimer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { items, total } = await listOffers({ pageSize: 6 });

  return (
    <div className="space-y-12">
      <section className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-8">
          <div className="section-label mb-4">Issue 01 / Q2 2026</div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Card offers,{" "}
            <span className="text-primary">curated daily.</span>
          </h1>
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
            A community-curated catalog of valid credit and debit card
            promotions from Sri Lankan banks. Filter by bank, card type, and
            category to find the deals that match the cards in your wallet —
            no scraping, no expired clutter.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/offers">
              <Button size="lg">Browse all offers →</Button>
            </Link>
            <Link href="/submit">
              <Button size="lg" variant="outline">
                Submit an offer
              </Button>
            </Link>
          </div>
        </div>
        <aside className="md:col-span-4">
          <div className="grid h-full grid-cols-2 gap-px border border-border bg-border md:grid-cols-1">
            <div className="bg-card p-4">
              <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Active
              </div>
              <p className="num mt-2 text-3xl font-semibold tracking-tight">
                {total.toString().padStart(2, "0")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                live offers right now
              </p>
            </div>
            <div className="bg-card p-4">
              <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Coverage
              </div>
              <p className="num mt-2 text-3xl font-semibold tracking-tight">
                LK
              </p>
              <p className="text-[11px] text-muted-foreground">
                Sri Lanka issuers
              </p>
            </div>
            <div className="bg-card p-4 md:border-t md:border-border">
              <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Updated
              </div>
              <p className="num mt-2 text-sm tracking-tight">
                {new Date()
                  .toLocaleString("en-LK", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .toUpperCase()}
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <div className="section-label mb-2">Front page</div>
            <h2 className="text-xl font-semibold tracking-tight">
              Latest offers
            </h2>
          </div>
          <Link
            href="/offers"
            className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
            No offers yet. Be the first to submit one.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} index={i + 1} />
            ))}
          </div>
        )}
      </section>

      <Disclaimer />
    </div>
  );
}
