import Link from "next/link";
import { Button } from "@/components/ui/button";

function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (p: number) => string;
}) {
  const pages = buildPageList(page, totalPages);
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col items-center justify-center gap-3 border-t border-border pt-6 sm:flex-row sm:gap-2"
    >
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:order-2">
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="num hidden px-1 text-xs text-muted-foreground sm:inline"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Link key={p} href={buildHref(p)} className="hidden sm:inline-block">
              <Button
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="num min-w-8"
              >
                {p.toString().padStart(2, "0")}
              </Button>
            </Link>
          ),
        )}
        <span className="num text-xs text-muted-foreground sm:hidden">
          Page {page} of {totalPages}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:order-1">
        {prevPage ? (
          <Link href={buildHref(prevPage)}>
            <Button variant="outline" size="sm">
              ← Prev
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            ← Prev
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2 sm:order-3">
        {nextPage ? (
          <Link href={buildHref(nextPage)}>
            <Button variant="outline" size="sm">
              Next →
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next →
          </Button>
        )}
      </div>
    </nav>
  );
}
