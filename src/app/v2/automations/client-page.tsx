"use client"

import { useMemo, useState } from "react"
import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { PageHeader } from "@/components/crm/page-header"
import { AutomationsGallery } from "@/components/crm/automations-gallery"
import { StatTile } from "@/components/crm/stat-tile"
import { InputGlass } from "@/components/crm/input-glass"
import { TabsGlass } from "@/components/crm/tabs-glass"
import { automations as seed } from "@/lib/automations-data"
import {
  IconBolt,
  IconPlus,
  IconUpload,
  IconActivity,
  IconCircleCheck,
  IconClock,
} from "@tabler/icons-react"

const FILTERS = ["Todas", "Ativas", "Pausadas"] as const

export default function V2AutomationsClientPage() {
  const [items, setItems] = useState(seed)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(0)

  const toggle = (id: string) =>
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)))

  const summary = useMemo(() => {
    const active = items.filter((a) => a.active)
    const runsToday = items.reduce((sum, a) => sum + a.runsToday, 0)
    const avgSuccess = Math.round(items.reduce((sum, a) => sum + a.successRate, 0) / (items.length || 1))
    return { active: active.length, paused: items.length - active.length, runsToday, avgSuccess }
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((a) => {
      const matchQuery = !q || a.name.toLowerCase().includes(q) || a.trigger.toLowerCase().includes(q)
      const matchFilter = filter === 0 || (filter === 1 ? a.active : !a.active)
      return matchQuery && matchFilter
    })
  }, [items, query, filter])

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconBolt size={22} />}
          title="Automações"
          description="Fluxos disparados por eventos do CRM."
          actions={
            <>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2 font-display text-[13px] font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-white"
              >
                <IconUpload size={15} /> Importar Bot Kommo
              </button>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
              >
                <IconPlus size={16} /> Nova automação
              </button>
            </>
          }
        />

        {/* Barra de resumo */}
        <div className="grid grid-cols-2 gap-3 px-1 lg:grid-cols-4">
          <StatTile label="Ativas" value={summary.active} hint={`de ${items.length}`} icon={<IconBolt size={18} />} tone="brand" />
          <StatTile label="Execuções hoje" value={summary.runsToday} icon={<IconActivity size={18} />} tone="violet" />
          <StatTile label="Taxa média de sucesso" value={`${summary.avgSuccess}%`} icon={<IconCircleCheck size={18} />} tone="success" />
          <StatTile label="Pausadas" value={summary.paused} icon={<IconClock size={18} />} tone="neutral" />
        </div>

        {/* Busca + filtro */}
        <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:max-w-sm sm:flex-1">
            <InputGlass
              withSearch
              placeholder="Buscar automações..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <TabsGlass
            tabs={[...FILTERS]}
            activeTab={filter}
            onChange={setFilter}
          />
        </div>

        {/* Galeria */}
        <AutomationsGallery automations={filtered} onToggle={toggle} />
      </main>
    </div>
  )
}
