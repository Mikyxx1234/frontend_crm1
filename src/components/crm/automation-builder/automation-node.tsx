/**
 * @deprecated DS-012 - componente legado sem rota ativa. O can�nico �
 * components/automations/*. N�o adicionar novos imports.
 * Remo��o f�sica quando nenhuma rota o referenciar.
 */
"use client"

import { memo } from "react"
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react"
import { IconCopy, IconTrash, IconPlus } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { getBlockMeta, blockPalette } from "../flow-block-icon"
import type { FlowNodeData, FlowOption } from "@/lib/automation-flow"
import { NODE_WIDTH } from "@/lib/automation-flow"

export interface AutomationNodeData extends Record<string, unknown> {
  node: FlowNodeData
  onDuplicate?: (id: string) => void
  onDelete?: (id: string) => void
  onAddBranch?: (id: string) => void
}

const kickerByCategory: Record<string, string> = {
  trigger: "Gatilho",
  action: "Ação",
  logic: "Lógica",
  whatsapp: "WhatsApp",
  integration: "Integração",
  salesbot: "Salesbot",
  ai: "IA",
  final: "Final",
}

const toneColor: Record<NonNullable<FlowOption["tone"]>, string> = {
  default: "#94a3b8",
  success: "#16a34a",
  danger: "var(--color-destructive)",
}

/** Dot de conexão (handle) estilizado conforme o DS */
function handleStyle(color: string): React.CSSProperties {
  return {
    width: 11,
    height: 11,
    background: "#fff",
    border: `2.5px solid ${color}`,
    boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
  }
}

export const AutomationNode = memo(function AutomationNode({
  data,
  selected,
}: NodeProps) {
  const { node, onDuplicate, onDelete, onAddBranch } = data as AutomationNodeData
  const meta = getBlockMeta(node.blockType)
  const Icon = meta.Icon
  const p = blockPalette[meta.color]
  const isTrigger = node.kind === "trigger"
  const isFinal = node.kind === "final"
  const accent = isTrigger ? "var(--brand-primary)" : p.fg
  const hasOptions = !!node.options?.length

  return (
    <div
      className={cn(
        "group/node relative rounded-[var(--radius-lg)] border bg-[var(--glass-bg-strong)] backdrop-blur-md transition-shadow",
        selected
          ? "border-transparent shadow-[var(--glass-shadow)] ring-2"
          : "border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)]",
      )}
      style={{
        width: NODE_WIDTH,
        ...(selected ? ({ ["--tw-ring-color" as string]: accent } as React.CSSProperties) : {}),
      }}
    >
      {/* Toolbar (duplicar / excluir) acima do nó */}
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
          {!isTrigger && !isFinal && onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(node.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
              aria-label="Duplicar"
            >
              <IconCopy size={15} />
            </button>
          )}
          {!isTrigger && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(node.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-danger)] transition-colors hover:bg-[rgba(239,68,68,0.12)]"
              aria-label="Excluir"
            >
              <IconTrash size={15} />
            </button>
          )}
        </div>
      </NodeToolbar>

      {/* Handle de entrada (esquerda) — todos exceto o gatilho */}
      {!isTrigger && (
        <Handle type="target" position={Position.Left} id="in" style={handleStyle(accent)} />
      )}

      {/* Cabeçalho colorido fino (estilo n8n): ícone + categoria + contador */}
      <div
        className="relative flex items-center gap-2 rounded-t-[var(--radius-lg)] px-3 py-2"
        style={{ backgroundColor: accent }}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.22)] text-white">
          <Icon size={14} stroke={2} />
        </span>
        <p className="min-w-0 flex-1 truncate font-display text-[10px] font-bold uppercase tracking-[0.09em] text-white">
          {kickerByCategory[isTrigger ? "trigger" : isFinal ? "final" : meta.category] ?? "Ação"}
        </p>
        {typeof node.count === "number" && (
          <span className="shrink-0 rounded-full bg-[rgba(255,255,255,0.22)] px-2 py-0.5 font-display text-[10px] font-bold text-white">
            {node.count.toLocaleString("pt-BR")}
          </span>
        )}
      </div>

      {/* Corpo branco: título, subtítulo e meta */}
      <div className={cn("px-3 pt-2.5", !node.body && !hasOptions ? "pb-3" : "pb-2.5")}>
        <p className="truncate font-display text-[13px] font-bold leading-tight text-[var(--text-primary)]">
          {node.title}
        </p>
        {node.subtitle && (
          <p className="truncate font-body text-[11px] leading-tight text-[var(--text-secondary)]">{node.subtitle}</p>
        )}
        {node.meta && (
          <p className="truncate font-body text-[11px] leading-tight text-[var(--text-muted)]">{node.meta}</p>
        )}
        {/* Balão de mensagem (estilo chatbot) */}
        {node.body && (
          <p className="mt-2 rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)] px-2.5 py-2 font-body text-[12px] leading-snug text-[var(--text-secondary)]">
            {node.body}
          </p>
        )}
      </div>

      {/* Opções (ramos) — cada uma com seu conector de saída */}
      {hasOptions && (
        <div className="flex flex-col gap-1.5 border-t border-[var(--glass-border-subtle)] px-3 py-2.5">
          {node.options!.map((opt) => {
            const c = toneColor[opt.tone ?? "default"]
            return (
              <div
                key={opt.id}
                className="relative flex items-center justify-between rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-1.5 pl-3 pr-4 font-body text-[12px] font-medium text-[var(--text-primary)]"
              >
                <span className="truncate">{opt.label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={opt.id}
                  style={{ ...handleStyle(c), right: -6 }}
                />
              </div>
            )
          })}
          {onAddBranch && (
            <button
              type="button"
              onClick={() => onAddBranch(node.id)}
              className="nodrag flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[11px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--color-enterprise-bg)]"
            >
              <IconPlus size={13} /> Adicionar saída
            </button>
          )}
        </div>
      )}

      {/* Handle de saída único (quando não há ramos e não é final) */}
      {!hasOptions && !isFinal && (
        <Handle type="source" position={Position.Right} id="out" style={handleStyle(accent)} />
      )}
    </div>
  )
})
