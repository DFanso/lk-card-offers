"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  MaintainerRequest,
  SubmissionStatusValue,
  UserRoleValue,
} from "@/db/schema";

export type QueueItem = {
  id: string;
  payload: unknown;
  status: SubmissionStatusValue;
  createdAt: string;
  submittedById: string;
  submittedByName: string | null;
  submittedByEmail: string | null;
};

export function useMaintainerQueue() {
  return useQuery({
    queryKey: ["maintainer-queue"],
    queryFn: async (): Promise<{ items: QueueItem[] }> => {
      const res = await fetch("/api/maintainer/queue");
      if (!res.ok) throw new Error("Failed to load queue");
      return res.json();
    },
  });
}

export type MaintainerRequestRow = MaintainerRequest & {
  userName: string | null;
  userEmail: string | null;
};

export function useMaintainerRequests() {
  return useQuery({
    queryKey: ["maintainer-requests"],
    queryFn: async (): Promise<{ items: MaintainerRequestRow[] }> => {
      const res = await fetch("/api/admin/maintainer-requests");
      if (!res.ok) throw new Error("Failed to load requests");
      return res.json();
    },
  });
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt: string;
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<{ items: AdminUserRow[] }> => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });
}
