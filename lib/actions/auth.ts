"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema } from "@/lib/validation/auth";

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

export async function registerUser(input: unknown): Promise<RegisterResult> {
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
