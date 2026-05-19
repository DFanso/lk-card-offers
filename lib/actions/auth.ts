"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema } from "@/lib/validation/auth";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function registerUser(input: unknown): Promise<RegisterResult> {
  const ip = await getRequestIp();
  const limit = rateLimit(`register:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many sign-up attempts. Try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`,
    };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.trim().toLowerCase();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return { ok: false, error: "Email already registered" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const inserted = await db
    .insert(users)
    .values({
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role: "user",
    })
    .returning({ id: users.id });

  return { ok: true, userId: inserted[0].id };
}
