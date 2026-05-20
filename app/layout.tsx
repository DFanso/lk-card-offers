import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Resolve the public origin once. NEXTAUTH_URL is already the canonical
// site URL across the app (sitemap, robots, offer detail pages). When
// metadataBase is set, Next.js rewrites every relative URL in the
// metadata tree (including the file-convention opengraph-image) into an
// absolute URL — which is what Facebook/LinkedIn/Twitter/Discord/iMessage
// require to actually fetch and render the preview image.
const SITE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LK Card Offers — Sri Lankan credit & debit card promotions",
    template: "%s · LK Card Offers",
  },
  description:
    "A community-curated catalog of valid credit & debit card promotions from Sri Lankan banks. Filter by bank, card, and category.",
  applicationName: "LK Card Offers",
  keywords: [
    "Sri Lanka credit card offers",
    "Sri Lanka debit card promotions",
    "DFCC card offers",
    "Commercial Bank card offers",
    "HNB card promotions",
    "NDB card promotions",
    "Nations Trust card offers",
    "People's Bank card offers",
    "card discounts Sri Lanka",
    "merchant promotions Sri Lanka",
  ],
  authors: [{ name: "LK Card Offers" }],
  creator: "LK Card Offers",
  publisher: "LK Card Offers",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "LK Card Offers",
    locale: "en_US",
    url: "/",
    title: "LK Card Offers — Sri Lankan credit & debit card promotions",
    description:
      "A community-curated catalog of valid credit & debit card promotions from Sri Lankan banks. Filter by bank, card, and category.",
    // og:image is auto-attached from app/opengraph-image.png by the
    // Next.js file convention. Listing it explicitly here ensures the
    // image:type/width/height tags get emitted alongside og:image even
    // when nested routes override `openGraph`.
  },
  twitter: {
    card: "summary_large_image",
    title: "LK Card Offers — Sri Lankan credit & debit card promotions",
    description:
      "A community-curated catalog of valid credit & debit card promotions from Sri Lankan banks.",
  },
  category: "finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf6e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1812" },
  ],
};

import { Providers } from "@/components/providers/providers"
import { THEME_INIT_SCRIPT } from "@/components/providers/theme-provider"
import { Toaster } from "sonner"
import { SiteHeader } from "@/components/site/header"
import { SiteFooter } from "@/components/site/footer"
import { GoogleAnalytics } from "@/components/site/google-analytics"
import { JsonLd } from "@/components/site/json-ld"

// Sitewide structured data. WebSite gives Google the canonical name + a
// SearchAction Sitelinks Search Box hook (search box appears in SERP);
// Organization is the matching publisher record used by Article rich
// results on offer detail pages.
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LK Card Offers",
  alternateName: "LK Card Offers — Sri Lankan credit & debit card promotions",
  url: SITE_URL,
  inLanguage: "en-LK",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/offers?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LK Card Offers",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Community-curated catalog of valid credit & debit card promotions from Sri Lankan banks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
      </head>
      <body className="font-mono antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 lg:px-10">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
        <Toaster />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
