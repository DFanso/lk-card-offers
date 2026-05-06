import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/site/disclaimer";

export default async function HomePage() {
  const { items } = await listOffers({ pageSize: 6 });

  return (
    <div className="space-y-10">
      <section className="space-y-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sri Lanka Credit Card Offers
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A community-curated catalog of valid credit and debit card promotions
          from Sri Lankan banks. Filter by bank, card type, and category to find
          deals that match the cards in your wallet.
        </p>
        <div className="flex gap-2">
          <Link href="/offers">
            <Button>Browse all offers</Button>
          </Link>
          <Link href="/submit">
            <Button variant="outline">Submit an offer</Button>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Latest offers</h2>
          <Link
            href="/offers"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No offers yet. Be the first to submit one.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </section>

      <Disclaimer />
    </div>
  );
}
