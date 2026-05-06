import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <h1 className="text-base font-semibold">Sign in</h1>
      <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
