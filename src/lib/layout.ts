import dagre from "@dagrejs/dagre"
import type { Edge, Node } from "@xyflow/react"
import { nodeHeight, type FlowNodeData } from "./flow-data"

export const NODE_WIDTH = 300

export type LayoutDirection = "LR" | "TB"

/**
 * Aplica layout em camadas (Dagre) que minimiza cruzamentos de arestas.
 * LR = esquerda->direita (estilo n8n). TB = cima->baixo.
 * A altura de cada card varia conforme o número de saídas.
 */
export function layoutFlow(
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
  direction: LayoutDirection = "LR",
): Node<FlowNodeData>[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 150,
    marginx: 48,
    marginy: 48,
    ranker: "tight-tree",
  })

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: nodeHeight(node.data) })
  })

  // Arestas de erro não influenciam o ranqueamento para não distorcer o layout principal
  edges
    .filter((e) => e.data?.routeType !== "error")
    .forEach((edge) => {
      g.setEdge(edge.source, edge.target)
    })

  dagre.layout(g)

  const isHorizontal = direction === "LR"

  return nodes.map((node) => {
    const pos = g.node(node.id)
    const h = nodeHeight(node.data)
    return {
      ...node,
      targetPosition: isHorizontal ? "left" : "top",
      sourcePosition: isHorizontal ? "right" : "bottom",
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - h / 2,
      },
    } as Node<FlowNodeData>
  })
}
