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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createMerchant,
  deleteMerchant,
  updateMerchant,
} from "@/lib/actions/master";
import type { Merchant } from "@/db/schema";

type FormState = {
  name: string;
  logoUrl: string;
  contact: string;
  locationSummary: string;
  isActive: boolean;
};

const empty: FormState = {
  name: "",
  logoUrl: "",
  contact: "",
  locationSummary: "",
  isActive: true,
};

function MerchantForm({
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
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Location summary</Label>
        <Input
          value={state.locationSummary}
          onChange={(e) =>
            onChange({ ...state, locationSummary: e.target.value })
          }
          placeholder="e.g. Colombo, Galle, Island-wide"
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Contact</Label>
        <Input
          value={state.contact}
          onChange={(e) => onChange({ ...state, contact: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Logo URL</Label>
        <Input
          type="url"
          value={state.logoUrl}
          onChange={(e) => onChange({ ...state, logoUrl: e.target.value })}
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

export function MerchantsClient({ initial }: { initial: Merchant[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createState, setCreateState] = useState<FormState>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<FormState>(empty);

  function openEdit(m: Merchant) {
    setEditId(m.id);
    setEditState({
      name: m.name,
      logoUrl: m.logoUrl ?? "",
      contact: m.contact ?? "",
      locationSummary: m.locationSummary ?? "",
      isActive: m.isActive,
    });
  }

  function submitCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createMerchant({
        ...createState,
        logoUrl: createState.logoUrl || null,
        contact: createState.contact || null,
        locationSummary: createState.locationSummary || null,
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
      const result = await updateMerchant(editId, {
        ...editState,
        logoUrl: editState.logoUrl || null,
        contact: editState.contact || null,
        locationSummary: editState.locationSummary || null,
      });
      if (!result.ok) setError(result.error);
      else {
        setEditId(null);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="ticker">
          {initial.length.toString().padStart(2, "0")} merchants
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button size="sm">+ New merchant</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add merchant</DialogTitle>
            </DialogHeader>
            <MerchantForm state={createState} onChange={setCreateState} />
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
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Location</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Contact</TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.18em]">Status</TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-[0.18em]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-muted-foreground">{m.locationSummary ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{m.contact ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={m.isActive ? "secondary" : "outline"}
                    className="text-[10px] uppercase tracking-wider"
                  >
                    {m.isActive ? "active" : "inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="xs" variant="ghost" onClick={() => openEdit(m)}>
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => handleDelete(m.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {initial.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No merchants yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit merchant</DialogTitle>
          </DialogHeader>
          <MerchantForm state={editState} onChange={setEditState} />
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
