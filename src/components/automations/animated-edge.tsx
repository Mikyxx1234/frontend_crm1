"use client";

import { memo } from "react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

/**
 * Edge sóbria (bezier) — sem gradiente brand / pulse.
 * Variantes só ajustam stroke + dash.
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
  default: "#94a3b8",
  button: "#64748b",
  else: "#f59e0b",
  timeout: "#94a3b8",
  add: "#cbd5e1",
};

const VARIANT_WIDTH: Record<AnimatedEdgeVariant, number> = {
  default: 1.5,
  button: 1.5,
  else: 1.35,
  timeout: 1.35,
  add: 1.2,
};

const VARIANT_DASH: Record<AnimatedEdgeVariant, string | undefined> = {
  default: "5 5",
  button: "5 5",
  else: "5 4",
  timeout: "5 4",
  add: "4 4",
};

/** Mantido por compat — defs vazios (gradientes removidos). */
export function AnimatedEdgeDefs() {
  return null;
}

function AnimatedEdgeImpl(props: EdgeProps) {
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

  const edgeData = data as AnimatedEdgeData | undefined;
  const variant: AnimatedEdgeVariant = edgeData?.variant ?? "default";

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  const stroke = VARIANT_STROKE[variant];
  const strokeWidth = selected
    ? VARIANT_WIDTH[variant] + 0.5
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

      {label != null && label !== "" && (
        <EdgeLabelRenderer>
          <TooltipGlass label="Remover esta conexão" side="top">
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
              }}
              className="nodrag nopan flex size-5 items-center justify-center rounded-full border border-[var(--wf-node-border,#e2e8f0)] bg-[var(--color-bg-card)] text-[10px] font-bold text-[var(--color-ink-muted)] shadow-sm transition-colors hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
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
