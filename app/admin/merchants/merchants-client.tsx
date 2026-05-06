"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createMerchant,
  deleteMerchant,
  updateMerchant,
} from "@/lib/actions/master";
import type { Merchant } from "@/db/schema";

export function MerchantsClient({ initial }: { initial: Merchant[] }) {
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
      logoUrl: (fd.get("logoUrl") as string) || null,
      contact: (fd.get("contact") as string) || null,
      locationSummary: (fd.get("locationSummary") as string) || null,
      isActive: true,
    };
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createMerchant(input);
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
      logoUrl: (fd.get("logoUrl") as string) || null,
      contact: (fd.get("contact") as string) || null,
      locationSummary: (fd.get("locationSummary") as string) || null,
      isActive: fd.get("isActive") === "on",
    };
    startTransition(async () => {
      const result = await updateMerchant(id, input);
      if (!result.ok) setError(result.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this merchant?")) return;
    startTransition(async () => {
      const result = await deleteMerchant(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6 text-xs">
      <form
        onSubmit={handleCreate}
        className="grid gap-2 rounded border p-3 md:grid-cols-4"
      >
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="contact">Contact</Label>
          <Input id="contact" name="contact" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="locationSummary">Location summary</Label>
          <Input id="locationSummary" name="locationSummary" />
        </div>
        <div className="md:col-span-3">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input id="logoUrl" name="logoUrl" type="url" />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={pending}>
            Add merchant
          </Button>
        </div>
      </form>

      {error && <p className="text-destructive">{error}</p>}

      <table className="w-full border-collapse text-left">
        <thead className="border-b">
          <tr>
            <th className="py-1.5 font-medium">Name</th>
            <th className="py-1.5 font-medium">Location</th>
            <th className="py-1.5 font-medium">Contact</th>
            <th className="py-1.5 font-medium">Active</th>
            <th className="py-1.5 font-medium" />
          </tr>
        </thead>
        <tbody>
          {initial.map((m) =>
            editingId === m.id ? (
              <tr key={m.id} className="border-b">
                <td colSpan={5} className="py-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(m.id, new FormData(e.currentTarget));
                    }}
                    className="grid gap-2 md:grid-cols-5"
                  >
                    <Input name="name" defaultValue={m.name} required />
                    <Input
                      name="locationSummary"
                      defaultValue={m.locationSummary ?? ""}
                      placeholder="location"
                    />
                    <Input
                      name="contact"
                      defaultValue={m.contact ?? ""}
                      placeholder="contact"
                    />
                    <Input
                      name="logoUrl"
                      defaultValue={m.logoUrl ?? ""}
                      placeholder="logo url"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={m.isActive}
                        />
                        <span>Active</span>
                      </label>
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
              <tr key={m.id} className="border-b">
                <td className="py-1.5">{m.name}</td>
                <td className="py-1.5 text-muted-foreground">
                  {m.locationSummary ?? "—"}
                </td>
                <td className="py-1.5 text-muted-foreground">
                  {m.contact ?? "—"}
                </td>
                <td className="py-1.5">
                  <Badge
                    variant={m.isActive ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {m.isActive ? "active" : "inactive"}
                  </Badge>
                </td>
                <td className="py-1.5 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(m.id)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ),
          )}
          {initial.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-muted-foreground">
                No merchants yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
