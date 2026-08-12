"use client";

import { useState } from "react";
import { Position, type Node, type NodeProps } from "@xyflow/react";
import { IconPlus as Plus, IconRefresh as Refresh, IconX as X } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import {
  ROUND_ROBIN_MAX_OPTIONS,
  ROUND_ROBIN_MIN_OPTIONS,
  newRoundRobinOptionId,
  roundRobinOptionLabel,
  type RoundRobinOption,
} from "@/lib/automation-round-robin";
import { CustomHandle } from "./custom-handle";
import {
  FlowNodeDeleteButton,
  FlowNodeHeader,
  FlowNodeShell,
} from "./flow-node-shell";

export type RoundRobinNodeData = {
  label: string;
  stepIndex?: number;
  options: RoundRobinOption[];
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
  config?: Record<string, unknown>;
  onConfigChange?: (next: Record<string, unknown>) => void;
};

type RoundRobinRF = Node<RoundRobinNodeData, "roundRobin">;

export function RoundRobinNode({ data, selected }: NodeProps<RoundRobinRF>) {
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
    updateOptions(
      options.map((o) => (o.id === id ? { ...o, label: label || undefined } : o))
    );
  };

  return (
    <FlowNodeShell
      selected={selected}
      accent="cyan"
      stepIndex={data.stepIndex}
      expanded={selected}
      className={selected ? "max-w-[380px] min-w-[320px]" : "max-w-[300px] min-w-[260px]"}
    >
      <CustomHandle
        type="target"
        position={Position.Left}
        connectionLimit={1}
        className="wf-handle--cyan"
      />
      <FlowNodeHeader
        icon={<Refresh className="size-3.5" strokeWidth={2.4} />}
        title={data.label || "Round Robin"}
        subtitle={`${options.length} ${options.length === 1 ? "opção" : "opções"}`}
        actions={
          <FlowNodeDeleteButton onDelete={data.onDelete} label="Remover Round Robin" />
        }
      />
      <div className="wf-node__outs">
        {options.map((option, idx) => (
          <div
            key={option.id}
            className="wf-node__out"
            style={{ height: "auto", minHeight: 36, paddingBlock: 6 }}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[color-mix(in_srgb,var(--color-cyan)_12%,transparent)] text-[10px] font-bold tabular-nums text-[var(--color-cyan)]">
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
                  className="w-full rounded border border-[var(--color-cyan)]/50 bg-[var(--color-bg-card)] px-1.5 py-0.5 text-[11px] font-bold outline-none"
                />
              ) : (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(option.id);
                  }}
                  className="truncate text-left text-[11px] font-bold text-[var(--text-primary)] hover:underline"
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
                  className="wf-node__del"
                  style={{ opacity: 1 }}
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
            <CustomHandle
              type="source"
              position={Position.Right}
              id={`option:${option.id}`}
              connectionLimit={1}
              className="wf-handle--ok"
            />
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--wf-node-border)] px-3 py-2">
        <button
          type="button"
          disabled={options.length >= ROUND_ROBIN_MAX_OPTIONS}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            addOption();
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[var(--wf-node-border)] py-1.5 text-[11px] font-semibold text-[var(--color-cyan)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-cyan)_8%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-3" strokeWidth={2.6} />
          Adicionar outra opção
        </button>
      </div>
      <p className="border-t border-[var(--wf-node-border)] px-3 py-2 text-[10px] font-medium leading-snug text-[var(--text-muted)]">
        Quando uma opção é adicionada ou removida, a fila é redefinida e começa do início.
      </p>
    </FlowNodeShell>
  );
}
