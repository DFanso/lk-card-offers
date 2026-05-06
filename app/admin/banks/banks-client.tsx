"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createBank, deleteBank, updateBank } from "@/lib/actions/master";
import type { Bank } from "@/db/schema";

export function BanksClient({ initial }: { initial: Bank[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") ?? ""),
      slug: String(fd.get("slug") ?? ""),
      logoUrl: (fd.get("logoUrl") as string) || null,
      isActive: true,
    };
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createBank(input);
      if (!result.ok) setError(result.error);
      else {
        form.reset();
        router.refresh();
      }
    });
  }

  function handleUpdate(id: string, fd: FormData) {
    const input = {
      name: String(fd.get("name") ?? ""),
      slug: String(fd.get("slug") ?? ""),
      logoUrl: (fd.get("logoUrl") as string) || null,
      isActive: fd.get("isActive") === "on",
    };
    startTransition(async () => {
      const result = await updateBank(id, input);
      if (!result.ok) setError(result.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this bank? Live-offer references will trigger soft-deactivation.")) return;
    startTransition(async () => {
      const result = await deleteBank(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6 text-xs">
      <form onSubmit={handleCreate} className="grid gap-2 rounded border p-3 md:grid-cols-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required pattern="[a-z0-9-]+" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input id="logoUrl" name="logoUrl" type="url" />
        </div>
        <div className="md:col-span-4">
          <Button type="submit" size="sm" disabled={pending}>
            Add bank
          </Button>
        </div>
      </form>

      {error && <p className="text-destructive">{error}</p>}

      <table className="w-full border-collapse text-left">
        <thead className="border-b">
          <tr>
            <th className="py-1.5 font-medium">Name</th>
            <th className="py-1.5 font-medium">Slug</th>
            <th className="py-1.5 font-medium">Active</th>
            <th className="py-1.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {initial.map((b) =>
            editingId === b.id ? (
              <tr key={b.id} className="border-b">
                <td colSpan={4} className="py-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(b.id, new FormData(e.currentTarget));
                    }}
                    className="grid gap-2 md:grid-cols-5"
                  >
                    <Input name="name" defaultValue={b.name} required />
                    <Input
                      name="slug"
                      defaultValue={b.slug}
                      required
                      pattern="[a-z0-9-]+"
                    />
                    <Input
                      name="logoUrl"
                      defaultValue={b.logoUrl ?? ""}
                      placeholder="logo url"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={b.isActive}
                      />
                      <span>Active</span>
                    </label>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={pending}>
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={b.id} className="border-b">
                <td className="py-1.5">{b.name}</td>
                <td className="py-1.5 text-muted-foreground">{b.slug}</td>
                <td className="py-1.5">
                  <Badge variant={b.isActive ? "secondary" : "outline"} className="text-[10px]">
                    {b.isActive ? "active" : "inactive"}
                  </Badge>
                </td>
                <td className="py-1.5 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(b.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(b.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ),
          )}
          {initial.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-muted-foreground">
                No banks yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
