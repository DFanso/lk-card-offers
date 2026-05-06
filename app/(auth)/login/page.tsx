import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-8 py-12">
      <header className="space-y-2 text-center">
        <div className="section-label justify-center">Access</div>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-xs text-muted-foreground">
          Welcome back to the wire.
        </p>
      </header>
      <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
