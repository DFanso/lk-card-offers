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
  createCardType,
  deleteCardType,
  updateCardType,
} from "@/lib/actions/master";
import type { CardType, CardTypeKindValue } from "@/db/schema";

const KINDS: { value: CardTypeKindValue; label: string }[] = [
  { value: "credit", label: "Credit" },
  { value: "debit", label: "Debit" },
  { value: "other", label: "Other" },
];

type FormState = {
  name: string;
  kind: CardTypeKindValue;
  isActive: boolean;
};

const empty: FormState = { name: "", kind: "credit", isActive: true };

function CardTypeForm({
  state,
  onChange,
}: {
  state: FormState;
  onChange: (next: FormState) => void;
}) {
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
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Kind</Label>
        <Select
          value={state.kind}
          onValueChange={(v) =>
            onChange({ ...state, kind: (v as CardTypeKindValue) ?? "credit" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
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

export function CardTypesClient({ initial }: { initial: CardType[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState<FormState>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState>(empty);

  function openEdit(c: CardType) {
    setEditId(c.id);
    setEditState({ name: c.name, kind: c.kind, isActive: c.isActive });
  }

  function submitCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createCardType(createState);
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
      const result = await updateCardType(editId, editState);
      if (!result.ok) setError(result.error);
      else {
        setEditId(null);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="ticker">
          {initial.length.toString().padStart(2, "0")} types · {initial.filter((c) => c.isActive).length} active
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm">+ New card type</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add card type</DialogTitle>
            </DialogHeader>
            <CardTypeForm state={createState} onChange={setCreateState} />
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

      <div className="hidden border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Name</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Kind</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Status</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-[0.18em]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground uppercase tracking-wider text-[10px]">
                  {c.kind}
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
            ))}
            {initial.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No card types yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {initial.length === 0 ? (
          <p className="border border-dashed border-border bg-muted/20 p-6 text-center text-xs text-muted-foreground">
            No card types yet.
          </p>
        ) : (
          initial.map((c) => (
            <article
              key={c.id}
              className="border border-border bg-card px-3 py-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Kind: <span className="text-foreground">{c.kind}</span>
                  </p>
                </div>
                <Badge
                  variant={c.isActive ? "secondary" : "outline"}
                  className="shrink-0 text-[10px] uppercase tracking-wider"
                >
                  {c.isActive ? "active" : "inactive"}
                </Badge>
              </div>
              <div className="mt-2 flex justify-end gap-1 border-t border-border/60 pt-2">
                <Button size="xs" variant="ghost" onClick={() => openEdit(c)}>
                  Edit
                </Button>
                <Button size="xs" variant="ghost" onClick={() => handleDelete(c.id)}>
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
            <DialogTitle>Edit card type</DialogTitle>
          </DialogHeader>
          <CardTypeForm state={editState} onChange={setEditState} />
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
