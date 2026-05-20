import type { Metadata } from "next";
import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import {
  getBankCounts,
  getCategoryCounts,
  getHomeStats,
} from "@/lib/queries-server/home";
import { OfferCard } from "@/components/site/offer-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/site/disclaimer";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "LK Card Offers — Sri Lankan credit & debit card promotions",
  description:
    "Browse the latest credit and debit card offers from Sri Lankan banks — DFCC, Commercial, HNB, NDB, Nations Trust, People's Bank. Filter by bank, card type, and category.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "LK Card Offers — Sri Lankan credit & debit card promotions",
    description:
      "Browse the latest credit and debit card offers from Sri Lankan banks — DFCC, Commercial, HNB, NDB, Nations Trust, People's Bank.",
  },
};

const SEVEN_DAYS_MS = 7 * 86400000;

export default async function HomePage() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysOut = new Date(now.getTime() + SEVEN_DAYS_MS)
    .toISOString()
    .slice(0, 10);

  const [stats, categories, banks, latest, endingSoon] = await Promise.all([
    getHomeStats(),
    getCategoryCounts(),
    getBankCounts(),
    listOffers({ pageSize: 10 }),
    listOffers({ pageSize: 5, sort: "ending_soon", endsBefore: sevenDaysOut }),
  ]);

  const stamp = now
    .toLocaleString("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .toUpperCase();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="section-label mb-5">Issue 01 / Q2 {todayStr.slice(0, 4)}</div>
          <h1 className="text-balance text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Card offers,{" "}
            <span className="text-primary">curated daily.</span>
          </h1>
          <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted-foreground md:mt-8 md:text-base">
            A community-curated catalog of valid credit and debit card
            promotions from Sri Lankan banks. Filter by bank, card type, and
            category to find the deals that match the cards in your wallet —
            no scraping, no expired clutter.
          </p>
          <form
            action="/offers"
            className="mt-8 flex max-w-xl items-center gap-2"
          >
            <Input
              name="q"
              placeholder="Search offers, merchants, banks…"
              className="h-10 text-sm"
            />
            <Button type="submit" size="lg">
              Search →
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="ticker">Quick links:</span>
            {categories.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/offers?category=${c.id}`}
                className="rounded-none border border-border bg-muted/30 px-2 py-1 transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                {c.name} <span className="num text-foreground">{c.count}</span>
              </Link>
            ))}
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="grid h-full gap-px border border-border bg-border">
            <div className="bg-card p-5">
              <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Live offers
              </div>
              <p className="num mt-3 text-5xl font-semibold tracking-tight">
                {stats.liveOffers.toString().padStart(3, "0")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                published & not yet expired
              </p>
            </div>
            <div className="grid grid-cols-3 bg-border gap-px">
              <div className="bg-card p-4">
                <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Banks
                </div>
                <p className="num mt-2 text-2xl font-semibold tracking-tight">
                  {stats.banks.toString().padStart(2, "0")}
                </p>
              </div>
              <div className="bg-card p-4">
                <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Categories
                </div>
                <p className="num mt-2 text-2xl font-semibold tracking-tight">
                  {stats.categories.toString().padStart(2, "0")}
                </p>
              </div>
              <div className="bg-card p-4">
                <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Merchants
                </div>
                <p className="num mt-2 text-2xl font-semibold tracking-tight">
                  {stats.merchants.toString().padStart(3, "0")}
                </p>
              </div>
            </div>
            <div className="bg-card p-4">
              <div className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Last updated
              </div>
              <p className="num mt-2 text-xs tracking-tight">{stamp}</p>
            </div>
          </div>
        </aside>
      </section>

      {/* Browse by category */}
      <section className="space-y-5">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <div className="section-label mb-2">Browse</div>
            <h2 className="text-xl font-semibold tracking-tight">
              By category
            </h2>
          </div>
          <Link
            href="/offers"
            className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
          >
            All offers →
          </Link>
        </div>
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/offers?category=${c.id}`}
              className="group relative bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-baseline justify-between">
                <span className="num text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  № {(i + 1).toString().padStart(2, "0")}
                </span>
                <span className="num text-lg font-semibold tracking-tight">
                  {c.count.toString().padStart(2, "0")}
                </span>
              </div>
              <p className="mt-6 text-sm font-medium tracking-tight transition-colors group-hover:text-primary">
                {c.name}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                offers
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by bank */}
      {banks.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <div>
              <div className="section-label mb-2">Browse</div>
              <h2 className="text-xl font-semibold tracking-tight">By bank</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {stats.banks} issuers
            </span>
          </div>
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {banks.map((b) => (
              <Link
                key={b.id}
                href={`/offers?bank=${b.id}`}
                className="group flex flex-col justify-between bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <p className="text-sm font-medium leading-tight tracking-tight transition-colors group-hover:text-primary">
                  {b.name}
                </p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="num text-2xl font-semibold tracking-tight">
                    {b.count.toString().padStart(2, "0")}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    offers
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ending soon */}
      {endingSoon.items.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <div>
              <div className="section-label mb-2">Don&apos;t miss</div>
              <h2 className="text-xl font-semibold tracking-tight">
                Ending this week
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              expires within 7 days
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {endingSoon.items.map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Latest */}
      <section className="space-y-5">
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
        {latest.items.length === 0 ? (
          <p className="border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
            No offers yet. Be the first to submit one.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {latest.items.map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} index={i + 1} />
            ))}
          </div>
        )}
      </section>

      {/* CTA strip */}
      <section className="grid gap-px border border-border bg-border md:grid-cols-2">
        <div className="bg-card p-8">
          <div className="section-label mb-3">Submit</div>
          <h3 className="text-2xl font-semibold tracking-tight">
            Spotted a deal we missed&#63;
          </h3>
          <p className="mt-3 max-w-prose text-xs text-muted-foreground">
            Anyone with an account can submit an offer. Our maintainers
            review and publish promptly.
          </p>
          <Link href="/submit" className="mt-5 inline-block">
            <Button size="lg">Submit an offer →</Button>
          </Link>
        </div>
        <div className="bg-card p-8">
          <div className="section-label mb-3">Maintainers</div>
          <h3 className="text-2xl font-semibold tracking-tight">
            Want to help curate?
          </h3>
          <p className="mt-3 max-w-prose text-xs text-muted-foreground">
            Sign up, then request maintainer access from your account page.
            Curate, publish, and keep the catalog fresh.
          </p>
          <Link href="/account" className="mt-5 inline-block">
            <Button variant="outline" size="lg">
              Become a maintainer →
            </Button>
          </Link>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
