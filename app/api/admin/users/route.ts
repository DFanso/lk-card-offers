import { listAdminUsers } from "@/lib/queries-server/users";
import { AuthError, requireRole } from "@/lib/rbac";
import { userRole, type UserRoleValue } from "@/db/schema";

export async function GET(req: Request) {
  try {
    await requireRole("super_admin");
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const roleParam = url.searchParams.get("role") ?? undefined;
  const role = roleParam && (userRole.enumValues as readonly string[]).includes(roleParam)
    ? (roleParam as UserRoleValue)
    : undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? "25") || 25),
  );

  const { items, total } = await listAdminUsers({ q, role, page, pageSize });
  return Response.json({ items, total, page, pageSize });
}
