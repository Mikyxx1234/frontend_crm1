"use client";

import { IconAlertTriangle } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/** Legenda + toggle de erro — princípios 4 e 6 do canvas LR. */
export function FlowCanvasToolbar({
  showErrors,
  onToggleErrors,
}: {
  showErrors: boolean;
  onToggleErrors: () => void;
}) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleErrors}
        aria-pressed={showErrors}
        aria-label={
          showErrors ? "Ocultar tratamento de erro" : "Mostrar tratamento de erro"
        }
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          showErrors
            ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
        )}
      >
        <IconAlertTriangle size={14} aria-hidden />
        {showErrors ? "Ocultar tratamento de erro" : "Mostrar tratamento de erro"}
      </button>
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5">
        <LegendSwatch className="bg-[var(--fx-flow)]" label="Navegação" />
        <LegendSwatch className="bg-[var(--fx-cond)]" label="Resposta" />
        <LegendSwatch className="bg-[var(--fx-error)]" label="Erro / sem resposta" />
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span className={cn("h-1.5 w-4 rounded-full", className)} aria-hidden />
      {label}
    </span>
  );
}
