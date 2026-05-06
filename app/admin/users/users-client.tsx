"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setUserRole } from "@/lib/actions/users";
import type { UserRoleValue } from "@/db/schema";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  createdAt: Date | string;
};

const ROLES: { value: UserRoleValue; label: string }[] = [
  { value: "user", label: "User" },
  { value: "maintainer", label: "Maintainer" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

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
    <div className="space-y-4">
      {error && (
        <div className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          {error}
        </div>
      )}
      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Email</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Current role</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Joined</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === currentUserId && (
                    <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                      you
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground num">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={(v) =>
                      v && handleChange(u.id, v as UserRoleValue)
                    }
                    disabled={pending || u.id === currentUserId}
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
