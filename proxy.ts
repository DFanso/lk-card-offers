import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_RANK } from "@/lib/rbac";
import type { UserRoleValue } from "@/db/schema";

const PROTECTED_PREFIXES: { prefix: string; min: UserRoleValue }[] = [
  { prefix: "/admin/users", min: "super_admin" },
  { prefix: "/admin", min: "admin" },
  { prefix: "/maintainer", min: "maintainer" },
  { prefix: "/submit", min: "user" },
  { prefix: "/account", min: "user" },
];

export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const session = req.auth;

  const match = PROTECTED_PREFIXES.find((p) => path.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  const userRank = ROLE_RANK[session.user.role] ?? 0;
  const minRank = ROLE_RANK[match.min];
  if (userRank < minRank) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Skip the middleware for paths that must be served as raw static
  // files. If the middleware runs on `/uploads/*`, Auth.js attaches
  // CSRF cookies and the request gets handled by the dynamic router
  // instead of Next.js's `/public/*` static handler — which means every
  // user-uploaded offer image and every scraper-downloaded People's
  // Bank image 404s.
  //
  // Convention metadata routes (`/icon.svg`, `/opengraph-image.png`,
  // `/apple-icon.svg`, `/manifest.webmanifest`, `/robots.txt`,
  // `/sitemap.xml`) are emitted as Next.js routes and are safe to leave
  // in the matcher — but excluding `uploads` is mandatory.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
