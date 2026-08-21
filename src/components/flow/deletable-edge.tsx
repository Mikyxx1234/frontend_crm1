"use client"

import { useState } from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"
import { X } from "lucide-react"

/**
 * Aresta com botão de exclusão "×" no meio do traçado.
 * O botão aparece ao passar o mouse sobre a linha ou quando ela está selecionada.
 * Também é possível clicar na linha e apertar Delete (comportamento nativo).
 */
export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  const [hovered, setHovered] = useState(false)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const remove = () => setEdges((eds) => eds.filter((e) => e.id !== id))
  const visible = selected || hovered

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />

      {/* Traçado invisível e largo para facilitar o hover/click na linha fina */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            type="button"
            aria-label="Excluir conexão"
            onClick={(e) => {
              e.stopPropagation()
              remove()
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:border-[var(--route-error)] hover:text-[var(--route-error)]"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.6)",
              pointerEvents: visible ? "all" : "none",
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
