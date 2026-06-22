"use client"

import { useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  const [hovered, setHovered] = useState(false)
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isErr = (data as { err?: boolean } | undefined)?.err
  const stroke = isErr ? "var(--color-danger)" : "var(--brand-primary-light)"
  const show = hovered || selected

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* invisible wide hit-area so the whole edge is hoverable */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={22} />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeDasharray: isErr ? "5 5" : undefined,
          opacity: isErr ? 0.7 : 0.9,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <button
            type="button"
            className="edge-delete"
            aria-label="Excluir conexão"
            style={{ opacity: show ? 1 : 0 }}
            onClick={(e) => {
              e.stopPropagation()
              setEdges((eds) => eds.filter((edge) => edge.id !== id))
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </EdgeLabelRenderer>
    </g>
  )
}

export const edgeTypes = { deletable: DeletableEdge }
