"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/site/nav-links";

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <HugeiconsIcon
          icon={open ? Cancel01Icon : Menu01Icon}
          strokeWidth={2}
        />
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-md">
          <nav className="flex flex-col px-6 py-2 lg:px-10">
            {items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "border-l-2 px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary bg-muted/40 text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
