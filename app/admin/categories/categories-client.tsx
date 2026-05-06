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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions/master";
import type { Category } from "@/db/schema";

const NONE = "__none__";

type FormState = {
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
};

const empty: FormState = { name: "", slug: "", parentId: null, isActive: true };

function CategoryForm({
  state,
  onChange,
  available,
  excludeId,
}: {
  state: FormState;
  onChange: (next: FormState) => void;
  available: Category[];
  excludeId?: string;
}) {
  const parents = available.filter((c) => c.id !== excludeId);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Name</Label>
        <Input
          value={state.name}
          onChange={(e) => onChange({ ...state, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Slug</Label>
        <Input
          value={state.slug}
          onChange={(e) => onChange({ ...state, slug: e.target.value })}
          pattern="[a-z0-9-]+"
          required
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Parent</Label>
        <Select
          value={state.parentId ?? NONE}
          onValueChange={(v) =>
            onChange({ ...state, parentId: v && v !== NONE ? v : null })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: string) => {
                if (!value || value === NONE) return "— none —";
                return parents.find((p) => p.id === value)?.name ?? "Loading…";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— none —</SelectItem>
            {parents.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

export function CategoriesClient({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState<FormState>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState>(empty);

  function openEdit(c: Category) {
    setEditId(c.id);
    setEditState({
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      isActive: c.isActive,
    });
  }

  function submitCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(createState);
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
      const result = await updateCategory(editId, editState);
      if (!result.ok) setError(result.error);
      else {
        setEditId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="ticker">
          {initial.length.toString().padStart(2, "0")} categories
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm">+ New category</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              state={createState}
              onChange={setCreateState}
              available={initial}
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitCreate} disabled={pending}>
                {pending ? "Saving…" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Slug</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Parent</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Status</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-[0.18em]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((c) => {
              const parent = initial.find((p) => p.id === c.parentId);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {parent?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={c.isActive ? "secondary" : "outline"}
                      className="text-[10px] uppercase tracking-wider"
                    >
                      {c.isActive ? "active" : "inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="xs" variant="ghost" onClick={() => openEdit(c)}>
                      Edit
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => handleDelete(c.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {initial.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No categories yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            state={editState}
            onChange={setEditState}
            available={initial}
            excludeId={editId ?? undefined}
          />
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
