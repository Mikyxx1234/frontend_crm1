"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { IconAlertTriangle as AlertTriangle, IconCircleCheck as CheckCircle2, IconPencil as Pencil, IconBolt as Zap } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TriggerNodeData = {
  label: string;
  summary: string;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * TriggerNode — porta de entrada da automação. Visual premium:
 * gradient brand no header, barra de brilho neon no topo, eyebrow
 * "GATILHO" em tracking-widest. Único node com header colorido —
 * sinaliza autoridade e ponto de origem do fluxo.
 */
export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <div
      className={cn(
        // `cursor-pointer` + grupo `group/trigger` pra revelar a pílula
        // "Editar" no hover. O click handler real fica no canvas
        // (onNodeClick), que chama `onTriggerClick` da page.
        "group/trigger relative min-w-[230px] max-w-[280px] cursor-pointer overflow-hidden rounded-lg border bg-[var(--color-bg-card)] transition-all duration-200",
        selected
          ? "border-primary/50 shadow-[var(--shadow-indigo-glow)] ring-2 ring-primary/30"
          : "border-[var(--glass-border)] shadow-[var(--shadow-lg)] hover:-translate-y-px hover:shadow-[var(--shadow-indigo-glow)]"
      )}
    >
      {/* Pílula "Editar" — aparece no hover, indica que o nó é clicável.
          pointer-events-none pra não interceptar o click do canvas. */}
      <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--glass-bg-modal)] px-2 py-0.5 text-[10px] font-bold tracking-tight text-primary opacity-0 shadow-sm ring-1 ring-primary/20 backdrop-blur-sm transition-opacity duration-150 group-hover/trigger:opacity-100">
        <Pencil className="size-3" strokeWidth={2.4} />
        Editar
      </span>
      {/* Header com gradient brand */}
      <div className="relative overflow-hidden bg-linear-to-br from-primary via-[#5a87ff] to-[#7b9bff] px-4 py-3 text-white">
        {/* Brilho neon sutil no topo */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent" />
        {/* Halo radial decorativo no canto */}
        <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-[var(--glass-bg-subtle)] blur-2xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
            <Zap className="size-4 text-white" strokeWidth={2.6} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/85">
              Gatilho
            </p>
            <p className="mt-0.5 truncate text-[14px] font-extrabold tracking-tighter leading-tight">
              {data.label}
            </p>
          </div>
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--glass-bg-overlay)] opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
          </span>
        </div>
      </div>

      {/* Body — resumo */}
      <div className="px-4 py-2.5">
        <p className="line-clamp-2 text-[12px] font-medium tracking-tight text-[var(--text-muted)]">
          {data.summary}
        </p>
      </div>

      {/* Stats pílulas */}
      {hasStats && (
        <TooltipHost label="Ver eventos" side="bottom">
          <button
            type="button"
            className="group/stats flex w-full items-center gap-2 border-t border-[var(--glass-border-subtle)] px-4 py-2 transition-colors hover:bg-[var(--color-bg-subtle)]/60"
            onClick={(e) => {
              e.stopPropagation();
              data.onStatsClick?.();
            }}
            aria-label="Ver eventos"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-success-text)] ring-1 ring-emerald-100">
              <CheckCircle2 className="size-3" />
              {s.success}
            </span>
            {s.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-danger-text)] ring-1 ring-rose-100">
                <AlertTriangle className="size-3" />
                {s.failed}
              </span>
            )}
          </button>
        </TooltipHost>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="size-3.5! border-2! border-white! bg-primary! shadow-[var(--shadow-indigo-glow)]!"
      />
    </div>
  );
}
