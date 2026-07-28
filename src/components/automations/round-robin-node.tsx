"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { IconPlus as Plus, IconRefresh as Refresh, IconTrash as Trash2, IconX as X } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import {
  ROUND_ROBIN_MAX_OPTIONS,
  ROUND_ROBIN_MIN_OPTIONS,
  newRoundRobinOptionId,
  roundRobinOptionLabel,
  type RoundRobinOption,
} from "@/lib/automation-round-robin";
import { cn } from "@/lib/utils";

export type RoundRobinNodeData = {
  label: string;
  stepIndex?: number;
  options: RoundRobinOption[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  /** Config bruta do step — o próprio card monta o patch { ...config, options } ao editar. */
  config?: Record<string, unknown>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

/**
 * RoundRobinNode — "Round Robin de caminhos" (estilo Kommo). NÃO
 * atribui agente: só escolhe qual caminho seguir em rodízio circular
 * entre execuções da mesma automação+step (cursor no backend, ver
 * `AutomationRoundRobinState`). Layout espelha o ConditionNode (card +
 * lista de linhas com handle próprio), mas como não há regras pra
 * configurar (só label + destino), add/remover/renomear opção fica
 * embutido direto no card — sem precisar do builder do editor inline.
 */
export function RoundRobinNode({ data, selected }: NodeProps<RoundRobinNodeData>) {
  const options = data.options ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateOptions = (next: RoundRobinOption[]) => {
    data.onConfigChange?.({ ...(data.config ?? {}), options: next });
  };

  const addOption = () => {
    if (options.length >= ROUND_ROBIN_MAX_OPTIONS) return;
    updateOptions([...options, { id: newRoundRobinOptionId() }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= ROUND_ROBIN_MIN_OPTIONS) return;
    updateOptions(options.filter((o) => o.id !== id));
  };

  const renameOption = (id: string, label: string) => {
    updateOptions(options.map((o) => (o.id === id ? { ...o, label: label || undefined } : o)));
  };

  return (
    <div className="group/node relative">
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[var(--brand-gradient-end)] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-[var(--color-cyan)]!"
      />

      <div
        className={cn(
          "relative overflow-hidden rounded-lg border bg-[var(--color-bg-card)] transition-all duration-200",
          selected ? "w-[380px]" : "w-[300px]",
          selected
            ? "border-[var(--color-cyan)] shadow-[var(--shadow-lavender-glow)] ring-2 ring-[var(--color-cyan)]/30"
            : "border-[var(--color-cyan)]/80 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:border-[var(--color-cyan)] hover:shadow-[var(--shadow-lavender-glow)]"
        )}
      >
        {/* Header */}
        <div className="node-drag-handle flex cursor-grab items-center gap-2 border-b border-[var(--color-cyan)]/70 bg-[var(--color-cyan-soft)] px-3 py-2 active:cursor-grabbing">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-bg-card)] text-[var(--color-cyan)] ring-1 ring-[var(--color-cyan)]/15">
            <Refresh className="size-3.5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-extrabold tracking-tighter text-[var(--text-primary)]">
              {data.label || "Round Robin"}
            </p>
            <p className="truncate text-[10px] font-medium tracking-tight text-[var(--text-muted)]">
              {options.length} {options.length === 1 ? "opção" : "opções"}
            </p>
          </div>
          {data.onDelete && (
            <TooltipHost label="Remover Round Robin" side="top">
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded-md text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover/node:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete?.();
                }}
                aria-label="Remover Round Robin"
              >
                <Trash2 className="size-3.5" strokeWidth={2.2} />
              </button>
            </TooltipHost>
          )}
        </div>

        {/* Opções */}
        <ul className="flex flex-col">
          {options.map((option, idx) => (
            <li
              key={option.id}
              className="relative flex items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-2 last:border-b-0 hover:bg-[var(--color-cyan-soft)]"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[var(--color-cyan-soft)] text-[10px] font-bold tabular-nums text-[var(--color-cyan)] ring-1 ring-[var(--color-cyan)]/15">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                {editingId === option.id ? (
                  <input
                    autoFocus
                    defaultValue={option.label ?? ""}
                    placeholder={roundRobinOptionLabel(option, idx)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameOption(option.id, e.target.value.trim());
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full rounded border border-[var(--color-cyan)]/50 bg-[var(--color-bg-card)] px-1.5 py-0.5 text-[11px] font-bold tracking-tight text-[var(--text-primary)] outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(option.id);
                    }}
                    className="truncate text-left text-[11px] font-bold tracking-tight text-[var(--text-primary)] hover:underline"
                    title="Clique para renomear"
                  >
                    {roundRobinOptionLabel(option, idx)}
                  </button>
                )}
              </div>
              {options.length > ROUND_ROBIN_MIN_OPTIONS && (
                <TooltipHost label="Remover opção" side="top">
                  <button
                    type="button"
                    className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover/node:opacity-100"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(option.id);
                    }}
                    aria-label="Remover opção"
                  >
                    <X className="size-3" strokeWidth={2.4} />
                  </button>
                </TooltipHost>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={`option:${option.id}`}
                className="size-2.5! border-2! border-white! bg-[var(--color-success)]!"
                style={{ top: "50%" }}
              />
            </li>
          ))}
        </ul>

        {/* Adicionar opção */}
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            disabled={options.length >= ROUND_ROBIN_MAX_OPTIONS}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              addOption();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--color-cyan)]/40 py-1.5 text-[11px] font-bold tracking-tight text-[var(--color-cyan)] transition-colors hover:bg-[var(--color-cyan-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-3" strokeWidth={2.6} />
            Adicionar outra opção
          </button>
        </div>

        {/* Help text */}
        <p className="border-t border-border bg-[var(--color-bg-subtle)]/60 px-3 py-2 text-[10px] font-medium leading-snug tracking-tight text-[var(--text-muted)]">
          Quando uma opção é adicionada ou removida, a fila é redefinida e começa do início.
        </p>
      </div>
    </div>
  );
}
