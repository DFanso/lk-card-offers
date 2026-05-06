"use client";

import { useQuery } from "@tanstack/react-query";
import type { PublicOfferListItem } from "@/lib/queries-server/offers";

export type OfferFilters = {
  bankIds?: string[];
  cardTypeIds?: string[];
  categoryId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

function buildQuery(filters: OfferFilters): string {
  const params = new URLSearchParams();
  filters.bankIds?.forEach((id) => params.append("bank", id));
  filters.cardTypeIds?.forEach((id) => params.append("cardType", id));
  if (filters.categoryId) params.set("category", filters.categoryId);
  if (filters.q) params.set("q", filters.q);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  return params.toString();
}

export function useOffers(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: ["offers", filters],
    queryFn: async (): Promise<{
      items: PublicOfferListItem[];
      total: number;
    }> => {
      const qs = buildQuery(filters);
      const res = await fetch(`/api/offers${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load offers");
      return res.json();
    },
  });
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: ["offer", id],
    queryFn: async (): Promise<PublicOfferListItem> => {
      const res = await fetch(`/api/offers/${id}`);
      if (!res.ok) throw new Error("Failed to load offer");
      return res.json();
    },
    enabled: Boolean(id),
  });
}
