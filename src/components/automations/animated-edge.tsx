"use client";

import { memo } from "react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";

/**
 * AnimatedEdge — custom edge type registrado em `edgeTypes` do
 * <ReactFlow>. Curva Bezier com gradiente brand.
 *
 * Variantes (passadas em `data.variant`):
 *  - "default"  → fluxo principal (azul brand → cyan brand)
 *  - "button"   → resposta de botão de Question/Interactive (azul → verde)
 *  - "else"     → caminho alternativo (âmbar pontilhado)
 *  - "timeout"  → cronômetro (cinza pontilhado)
 *  - "add"      → handle pro AddStepNode (cinza ultra-claro pontilhado)
 *
 * Label "✕" continua sendo passada via `label` no `buildEdges()` — só
 * estilizamos visualmente como pílula clicável de excluir.
 *
 * Pulso elétrico (animateMotion): um dot percorre a curva pra dar
 * sensação de "fluxo vivo". É opt-in via `data.energized` (default
 * desligado) pra não pesar com muitas edges — quem renderiza decide,
 * ex.: edges conectadas ao gatilho ou no hover/seleção.
 */

export type AnimatedEdgeVariant =
  | "default"
  | "button"
  | "else"
  | "timeout"
  | "add";

export type AnimatedEdgeData = {
  variant?: AnimatedEdgeVariant;
  energized?: boolean;
};

const VARIANT_STROKE: Record<AnimatedEdgeVariant, string> = {
  default: "url(#edge-grad-default)",
  button: "url(#edge-grad-button)",
  else: "var(--color-warning)",
  timeout: "#94a3b8",
  add: "rgba(91,111,245,0.35)",
};

/** Cor do "pulso" (dot animado) por variante — segue o stroke. */
const VARIANT_PULSE: Record<AnimatedEdgeVariant, string> = {
  default: "var(--brand-primary)",
  button: "#16a34a",
  else: "var(--color-warning)",
  timeout: "#94a3b8",
  add: "rgba(91,111,245,0.5)",
};

const VARIANT_WIDTH: Record<AnimatedEdgeVariant, number> = {
  default: 2.2,
  button: 2.2,
  else: 1.8,
  timeout: 1.8,
  add: 1.5,
};

const VARIANT_DASH: Record<AnimatedEdgeVariant, string | undefined> = {
  default: undefined,
  button: undefined,
  else: "6 4",
  timeout: "6 4",
  add: "5 4",
};

/**
 * Defs SVG globais (gradientes nomeados) — renderizar UMA vez no canvas
 * pai. Se renderizar dentro de cada edge, o `<linearGradient>` repete N
 * vezes e o navegador penaliza. Mantemos aqui pra colocação manual.
 */
export function AnimatedEdgeDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <linearGradient id="edge-grad-default" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--brand-primary)" />
          <stop offset="100%" stopColor="var(--brand-secondary)" />
        </linearGradient>
        <linearGradient id="edge-grad-button" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--brand-primary)" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AnimatedEdgeImpl(props: EdgeProps<AnimatedEdgeData>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    label,
    markerEnd,
    selected,
  } = props;

  const variant: AnimatedEdgeVariant = data?.variant ?? "default";

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.32,
  });

  const stroke = VARIANT_STROKE[variant];
  const strokeWidth = selected
    ? VARIANT_WIDTH[variant] + 0.6
    : VARIANT_WIDTH[variant];
  const dash = VARIANT_DASH[variant];
  const energized = (data?.energized ?? false) || selected;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray: dash,
          fill: "none",
          cursor: "pointer",
        }}
      />

      {/* Pulso elétrico — dot percorrendo a curva. Opt-in (energized)
          pra não pesar com muitas edges. */}
      {energized && variant !== "add" && (
        <circle r={3} fill={VARIANT_PULSE[variant]}>
          <animateMotion dur="1.6s" repeatCount="indefinite" path={path} />
        </circle>
      )}

      {label != null && label !== "" && (
        <EdgeLabelRenderer>
          <TooltipGlass label="Remover esta conexão" side="top">
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
              }}
              className="nodrag nopan flex size-5 items-center justify-center rounded-full border border-border bg-white text-[10px] font-bold text-[var(--color-ink-muted)] shadow-sm transition-all hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500 hover:shadow-[0_4px_12px_-4px_rgba(244,63,94,0.4)]"
            >
              {label}
            </div>
          </TooltipGlass>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeImpl);
