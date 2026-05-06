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
    <div className="mx-auto max-w-sm space-y-8 py-12">
      <header className="space-y-2 text-center">
        <div className="section-label justify-center">Access</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="text-xs text-muted-foreground">
          Submit offers and track approvals.
        </p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border border-border bg-card p-6"
      >
        <div>
          <Label
            htmlFor="name"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Name
          </Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div>
          <Label
            htmlFor="email"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Email
          </Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label
            htmlFor="password"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Six characters minimum.
          </p>
        </div>
        {error && (
          <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
            {error}
          </div>
        )}
        <Button
          type="submit"
          disabled={pending}
          className="w-full"
          size="lg"
        >
          {pending ? "Creating…" : "Create account →"}
        </Button>
      </form>
      <p className="text-center text-[11px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
