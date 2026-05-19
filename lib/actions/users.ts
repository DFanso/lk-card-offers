"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  maintainerRequests,
  users,
  type UserRoleValue,
} from "@/db/schema";
import { requireRole, requireSession } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function requestMaintainer(note?: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const limit = rateLimit(`maintainer-request:${session.user.id}`, 3, 60 * 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many requests. Try again in ${Math.ceil(limit.retryAfterMs / 60_000)} min.`,
    };
  }

  // Already a maintainer or higher → no-op
  const role = session.user.role;
  if (role === "maintainer" || role === "admin" || role === "super_admin") {
    return { ok: false, error: "You already have maintainer access" };
  }

  const existing = await db
    .select({ id: maintainerRequests.id })
    .from(maintainerRequests)
    .where(
      and(
        eq(maintainerRequests.userId, session.user.id),
        eq(maintainerRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return { ok: false, error: "You already have a pending request" };
  }

  await db.insert(maintainerRequests).values({
    userId: session.user.id,
    note: note ?? null,
  });
  revalidatePath("/account");
  revalidatePath("/admin/maintainer-requests");
  return { ok: true };
}

export async function approveMaintainerRequest(
  requestId: string,
  note?: string,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const found = await db
    .select()
    .from(maintainerRequests)
    .where(eq(maintainerRequests.id, requestId))
    .limit(1);
  const request = found[0];
  if (!request) return { ok: false, error: "Request not found" };
  if (request.status !== "pending") {
    return { ok: false, error: "Request already reviewed" };
  }

  await db
    .update(maintainerRequests)
    .set({
      status: "approved",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      note: note ?? request.note,
    })
    .where(eq(maintainerRequests.id, requestId));

  await db
    .update(users)
    .set({ role: "maintainer", updatedAt: new Date() })
    .where(eq(users.id, request.userId));

  revalidatePath("/admin/maintainer-requests");
  return { ok: true };
}

export async function rejectMaintainerRequest(
  requestId: string,
  note?: string,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  await db
    .update(maintainerRequests)
    .set({
      status: "rejected",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      note: note ?? null,
    })
    .where(eq(maintainerRequests.id, requestId));

  revalidatePath("/admin/maintainer-requests");
  return { ok: true };
}

export async function setUserRole(
  userId: string,
  role: UserRoleValue,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireRole("super_admin");
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  if (userId === session.user.id && role !== "super_admin") {
    return { ok: false, error: "You cannot demote yourself" };
  }
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}
