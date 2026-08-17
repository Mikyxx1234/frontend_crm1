"use client";

import { memo } from "react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

import type { OutputKind } from "./flow-node";

/**
 * Edge Suave — cor semântica via classe `fx-edge--{kind}`.
 * Sem stroke hard-coded no JS.
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
  /** Preferir kind semântico (flow|error|cond). */
  kind?: OutputKind;
  /** Hover: esmaece arestas que não tocam o nó. */
  dimmed?: boolean;
};

function variantToKind(variant: AnimatedEdgeVariant): OutputKind {
  switch (variant) {
    case "button":
      return "cond";
    case "else":
    case "timeout":
      return "error";
    case "add":
    case "default":
    default:
      return "flow";
  }
}

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
  const kind = edgeData?.kind ?? variantToKind(variant);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`fx-edge fx-edge--${kind}${selected ? " is-selected" : ""}${edgeData?.dimmed ? " is-dimmed" : ""}`}
        style={{
          fill: "none",
          cursor: "pointer",
          strokeWidth: selected ? 3.1 : undefined,
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
              className="fx-edge-delete nodrag nopan"
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
