import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { roleAtLeast } from "@/lib/rbac";
import { NavLinks, type NavItem } from "@/components/site/nav-links";
import { MobileNav } from "@/components/site/mobile-nav";
import { AccountMenu } from "@/components/site/account-menu";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;
  const today = new Date();
  const stamp = today
    .toLocaleDateString("en-LK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();

  const navItems: NavItem[] = [
    { href: "/offers", label: "Offers" },
  ];
  if (session?.user) {
    navItems.push({ href: "/submit", label: "Submit" });
  }
  if (roleAtLeast(role, "maintainer")) {
    navItems.push({ href: "/maintainer", label: "Maintainer" });
  }
  if (roleAtLeast(role, "admin")) {
    navItems.push({ href: "/admin", label: "Admin" });
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-7 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-10 2xl:px-14 text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-3 truncate">
          <span className="num shrink-0">{stamp}</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Colombo</span>
          <span aria-hidden className="hidden md:inline">·</span>
          <span className="hidden md:inline">Vol 01 / Iss 01</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden md:inline">Sri Lanka Card Offers Wire</span>
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        </div>
      </div>
      <Separator />
      <div className="relative mx-auto flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6 sm:gap-6 lg:px-10 2xl:px-14">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="text-base sm:text-lg font-semibold tracking-[-0.01em] text-foreground whitespace-nowrap">
              LK / Card Offers
            </span>
          </Link>
          <NavLinks items={navItems} />
        </div>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <AccountMenu
              name={session.user.name ?? "Account"}
              email={session.user.email ?? ""}
              role={session.user.role}
              signOutAction={signOutAction}
            />
          ) : (
            <>
              <Link href="/login" className="hidden xs:inline-block">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
          <MobileNav items={navItems} />
        </div>
      </div>
    </header>
  );
}
