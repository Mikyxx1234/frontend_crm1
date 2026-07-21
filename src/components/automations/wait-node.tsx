"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { IconAlertTriangle as AlertTriangle, IconCircleCheck as CheckCircle2, IconClock as Clock, IconMessageCircle as MessageCircle, IconPlayerPause as Pause, IconTrash as Trash2 } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NodeInlineConfig } from "./node-inline-config";

export type WaitNodeData = {
  label: string;
  summary: string;
  stepIndex?: number;
  hasReceivedGoto: boolean;
  hasTimeoutGoto: boolean;
  timeoutLabel: string;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  stepType?: string;
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

/**
 * WaitNode — espera mensagem ou cronômetro estourar. Card premium com
 * 2 sub-rows: "received" (verde) e "timeout" (cinza), cada uma com
 * seu handle saindo lateralmente. Accent orange (família do Delay).
 */
export function WaitNode({ data, selected }: NodeProps<WaitNodeData>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);

  return (
    <div
      className={cn(
        "group/node relative rounded-lg border bg-[var(--color-bg-card)] transition-all duration-200",
        selected ? "min-w-[340px] max-w-[400px]" : "min-w-[250px] max-w-[310px]",
        selected
          ? "border-orange-400/60 ring-2 ring-orange-300/30 shadow-[0_10px_30px_-10px_rgba(249,115,22,0.4)]"
          : "border-[var(--glass-border-subtle)] shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-orange-300/50 hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)]"
      )}
    >
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[var(--brand-gradient-end)] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-[var(--glass-border-subtle)]!"
      />

      {/* Header */}
      <div className="node-drag-handle flex cursor-grab items-start gap-3 px-3.5 py-3 active:cursor-grabbing">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warn-subtle)] text-[var(--color-warn-text)] ring-1 ring-[var(--color-warn-subtle)]">
          <Pause className="size-4" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-extrabold tracking-tighter leading-tight text-[var(--text-primary)]">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight text-[var(--text-muted)]">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover espera" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover/node:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.();
              }}
              aria-label="Remover espera"
            >
              <Trash2 className="size-3.5" strokeWidth={2.2} />
            </button>
          </TooltipHost>
        )}
      </div>

      {/* Condition rows */}
      <div className="border-t border-[var(--glass-border-subtle)] bg-linear-to-b from-[var(--color-bg-subtle)] to-transparent">
        <div className="relative flex h-8 items-center gap-2 border-b border-[var(--glass-border-subtle)]/80 px-3.5">
          <MessageCircle className="size-3 shrink-0 text-[var(--color-success)]" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[11px] font-bold tracking-tight text-[var(--color-success-text)]">
            Até a mensagem recebida
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="received"
            className="size-3! border-2! border-white! bg-[var(--color-success)]!"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          />
        </div>

        <div className="relative flex h-8 items-center gap-2 px-3.5">
          <Clock className="size-3 shrink-0 text-[var(--color-ink-muted)]" strokeWidth={2.4} />
          <span className="flex-1 truncate text-[11px] font-medium tracking-tight text-[var(--text-muted)]">
            {data.timeoutLabel || "Cronômetro"}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="timeout"
            className="size-3! border-2! border-white! bg-[var(--color-status-offline)]!"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      {/*
        NB: o "Aguardar resposta" só tem DUAS saídas legítimas — o handle
        verde "received" (id="received", topo à direita) e o cinza
        "timeout" (id="timeout", abaixo). O executor só lê
        `cfg.receivedGotoStepId` e `cfg.timeoutGotoStepId`; qualquer
        edge sem sourceHandle seria silenciosamente ignorado. Antes
        tínhamos um terceiro handle laranja aqui "main flow" (sem id),
        que aparecia sobreposto ao verde e levava o operador a crer
        que existia um caminho "padrão" adicional — removido.
      */}

      {/* Stats */}
      {hasStats && (
        <TooltipHost label="Ver eventos" side="bottom">
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-[var(--glass-border-subtle)] px-3.5 py-2 transition-colors hover:bg-[var(--color-bg-subtle)]/60"
            onClick={(e) => {
              e.stopPropagation();
              data.onStatsClick?.();
            }}
            aria-label="Ver eventos"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-success-text)] ring-1 ring-[var(--color-success)]/15">
              <CheckCircle2 className="size-3" />
              {s.success}
            </span>
            {s.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-danger-text)] ring-1 ring-[var(--color-destructive)]/15">
                <AlertTriangle className="size-3" />
                {s.failed}
              </span>
            )}
          </button>
        </TooltipHost>
      )}
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType ?? "wait_for_reply"}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
    </div>
  );
}
