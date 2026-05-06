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
import { Toaster } from "sonner"
import { SiteHeader } from "@/components/site/header"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="font-mono antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full px-6 py-6 lg:px-10 2xl:px-14">
            {children}
          </main>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
