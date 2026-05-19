"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createBank, deleteBank, updateBank } from "@/lib/actions/master";
import type { Bank } from "@/db/schema";

type FormState = {
  name: string;
  slug: string;
  logoUrl: string;
  isActive: boolean;
};

const empty: FormState = { name: "", slug: "", logoUrl: "", isActive: true };

function BankForm({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (next: FormState) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="name" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Name
        </Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => onChange({ ...state, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="slug" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Slug
        </Label>
        <Input
          id="slug"
          value={state.slug}
          onChange={(e) => onChange({ ...state, slug: e.target.value })}
          pattern="[a-z0-9-]+"
          required
        />
      </div>
      <div>
        <Label htmlFor="logoUrl" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Logo URL
        </Label>
        <Input
          id="logoUrl"
          type="url"
          value={state.logoUrl}
          onChange={(e) => onChange({ ...state, logoUrl: e.target.value })}
          placeholder="https://…"
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={state.isActive}
          onCheckedChange={(v) => onChange({ ...state, isActive: !!v })}
        />
        <span>Active</span>
      </label>
    </div>
  );
}

export function BanksClient({ initial }: { initial: Bank[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState<FormState>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState>(empty);

  function openEdit(bank: Bank) {
    setEditId(bank.id);
    setEditState({
      name: bank.name,
      slug: bank.slug,
      logoUrl: bank.logoUrl ?? "",
      isActive: bank.isActive,
    });
  }

  function submitCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createBank({
        name: createState.name,
        slug: createState.slug,
        logoUrl: createState.logoUrl || null,
        isActive: createState.isActive,
      });
      if (!result.ok) setError(result.error);
      else {
        setCreateState(empty);
        setCreateOpen(false);
        router.refresh();
      }
    });
  }

  function submitEdit() {
    if (!editId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateBank(editId, {
        name: editState.name,
        slug: editState.slug,
        logoUrl: editState.logoUrl || null,
        isActive: editState.isActive,
      });
      if (!result.ok) setError(result.error);
      else {
        setEditId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this bank? Banks tied to live offers will be soft-deactivated instead.")) return;
    startTransition(async () => {
      const result = await deleteBank(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="ticker">
          {initial.length.toString().padStart(2, "0")} banks · {initial.filter((b) => b.isActive).length} active
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={<Button size="sm">+ New bank</Button>}
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add bank</DialogTitle>
              <DialogDescription>
                Banks appear in offer-form selectors after they are added.
              </DialogDescription>
            </DialogHeader>
            <BankForm state={createState} onChange={setCreateState} />
            {error && (
              <p className="text-[11px] text-destructive">{error}</p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitCreate} disabled={pending}>
                {pending ? "Saving…" : "Add bank"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="hidden border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Slug</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Status</TableHead>
              <TableHead className="w-1 text-right text-[10px] uppercase tracking-[0.18em]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-muted-foreground">{b.slug}</TableCell>
                <TableCell>
                  <Badge
                    variant={b.isActive ? "secondary" : "outline"}
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {b.isActive ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="xs" variant="ghost" onClick={() => openEdit(b)}>
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => handleDelete(b.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {initial.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No banks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {initial.length === 0 ? (
          <p className="border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            No banks yet.
          </p>
        ) : (
          initial.map((b) => (
            <article
              key={b.id}
              className="border border-border bg-card px-3 py-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{b.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Slug: <span className="num text-foreground">{b.slug}</span>
                  </p>
                </div>
                <Badge
                  variant={b.isActive ? "secondary" : "outline"}
                  className="shrink-0 text-[10px] uppercase tracking-wider"
                >
                  {b.isActive ? "active" : "inactive"}
                </Badge>
              </div>
              <div className="mt-2 flex justify-end gap-1 border-t border-border/60 pt-2">
                <Button size="xs" variant="ghost" onClick={() => openEdit(b)}>
                  Edit
                </Button>
                <Button size="xs" variant="ghost" onClick={() => handleDelete(b.id)}>
                  Delete
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit bank</DialogTitle>
          </DialogHeader>
          <BankForm state={editState} onChange={setEditState} />
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
