import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { roleAtLeast } from "@/lib/rbac";

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

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-7 w-full items-center justify-between gap-4 px-6 lg:px-10 2xl:px-14 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="num">{stamp}</span>
          <span aria-hidden>·</span>
          <span>Colombo</span>
          <span aria-hidden>·</span>
          <span>Vol 01 / Iss 01</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Sri Lanka Card Offers Wire</span>
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
        </div>
      </div>
      <Separator />
      <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-6 lg:px-10 2xl:px-14">
        <Link href="/" className="group flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-[-0.01em] text-foreground">
            LK / Card Offers
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            {"// ticker of the wallet"}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-[11px] uppercase tracking-[0.2em] md:flex">
          <Link
            href="/offers"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Offers
          </Link>
          {session?.user && (
            <Link
              href="/submit"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Submit
            </Link>
          )}
          {roleAtLeast(role, "maintainer") && (
            <Link
              href="/maintainer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Maintainer
            </Link>
          )}
          {roleAtLeast(role, "admin") && (
            <Link
              href="/admin"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link
                href="/account"
                className="hidden items-center gap-2 sm:flex"
              >
                <Badge variant="outline" className="text-[10px] uppercase">
                  {session.user.role}
                </Badge>
                <span className="text-xs text-foreground">
                  {session.user.name}
                </span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
