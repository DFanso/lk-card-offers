"use client";

/**
 * Google Analytics 4 (gtag.js).
 *
 * Sourced from `NEXT_PUBLIC_GA_ID`. When the env var is unset (e.g. local
 * dev without a measurement ID, preview builds), the component renders
 * nothing — no script tags, no network requests.
 *
 * On the initial document load `gtag('config', ...)` automatically sends a
 * page_view. App Router client-side navigations don't trigger that, so we
 * fire one manually from a small effect that watches `usePathname()` /
 * `useSearchParams()`. The listener lives inside <Suspense> because
 * `useSearchParams()` requires it.
 */
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function PageviewListener({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }
    const query = searchParams.toString();
    const page_path = query ? `${pathname}?${query}` : pathname;
    window.gtag("event", "page_view", {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
      send_to: gaId,
    });
  }, [pathname, searchParams, gaId]);

  return null;
}

export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: true });`}
      </Script>
      <Suspense fallback={null}>
        <PageviewListener gaId={GA_ID} />
      </Suspense>
    </>
  );
}
