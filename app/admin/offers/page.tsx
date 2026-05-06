import Link from "next/link";
import { listOffers } from "@/lib/queries-server/offers";
import { requireRole } from "@/lib/rbac";
import { OffersClient } from "./offers-client";
import { Pagination } from "@/components/site/pagination";
import type { OfferStatusValue } from "@/db/schema";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: { value: OfferStatusValue | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "expired", label: "Expired" },
  { value: "pending_review", label: "Pending review" },
  { value: "rejected", label: "Rejected" },
];

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : "all";
  const status = (
    STATUS_OPTIONS.find((s) => s.value === statusParam)?.value ?? "all"
  ) as OfferStatusValue | "all";
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const pageSize = 25;

  const { items, total } = await listOffers({
    q,
    status: status === "all" ? undefined : status,
    includeExpired: true,
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  const buildHref = (next: { status?: string; page?: number; q?: string }) => {
    const params = new URLSearchParams();
    const s = next.status ?? (status === "all" ? undefined : status);
    if (s) params.set("status", s);
    const query = next.q ?? q;
    if (query) params.set("q", query);
    if (next.page) params.set("page", String(next.page));
    return `/admin/offers${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 07 / Catalog</div>
        <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Browse and manage every offer in the catalog, including expired and
          rejected entries. Use the filter to narrow by status.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = (status === opt.value);
            return (
              <Link
                key={opt.value}
                href={buildHref({ status: opt.value, page: 1 })}
                className={
                  isActive
                    ? "border border-foreground bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                    : "border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                }
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
        <form action="/admin/offers" className="flex items-center gap-2">
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title or description…"
            className="h-8 w-56 rounded-none border border-border bg-transparent px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="h-8 border border-border bg-card px-3 text-[11px] font-medium hover:bg-muted"
          >
            Search
          </button>
        </form>
      </div>

      <OffersClient
        items={items}
        total={total}
        offset={offset}
        pageSize={pageSize}
      />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => buildHref({ page: p })}
        />
      )}
    </div>
  );
}
