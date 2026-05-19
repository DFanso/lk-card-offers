"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SearchHit, SearchResponse } from "@/app/api/search/route";

function hitHref(hit: SearchHit): string {
  switch (hit.kind) {
    case "offer":
      return `/offers/${hit.id}`;
    case "merchant":
      return `/offers?q=${encodeURIComponent(hit.name)}`;
    case "bank":
      return `/offers?bank=${hit.id}`;
    case "category":
      return `/offers?category=${hit.id}`;
  }
}

function hitLabel(hit: SearchHit): string {
  switch (hit.kind) {
    case "offer":
      return hit.title;
    case "merchant":
    case "bank":
    case "category":
      return hit.name;
  }
}

function hitDetail(hit: SearchHit): string {
  switch (hit.kind) {
    case "offer":
      return hit.merchant ?? "Offer";
    case "merchant":
      return "View related offers";
    case "bank":
      return `Bank · ${hit.slug}`;
    case "category":
      return `Category · ${hit.slug}`;
  }
}

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  offer: "Offer",
  merchant: "Merchant",
  bank: "Bank",
  category: "Category",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // Global cmd/ctrl-K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK =
        (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isCmdK) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
      setActive(0);
    } else {
      // focus input on open
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const json = (await res.json()) as SearchResponse;
        if (reqId.current === id) {
          setHits(json.hits);
          setActive(0);
        }
      } catch {
        if (reqId.current === id) setHits([]);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [q, open]);

  const grouped = useMemo(() => {
    const out: Record<SearchHit["kind"], SearchHit[]> = {
      offer: [],
      merchant: [],
      bank: [],
      category: [],
    };
    for (const h of hits) out[h.kind].push(h);
    return out;
  }, [hits]);

  const navigate = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      router.push(hitHref(hit));
    },
    [router],
  );

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) navigate(hit);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search (⌘K)"
        aria-label="Open search"
        className="hidden h-9 items-center gap-2 border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground md:flex"
      >
        <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.75} />
        <span>Search</span>
        <span className="ml-2 num rounded-none border border-border/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          ⌘K
        </span>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search"
        aria-label="Open search"
        className="flex h-9 w-9 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground md:hidden"
      >
        <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.75} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[15%] left-1/2 max-w-xl translate-y-0 gap-0 p-0 sm:max-w-xl"
        >
          <DialogHeader className="border-b border-border px-3 py-2">
            <DialogTitle className="sr-only">Sitewide search</DialogTitle>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                strokeWidth={1.75}
                className="text-muted-foreground"
              />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search offers, merchants, banks, categories…"
                className="h-9 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="num text-[10px] uppercase tracking-wider text-muted-foreground">
                {loading ? "…" : "ESC"}
              </span>
            </div>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {q.trim().length < 2 ? (
              <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
                Type at least 2 characters. Use ↑↓ to navigate, ↵ to open.
              </div>
            ) : hits.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center text-[11px] text-muted-foreground">
                No matches for{" "}
                <span className="text-foreground">&ldquo;{q}&rdquo;</span>.
              </div>
            ) : (
              <ul className="py-1" role="listbox">
                {(["offer", "merchant", "bank", "category"] as const).map(
                  (kind) => {
                    const rows = grouped[kind];
                    if (rows.length === 0) return null;
                    return (
                      <li key={kind} className="mb-1">
                        <div className="section-label px-3 pt-2 pb-1">
                          {KIND_LABEL[kind]}
                        </div>
                        <ul>
                          {rows.map((hit) => {
                            const idx = hits.indexOf(hit);
                            const isActive = idx === active;
                            return (
                              <li key={`${kind}:${hit.id}`}>
                                <Link
                                  href={hitHref(hit)}
                                  onClick={() => setOpen(false)}
                                  onMouseEnter={() => setActive(idx)}
                                  className={
                                    isActive
                                      ? "flex items-center justify-between gap-3 bg-primary/10 px-3 py-1.5 text-xs text-foreground"
                                      : "flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-foreground hover:bg-muted/60"
                                  }
                                >
                                  <span className="truncate">
                                    {hitLabel(hit)}
                                  </span>
                                  <span className="shrink-0 truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                    {hitDetail(hit)}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  },
                )}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
