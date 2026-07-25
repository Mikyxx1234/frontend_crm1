"use client";

import * as React from "react";

import { TagChip } from "@/components/crm/tag-chip";
import { cn } from "@/lib/utils";

export type TagChipOption = {
  id: string;
  name: string;
  color?: string | null;
};

export type TagChipOptionsListProps = {
  tags: TagChipOption[];
  selectedIds: ReadonlySet<string> | readonly string[];
  onToggle: (tagId: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  emptyLabel?: string;
  /** Quando definido, exibe a ação de criar tag no final da lista. */
  createLabel?: string | null;
  onCreate?: () => void;
  createDisabled?: boolean;
  className?: string;
  listClassName?: string;
};

function toSelectedSet(
  selectedIds: ReadonlySet<string> | readonly string[],
): ReadonlySet<string> {
  return selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
}

/**
 * Lista de opções de tag no visual canônico (`TagChip`), usada pelos
 * popovers/compositores de Inbox, Deal Detail e Kanban.
 */
export function TagChipOptionsList({
  tags,
  selectedIds,
  onToggle,
  disabled = false,
  isLoading = false,
  emptyLabel = "Nenhuma tag.",
  createLabel = null,
  onCreate,
  createDisabled = false,
  className,
  listClassName,
}: TagChipOptionsListProps) {
  const selected = React.useMemo(
    () => toSelectedSet(selectedIds),
    [selectedIds],
  );

  if (isLoading) {
    return (
      <p className={cn("px-1 py-2 text-[12px] text-[var(--text-muted)]", className)}>
        Carregando…
      </p>
    );
  }

  const showEmpty = tags.length === 0 && !createLabel;

  return (
    <div className={cn("max-h-56 overflow-y-auto", className)}>
      {showEmpty ? (
        <p className="px-1 py-2 text-[12px] text-[var(--text-muted)]">{emptyLabel}</p>
      ) : (
        <div
          className={cn("flex flex-wrap content-start gap-1.5 px-0.5 py-0.5", listClassName)}
        >
          {tags.map((tag) => {
            const checked = selected.has(tag.id);
            return (
              <TagChip
                key={tag.id}
                name={tag.name}
                color={tag.color}
                selected={checked}
                aria-pressed={checked}
                onClick={() => {
                  if (!disabled) onToggle(tag.id);
                }}
                className={cn(disabled && "pointer-events-none opacity-60")}
              />
            );
          })}
          {createLabel && onCreate ? (
            <button
              type="button"
              disabled={createDisabled || disabled}
              onClick={onCreate}
              className="inline-flex max-w-full items-center rounded-[6px] border border-dashed border-[var(--brand-primary)]/40 bg-[var(--color-enterprise-bg)] px-2 py-0.5 text-[11px] font-display font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="truncate">{createLabel}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
