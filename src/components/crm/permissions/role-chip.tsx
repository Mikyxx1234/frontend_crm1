"use client";

import { IconLoader2, IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * RoleChip — chip de papel atribuído, opcionalmente removível. Substitui os
 * `Badge variant="outline"` shadcn com X embutido do editor de usuários.
 */
export function RoleChip({
  label,
  systemPreset,
  onRemove,
  removing,
  className,
}: {
  label: string;
  /** Exibe o marcador "· sistema" para presets do sistema. */
  systemPreset?: boolean;
  /** Quando presente, mostra o botão de remover (X). */
  onRemove?: () => void;
  removing?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-0.5 pl-2.5 font-display text-[12px] font-semibold text-[var(--text-secondary)]",
        onRemove ? "pr-1" : "pr-2.5",
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {systemPreset && (
        <span className="text-[11px] font-normal text-[var(--text-muted)]">
          · sistema
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remover papel ${label}`}
          className="flex size-4 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:opacity-50"
        >
          {removing ? (
            <IconLoader2 size={11} className="animate-spin" />
          ) : (
            <IconX size={11} stroke={2.5} />
          )}
        </button>
      )}
    </span>
  );
}
