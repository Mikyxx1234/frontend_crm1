"use client"

import { memo } from "react"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import { NodeConfigEditor } from "./inline-editor"
import { resolveFlowPresentation } from "./node-presentation"

type Accent = "violet" | "green" | "blue" | "amber" | "red"

export type FlowNodeData = {
  kind: string
  title: string
  accent: Accent
  /** tipo canônico da ação (ex.: "send_whatsapp_message") — habilita edição inline */
  stepType?: string
  /** config editável da ação */
  config?: Record<string, unknown>
  badge?: string
  /** muted descriptive line in the body */
  subtitle?: string
  /** amber "cronômetro" style meta row */
  meta?: string
  /** multi-output rows; each gets a source handle on the right */
  outputs?: { id: string; label: string; icon?: IconName; err?: boolean }[]
  /** branch outputs without label rows (handles only), e.g. wait node */
  branches?: { id: string; label: string; err?: boolean }[]
  /** single source handle on the right-middle */
  source?: boolean
  /** target handle on the left */
  target?: boolean
  targetErr?: boolean
  stats?: { ok?: number; err?: number }
}

export type IconName =
  | "zap"
  | "buttons"
  | "tag"
  | "chat"
  | "template"
  | "clock"
  | "stage"
  | "briefcase"
  | "grad"
  | "list"
  | "mail"
  | "userplus"
  | "tagoff"
  | "pencil"
  | "calendar"
  | "trending"
  | "branch"
  | "image"
  | "globe"
  | "bot"
  | "help"
  | "pause"
  | "variable"
  | "goto"
  | "sync"
  | "check"
  | "stop"

export function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  switch (name) {
    case "zap":
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    case "buttons":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 8h10M7 12h6" />
        </svg>
      )
    case "tag":
      return (
        <svg {...common}>
          <path d="M20.59 13.41 12 22 2 12V2h10z" />
          <circle cx="7" cy="7" r="1.2" />
        </svg>
      )
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
        </svg>
      )
    case "template":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
        </svg>
      )
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case "stage":
      return (
        <svg {...common}>
          <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
        </svg>
      )
    case "briefcase":
      return (
        <svg {...common} strokeWidth={2}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      )
    case "grad":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        </svg>
      )
    case "list":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      )
    case "mail":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m2 7 10 6 10-6" />
        </svg>
      )
    case "userplus":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      )
    case "tagoff":
      return (
        <svg {...common}>
          <path d="M20.59 13.41 12 22 2 12V2h10z" />
          <circle cx="7" cy="7" r="1.2" />
          <path d="M9 9l6 6" />
        </svg>
      )
    case "pencil":
      return (
        <svg {...common}>
          <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
        </svg>
      )
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
        </svg>
      )
    case "trending":
      return (
        <svg {...common}>
          <path d="M3 17l6-6 4 4 7-7" />
          <path d="M17 8h4v4" />
        </svg>
      )
    case "branch":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="9" r="2.5" />
          <path d="M6 8.5v7M8.5 6H13a3 3 0 0 1 3 3v.5" />
        </svg>
      )
    case "image":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      )
    case "globe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
        </svg>
      )
    case "bot":
      return (
        <svg {...common}>
          <rect x="4" y="8" width="16" height="11" rx="2.5" />
          <path d="M12 8V4M9 4h6" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
        </svg>
      )
    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.5-2.6 2.5" />
          <path d="M12 17h.01" />
        </svg>
      )
    case "pause":
      return (
        <svg {...common}>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      )
    case "variable":
      return (
        <svg {...common}>
          <path d="M6 4a9 9 0 0 0 0 16M18 4a9 9 0 0 1 0 16" />
          <path d="m9.5 9 5 6M14.5 9l-5 6" />
        </svg>
      )
    case "goto":
      return (
        <svg {...common}>
          <path d="M4 5v6a3 3 0 0 0 3 3h11" />
          <path d="m15 11 4 3-4 3" />
        </svg>
      )
    case "sync":
      return (
        <svg {...common}>
          <path d="M3 9a8 8 0 0 1 13-3l2 2M21 4v4h-4" />
          <path d="M21 15a8 8 0 0 1-13 3l-2-2M3 20v-4h4" />
        </svg>
      )
    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
      )
    case "stop":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="2.5" />
        </svg>
      )
  }
}

