/**
 * @deprecated DS-012 - componente legado sem rota ativa. O canônico é
 * components/automations/*. Não adicionar novos imports.
 * Remoção física quando nenhuma rota o referenciar.
 */
"use client"

import "@xyflow/react/dist/style.css"

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ForwardedRef,
} from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnSelectionChangeParams,
} from "@xyflow/react"
import { AutomationNode, type AutomationNodeData } from "./automation-node"
import { getBlockMeta, blockAccent } from "../flow-block-icon"
import type { FlowNodeData, FlowEdgeData } from "@/lib/automation-flow"

export interface FlowCanvasSnapshotNode {
  id: string
  type: string
  position: { x: number; y: number }
  config: Record<string, unknown> | null
}

export interface FlowCanvasHandle {
  addBlock: (type: string) => void
  deselect: () => void
  /**
   * Retorna a snapshot atual dos nodes para persistÃªncia. A ordem Ã©
   * topolÃ³gica simples por `y` crescente (e `x` como desempate),
   * aproximando "fluxo de cima pra baixo".
   */
  getSnapshot: () => FlowCanvasSnapshotNode[]
}

interface FlowCanvasProps {
  initialNodes: FlowNodeData[]
  initialEdges: FlowEdgeData[]
  onSelect: (node: FlowNodeData | null) => void
  onDirty: () => void
}

const nodeTypes = { automation: AutomationNode }

const edgeTone: Record<string, string> = {
  default: "#a9b4c7",
  success: "#16a34a",
  danger: "var(--color-destructive)",
}

let idSeq = 0
const uid = () => `n-${Date.now()}-${idSeq++}`

function toRfNode(n: FlowNodeData): Node<AutomationNodeData> {
  return {
    id: n.id,
    type: "automation",
    position: { x: n.x, y: n.y },
    data: { node: n },
  }
}

function toRfEdge(e: FlowEdgeData): Edge {
  const stroke = edgeTone[e.tone ?? "default"]
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: "in",
    type: "default",
    style: { stroke, strokeWidth: 2 },
  }
}

function CanvasInner(
  { initialNodes, initialEdges, onSelect, onDirty }: FlowCanvasProps,
  ref: ForwardedRef<FlowCanvasHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AutomationNodeData>>(
    useMemo(() => initialNodes.map(toRfNode), [initialNodes]),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    useMemo(() => initialEdges.map(toRfEdge), [initialEdges]),
  )

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      onSelect(null)
      onDirty()
    },
    [setNodes, setEdges, onSelect, onDirty],
  )

  const duplicateNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const src = nds.find((n) => n.id === id)
        if (!src) return nds
        const newId = uid()
        const copy: Node<AutomationNodeData> = {
          ...src,
          id: newId,
          position: { x: src.position.x + 40, y: src.position.y + 60 },
          selected: false,
          data: { node: { ...src.data.node, id: newId, count: undefined, options: undefined } },
        }
        return [...nds.map((n) => ({ ...n, selected: false })), copy]
      })
      onDirty()
    },
    [setNodes, onDirty],
  )

  const addBranch = useCallback(
    (id: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n
          const opts = n.data.node.options ?? []
          const newOpt = { id: `${id}-opt-${uid()}`, label: `SaÃ­da ${opts.length + 1}` }
          return { ...n, data: { node: { ...n.data.node, options: [...opts, newOpt] } } }
        }),
      )
      onDirty()
    },
    [setNodes, onDirty],
  )

  const addBlock = useCallback(
    (type: string, position?: { x: number; y: number }) => {
      const meta = getBlockMeta(type)
      const id = uid()
      const isBranch = type === "condition"
      const rect = wrapperRef.current?.getBoundingClientRect()
      const pos =
        position ??
        (rect
          ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2.4 })
          : { x: 240, y: 200 })
      const placed: FlowNodeData = {
        id,
        kind: "action",
        blockType: type,
        title: meta.label,
        options: isBranch
          ? [
              { id: `${id}-sim`, label: "Sim", tone: "success" },
              { id: `${id}-nao`, label: "NÃ£o", tone: "danger" },
            ]
          : undefined,
        x: pos.x,
        y: pos.y,
      }
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { ...toRfNode(placed), selected: true },
      ])
      onSelect(placed)
      onDirty()
    },
    [screenToFlowPosition, setNodes, onSelect, onDirty],
  )

  useImperativeHandle(
    ref,
    () => ({
      addBlock: (type: string) => addBlock(type),
      deselect: () => {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })))
        onSelect(null)
      },
      getSnapshot: () => {
        return [...nodes]
          .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
          .map((n) => ({
            id: n.id,
            type: (n.data as { blockType?: string } | undefined)?.blockType ?? n.type ?? "unknown",
            position: { x: n.position.x, y: n.position.y },
            config: ((n.data as { config?: Record<string, unknown> } | undefined)?.config) ?? null,
          }))
      },
    }),
    [addBlock, setNodes, onSelect, nodes],
  )

  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...conn, type: "default", style: { stroke: edgeTone.default, strokeWidth: 2 } },
          eds,
        ),
      )
      onDirty()
    },
    [setEdges, onDirty],
  )

  const onSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => {
      const first = sel[0] as Node<AutomationNodeData> | undefined
      onSelect(first ? first.data.node : null)
    },
    [onSelect],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData("text/block-type")
      if (!type) return
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addBlock(type, { x: pos.x - 128, y: pos.y - 30 })
    },
    [screenToFlowPosition, addBlock],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("text/block-type")) {
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    }
  }, [])

  // Injeta os handlers atuais em todos os nÃ³s (inclusive os iniciais) a cada render
  const rfNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onDuplicate: duplicateNode,
          onDelete: deleteNode,
          onAddBranch: addBranch,
        },
      })),
    [nodes, duplicateNode, deleteNode, addBranch],
  )

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => onSelect(null)}
        onNodeDragStop={onDirty}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultEdgeOptions={{ type: "default" }}
        connectionLineStyle={{ stroke: blockAccent("trigger"), strokeWidth: 2 }}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="rgba(91,111,245,0.22)" />
        <Controls
          showInteractive={false}
          className="!rounded-[var(--radius-lg)] !border !border-[var(--glass-border)] !bg-[var(--glass-bg-strong)] !shadow-[var(--glass-shadow-sm)] !backdrop-blur-md"
        />
        <MiniMap
          pannable
          zoomable
          className="!rounded-[var(--radius-lg)] !border !border-[var(--glass-border)] !bg-[var(--glass-bg-strong)]"
          maskColor="rgba(91,111,245,0.08)"
          nodeColor={(n) => {
            const data = n.data as AutomationNodeData
            return data?.node?.kind === "trigger"
              ? "#5b6ff5"
              : blockAccent(data?.node?.blockType ?? "send-email")
          }}
          nodeStrokeWidth={0}
          nodeBorderRadius={6}
        />
      </ReactFlow>
    </div>
  )
}

const CanvasWithRef = forwardRef<FlowCanvasHandle, FlowCanvasProps>(CanvasInner)

export const FlowCanvas = forwardRef<FlowCanvasHandle, FlowCanvasProps>(function FlowCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <CanvasWithRef {...props} ref={ref} />
    </ReactFlowProvider>
  )
})
