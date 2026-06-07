"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

import { CategoryHeader, NodeShell, StatsBar, categoryTone } from "./node-kit";

export type TriggerNodeData = {
  label: string;
  summary: string;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

/**
 * TriggerNode — porta de entrada da automação. Header em gradiente brand
 * DS v2 (eyebrow "GATILHO"), ponto pulsante de "fluxo vivo" e shell glass.
 * Único node de entrada — sinaliza autoridade e origem do fluxo.
 */
export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const tone = categoryTone.trigger;

  return (
    <NodeShell tone={tone} selected={selected} className="min-w-[230px] max-w-[280px] cursor-pointer">
      <CategoryHeader
        tone={tone}
        icon={Zap}
        eyebrow="Gatilho"
        title={data.label}
        summary={data.summary}
        variant="gradient"
        trailing={
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
          </span>
        }
      />

      {data.stats && <StatsBar stats={data.stats} onClick={data.onStatsClick} />}

      <Handle
        type="source"
        position={Position.Right}
        className={cn("size-3.5! border-2! border-[color:var(--glass-bg-base)]!")}
        style={{ backgroundColor: tone.fg }}
      />
    </NodeShell>
  );
}
