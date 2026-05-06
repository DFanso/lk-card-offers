"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");

    startTransition(async () => {
      const result = await registerUser({ name, email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError("Account created. Please sign in.");
        router.push("/login");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <h1 className="text-base font-semibold">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
