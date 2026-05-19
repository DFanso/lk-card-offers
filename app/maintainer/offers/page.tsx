import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/site/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listOffers } from "@/lib/queries-server/offers";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function shortDate(d: string) {
  return new Date(d)
    .toLocaleDateString("en-LK", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .toUpperCase();
}

export default async function MaintainerOffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("maintainer");
  const sp = await searchParams;
  const mine = sp.mine === "1";
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const pageSize = 25;

  const { items, total } = await listOffers({
    q,
    includeExpired: true,
    page,
    pageSize,
    publishedByMaintainerId: mine ? session.user.id : undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  const buildHref = (next: { mine?: boolean; page?: number; q?: string }) => {
    const params = new URLSearchParams();
    const m = next.mine ?? mine;
    if (m) params.set("mine", "1");
    const query = next.q ?? q;
    if (query) params.set("q", query);
    if (next.page) params.set("page", String(next.page));
    return `/maintainer/offers${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="section-label">№ 04 / Catalog</div>
          <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
          <p className="max-w-2xl text-xs text-muted-foreground">
            Browse and edit published offers. Toggle <em>Mine only</em> to see
            the offers you personally published.
          </p>
        </div>
        <Link href="/maintainer/offers/new">
          <Button>+ New offer</Button>
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href={buildHref({ mine: false, page: 1 })}
            className={
              !mine
                ? "border border-foreground bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                : "border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            }
          >
            All
          </Link>
          <Link
            href={buildHref({ mine: true, page: 1 })}
            className={
              mine
                ? "border border-foreground bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                : "border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            }
          >
            Mine only
          </Link>
        </div>
        <form action="/maintainer/offers" className="flex items-center gap-2">
          {mine && <input type="hidden" name="mine" value="1" />}
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

      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Showing{" "}
        <span className="num text-foreground">
          {(offset + 1).toString().padStart(3, "0")}–
          {Math.min(offset + pageSize, total).toString().padStart(3, "0")}
        </span>{" "}
        of <span className="num text-foreground">{total}</span>
      </div>

      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">
                Title
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">
                Merchant
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">
                Status
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">
                Valid
              </TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-[0.18em]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell className="max-w-[280px]">
                  <Link
                    href={`/offers/${offer.id}`}
                    target="_blank"
                    className="block truncate font-medium hover:underline"
                  >
                    {offer.title}
                  </Link>
                  {offer.category && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {offer.category.name}
                    </p>
                  )}
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-muted-foreground">
                  {offer.merchant?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      offer.status === "published"
                        ? "secondary"
                        : offer.status === "rejected"
                        ? "destructive"
                        : "outline"
                    }
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {offer.status}
                  </Badge>
                </TableCell>
                <TableCell className="num text-[10px] uppercase tracking-wider text-muted-foreground">
                  {shortDate(offer.startDate)} → {shortDate(offer.endDate)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/maintainer/offers/${offer.id}/edit`}>
                    <Button size="xs" variant="ghost">
                      Edit
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  {mine
                    ? "You haven't published any offers yet."
                    : "No offers found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