const KIND_ICON: Record<string, IconName> = {
  Gatilho: "zap",
  "Botões WhatsApp": "buttons",
  "Adicionar tag": "tag",
  "Mensagem WhatsApp": "chat",
  "Template WhatsApp": "template",
  "Aguardar resposta": "pause",
  "Mover estágio": "stage",
  // Ações
  "Enviar e-mail": "mail",
  "Atribuir responsável": "userplus",
  "Remover tag": "tagoff",
  "Atualizar campo": "pencil",
  "Criar atividade": "calendar",
  "Atualizar lead score": "trending",
  // Lógica
  Atraso: "clock",
  Condição: "branch",
  // WhatsApp
  "Mídia WhatsApp": "image",
  // Integrações
  Webhook: "globe",
  // IA
  "Transferir para agente": "bot",
  "Perguntar ao agente": "bot",
  // Salesbot
  "Pergunta ao lead": "help",
  "Definir variável": "variable",
  "Ir para (Goto)": "goto",
  "Transferir automação": "sync",
  "Encerrar conversa": "check",
  "Finalizar fluxo": "stop",
}

function FlowNodeComponent({ id, data, selected }: NodeProps) {
  const d = data as FlowNodeData
  const icon = KIND_ICON[d.kind] ?? "chat"
  const derived = resolveFlowPresentation(d.stepType, d.config ?? {}, d)
  const rows = derived.outputs ?? d.outputs ?? []
  const branches = derived.branches ?? d.branches ?? []
  const subtitle = derived.subtitle ?? d.subtitle
  const meta = derived.meta ?? d.meta
  const title = derived.title ?? d.title
  const rf = useReactFlow()
  const editing = !!selected && !!d.stepType

  const steps = editing
    ? rf
        .getNodes()
        .filter((n) => n.id !== id)
        .map((n) => {
          const nd = n.data as FlowNodeData
          return { value: n.id, label: nd.title || nd.kind }
        })
    : []

  return (
    <div className={`fnode ${d.accent}${editing ? " editing" : ""}`}>
      {d.badge && <span className="n-badge">{d.badge}</span>}

      {d.target && (
        <Handle
          type="target"
          position={Position.Left}
          className={d.targetErr ? "handle-err" : undefined}
        />
      )}

      <div className="n-head">
        <div className="n-ico">
          <Icon name={icon} />
        </div>
        <div>
          <span className="n-kind">{d.kind}</span>
          <div className="n-title">{title}</div>
        </div>
      </div>

      {(subtitle || meta) && (
        <div className="n-body">
          {subtitle && <span className="clamp muted">{subtitle}</span>}
          {meta && (
            <div className="meta-row">
              <Icon name="clock" size={13} />
              {meta}
            </div>
          )}
        </div>
      )}

      {/* multi-output rows with their own source handle */}
      {rows.map((o) => (
        <div className="out-row" key={o.id}>
          <span className="o-label">
            {o.icon && <Icon name={o.icon} size={13} />}
            <span>{o.label}</span>
          </span>
          <Handle
            type="source"
            id={o.id}
            position={Position.Right}
            className={o.err ? "handle-err" : undefined}
          />
        </div>
      ))}

      {/* branch outputs (labels + right handles) */}
      {branches.map((b) => (
        <div className="out-row" key={b.id}>
          <span className="o-label">
            <span>{b.label}</span>
          </span>
          <Handle
            type="source"
            id={b.id}
            position={Position.Right}
            className={b.err ? "handle-err" : undefined}
          />
        </div>
      ))}

      {d.stats && (
        <div className="n-foot">
          {d.stats.ok != null && (
            <div className="stat ok">
              <span className="v">{d.stats.ok}</span>
              <span className="k">ok</span>
            </div>
          )}
          {d.stats.err != null && (
            <div className="stat err">
              <span className="v">{d.stats.err}</span>
              <span className="k">erro</span>
            </div>
          )}
        </div>
      )}

      {/* edição inline (expande quando o nó está selecionado) */}
      {editing && (
        <NodeConfigEditor
          stepType={d.stepType as string}
          config={d.config ?? {}}
          steps={steps}
          onChange={(next) => rf.updateNodeData(id, { config: next })}
        />
      )}

      {/* single source handle (right-middle) for simple nodes */}
      {d.source && <Handle type="source" position={Position.Right} />}
    </div>
  )
}

export const FlowNode = memo(FlowNodeComponent)

export const nodeTypes = { flow: FlowNode }
