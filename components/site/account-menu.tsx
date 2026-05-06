"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Logout01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type AccountMenuProps = {
  name: string;
  email: string;
  role: string;
  signOutAction: () => Promise<void>;
};

export function AccountMenu({ name, email, role, signOutAction }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="group flex h-9 items-center gap-2 border border-border bg-card px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          />
        }
      >
        <HugeiconsIcon icon={UserIcon} strokeWidth={2} className="size-4" />
        <span className="hidden max-w-[8rem] truncate sm:inline">{name}</span>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
          {role}
        </Badge>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-3 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="text-[11px] text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />}>
          My account
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/submit" />}>
          Submit an offer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void signOutAction();
          }}
        >
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
