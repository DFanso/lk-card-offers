import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-border bg-muted/20">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="text-base font-semibold tracking-[-0.01em] text-foreground">
              LK / Card Offers
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
              A community-curated catalog of valid credit and debit card
              promotions from Sri Lankan banks. Filter by bank, card type, and
              category — no scraping, no expired clutter.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              <span>Live · Updated daily</span>
            </div>
          </div>

          <FooterColumn title="Browse">
            <FooterLink href="/offers">All offers</FooterLink>
            <FooterLink href="/offers?category=dining">Dining</FooterLink>
            <FooterLink href="/offers?category=shopping">Shopping</FooterLink>
            <FooterLink href="/offers?category=travel">Travel</FooterLink>
          </FooterColumn>

          <FooterColumn title="Contribute">
            <FooterLink href="/submit">Submit an offer</FooterLink>
            <FooterLink href="/account">Become a maintainer</FooterLink>
            <FooterLink href="/register">Create an account</FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
          </FooterColumn>

          <FooterColumn title="Info">
            <FooterLink href="/">Home</FooterLink>
            <span className="text-[11px] text-muted-foreground/70">
              Issue 01 · Q2 {year}
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              Made in Colombo
            </span>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} LK / Card Offers. All offers belong to their issuers.</p>
          <p className="text-[10px] uppercase tracking-[0.22em]">
            Not financial advice · Confirm with the issuer
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="md:col-span-2">
      <div className="section-label mb-3">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
