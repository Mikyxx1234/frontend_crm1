"use client";

/*
 * Popover de filtros do Kanban v2. Filtros sao aplicados client-side
 * sobre o board (board ja vem completo, filtrar local evita ida ao
 * backend e mantem a UX rapida).
 *
 * Filtros expostos:
 *   - Responsavel: lista multi-select de TeamUser.
 *   - Tag: lista multi-select de DealTag.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconX } from "@tabler/icons-react";

import { useDealTags, useTeamUsers } from "@/features/pipeline-v2/hooks";

export interface KanbanFilters {
  ownerIds: string[];
  tagIds: string[];
}

export const EMPTY_FILTERS: KanbanFilters = { ownerIds: [], tagIds: [] };

export function countActiveFilters(f: KanbanFilters): number {
  return f.ownerIds.length + f.tagIds.length;
}

interface FiltersPopoverProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  filters: KanbanFilters;
  onChange: (next: KanbanFilters) => void;
}

export function FiltersPopover({
  open,
  anchorRef,
  onClose,
  filters,
  onChange,
}: FiltersPopoverProps) {
  const { data: users = [] } = useTeamUsers(open);
  const { data: tags = [] } = useDealTags();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click outside
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(t) &&
        anchorRef.current &&
        !anchorRef.current.contains(t)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, anchorRef, onClose]);

  // ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 6 : 80;
  const right = rect
    ? Math.max(8, window.innerWidth - rect.right)
    : 16;

  function toggleOwner(id: string) {
    const has = filters.ownerIds.includes(id);
    onChange({
      ...filters,
      ownerIds: has
        ? filters.ownerIds.filter((x) => x !== id)
        : [...filters.ownerIds, id],
    });
  }

  function toggleTag(id: string) {
    const has = filters.tagIds.includes(id);
    onChange({
      ...filters,
      tagIds: has
        ? filters.tagIds.filter((x) => x !== id)
        : [...filters.tagIds, id],
    });
  }

  const active = countActiveFilters(filters);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] w-[320px] rounded-[var(--radius-lg)] border shadow-2xl"
      style={{
        top,
        right,
        background: "rgba(255, 255, 255, 0.98)",
        borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
        isolation: "isolate",
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-center justify-between border-b px-3.5 py-2.5"
        style={{ borderColor: "var(--glass-border, rgba(0,0,0,0.08))" }}
      >
        <span className="font-display text-[12px] font-bold uppercase tracking-wider text-[var(--text-primary,#1a202c)]">
          Filtros {active > 0 ? `(${active})` : ""}
        </span>
        <div className="flex items-center gap-2">
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="font-display text-[11px] font-semibold text-[var(--text-muted,#718096)] hover:text-[var(--brand-primary,#5b6ff5)]"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted,#718096)] hover:text-[var(--text-primary,#1a202c)]"
            aria-label="Fechar"
          >
            <IconX size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {/* RESPONSAVEL */}
        <FilterSection title="Responsavel">
          {users.length === 0 ? (
            <Empty label="Nenhum usuario disponivel" />
          ) : (
            users.map((u) => {
              const checked = filters.ownerIds.includes(u.id);
              return (
                <FilterRow
                  key={u.id}
                  label={u.name ?? "Sem nome"}
                  sub={u.email ?? undefined}
                  checked={checked}
                  onToggle={() => toggleOwner(u.id)}
                />
              );
            })
          )}
        </FilterSection>

        {/* TAGS */}
        <FilterSection title="Tags">
          {tags.length === 0 ? (
            <Empty label="Nenhuma tag cadastrada" />
          ) : (
            tags.map((t) => {
              const checked = filters.tagIds.includes(t.id);
              return (
                <FilterRow
                  key={t.id}
                  label={t.name}
                  swatch={t.color ?? undefined}
                  checked={checked}
                  onToggle={() => toggleTag(t.id)}
                />
              );
            })
          )}
        </FilterSection>
      </div>
    </div>,
    document.body,
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-2 py-1.5 font-display text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted,#718096)]">
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function FilterRow({
  label,
  sub,
  swatch,
  checked,
  onToggle,
}: {
  label: string;
  sub?: string;
  swatch?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left hover:bg-black/5"
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
        style={{
          background: checked ? "var(--brand-primary, #5b6ff5)" : "transparent",
          borderColor: checked
            ? "var(--brand-primary, #5b6ff5)"
            : "var(--glass-border, rgba(0,0,0,0.15))",
        }}
      >
        {checked ? <IconCheck size={11} color="#fff" stroke={3} /> : null}
      </span>
      {swatch ? (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{
            background: swatch,
            border: `1px solid ${swatch}99`,
          }}
        />
      ) : null}
      <span className="min-w-0 flex-1">
        <div className="truncate font-display text-[12.5px] font-semibold text-[var(--text-primary,#1a202c)]">
          {label}
        </div>
        {sub ? (
          <div className="truncate text-[10.5px] text-[var(--text-muted,#718096)]">
            {sub}
          </div>
        ) : null}
      </span>
    </button>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="px-2 py-2 text-[11.5px] italic text-[var(--text-muted,#718096)]">
      {label}
    </div>
  );
}
