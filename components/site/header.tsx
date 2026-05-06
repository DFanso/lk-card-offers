import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { roleAtLeast } from "@/lib/rbac";

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            LK Card Offers
          </Link>
          <nav className="flex items-center gap-4 text-xs">
            <Link href="/offers" className="text-muted-foreground hover:text-foreground">
              Offers
            </Link>
            {session?.user && (
              <Link href="/submit" className="text-muted-foreground hover:text-foreground">
                Submit
              </Link>
            )}
            {roleAtLeast(role, "maintainer") && (
              <Link
                href="/maintainer"
                className="text-muted-foreground hover:text-foreground"
              >
                Maintainer
              </Link>
            )}
            {roleAtLeast(role, "admin") && (
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Link
                href="/account"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {session.user.name}
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
