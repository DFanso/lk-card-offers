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
    default: "LK Card Offers",
    template: "%s · LK Card Offers",
  },
  description:
    "A community-curated catalog of valid credit & debit card promotions from Sri Lankan banks. Filter by bank, card, and category.",
  applicationName: "LK Card Offers",
  openGraph: {
    type: "website",
    siteName: "LK Card Offers",
    locale: "en_US",
    url: "/",
    title: "LK Card Offers",
    description:
      "A community-curated catalog of valid credit & debit card promotions from Sri Lankan banks. Filter by bank, card, and category.",
    // og:image is auto-attached from app/opengraph-image.png by the
    // Next.js file convention. Listing it explicitly here ensures the
    // image:type/width/height tags get emitted alongside og:image even
    // when nested routes override `openGraph`.
  },
  twitter: {
    card: "summary_large_image",
    title: "LK Card Offers",
    description:
      "A community-curated catalog of valid credit & debit card promotions from Sri Lankan banks.",
  },
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
      </body>
    </html>
  );
}
