"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InputGlass } from "@/components/crm/input-glass";
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
import {
  SETTINGS_HUB_BACK,
  SettingsV2Shell,
  useSettingsHeaderSlots,
} from "../_v2-shell";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { GlassCard } from "@/components/crm/glass-card";
import { ButtonGlass } from "@/components/crm/button-glass";
import {
  PageSegmentedControl,
  type PageSegmentItem,
} from "@/components/crm/page-toolbar";

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
  const slots = useSettingsHeaderSlots();
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

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: tags.length },
    { id: "deals", label: "Deals", count: tags.filter((t) => t.dealCount > 0).length },
    { id: "contatos", label: "Contatos", count: tags.filter((t) => t.contactCount > 0).length },
    { id: "sem-uso", label: "Sem uso", count: unusedCount },
  ];

  const filterItems: readonly PageSegmentItem[] = TABS.map((tab) => ({
    value: tab.id,
    label: (
      <span className="inline-flex items-center gap-1.5">
        {tab.label}
        <span
          className={cn(
            "min-w-[16px] rounded-full px-1 text-center text-[10px] font-bold",
            filter === tab.id
              ? "bg-[color-mix(in_srgb,var(--brand-primary)_16%,transparent)] text-[var(--brand-primary)]"
              : tab.id === "sem-uso" && tab.count > 0
                ? "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                : "bg-[var(--glass-bg-strong)] text-[var(--text-secondary)]",
          )}
        >
          {tab.count}
        </span>
      </span>
    ),
  }));

  /* Injeta filtros (pills) + limpar-sem-uso no PageHeader — padrão /contacts. */
  React.useEffect(() => {
    if (!slots) return;
    slots.setActions(
      <div className="flex items-center gap-2">
        <PageSegmentedControl
          items={filterItems}
          value={filter}
          onChange={(v) => setFilter(v as FilterTab)}
          size="compact"
          aria-label="Filtrar tags por uso"
        />
        {unusedCount > 0 && (
          <TooltipGlass label={`Remover ${unusedCount} tag(s) sem nenhum uso`} side="bottom">
            <ButtonGlass
              variant="glass"
              size="sm"
              onClick={() => bulkDeleteUnused.mutate()}
              disabled={bulkDeleteUnused.isPending}
              className="!text-[var(--color-danger)]"
            >
              <IconTrash size={14} /> Limpar sem uso ({unusedCount})
            </ButtonGlass>
          </TooltipGlass>
        )}
      </div>,
    );
    return () => slots.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, filter, unusedCount, tags.length, bulkDeleteUnused.isPending]);

  return (
    <GlassCard variant="panel" className="min-w-0 overflow-hidden">
      {/* ── Criar nova tag ── */}
      <div className="border-b border-[var(--glass-border-subtle)] p-3 sm:p-4">
        <p className="mb-3 font-display text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Nova tag
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          <InputGlass
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da tag…"
            className="min-w-0 w-full sm:flex-1"
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
              className="max-w-full shrink-0 truncate self-start rounded-full px-2.5 py-1 font-display text-[11px] font-semibold sm:self-auto"
              style={{
                background: `${newColor}22`,
                color: newColor,
                border: `1px solid ${newColor}44`,
              }}
            >
              {newName.trim()}
            </span>
          )}

          <ButtonGlass
            variant="primary"
            onClick={() =>
              newName.trim() && createMutation.mutate({ name: newName.trim(), color: newColor })
            }
            disabled={!newName.trim() || createMutation.isPending}
            className="w-full shrink-0 sm:w-auto"
          >
            <IconPlus size={15} />
            Criar
          </ButtonGlass>
        </div>
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
    </GlassCard>
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
    <div className="group flex min-w-0 items-center gap-2 px-3 py-3 transition-colors hover:bg-[var(--glass-bg-overlay)] sm:gap-3 sm:px-4">
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
        <InputGlass
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setName(tag.name); setEditing(false); }
          }}
          className="min-w-0 flex-1"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <GlassCard variant="panel" className="w-full max-w-sm p-5 sm:p-6">
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
      </GlassCard>
    </div>
  );
}
