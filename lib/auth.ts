import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users, type UserRoleValue } from "@/db/schema";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.trim().toLowerCase();

        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        const user = found[0];
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: UserRoleValue }).role;
      }

      // Refresh role from DB on session updates so revoked roles take effect.
      if (trigger === "update" && token.id) {
        const refreshed = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        if (refreshed[0]) token.role = refreshed[0].role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRoleValue;
      }
      return session;
    },
  },
});
