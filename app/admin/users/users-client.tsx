"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { setUserRole } from "@/lib/actions/users";
import type { UserRoleValue } from "@/db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt: Date | string;
};

const ROLES: UserRoleValue[] = ["user", "maintainer", "admin", "super_admin"];

export function UsersClient({
  initial,
  currentUserId,
}: {
  initial: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(id: string, role: UserRoleValue) {
    setError(null);
    startTransition(async () => {
      const result = await setUserRole(id, role);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3 text-xs">
      {error && <p className="text-destructive">{error}</p>}
      <table className="w-full border-collapse text-left">
        <thead className="border-b">
          <tr>
            <th className="py-1.5 font-medium">Name</th>
            <th className="py-1.5 font-medium">Email</th>
            <th className="py-1.5 font-medium">Role</th>
            <th className="py-1.5 font-medium">Joined</th>
            <th className="py-1.5 font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {initial.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-1.5">
                {u.name}
                {u.id === currentUserId && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    you
                  </Badge>
                )}
              </td>
              <td className="py-1.5 text-muted-foreground">{u.email}</td>
              <td className="py-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {u.role}
                </Badge>
              </td>
              <td className="py-1.5 text-muted-foreground">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="py-1.5">
                <select
                  className="h-7 rounded-none border bg-transparent px-2 text-xs"
                  defaultValue={u.role}
                  disabled={pending || u.id === currentUserId}
                  onChange={(e) =>
                    handleChange(u.id, e.target.value as UserRoleValue)
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
