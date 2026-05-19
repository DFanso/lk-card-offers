import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LK Card Offers",
  description: "Discover credit & debit card offers from Sri Lankan banks.",
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
            <main className="mx-auto w-full flex-1 px-6 py-6 lg:px-10 2xl:px-14">
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
