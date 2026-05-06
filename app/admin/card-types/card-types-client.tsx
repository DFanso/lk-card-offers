"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createCardType,
  deleteCardType,
  updateCardType,
} from "@/lib/actions/master";
import type { CardType } from "@/db/schema";

export function CardTypesClient({ initial }: { initial: CardType[] }) {
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
      kind: fd.get("kind") as "credit" | "debit" | "other",
      isActive: true,
    };
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createCardType(input);
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
      kind: fd.get("kind") as "credit" | "debit" | "other",
      isActive: fd.get("isActive") === "on",
    };
    startTransition(async () => {
      const result = await updateCardType(id, input);
      if (!result.ok) setError(result.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this card type?")) return;
    startTransition(async () => {
      const result = await deleteCardType(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const selectClass = "h-8 w-full rounded-none border bg-transparent px-2.5 text-xs";

  return (
    <div className="space-y-6 text-xs">
      <form
        onSubmit={handleCreate}
        className="grid gap-2 rounded border p-3 md:grid-cols-3"
      >
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="kind">Kind</Label>
          <select id="kind" name="kind" className={selectClass} defaultValue="credit">
            <option value="credit">credit</option>
            <option value="debit">debit</option>
            <option value="other">other</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={pending}>
            Add card type
          </Button>
        </div>
      </form>

      {error && <p className="text-destructive">{error}</p>}

      <table className="w-full border-collapse text-left">
        <thead className="border-b">
          <tr>
            <th className="py-1.5 font-medium">Name</th>
            <th className="py-1.5 font-medium">Kind</th>
            <th className="py-1.5 font-medium">Active</th>
            <th className="py-1.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {initial.map((c) =>
            editingId === c.id ? (
              <tr key={c.id} className="border-b">
                <td colSpan={4} className="py-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(c.id, new FormData(e.currentTarget));
                    }}
                    className="grid gap-2 md:grid-cols-4"
                  >
                    <Input name="name" defaultValue={c.name} required />
                    <select name="kind" className={selectClass} defaultValue={c.kind}>
                      <option value="credit">credit</option>
                      <option value="debit">debit</option>
                      <option value="other">other</option>
                    </select>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={c.isActive}
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
              <tr key={c.id} className="border-b">
                <td className="py-1.5">{c.name}</td>
                <td className="py-1.5 text-muted-foreground">{c.kind}</td>
                <td className="py-1.5">
                  <Badge
                    variant={c.isActive ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {c.isActive ? "active" : "inactive"}
                  </Badge>
                </td>
                <td className="py-1.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(c.id)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ),
          )}
          {initial.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-muted-foreground">
                No card types yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
