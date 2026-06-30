"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconBriefcase,
  IconCheck,
  IconPencil,
  IconPlus,
  IconTag,
  IconTrash,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type TagRow = {
  id: string;
  name: string;
  color: string;
  dealCount: number;
  contactCount: number;
};

type FilterTab = "todos" | "deals" | "contatos" | "sem-uso";

const TAG_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#4f46e5",
  "#6b7280", "#334155",
];

// ─────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────

async function fetchTags(): Promise<TagRow[]> {
  const res = await fetch(apiUrl("/api/tags?counts=1"));
  if (!res.ok) throw new Error("Erro ao carregar tags");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export default function TagsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Tags"
      description="Etiquetas de classificação para contatos e negócios"
    >
      <TagsPage />
    </SettingsV2Shell>
  );
}

function TagsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<FilterTab>("todos");
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
        throw new Error((err as { message?: string }).message ?? "Erro ao criar");
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
        throw new Error((err as { message?: string }).message ?? "Erro ao atualizar");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags-settings"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/tags/${id}`), { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao excluir");
      }
    },
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tag excluída");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkDeleteUnused = useMutation({
    mutationFn: async () => {
      const unused = tags.filter((t) => t.dealCount === 0 && t.contactCount === 0);
      await Promise.all(
        unused.map((t) =>
          fetch(apiUrl(`/api/tags/${t.id}`), { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error(`Falha ao excluir "${t.name}"`);
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags-settings"] });
      toast.success("Tags sem uso removidas");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unusedCount = tags.filter((t) => t.dealCount === 0 && t.contactCount === 0).length;

  const filtered = React.useMemo(() => {
    if (filter === "deals") return tags.filter((t) => t.dealCount > 0);
    if (filter === "contatos") return tags.filter((t) => t.contactCount > 0);
    if (filter === "sem-uso") return tags.filter((t) => t.dealCount === 0 && t.contactCount === 0);
    return tags;
  }, [tags, filter]);

  const TABS: { id: FilterTab; label: string; count?: number }[] = [
    { id: "todos", label: "Todos", count: tags.length },
    { id: "deals", label: "Deals", count: tags.filter((t) => t.dealCount > 0).length },
    { id: "contatos", label: "Contatos", count: tags.filter((t) => t.contactCount > 0).length },
    { id: "sem-uso", label: "Sem uso", count: unusedCount },
  ];

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow)] backdrop-blur-md">
      {/* ── Criar nova tag ── */}
      <div className="border-b border-[var(--glass-border-subtle)] p-4">
        <p className="mb-3 font-display text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Nova tag
        </p>
        <div className="flex items-center gap-2">
          {/* Color picker */}
          <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1.5">
            {TAG_COLORS.map((c) => (
              <TooltipGlass key={c} label={c} side="top">
                <button
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn(
                    "size-5 rounded-full transition-all",
                    newColor === c
                      ? "scale-110 ring-2 ring-offset-1 ring-[var(--glass-border)]"
                      : "hover:scale-105",
                  )}
                  style={{ backgroundColor: c }}
                />
              </TooltipGlass>
            ))}
          </div>

          {/* Name input */}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da tag…"
            className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-display text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                e.preventDefault();
                createMutation.mutate({ name: newName.trim(), color: newColor });
              }
            }}
          />

          {/* Preview */}
          {newName.trim() && (
            <span
              className="shrink-0 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold"
              style={{
                background: `${newColor}22`,
                color: newColor,
                border: `1px solid ${newColor}44`,
              }}
            >
              {newName.trim()}
            </span>
          )}

          <button
            type="button"
            onClick={() =>
              newName.trim() && createMutation.mutate({ name: newName.trim(), color: newColor })
            }
            disabled={!newName.trim() || createMutation.isPending}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-4 font-display text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <IconPlus size={15} />
            Criar
          </button>
        </div>
      </div>

      {/* ── Filtros + ação bulk ── */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[12px] font-semibold transition-colors",
                filter === tab.id
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold",
                    filter === tab.id
                      ? "bg-[color-mix(in_srgb,white_20%,transparent)] text-white"
                      : tab.id === "sem-uso" && (tab.count ?? 0) > 0
                        ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                        : "bg-[var(--glass-bg-strong)] text-[var(--text-secondary)]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {unusedCount > 0 && (
          <TooltipGlass label={`Remover ${unusedCount} tag(s) sem nenhum uso`} side="top">
            <button
              type="button"
              onClick={() => bulkDeleteUnused.mutate()}
              disabled={bulkDeleteUnused.isPending}
              className="flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 px-3 font-display text-[12px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/8 disabled:opacity-50"
            >
              <IconTrash size={13} />
              Limpar sem uso ({unusedCount})
            </button>
          </TooltipGlass>
        )}
      </div>

      {/* ── Lista de tags ── */}
      <div>
        {isLoading ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <IconTag size={32} className="text-[var(--text-muted)] opacity-40" />
            <p className="font-display text-sm font-semibold text-[var(--text-muted)]">
              {filter === "sem-uso" ? "Nenhuma tag sem uso" : "Nenhuma tag encontrada"}
            </p>
            {filter !== "todos" && (
              <button
                type="button"
                onClick={() => setFilter("todos")}
                className="font-display text-xs text-[var(--brand-primary)] hover:underline"
              >
                Ver todas
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            {filtered.map((tag) => (
              <TagRowItem
                key={tag.id}
                tag={tag}
                onUpdate={(data) => updateMutation.mutate({ id: tag.id, ...data })}
                onDelete={() => setDeleteTarget(tag)}
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Confirm delete ── */}
      {deleteTarget && (
        <DeleteConfirmDialog
          tag={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tag Row
// ─────────────────────────────────────────────────────────────────

function TagRowItem({
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

  const isUnused = tag.dealCount === 0 && tag.contactCount === 0;

  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--glass-bg-overlay)]">
      {/* Color dot + picker */}
      <div className="relative">
        <TooltipGlass label="Alterar cor" side="top">
          <button
            type="button"
            onClick={() => setColorOpen((v) => !v)}
            className="size-5 shrink-0 rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: tag.color }}
            aria-label="Alterar cor"
          />
        </TooltipGlass>
        {colorOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-2 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onUpdate({ color: c });
                  setColorOpen(false);
                }}
                className={cn(
                  "size-5 rounded-full transition-all hover:scale-105",
                  tag.color === c ? "ring-2 ring-offset-1 ring-[var(--glass-border)]" : "",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tag preview chip */}
      <span
        className="shrink-0 rounded-full px-2 py-0.5 font-display text-[10.5px] font-semibold"
        style={{
          background: `${tag.color}22`,
          color: tag.color,
          border: `1px solid ${tag.color}44`,
        }}
      >
        {tag.name}
      </span>

      {/* Name (editable) */}
      {editing ? (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setName(tag.name); setEditing(false); }
          }}
          className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--brand-primary)]/30 bg-[var(--glass-bg-overlay)] px-2 py-1 font-display text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
          autoFocus
        />
      ) : (
        <span className="min-w-0 flex-1 truncate font-display text-sm font-medium text-[var(--text-primary)]">
          {tag.name}
        </span>
      )}

      {/* Usage pills */}
      <div className="flex shrink-0 items-center gap-1.5">
        {isUnused ? (
          <span className="rounded-full border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/8 px-2 py-0.5 font-display text-[10px] font-semibold text-[var(--color-danger)]">
            Sem uso
          </span>
        ) : (
          <>
            {tag.dealCount > 0 && (
              <TooltipGlass label={`${tag.dealCount} deal${tag.dealCount !== 1 ? "s" : ""}`} side="top">
                <span className="flex items-center gap-1 rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 font-display text-[10.5px] font-semibold text-[var(--text-secondary)]">
                  <IconBriefcase size={10} />
                  {tag.dealCount}
                </span>
              </TooltipGlass>
            )}
            {tag.contactCount > 0 && (
              <TooltipGlass label={`${tag.contactCount} contato${tag.contactCount !== 1 ? "s" : ""}`} side="top">
                <span className="flex items-center gap-1 rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 font-display text-[10.5px] font-semibold text-[var(--text-secondary)]">
                  <IconUser size={10} />
                  {tag.contactCount}
                </span>
              </TooltipGlass>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {editing ? (
          <button
            type="button"
            onClick={save}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
          >
            <IconCheck size={14} />
          </button>
        ) : (
          <TooltipGlass label="Renomear" side="top">
            <button
              type="button"
              onClick={() => { setName(tag.name); setEditing(true); }}
              disabled={isPending}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
            >
              <IconPencil size={13} />
            </button>
          </TooltipGlass>
        )}
        <TooltipGlass label="Excluir" side="top">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)]"
          >
            <IconTrash size={13} />
          </button>
        </TooltipGlass>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Delete confirm dialog (DS v2 glass)
// ─────────────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  tag,
  onConfirm,
  onCancel,
  isPending,
}: {
  tag: TagRow;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-6 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)]/12">
            <IconTrash size={18} className="text-[var(--color-danger)]" />
          </div>
          <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)]">
            Excluir tag
          </h3>
        </div>
        <p className="mb-5 font-display text-sm text-[var(--text-muted)]">
          A tag{" "}
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}44` }}
          >
            {tag.name}
          </span>{" "}
          será removida de <strong>{tag.dealCount}</strong> deal(s) e{" "}
          <strong>{tag.contactCount}</strong> contato(s). Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-2 font-display text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-[var(--color-danger)] px-4 py-2 font-display text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}
