"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { IconArrowLeft, IconSparkles, IconX } from "@tabler/icons-react"
import { InputGlass } from "../input-glass"
import { BlockPill } from "../block-pill"
import { getBlockMeta, blockCategories, blockChipStyle } from "../flow-block-icon"
import type { FlowNodeData } from "@/lib/automation-flow"

interface InspectorPanelProps {
  selected: FlowNodeData | null
  onClose: () => void
  onAddBlock: (type: string) => void
}

export function InspectorPanel({ selected, onClose, onAddBlock }: InspectorPanelProps) {
  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow-sm)]">
      {/* Paleta sempre presente como barra principal à direita */}
      <BlocksPalette onAddBlock={onAddBlock} />

      {/* Drawer de configuração desliza sobre a paleta quando há seleção */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex flex-col bg-[rgba(244,247,252,0.98)] backdrop-blur-xl transition-transform duration-300",
          selected ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        {selected && <StepInspector selected={selected} onClose={onClose} />}
      </div>
    </aside>
  )
}

/* ---------- Paleta de blocos (faithful às imagens) ---------- */

function BlocksPalette({ onAddBlock }: { onAddBlock: (type: string) => void }) {
  const [query, setQuery] = useState("")

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return blockCategories
    return blockCategories
      .map((cat) => ({
        ...cat,
        types: cat.types.filter((t) => getBlockMeta(t).label.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.types.length > 0)
  }, [query])

  return (
    <>
      <div className="border-b border-[var(--glass-border-subtle)] px-4 pb-3 pt-3.5">
        <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">Blocos</p>
        <p className="mb-2.5 font-body text-[12px] text-[var(--text-muted)]">
          Clique ou arraste para o fluxo.
        </p>
        <InputGlass
          withSearch
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar bloco…"
          aria-label="Buscar bloco"
        />
      </div>

      <div className="flex-1 overflow-auto px-3 py-3">
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center font-body text-[12px] text-[var(--text-muted)]">
            Nenhum bloco encontrado.
          </p>
        ) : (
          groups.map((cat) => (
            <div key={cat.id} className="mb-4 last:mb-0">
              <p className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {cat.label}
              </p>
              <div className="flex flex-col gap-2">
                {cat.types.map((type) => (
                  <BlockPill
                    key={type}
                    type={type}
                    size="sm"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/block-type", type)}
                    onClick={() => onAddBlock(type)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}

/* ---------- Inspector de passo selecionado ---------- */

function StepInspector({ selected, onClose }: { selected: FlowNodeData; onClose: () => void }) {
  const meta = getBlockMeta(selected.blockType)
  const Icon = meta.Icon
  const categoryLabel =
    selected.kind === "trigger"
      ? "Gatilho"
      : selected.kind === "final"
        ? "Final"
        : meta.category === "salesbot"
          ? "Salesbot"
          : meta.category === "ai"
            ? "IA"
            : "Ação"

  return (
    <>
      <div className="flex items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
          aria-label="Voltar para blocos"
        >
          <IconArrowLeft size={18} />
        </button>
        <span className="flex-1 font-display text-[13px] font-bold text-[var(--text-primary)]">
          Configurar passo
        </span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
        >
          <IconX size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]"
            style={
              selected.kind === "trigger"
                ? { backgroundColor: "var(--brand-primary)", color: "#fff" }
                : blockChipStyle(selected.blockType)
            }
          >
            <Icon size={22} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {categoryLabel}
            </p>
            <p className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
              {selected.title}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Título do passo" defaultValue={selected.title} />
          {selected.subtitle && <Field label="Configuração" defaultValue={selected.subtitle} />}
          {selected.meta && <Field label="Contexto" defaultValue={selected.meta} />}
          {typeof selected.count === "number" && (
            <Readout label="Execuções acumuladas" value={selected.count.toLocaleString("pt-BR")} />
          )}
        </div>

        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/25 bg-[var(--color-enterprise-bg)] p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-[var(--brand-primary)]">
            <IconSparkles size={15} />
            <span className="font-display text-[12px] font-bold">Sugestão do Copilot</span>
          </div>
          <p className="font-body text-[12px] leading-relaxed text-[var(--text-secondary)]">
            Adicione uma condição antes deste passo para filtrar apenas leads com lead score acima de 50.
          </p>
        </div>
      </div>
    </>
  )
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-display text-[11px] font-semibold text-[var(--text-muted)]">{label}</span>
      <InputGlass defaultValue={defaultValue} aria-label={label} />
    </label>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[11px] font-semibold text-[var(--text-muted)]">{label}</span>
      <span className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  )
}
