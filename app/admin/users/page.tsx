import Link from "next/link";
import { listAdminUsers } from "@/lib/queries-server/users";
import { requireRole } from "@/lib/rbac";
import { UsersClient } from "./users-client";
import { Pagination } from "@/components/site/pagination";
import type { UserRoleValue } from "@/db/schema";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS: { value: UserRoleValue | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "user", label: "User" },
  { value: "maintainer", label: "Maintainer" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("super_admin");
  const sp = await searchParams;
  const roleParam = typeof sp.role === "string" ? sp.role : "all";
  const role = (
    ROLE_OPTIONS.find((r) => r.value === roleParam)?.value ?? "all"
  ) as UserRoleValue | "all";
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const page = Number(typeof sp.page === "string" ? sp.page : "1") || 1;
  const pageSize = 25;

  const { items, total } = await listAdminUsers({
    q,
    role: role === "all" ? undefined : role,
    page,
    pageSize,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildHref = (next: { role?: string; page?: number; q?: string }) => {
    const params = new URLSearchParams();
    const r = next.role ?? (role === "all" ? undefined : role);
    if (r) params.set("role", r);
    const query = next.q ?? q;
    if (query) params.set("q", query);
    if (next.page) params.set("page", String(next.page));
    return `/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="section-label">№ 06 / Super admin</div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">
          Promote or demote any user. You cannot demote yourself.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-1">
          {ROLE_OPTIONS.map((opt) => {
            const isActive = role === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildHref({ role: opt.value, page: 1 })}
                className={
                  isActive
                    ? "border border-foreground bg-foreground px-3 py-1.5 text-[11px] font-medium text-background"
                    : "border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                }
              >
                {opt.label}
              </Link>
            );
          })}
        </div>
        <form action="/admin/users" className="flex items-center gap-2">
          {role !== "all" && <input type="hidden" name="role" value={role} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search email or name…"
            className="h-8 w-56 rounded-none border border-border bg-transparent px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="h-8 border border-border bg-card px-3 text-[11px] font-medium hover:bg-muted"
          >
            Search
          </button>
        </form>
      </div>

      <UsersClient initial={items} currentUserId={session.user.id} />

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => buildHref({ page: p })}
        />
      )}
    </div>
  );
}
