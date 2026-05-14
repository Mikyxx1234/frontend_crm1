"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TAG_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#4f46e5",
  "#6b7280", "#334155",
];

type TagRow = {
  id: string;
  name: string;
  color: string;
  dealCount: number;
  contactCount: number;
};

async function fetchTags(): Promise<TagRow[]> {
  const res = await fetch(apiUrl("/api/tags?counts=1"));
  if (!res.ok) throw new Error("Erro ao carregar tags");
  return res.json();
}

export default function TagsSettingsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState(TAG_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = React.useState<TagRow | null>(null);

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags-settings"],
    queryFn: fetchTags,
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch(apiUrl("/api/tags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao criar");
      }
    },
    onSuccess: () => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag criada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string }) => {
      const res = await fetch(apiUrl(`/api/tags/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao atualizar");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/tags/${id}`), { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Erro ao excluir");
      }
    },
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag excluída");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <PageHeader
        title="Gerenciamento de Tags"
        description="Crie, edite e organize as tags disponíveis para negócios e contatos."
        icon={<TagIcon />}
      />

      {/* Create new */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white p-1">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={cn(
                "size-5 rounded-full transition-all",
                newColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : "hover:scale-105",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova tag…"
          className="h-10 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              e.preventDefault();
              createMutation.mutate({ name: newName.trim(), color: newColor });
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => newName.trim() && createMutation.mutate({ name: newName.trim(), color: newColor })}
          disabled={!newName.trim() || createMutation.isPending}
          className="h-10 gap-1.5 rounded-lg px-4"
        >
          <Plus className="size-4" />
          Criar
        </Button>
      </div>

      {/* List */}
      <div className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))
        ) : tags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
            <p className="text-sm text-slate-500">Nenhuma tag cadastrada</p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Crie tags para categorizar negócios e contatos.
            </p>
          </div>
        ) : (
          tags.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              onUpdate={(data) => updateMutation.mutate({ id: tag.id, ...data })}
              onDelete={() => setDeleteTarget(tag)}
              isPending={updateMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tag &ldquo;{deleteTarget?.name}&rdquo;</AlertDialogTitle>
            <AlertDialogDescription>
              Esta tag será removida de {deleteTarget?.dealCount ?? 0} negócio(s) e {deleteTarget?.contactCount ?? 0} contato(s). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TagRow({
  tag,
  onUpdate,
  onDelete,
  isPending,
}: {
  tag: TagRow;
  onUpdate: (data: { name?: string; color?: string }) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(tag.name);
  const [colorOpen, setColorOpen] = React.useState(false);

  const save = () => {
    if (name.trim() && name.trim() !== tag.name) {
      onUpdate({ name: name.trim() });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 transition hover:bg-[var(--color-bg-subtle)]/50">
      {/* Color dot + picker */}
      <div className="relative">
        <TooltipHost label="Alterar cor" side="top">
          <button
            type="button"
            onClick={() => setColorOpen((v) => !v)}
            className="size-5 rounded-full ring-1 ring-slate-200 transition hover:scale-110"
            style={{ backgroundColor: tag.color }}
            aria-label="Alterar cor"
          />
        </TooltipHost>
        {colorOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-border bg-white p-1.5 shadow-lg">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onUpdate({ color: c });
                  setColorOpen(false);
                }}
                className={cn(
                  "size-5 rounded-full transition-all",
                  tag.color === c ? "ring-2 ring-offset-1 ring-slate-400" : "hover:scale-105",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name */}
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setName(tag.name); setEditing(false); }
          }}
          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
          autoFocus
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {tag.name}
        </span>
      )}

      {/* Usage counts */}
      <span className="shrink-0 text-[11px] text-[var(--color-ink-muted)]">
        {tag.dealCount} deal{tag.dealCount !== 1 ? "s" : ""} · {tag.contactCount} contato{tag.contactCount !== 1 ? "s" : ""}
      </span>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <TooltipHost label="Renomear" side="top">
          <button
            type="button"
            onClick={() => { setName(tag.name); setEditing(true); }}
            disabled={isPending}
            className="rounded-md p-1.5 text-[var(--color-ink-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink-soft)]"
            aria-label="Renomear"
          >
            <Pencil className="size-3.5" />
          </button>
        </TooltipHost>
        <TooltipHost label="Excluir" side="top">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1.5 text-[var(--color-ink-muted)] transition hover:bg-red-50 hover:text-red-600"
            aria-label="Excluir"
          >
            <Trash2 className="size-3.5" />
          </button>
        </TooltipHost>
      </div>
    </div>
  );
}
