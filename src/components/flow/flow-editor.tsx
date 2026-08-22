"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { toast } from "sonner"
import {
  IconBolt,
  IconDeviceFloppy,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconMaximize,
  IconPlayerPlay,
  IconPlayerPause,
  IconSitemap,
} from "@tabler/icons-react"
import { PageHeader } from "@/components/crm/page-header"
import { PageActionsMenu, PagePrimaryButton } from "@/components/crm/page-toolbar"
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "@/components/automations/flow-editor.css"
import "./flow-canvas.css"

import {
  ROUTE_META,
  TOPIC_META,
  rawEdges,
  rawNodes,
  type FlowNodeData,
  type RouteType,
} from "@/lib/flow-data"
import {
  applyHandleToConfig,
  blankFlowNodeFromStep,
  clearHandleFromConfig,
  migrateFlowNode,
  remapFlowEdges,
  stripDeletedStepTargets,
} from "@/lib/flow-step-adapter"
import type { ActionStepType } from "@/lib/automation-workflow"
import { layoutFlow, type LayoutDirection } from "@/lib/layout"
import { NodePaletteDrawer } from "@/components/automations/node-palette-drawer"
import { readPaletteDragType } from "@/components/automations/node-palette"
import { StepPickerModal } from "@/components/automations/step-picker-modal"
import { FlowNode } from "./flow-node"
import { LogsContext } from "./logs-context"
import { LogsModal, type LogsTarget } from "./logs-modal"
import { DeletableEdge } from "./deletable-edge"

const nodeTypes = { flowNode: FlowNode }
const edgeTypes = { deletable: DeletableEdge }

type EdgeData = { routeType: RouteType }

function routeTypeFromHandle(
  nodes: Node<FlowNodeData>[],
  sourceId: string | null | undefined,
  sourceHandle: string | null | undefined,
): RouteType {
  if (!sourceId) return "navigation"
  const node = nodes.find((n) => n.id === sourceId)
  const out = node?.data.outputs.find((o) => o.key === sourceHandle) ?? node?.data.outputs[0]
  return out?.kind ?? "navigation"
}

function toFlowNodes(): Node<FlowNodeData>[] {
  return rawNodes.map((n) => ({
    id: n.id,
    type: "flowNode",
    position: { x: 0, y: 0 },
    data: n.data,
  }))
}

function toFlowEdges(): Edge[] {
  return rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle,
    target: e.target,
    type: "deletable",
    data: { routeType: e.type } satisfies EdgeData,
  }))
}

function getInitialDirection(): LayoutDirection {
  if (typeof window !== "undefined" && window.innerWidth < 768) return "TB"
  return "LR"
}

const FLOW_DRAFT_KEY = "crm1.fluxo.bv-calouros"

type FlowDraft = {
  active: boolean
  nodes: Node<FlowNodeData>[]
  edges: Edge[]
}

function readDraft(): FlowDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(FLOW_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FlowDraft
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    return parsed
  } catch {
    return null
  }
}

