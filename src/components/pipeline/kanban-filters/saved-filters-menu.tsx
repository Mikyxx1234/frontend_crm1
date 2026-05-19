/**
 * Menu de filtros salvos.
 *
 * Lista os filtros salvos (privados do usuário + compartilhados da org),
 * permite aplicar, duplicar e excluir. Edição via "Salvar filtro" reaproveita
 * o nome existente quando o usuário aplica e re-salva.
 */

"use client";

import * as React from "react";
import {
  Copy,
  Star,
  StarOff,
  Trash2,
  Users as UsersIcon,
  Lock,
  Loader as Loader2,
  Bookmark,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { SavedFilter } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SavedFilter[];
  loading: boolean;
  currentUserId?: string;
  onApply: (filter: SavedFilter) => void;
  onDuplicate: (filter: SavedFilter) => void;
  onDelete: (filter: SavedFilter) => void;
  onToggleDefault: (filter: SavedFilter) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

export function SavedFiltersMenu({
  open,
  onOpenChange,
  filters,
  loading,
  currentUserId,
  onApply,
  onDuplicate,
  onDelete,
  onToggleDefault,
  anchorRef,
}: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onOpenChange, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-2 w-72 rounded-[18px] border border-white/55 bg-white/80 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/40 px-3 py-2">
        <span className="font-display text-[12px] font-bold text-foreground">Filtros salvos</span>
        {loading && <Loader2 className="size-3 animate-spin text-[var(--color-ink-muted)]" />}
      </div>

      <div className="max-h-80 overflow-y-auto py-1">
        {filters.length === 0 && !loading && (
          <p className="px-3 py-4 text-center text-[11px] text-zinc-400">
            Nenhum filtro salvo ainda. Abra o painel, configure e clique em &ldquo;Salvar&rdquo;.
          </p>
        )}
        {filters.map((f) => {
          const isOwner = f.userId === currentUserId;
          return (
            <div
              key={f.id}
              className="group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-white/45"
            >
              <button
                type="button"
                onClick={() => {
                  onApply(f);
                  onOpenChange(false);
                }}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-1.5">
                  <Bookmark className="size-3 text-blue-500" />
                  <span className="truncate text-[12px] font-semibold text-zinc-800">
                    {f.name}
                  </span>
                  {f.isDefault && (
                    <Star className="size-3 fill-amber-400 text-amber-500" aria-label="Padrão" />
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                  {f.isShared ? (
                    <span className="inline-flex items-center gap-0.5">
                      <UsersIcon className="size-2.5" /> Compartilhado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5">
                      <Lock className="size-2.5" /> Privado
                    </span>
                  )}
                  {f.user?.name && <span>· {f.user.name}</span>}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => onToggleDefault(f)}
                  title={f.isDefault ? "Remover padrão" : "Marcar como padrão"}
                  className={cn(
                    "rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-amber-600",
                    f.isDefault && "text-amber-500",
                  )}
                >
                  {f.isDefault ? <StarOff className="size-3" /> : <Star className="size-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(f)}
                  title="Duplicar"
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <Copy className="size-3" />
                </button>
                {(isOwner || f.isShared) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir filtro "${f.name}"?`)) onDelete(f);
                    }}
                    title="Excluir"
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type SaveFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  canShare?: boolean;
  onSubmit: (data: { name: string; isShared: boolean; isDefault: boolean }) => Promise<void> | void;
};

export function SaveFilterDialog({
  open,
  onOpenChange,
  defaultName = "",
  canShare = true,
  onSubmit,
}: SaveFilterDialogProps) {
  const [name, setName] = React.useState(defaultName);
  const [isShared, setIsShared] = React.useState(false);
  const [isDefault, setIsDefault] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(defaultName);
      setIsShared(false);
      setIsDefault(false);
    }
  }, [open, defaultName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[22px] border border-white/55 bg-white/80 p-5 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl">
        <h2 className="font-display text-base font-bold text-foreground">Salvar filtro</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-ink-muted)]">
          Reutilize esse conjunto de critérios depois.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            try {
              setSaving(true);
              await onSubmit({ name: name.trim(), isShared, isDefault });
              onOpenChange(false);
            } finally {
              setSaving(false);
            }
          }}
          className="mt-4 space-y-3"
        >
          <div>
            <label className="block text-[11px] font-semibold text-zinc-700">Nome</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Meus leads de hoje"
              className="mt-1 h-9 w-full rounded-md border border-zinc-200 px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {canShare && (
            <label className="flex items-center gap-2 text-[12px] text-zinc-700">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
              />
              Compartilhar com a equipe
            </label>
          )}
          <label className="flex items-center gap-2 text-[12px] text-zinc-700">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            Definir como filtro padrão do Kanban
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="text-xs" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-1 size-3 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
