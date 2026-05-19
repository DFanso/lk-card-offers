"use client";

import { useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { useTheme } from "@/components/providers/theme-provider";

function subscribeMount(callback: () => void) {
  queueMicrotask(callback);
  return () => {};
}

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeMount,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <span aria-hidden className="block h-9 w-9 border border-transparent" />
    );
  }

  const isDark = resolved === "dark";
  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
    >
      <HugeiconsIcon
        icon={isDark ? Sun03Icon : Moon02Icon}
        size={16}
        strokeWidth={1.75}
      />
    </button>
  );
}
