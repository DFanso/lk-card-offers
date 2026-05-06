"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  Bank,
  CardType,
  Category,
  Merchant,
} from "@/db/schema";

export function useBanks() {
  return useQuery({
    queryKey: ["banks"],
    queryFn: async (): Promise<{ items: Bank[] }> => {
      const res = await fetch("/api/banks");
      if (!res.ok) throw new Error("Failed to load banks");
      return res.json();
    },
  });
}

export function useCardTypes() {
  return useQuery({
    queryKey: ["card-types"],
    queryFn: async (): Promise<{ items: CardType[] }> => {
      const res = await fetch("/api/card-types");
      if (!res.ok) throw new Error("Failed to load card types");
      return res.json();
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<{ items: Category[] }> => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });
}

export function useMerchants() {
  return useQuery({
    queryKey: ["merchants"],
    queryFn: async (): Promise<{ items: Merchant[] }> => {
      const res = await fetch("/api/merchants");
      if (!res.ok) throw new Error("Failed to load merchants");
      return res.json();
    },
  });
}
