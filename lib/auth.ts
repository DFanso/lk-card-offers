import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          // Add your own database logic here to verify the user
          // For now, this is a placeholder that always works with dummy data
          if (email === "user@example.com" && password === "123456") {
            return { id: "1", name: "User", email: "user@example.com" };
          }
        }

        return null;
      },
    }),
  ],
});
