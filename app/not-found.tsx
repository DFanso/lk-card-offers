import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-stretch gap-8 py-16">
      <div className="border border-border bg-card">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-muted/30 px-4 py-2.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="num">№ 404 / Off the wire</span>
          <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
        </header>

        <div className="space-y-6 p-8">
          <div className="section-label">Status</div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            <span className="num text-primary">404</span> · Page not found
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            The page you’re looking for has expired, moved, or never existed.
            Public offers automatically drop off the wire once they end — so a
            stale bookmark is the most likely culprit.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/">
              <Button size="lg">← Back to home</Button>
            </Link>
            <Link href="/offers">
              <Button variant="outline" size="lg">
                Browse all offers →
              </Button>
            </Link>
          </div>
        </div>

        <footer className="grid grid-cols-2 gap-px border-t border-border bg-border text-[11px] sm:grid-cols-4">
          <Link
            href="/"
            className="bg-card px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/offers"
            className="bg-card px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            Offers
          </Link>
          <Link
            href="/submit"
            className="bg-card px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            Submit
          </Link>
          <Link
            href="/account"
            className="bg-card px-4 py-3 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            Account
          </Link>
        </footer>
      </div>
    </section>
  );
}
