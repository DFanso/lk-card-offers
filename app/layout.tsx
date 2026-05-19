import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LK Card Offers",
    template: "%s · LK Card Offers",
  },
  description: "Discover credit & debit card offers from Sri Lankan banks.",
  applicationName: "LK Card Offers",
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
