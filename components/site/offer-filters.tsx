"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBanks, useCardTypes, useCategories } from "@/lib/queries/master";

const CATEGORY_ALL = "__all__";

export function OfferFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const banks = useBanks();
  const cardTypes = useCardTypes();
  const categories = useCategories();

  const selectedBanks = new Set(params.getAll("bank"));
  const selectedCardTypes = new Set(params.getAll("cardType"));
  const selectedCategory = params.get("category") ?? "";
  const q = params.get("q") ?? "";

  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    startTransition(() => {
      router.push(`/offers?${next.toString()}`);
    });
  };

  const toggle = (key: string, value: string) =>
    update((next) => {
      const all = next.getAll(key);
      next.delete(key);
      if (all.includes(value)) {
        all.filter((v) => v !== value).forEach((v) => next.append(key, v));
      } else {
        [...all, value].forEach((v) => next.append(key, v));
      }
    });

  const reset = () => startTransition(() => router.push("/offers"));

  const activeCount =
    selectedBanks.size +
    selectedCardTypes.size +
    (selectedCategory ? 1 : 0) +
    (q ? 1 : 0);

  return (
    <aside className="space-y-6">
      <div className="border border-border bg-card">
        <div className="panel-header">
          <span>Filters</span>
          <span className="num text-foreground">{activeCount.toString().padStart(2, "0")}</span>
        </div>
        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <div className="section-label">Search</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                update((next) => {
                  const v = String(formData.get("q") ?? "").trim();
                  if (v) next.set("q", v);
                  else next.delete("q");
                });
              }}
            >
              <Input
                name="q"
                defaultValue={q}
                placeholder="Title or description…"
              />
            </form>
          </div>

          <div className="space-y-2">
            <div className="section-label">Category</div>
            <Select
              value={selectedCategory || CATEGORY_ALL}
              onValueChange={(v) =>
                update((next) => {
                  if (v && v !== CATEGORY_ALL) next.set("category", v);
                  else next.delete("category");
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories">
                  {(value: string) => {
                    if (!value || value === CATEGORY_ALL) return "All categories";
                    return (
                      categories.data?.items.find((c) => c.id === value)?.name ??
                      "Loading…"
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CATEGORY_ALL}>All categories</SelectItem>
                {categories.data?.items
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="section-label">Banks</div>
            <div className="space-y-1.5">
              {banks.isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))
                : banks.data?.items
                    .filter((b) => b.isActive)
                    .map((b) => (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Checkbox
                          checked={selectedBanks.has(b.id)}
                          onCheckedChange={() => toggle("bank", b.id)}
                        />
                        <span>{b.name}</span>
                      </label>
                    ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="section-label">Card types</div>
            <div className="space-y-1.5">
              {cardTypes.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))
                : cardTypes.data?.items
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Checkbox
                          checked={selectedCardTypes.has(c.id)}
                          onCheckedChange={() => toggle("cardType", c.id)}
                        />
                        <span className="flex-1">{c.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          {c.kind}
                        </span>
                      </label>
                    ))}
            </div>
          </div>
        </div>
        <div className="border-t border-border p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={pending || activeCount === 0}
            className="w-full"
          >
            Reset all filters
          </Button>
        </div>
      </div>
    </aside>
  );
}
