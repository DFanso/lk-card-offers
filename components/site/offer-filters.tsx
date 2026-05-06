"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBanks, useCardTypes, useCategories } from "@/lib/queries/master";

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

  return (
    <aside className="space-y-6 text-xs">
      <div>
        <Label htmlFor="filter-q" className="mb-1 block">
          Search
        </Label>
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
            id="filter-q"
            name="q"
            defaultValue={q}
            placeholder="Search title or description"
          />
        </form>
      </div>

      <div>
        <h3 className="mb-2 font-medium">Banks</h3>
        <div className="flex flex-col gap-1.5">
          {banks.data?.items.filter((b) => b.isActive).map((b) => (
            <label key={b.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedBanks.has(b.id)}
                onChange={() => toggle("bank", b.id)}
              />
              <span>{b.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium">Card Types</h3>
        <div className="flex flex-col gap-1.5">
          {cardTypes.data?.items.filter((c) => c.isActive).map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCardTypes.has(c.id)}
                onChange={() => toggle("cardType", c.id)}
              />
              <span>
                {c.name}{" "}
                <span className="text-muted-foreground">({c.kind})</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="filter-cat" className="mb-1 block">
          Category
        </Label>
        <select
          id="filter-cat"
          className="h-8 w-full rounded-none border bg-transparent px-2.5 text-xs"
          value={selectedCategory}
          onChange={(e) =>
            update((next) => {
              if (e.target.value) next.set("category", e.target.value);
              else next.delete("category");
            })
          }
        >
          <option value="">All</option>
          {categories.data?.items.filter((c) => c.isActive).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={reset}
        disabled={pending}
        className="w-full"
      >
        Reset filters
      </Button>
    </aside>
  );
}
