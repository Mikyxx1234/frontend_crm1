/**
 * Menu de filtros salvos.
 *
 * Lista os filtros salvos (privados do usuário + compartilhados da org),
 * permite aplicar, duplicar e excluir. Edição via "Salvar filtro" reaproveita
 * o nome existente quando o usuário aplica e re-salva.
 */

"use client";

import * as React from "react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { createPortal } from "react-dom";
import { IconCopy as Copy, IconStar as Star, IconStarOff as StarOff, IconTrash as Trash2, IconUsers as UsersIcon, IconLock as Lock, IconLoader as Loader2, IconBookmark as Bookmark } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
  const [pos, setPos] = React.useState<{ top: number; right: number } | null>(
    null,
  );
  const [isDark, setIsDark] = React.useState(false);
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    function compute() {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, anchorRef]);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      // Cliques dentro do confirm dialog (portal Radix no body) não fecham o menu
      if (target instanceof Element && target.closest('[role="alertdialog"]')) return;
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

  if (!open || !pos || typeof document === "undefined") return null;

  const menu = createPortal(
    // Portal no <body> + posição fixed + cor literal inline: blindagem
    // total contra stacking/backdrop-filter de ancestrais.
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        width: 288,
        zIndex: "var(--z-popover)",
        backgroundColor: isDark ? "#1a2238" : "#ffffff",
        isolation: "isolate",
      }}
      className="rounded-[18px] border border-[var(--glass-border)] shadow-[var(--glass-shadow-lg)] dark:border-slate-700"
    >
      <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-3 py-2">
        <span className="font-display text-[12px] font-bold text-foreground">Filtros salvos</span>
        {loading && <Loader2 className="size-3 animate-spin text-[var(--color-ink-muted)]" />}
      </div>

      <div className="max-h-80 overflow-y-auto py-1">
        {filters.length === 0 && !loading && (
          <p className="px-3 py-4 text-center text-[11px] text-[var(--color-ink-muted)]">
            Nenhum filtro salvo ainda. Abra o painel, configure e clique em &ldquo;Salvar&rdquo;.
          </p>
        )}
        {filters.map((f) => {
          const isOwner = f.userId === currentUserId;
          return (
            <div
              key={f.id}
              className="group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-[var(--color-bg-hover)]"
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
                  <Bookmark className="size-3 text-blue-500 dark:text-blue-400" />
                  <span className="truncate text-[12px] font-semibold text-foreground">
                    {f.name}
                  </span>
                  {f.isDefault && (
                    <Star className="size-3 fill-amber-400 text-amber-500" aria-label="Padrão" />
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--color-ink-muted)]">
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
                <TooltipGlass label={f.isDefault ? "Remover padrão" : "Marcar como padrão"} side="top">
                  <button
                    type="button"
                    onClick={() => onToggleDefault(f)}
                    className={cn(
                      "rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-hover)] hover:text-amber-600 dark:hover:text-amber-400",
                      f.isDefault && "text-amber-500",
                    )}
                  >
                    {f.isDefault ? <StarOff className="size-3" /> : <Star className="size-3" />}
                  </button>
                </TooltipGlass>
                <TooltipGlass label="Duplicar" side="top">
                  <button
                    type="button"
                    onClick={() => onDuplicate(f)}
                    className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-hover)] hover:text-foreground"
                  >
                    <Copy className="size-3" />
                  </button>
                </TooltipGlass>
                {(isOwner || f.isShared) && (
                  <TooltipGlass label="Excluir" side="top">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirmDelete({
                          title: `Excluir filtro "${f.name}"?`,
                          confirmLabel: "Excluir",
                          destructive: true,
                        });
                        if (ok) onDelete(f);
                      }}
                      className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-hover)] hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </TooltipGlass>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      {menu}
      {confirmDialog}
    </>
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
      <div className="w-full max-w-sm rounded-[22px] border border-[var(--glass-border)] bg-[var(--color-popover)] p-5 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl">
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
            <label className="block text-[11px] font-semibold text-[var(--color-ink-soft)]">Nome</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Meus leads de hoje"
              className="mt-1 h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input)] px-3 text-sm text-foreground placeholder:text-[var(--color-ink-muted)] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {canShare && (
            <label className="flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
              />
              Compartilhar com a equipe
            </label>
          )}
          <label className="flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
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