function InnerEditor() {
  const [direction, setDirection] = useState<LayoutDirection>("LR")
  const [showErrors, setShowErrors] = useState(true)
  const [hovered, setHovered] = useState<string | null>(null)
  const [logsTarget, setLogsTarget] = useState<LogsTarget | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [connectStroke, setConnectStroke] = useState("var(--route-navigation)")
  const [active, setActive] = useState(false)
  const [dirty, setDirty] = useState(false)
  const readyRef = useRef(false)
  const pendingPosition = useRef<{ x: number; y: number } | null>(null)
  const pendingConn = useRef<{ sourceId: string; sourceHandle: string } | null>(null)
  const connectStartRef = useRef<{ sourceId: string; sourceHandle: string } | null>(null)
  const { fitView, screenToFlowPosition } = useReactFlow()

  const logsContext = useMemo(
    () => ({ openLogs: (t: LogsTarget) => setLogsTarget(t) }),
    [],
  )

  // Estado real = fonte da verdade. As edições do usuário ficam aqui.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(
    layoutFlow(toFlowNodes(), toFlowEdges(), "LR"),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges())

  // Reaplica o layout automático (Dagre) preservando as edições atuais
  const runLayout = useCallback(
    (dir: LayoutDirection) => {
      setNodes((prev) => layoutFlow(prev, edges, dir))
      window.requestAnimationFrame(() => fitView({ padding: 0.15, duration: 500 }))
    },
    [edges, fitView, setNodes],
  )

  useEffect(() => {
    const draft = readDraft()
    if (draft) {
      const nodes = draft.nodes.map((n) => ({ ...n, data: migrateFlowNode(n.data) }))
      setActive(draft.active)
      setNodes(nodes)
      setEdges(remapFlowEdges(draft.edges, nodes))
    } else {
      const initial = getInitialDirection()
      if (initial !== "LR") {
        setDirection(initial)
        setNodes((prev) => layoutFlow(prev, toFlowEdges(), initial))
      }
    }
    window.requestAnimationFrame(() => fitView({ padding: 0.15 }))
    const t = window.setTimeout(() => {
      readyRef.current = true
    }, 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markDirty = useCallback(() => {
    if (readyRef.current) setDirty(true)
  }, [])

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes)
      if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) {
        markDirty()
      }
    },
    [onNodesChange, markDirty],
  )

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      const removedIds = new Set(
        changes.filter((c) => c.type === "remove").map((c) => c.id),
      )
      if (removedIds.size > 0) {
        const removed = edges.filter((e) => removedIds.has(e.id))
        if (removed.length > 0) {
          setNodes((prev) =>
            prev.map((n) => {
              const mine = removed.filter((e) => e.source === n.id)
              if (mine.length === 0) return n
              let config = n.data.config ?? {}
              let outputs = n.data.outputs
              for (const e of mine) {
                const handle = e.sourceHandle ?? ""
                config = clearHandleFromConfig(config, handle, n.data.stepType)
                outputs = outputs.map((o) =>
                  o.key === handle || (!handle && o.key === outputs[0]?.key)
                    ? { ...o, target: undefined }
                    : o,
                )
              }
              return { ...n, data: { ...n.data, outputs, config } }
            }),
          )
        }
      }
      onEdgesChange(changes)
      if (changes.some((c) => c.type !== "select")) {
        markDirty()
      }
    },
    [edges, onEdgesChange, setNodes, markDirty],
  )

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = connection.source
      const target = connection.target
      const sourceHandle = connection.sourceHandle ?? null
      if (!source || !target) return false
      if (source === target) return false
      return !edges.some(
        (e) =>
          e.source === source &&
          (e.sourceHandle ?? null) === sourceHandle &&
          e.target !== target,
      )
    },
    [edges],
  )

  // Criar conexão arrastando de um handle de saída para a entrada de outro card
  const onConnect = useCallback(
    (c: Connection) => {
      const routeType = routeTypeFromHandle(nodes, c.source, c.sourceHandle)
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            type: "deletable",
            data: { routeType } satisfies EdgeData,
            id: `manual-${c.source}-${c.sourceHandle ?? ""}-${c.target}-${Date.now()}`,
          },
          eds,
        ),
      )
      if (c.source && c.target) {
        const handle = c.sourceHandle ?? ""
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== c.source) return n
            return {
              ...n,
              data: {
                ...n.data,
                outputs: n.data.outputs.map((o) =>
                  o.key === handle || (!handle && o.key === n.data.outputs[0]?.key)
                    ? { ...o, target: c.target! }
                    : o,
                ),
                config: applyHandleToConfig(n.data.config ?? {}, handle, c.target!, n.data.stepType),
              },
            }
          }),
        )
      }
      markDirty()
    },
    [nodes, setEdges, setNodes, markDirty],
  )

  // ---- Copiar / Colar / Duplicar / Excluir ---------------------------------
  const clipboardRef = useRef<Node<FlowNodeData> | null>(null)

  // Cria uma cópia de um nó com deslocamento e a seleciona
  const pasteNode = useCallback(
    (src: Node<FlowNodeData>, offset = 48) => {
      const newId = `copy-${Date.now()}`
      const clone: Node<FlowNodeData> = {
        ...src,
        id: newId,
        position: { x: src.position.x + offset, y: src.position.y + offset },
        selected: false,
        data: { ...src.data },
      }
      setNodes((prev) => [...prev, clone])
      setSelectedNodeId(newId)
    },
    [setNodes],
  )

  // Atalhos de teclado: Ctrl/Cmd+C copia, Ctrl/Cmd+V cola (Del é nativo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === "c") {
        const node = nodes.find((n) => n.id === selectedNodeId)
        if (node) clipboardRef.current = node
      } else if (mod && e.key.toLowerCase() === "v") {
        if (clipboardRef.current) {
          e.preventDefault()
          pasteNode(clipboardRef.current)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [nodes, selectedNodeId, pasteNode])

  // Conjunto de nós ativos ao passar o mouse (mata o "espaguete")
  const activeNodeIds = useMemo(() => {
    if (!hovered) return null
    const set = new Set<string>([hovered])
    edges.forEach((e) => {
      if (e.source === hovered) set.add(e.target)
      if (e.target === hovered) set.add(e.source)
    })
    return set
  }, [hovered, edges])

  // Arestas RENDERIZADAS: filtra erros e aplica estilo, sem tocar na fonte da verdade
  const styledEdges = useMemo<Edge[]>(() => {
    return edges.map((e) => {
        const src = nodes.find((n) => n.id === e.source)
        const handleOk = src?.data.outputs.some((o) => o.key === e.sourceHandle)
        const sourceHandle = handleOk ? e.sourceHandle : (src?.data.outputs[0]?.key ?? e.sourceHandle)
        const rt = routeTypeFromHandle(nodes, e.source, sourceHandle)
        const meta = ROUTE_META[rt]
        const touchesHover =
          hovered && (e.source === hovered || e.target === hovered)
        const dimmed = hovered && !touchesHover
        return {
          ...e,
          type: "deletable",
          sourceHandle,
          animated: Boolean(touchesHover),
          style: {
            stroke: meta.color,
            strokeWidth: e.selected ? 3 : touchesHover ? 2.4 : 1.5,
            strokeDasharray: meta.dashed ? "6 5" : undefined,
            opacity: dimmed ? 0.08 : 0.85,
            transition: "opacity 160ms ease, stroke-width 120ms ease",
          },
        }
      })
  }, [edges, nodes, hovered])

  // Nós renderizados: esmaece os que estão fora do caminho ativo
  const displayNodes = useMemo(() => {
    return nodes.map((n) => {
      const dimmed = activeNodeIds ? !activeNodeIds.has(n.id) : false
      return {
        ...n,
        selected: n.id === selectedNodeId,
        style: {
          ...n.style,
          opacity: dimmed ? 0.28 : 1,
          transition: "opacity 160ms ease",
        },
      }
    })
  }, [nodes, activeNodeIds, selectedNodeId])

  const addNode = useCallback(
    (type: ActionStepType, position?: { x: number; y: number }) => {
      const ref = nodes.reduce((max, n) => Math.max(max, n.data.ref), 0) + 1
      const id = `node-${Date.now()}`
      const pos =
        position ??
        pendingPosition.current ??
        screenToFlowPosition({
          x: window.innerWidth * 0.5,
          y: window.innerHeight * 0.45,
        })
      pendingPosition.current = null
      const conn = pendingConn.current
      pendingConn.current = null
      setNodes((prev) => [
        ...prev,
        {
          id,
          type: "flowNode",
          position: pos,
          data: blankFlowNodeFromStep(type, ref),
        },
      ])
      if (conn) {
        const src = nodes.find((n) => n.id === conn.sourceId)
        const out = src?.data.outputs.find((o) => o.key === conn.sourceHandle)
        const routeType: RouteType = out?.kind ?? "navigation"
        setEdges((eds) =>
          addEdge(
            {
              id: `conn-${conn.sourceId}-${conn.sourceHandle}-${id}`,
              source: conn.sourceId,
              sourceHandle: conn.sourceHandle,
              target: id,
              type: "deletable",
              data: { routeType } satisfies EdgeData,
            },
            eds,
          ),
        )
        if (src && out) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === conn.sourceId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      outputs: n.data.outputs.map((o) =>
                        o.key === conn.sourceHandle ? { ...o, target: id } : o,
                      ),
                      config: applyHandleToConfig(
                        n.data.config ?? {},
                        conn.sourceHandle,
                        id,
                        n.data.stepType,
                      ),
                    },
                  }
                : n,
            ),
          )
        }
      }
      setSelectedNodeId(id)
      markDirty()
    },
    [nodes, screenToFlowPosition, setNodes, setEdges, markDirty],
  )

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const type = readPaletteDragType(e.dataTransfer)
      if (!type) return
      addNode(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }))
    },
    [addNode, screenToFlowPosition],
  )

  const onConnectStart = useCallback(
    (_: unknown, params: { nodeId: string | null; handleId: string | null }) => {
      if (params.nodeId && params.handleId) {
        connectStartRef.current = { sourceId: params.nodeId, sourceHandle: params.handleId }
        const rt = routeTypeFromHandle(nodes, params.nodeId, params.handleId)
        setConnectStroke(ROUTE_META[rt].color)
      }
    },
    [nodes],
  )

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const start = connectStartRef.current
      connectStartRef.current = null
      if (!start) return
      const targetEl = ("target" in event ? event.target : null) as HTMLElement | null
      if (targetEl?.closest(".react-flow__node") || targetEl?.closest(".react-flow__handle")) return
      const clientX = "clientX" in event ? event.clientX : event.touches?.[0]?.clientX ?? 0
      const clientY = "clientY" in event ? event.clientY : event.touches?.[0]?.clientY ?? 0
      pendingPosition.current = screenToFlowPosition({ x: clientX, y: clientY })
      pendingConn.current = start
      setPickerOpen(true)
    },
    [screenToFlowPosition],
  )

  const exportJson = useCallback(() => {
    const payload = {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        data: e.data,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fluxo-bv-calouros.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const saveFlow = useCallback(() => {
    const draft: FlowDraft = { active, nodes, edges }
    try {
      window.localStorage.setItem(FLOW_DRAFT_KEY, JSON.stringify(draft))
      setDirty(false)
      toast.success("Rascunho salvo neste navegador — não publica a automação")
    } catch {
      toast.error("Não foi possível salvar o rascunho")
    }
  }, [active, nodes, edges])

  const toggleActive = useCallback(() => {
    setActive((prev) => {
      const next = !prev
      toast.success(
        next
          ? "Marcado ativo só neste navegador — o worker não executa /fluxo"
          : "Desmarcado neste navegador",
      )
      return next
    })
    setDirty(true)
  }, [])

  return (
    <LogsContext.Provider value={logsContext}>
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <PageHeader
        back={{ href: "/automations", label: "Automações" }}
        icon={<IconBolt size={22} stroke={2.2} />}
        title="BV – Calouros"
        titleAccessory={
          <div className="flex items-center gap-2">
            <span
              className={
                active
                  ? "rounded-full bg-[var(--color-success-subtle,#dcfce7)] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700"
                  : "rounded-full bg-[var(--color-bg-subtle)] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[var(--text-muted)]"
              }
            >
              {active ? "Rascunho · ativo local" : "Rascunho local"}
            </span>
            {dirty ? (
              <span className="rounded-full bg-[var(--color-amber-soft,#fef3c7)] px-2.5 py-0.5 text-[11px] font-extrabold tracking-tight text-[var(--color-amber-text,#92400e)]">
                Alterações não salvas
              </span>
            ) : null}
          </div>
        }
        actions={
          <>
            <PagePrimaryButton onClick={saveFlow} disabled={!dirty}>
              <IconDeviceFloppy size={16} stroke={2.2} />
              {dirty ? "Salvar" : "Salvo"}
            </PagePrimaryButton>
            <PageActionsMenu
            items={[
              {
                icon: active ? <IconPlayerPause size={16} stroke={2.2} /> : <IconPlayerPlay size={16} stroke={2.2} />,
                label: active ? "Desmarcar (local)" : "Marcar ativo (local)",
                onClick: toggleActive,
                active,
              },
              {
                icon: <IconSitemap size={16} stroke={2.2} />,
                label: "Auto alinhar",
                onClick: () => runLayout(direction),
                divider: true,
              },
              {
                icon: <IconMaximize size={16} stroke={2.2} />,
                label: "Ajustar à tela",
                onClick: () => fitView({ padding: 0.15, duration: 500 }),
              },
              {
                icon: showErrors ? <IconEyeOff size={16} stroke={2.2} /> : <IconEye size={16} stroke={2.2} />,
                label: showErrors ? "Ocultar erros" : "Mostrar erros",
                onClick: () => setShowErrors((v) => !v),
                active: showErrors,
              },
              {
                icon: <IconDownload size={16} stroke={2.2} />,
                label: "Exportar JSON",
                onClick: exportJson,
              },
            ]}
            />
          </>
        }
      />

      <div className="crm-flow-editor relative flex min-h-0 flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]">
      <NodePaletteDrawer onAdd={addNode} />

      <div className="relative min-h-0 min-w-0 flex-1">

      <ReactFlow
        nodes={displayNodes}
        edges={styledEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodesDelete={(deleted) => {
          const ids = new Set(deleted.map((n) => n.id))
          if (deleted.some((n) => n.id === selectedNodeId)) {
            setSelectedNodeId(null)
          }
          setNodes((prev) =>
            prev.map((n) => {
              if (ids.has(n.id)) return n
              return {
                ...n,
                data: {
                  ...n.data,
                  outputs: n.data.outputs.map((o) =>
                    o.target && ids.has(o.target) ? { ...o, target: undefined } : o,
                  ),
                  config: stripDeletedStepTargets(n.data.config ?? {}, ids, n.data.stepType),
                },
              }
            }),
          )
        }}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd as unknown as (event: MouseEvent | TouchEvent) => void}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeMouseEnter={(_, n) => setHovered(n.id)}
        onNodeMouseLeave={() => setHovered(null)}
        onNodeClick={(_, n) => setSelectedNodeId(n.id)}
        onPaneClick={() => {
          setHovered(null)
          setSelectedNodeId(null)
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={["Backspace", "Delete"]}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        zoomOnDoubleClick={false}
        connectionLineType={"smoothstep" as never}
        connectionLineStyle={{ stroke: connectStroke, strokeWidth: 2 }}
        fitView
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.4}
          color="var(--border)"
        />
        <Controls
          className="!rounded-lg !border !border-border !bg-[var(--color-bg-card)] !shadow-sm [&_button]:!border-border [&_button]:!bg-[var(--color-bg-card)] [&_button]:!text-foreground [&_button:hover]:!bg-muted"
          showInteractive={false}
        />
        <MiniMap
          pannable
          zoomable
          className="!rounded-lg !border !border-border !bg-[var(--color-bg-card)]"
          maskColor="color-mix(in oklch, var(--muted) 60%, transparent)"
          nodeColor={(n) => {
            const d = n.data as FlowNodeData
            return TOPIC_META[d.topic]?.color ?? "var(--muted-foreground)"
          }}
          nodeStrokeWidth={0}
        />
      </ReactFlow>

      <Legend />

      <LogsModal
        target={logsTarget}
        open={logsTarget !== null}
        onOpenChange={(o) => !o && setLogsTarget(null)}
      />
      <StepPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          pendingPosition.current = null
          pendingConn.current = null
        }}
        onSelect={(type) => addNode(type)}
      />
      </div>
      </div>
    </div>
    </LogsContext.Provider>
  )
}

function Legend() {
  return (
    <div className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-2.5 rounded-md border border-border bg-[var(--color-bg-card)] px-2 py-1 text-[10px] shadow-sm">
      {(Object.keys(ROUTE_META) as RouteType[]).map((k) => {
        const m = ROUTE_META[k]
        return (
          <div key={k} className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block h-0 w-4 border-t-2"
              style={{
                borderColor: m.color,
                borderStyle: m.dashed ? "dashed" : "solid",
              }}
            />
            {m.label}
          </div>
        )
      })}
    </div>
  )
}

export function FlowEditor() {
  return (
    <ReactFlowProvider>
      <InnerEditor />
    </ReactFlowProvider>
  )
}
