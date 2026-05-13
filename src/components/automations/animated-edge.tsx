"use client";

import { memo } from "react";
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
 * NOTE: o "pulso elétrico" (animateMotion) foi removido por feedback
 * dos usuários — era ruído visual e consumia CPU com muitas edges.
 * `data.energized` segue no tipo só por compatibilidade e é ignorado.
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
  else: "#f59e0b",
  timeout: "#94a3b8",
  add: "#cbd5e1",
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
          <stop offset="0%" stopColor="#507df1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="edge-grad-button" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#507df1" />
          <stop offset="100%" stopColor="#22c55e" />
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

      {/* NOTE: pulso elétrico animado (animateMotion) foi removido —
          consumia CPU com muitas edges e trazia mais ruído do que valor
          visual. Se um dia quisermos reativar, usar condicional a
          `data.energized` + preferência do usuário. */}

      {label != null && label !== "" && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-400 shadow-sm transition-all hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500 hover:shadow-[0_4px_12px_-4px_rgba(244,63,94,0.4)]"
            title="Clique pra remover esta conexão"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeImpl);
