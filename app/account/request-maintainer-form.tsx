"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestMaintainer } from "@/lib/actions/users";

export function RequestMaintainerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const note = String(fd.get("note") ?? "");

    startTransition(async () => {
      const result = await requestMaintainer(note || undefined);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-xs">
      <Textarea
        name="note"
        rows={2}
        placeholder="Tell admins why you'd like to be a maintainer (optional)"
      />
      {error && <p className="text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Submitting…" : "Request access"}
      </Button>
    </form>
  );
}
