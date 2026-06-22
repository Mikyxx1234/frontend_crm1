"use client"

import { useMemo, useRef, useState } from "react"
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
import { PageDemoBanner } from "@/components/crm/page-demo-banner"
import {
  PageGhostButton,
  PagePrimaryButton,
  PageSearchBar,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar"
import { AutomationsGallery } from "@/components/crm/automations-gallery"
import { EmptyState } from "@/components/crm/empty-state"
import {
  useAutomations,
  useToggleAutomation,
} from "@/features/automations-v2/hooks"
import { dtoToAutomation } from "@/features/automations-v2/automation-adapter"
import { MOCK_AUTOMATIONS_PAGE } from "@/features/automations-v2/mock-automations"
import { shouldAutoDemoEmpty } from "@/lib/page-mock-mode"
import { cn } from "@/lib/utils"

const FILTERS = ["Todas", "Ativas", "Pausadas"] as const

export default function V2AutomationsClientPage() {
  const { ready, isManagerUp } = useRequireManager()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(0)
  const importInputRef = useRef<HTMLInputElement>(null)

  const automationsQuery = useAutomations({ perPage: 200 })
  const toggleMutation = useToggleAutomation()

  const realDtos = automationsQuery.data?.items ?? []
  const hasFilters = query.trim().length > 0 || filter !== 0
  const isDemo = shouldAutoDemoEmpty({
    realCount: realDtos.length,
    hasFilters,
    isLoading: automationsQuery.isLoading,
    isError: automationsQuery.isError,
  })

  const items = useMemo(
    () => (isDemo ? MOCK_AUTOMATIONS_PAGE.items : realDtos).map(dtoToAutomation),
    [isDemo, realDtos],
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
    if (isDemo) {
      toast.info("Modo demonstração — o status não é salvo no servidor.")
      return
    }
    toggleMutation.mutate(id, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Erro ao alternar automação"),
    })
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    toast.info("Importação de .json em breve — use o editor para montar o fluxo.")
  }

  const isLoading = automationsQuery.isLoading
  const isError = automationsQuery.isError && !isDemo
  const isEmpty = !isLoading && !isError && !isDemo && items.length === 0

  if (ready && !isManagerUp) return <RestrictedScreen />

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconBolt size={22} stroke={2.2} />}
          title="Automações"
          description="Fluxos disparados por eventos do CRM."
          center={
            <PageSearchBar
              variant="compact"
              value={query}
              onChange={setQuery}
              placeholder="Buscar automações..."
              aria-label="Buscar automações"
            />
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PageSegmentedControl
                size="compact"
                aria-label="Filtrar automações"
                items={FILTERS.map((label, index) => ({
                  value: String(index),
                  label,
                }))}
                value={String(filter)}
                onChange={(v) => setFilter(Number(v))}
              />
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <PageGhostButton type="button" onClick={handleImportClick}>
                <IconUpload size={15} /> Importar .json
              </PageGhostButton>
              <PagePrimaryButton href="/automations/new">
                <IconPlus size={15} stroke={2.4} /> Nova automação
              </PagePrimaryButton>
            </div>
          }
        />

        <section
          className="grid shrink-0 grid-cols-2 gap-3.5 lg:grid-cols-4"
          aria-label="Indicadores"
        >
          <KpiCard
            label="Ativas"
            value={summary.active}
            hint={`de ${items.length}`}
            icon={<IconBolt size={20} stroke={2.2} />}
            tone="brand"
          />
          <KpiCard
            label="Execuções hoje"
            value={summary.runsToday}
            icon={<IconActivity size={20} />}
            tone="violet"
          />
          <KpiCard
            label="Taxa média de sucesso"
            value={`${summary.avgSuccess}%`}
            icon={<IconCircleCheck size={20} />}
            tone="success"
          />
          <KpiCard
            label="Pausadas"
            value={summary.paused}
            icon={<IconClock size={20} />}
            tone="neutral"
          />
        </section>

        {isDemo && (
          <PageDemoBanner>
            Dados de exemplo — fluxos ilustrativos com métricas e mini-fluxo para visualizar a lista.
          </PageDemoBanner>
        )}

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)]"
              />
            ))}
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
            description="Crie sua primeira automação ou importe um fluxo em .json."
            action={
              <Link
                href="/automations/new"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
              >
                <IconPlus size={16} /> Nova automação
              </Link>
            }
          />
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <AutomationsGallery automations={filtered} onToggle={handleToggle} />
        )}

        {!isLoading && !isError && filtered.length === 0 && items.length > 0 && (
          <EmptyState
            icon={<IconBolt size={28} />}
            title="Nenhum resultado"
            description="Nenhuma automação corresponde à busca ou ao filtro selecionado."
          />
        )}
      </main>
    </div>
  )
}

const KPI_TONES = {
  brand: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  violet: "bg-[rgba(167,139,250,0.18)] text-[var(--brand-secondary)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)]",
  neutral: "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
} as const

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon: React.ReactNode
  tone: keyof typeof KPI_TONES
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-[18px] py-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          KPI_TONES[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
          {label}
        </p>
        <p className="font-display text-[24px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
          {value}
          {hint && (
            <small className="ml-1.5 text-[13px] font-semibold text-[var(--text-muted)]">
              {hint}
            </small>
          )}
        </p>
      </div>
    </div>
  )
}
