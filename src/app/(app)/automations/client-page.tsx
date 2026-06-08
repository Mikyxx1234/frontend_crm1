"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  IconActivity,
  IconBolt,
  IconCircleCheck,
  IconClock,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react"

import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { RestrictedScreen } from "@/components/crm/restricted-screen"
import { useRequireManager } from "@/hooks/use-user-role"
import { PageHeader } from "@/components/crm/page-header"
import { AutomationsGallery } from "@/components/crm/automations-gallery"
import { StatTile } from "@/components/crm/stat-tile"
import { InputGlass } from "@/components/crm/input-glass"
import { TabsGlass } from "@/components/crm/tabs-glass"
import { EmptyState } from "@/components/crm/empty-state"
import {
  useAutomations,
  useToggleAutomation,
} from "@/features/automations-v2/hooks"
import { dtoToAutomation } from "@/features/automations-v2/automation-adapter"

const FILTERS = ["Todas", "Ativas", "Pausadas"] as const

export default function V2AutomationsClientPage() {
  const { ready, isManagerUp } = useRequireManager()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(0)

  const automationsQuery = useAutomations({ perPage: 200 })
  const toggleMutation = useToggleAutomation()

  const items = useMemo(
    () => (automationsQuery.data?.items ?? []).map(dtoToAutomation),
    [automationsQuery.data?.items],
  )

  const summary = useMemo(() => {
    const active = items.filter((a) => a.active)
    const runsToday = items.reduce((sum, a) => sum + a.runsToday, 0)
    const avgSuccess =
      items.length === 0
        ? 0
        : Math.round(items.reduce((sum, a) => sum + a.successRate, 0) / items.length)
    return {
      active: active.length,
      paused: items.length - active.length,
      runsToday,
      avgSuccess,
    }
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((a) => {
      const matchQuery =
        !q || a.name.toLowerCase().includes(q) || a.trigger.toLowerCase().includes(q)
      const matchFilter = filter === 0 || (filter === 1 ? a.active : !a.active)
      return matchQuery && matchFilter
    })
  }, [items, query, filter])

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Erro ao alternar automação"),
    })
  }

  const isLoading = automationsQuery.isLoading
  const isError = automationsQuery.isError
  const isEmpty = !isLoading && !isError && items.length === 0

  if (ready && !isManagerUp) return <RestrictedScreen />

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
              <Link
                href="/old/automations"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2 font-display text-[13px] font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-white"
              >
                <IconUpload size={15} /> Importar Bot Kommo
              </Link>
              <Link
                href="/automations/new"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
              >
                <IconPlus size={16} /> Nova automação
              </Link>
            </>
          }
        />

        {/* Barra de resumo */}
        <div className="grid grid-cols-2 gap-3 px-1 lg:grid-cols-4">
          <StatTile
            label="Ativas"
            value={summary.active}
            hint={`de ${items.length}`}
            icon={<IconBolt size={18} />}
            tone="brand"
          />
          <StatTile
            label="Execuções hoje"
            value={summary.runsToday}
            icon={<IconActivity size={18} />}
            tone="violet"
          />
          <StatTile
            label="Taxa média de sucesso"
            value={`${summary.avgSuccess}%`}
            icon={<IconCircleCheck size={18} />}
            tone="success"
          />
          <StatTile
            label="Pausadas"
            value={summary.paused}
            icon={<IconClock size={18} />}
            tone="neutral"
          />
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
          <TabsGlass tabs={[...FILTERS]} activeTab={filter} onChange={setFilter} />
        </div>

        {/* Estados: loading, erro, vazio, galeria */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center font-body text-[13px] text-[var(--text-muted)]">
            Carregando automações...
          </div>
        )}

        {isError && (
          <EmptyState
            icon={<IconBolt size={28} />}
            title="Erro ao carregar automações"
            description={
              automationsQuery.error?.message ?? "Tente recarregar a página."
            }
          />
        )}

        {isEmpty && (
          <EmptyState
            icon={<IconBolt size={28} />}
            title="Nenhuma automação ainda"
            description="Crie sua primeira automação ou importe um bot do Kommo."
            action={
              <Link
                href="/automations/new"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)]"
              >
                <IconPlus size={16} /> Nova automação
              </Link>
            }
          />
        )}

        {!isLoading && !isError && items.length > 0 && (
          <AutomationsGallery automations={filtered} onToggle={handleToggle} />
        )}
      </main>
    </div>
  )
}
