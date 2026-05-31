"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { BuilderTopbar } from "@/components/crm/automation-builder/builder-topbar"
import { FlowCanvas, type FlowCanvasHandle } from "@/components/crm/automation-builder/flow-canvas"
import { InspectorPanel } from "@/components/crm/automation-builder/inspector-panel"
import { getAutomation } from "@/lib/automations-data"
import { getFlow, getFlowEdges, type FlowNodeData } from "@/lib/automation-flow"
import { IconBolt } from "@tabler/icons-react"

interface V2AutomationDetailClientPageProps {
  automationId: string
}

export default function V2AutomationDetailClientPage({
  automationId,
}: V2AutomationDetailClientPageProps) {
  const automation = getAutomation(automationId)

  const [name, setName] = useState(automation?.name ?? "Nova automação")
  const [active, setActive] = useState(automation?.active ?? false)
  const [selected, setSelected] = useState<FlowNodeData | null>(null)
  const [saved, setSaved] = useState(true)

  const canvasRef = useRef<FlowCanvasHandle>(null)

  const markDirty = () => setSaved(false)

  const addBlock = (type: string) => canvasRef.current?.addBlock(type)
  const closeInspector = () => {
    canvasRef.current?.deselect()
    setSelected(null)
  }

  if (!automation) {
    return (
      <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
        <NavRailV2 />
        <main className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
            <IconBolt size={24} />
          </span>
          <p className="font-display text-[15px] font-bold text-[var(--text-primary)]">
            Automação não encontrada.
          </p>
          <Link
            href="/v2/automations"
            className="rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white"
          >
            Voltar para automações
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="grid min-w-0 grid-rows-[auto_1fr] gap-4 overflow-hidden">
        <BuilderTopbar
          name={name}
          active={active}
          onToggle={() => {
            setActive((v) => !v)
            markDirty()
          }}
          onRename={(v) => {
            setName(v)
            markDirty()
          }}
          onSave={() => setSaved(true)}
          saved={saved}
        />

        <div className="grid min-h-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
          {/* Canvas node-based */}
          <section
            aria-label="Canvas da automação"
            className="relative min-h-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] backdrop-blur-md"
          >
            <FlowCanvas
              ref={canvasRef}
              initialNodes={getFlow(automationId)}
              initialEdges={getFlowEdges(automationId)}
              onSelect={setSelected}
              onDirty={markDirty}
            />
          </section>

          {/* Inspector / paleta */}
          <div className="hidden min-h-0 lg:block">
            <InspectorPanel
              selected={selected}
              onClose={closeInspector}
              onAddBlock={addBlock}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
