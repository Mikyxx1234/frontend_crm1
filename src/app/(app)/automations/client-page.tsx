"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconBolt,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconLoader2,
  IconMenu2,
  IconPlus,
  IconRobot,
  IconRotateClockwise,
  IconSearch,
  IconUpload,
} from "@tabler/icons-react"

import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { RestrictedScreen } from "@/components/crm/restricted-screen"
import { useRequireManager } from "@/hooks/use-user-role"
import { PageHeader } from "@/components/crm/page-header"
import { PageSegmentedControl } from "@/components/crm/page-toolbar"
import { PageDemoBanner } from "@/components/crm/page-demo-banner"
import { AutomationsGallery } from "@/components/crm/automations-gallery"
import { EmptyState } from "@/components/crm/empty-state"
import { cn } from "@/lib/utils"
import {
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  useReplaceAutomation,
  useToggleAutomation,
} from "@/features/automations-v2/hooks"
import { dtoToAutomation } from "@/features/automations-v2/automation-adapter"
import { MOCK_AUTOMATIONS_PAGE } from "@/features/automations-v2/mock-automations"
import { isPageMockMode } from "@/lib/page-mock-mode"
import { AUTOMATION_TRIGGER_TYPES } from "@/lib/automation-workflow"
import { useConfirm } from "@/components/ui/confirm-dialog"

const FILTERS = ["Todas", "Ativas", "Pausadas"] as const

export default function V2AutomationsClientPage() {
  const router = useRouter()
  const { ready, isManagerUp } = useRequireManager()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const automationsQuery = useAutomations({ perPage: 200 })
  const toggleMutation = useToggleAutomation()
  const createMutation = useCreateAutomation()
  const replaceMutation = useReplaceAutomation()
  const deleteMutation = useDeleteAutomation()
  const { confirm, dialog: confirmDialog } = useConfirm()

  const realDtos = automationsQuery.data?.items ?? []
  const hasFilters = query.trim().length > 0 || filter !== 0
  // Automacoes: nao mostra mocks pra org nova (realCount=0). Isso confundia
  // usuarios reais em prod, que viam automacoes "fantasma" sem conseguir
  // desligar/apagar. Modo demo agora exige ativacao explicita (URL
  // ?mock=1, env NEXT_PUBLIC_MOCK_PAGES=1 ou preview v0).
  const isDemo = isPageMockMode() && !hasFilters

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

  const handleDelete = async (id: string) => {
    if (isDemo) {
      toast.info("Modo demonstração — exclusão indisponível.")
      return
    }
    const target = items.find((a) => a.id === id)
    const name = target?.name ?? "esta automação"

    const ok = await confirm({
      title: "Excluir automação?",
      description: (
        <>
          Tem certeza que deseja excluir <strong>{name}</strong>? Esta ação não
          pode ser desfeita. Todos os passos e o histórico de execuções da
          automação serão removidos.
        </>
      ),
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      destructive: true,
    })
    if (!ok) return

    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Automação "${name}" excluída.`),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Erro ao excluir automação"),
    })
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  /**
   * Importa um fluxo `.json` exportado por outra automação (formato do
   * `handleExportJson` em `features/legacy-v1/automations-editor.tsx`):
   *   { id?, name, description?, triggerType, triggerConfig?, active?,
   *     steps: [{ id, type, config }], exportedAt? }
   *
   * Estratégia em 2 passos:
   *   1. `POST /api/automations` — cria a casca (sempre pausada,
   *      `active: false`, para não disparar antes do operador revisar).
   *   2. `PUT  /api/automations/:id` — substitui tudo de uma vez (nome,
   *      triggerType, triggerConfig E steps embutidos). Mesmo endpoint
   *      usado pelo `OldAutomationEditor` para salvar o canvas — é o
   *      caminho confirmado em produção (o endpoint
   *      `PUT /api/automations/:id/steps` que o `saveAutomationSteps`
   *      sugeria não persiste no backend atual).
   *
   * O `id` original da AUTOMAÇÃO é descartado (backend gera UUID novo no
   * POST). Já o `id` de cada STEP é PRESERVADO — sem isso, as referências
   * internas do fluxo (`nextStepId`, `gotoStepId`, `elseGotoStepId`,
   * `targetStepId`, etc.) ficariam quebradas após a importação.
   */
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (isImporting) return

    setIsImporting(true)
    try {
      const text = await file.text()

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        toast.error("Arquivo não é um JSON válido.")
        return
      }

      if (!parsed || typeof parsed !== "object") {
        toast.error("Estrutura inválida: era esperado um objeto JSON.")
        return
      }
      const data = parsed as Record<string, unknown>

      const name = typeof data.name === "string" ? data.name.trim() : ""
      const triggerType =
        typeof data.triggerType === "string" ? data.triggerType : ""
      const stepsRaw = Array.isArray(data.steps) ? data.steps : null

      if (!name) {
        toast.error("Campo `name` ausente ou vazio no JSON.")
        return
      }
      if (!triggerType) {
        toast.error("Campo `triggerType` ausente no JSON.")
        return
      }
      if (!stepsRaw) {
        toast.error("Campo `steps` ausente ou inválido no JSON.")
        return
      }
      if (
        !AUTOMATION_TRIGGER_TYPES.includes(
          triggerType as (typeof AUTOMATION_TRIGGER_TYPES)[number],
        )
      ) {
        toast.warning(
          `Gatilho "${triggerType}" não está no catálogo conhecido — tentando mesmo assim.`,
        )
      }

      const description =
        typeof data.description === "string" ? data.description : null
      const triggerConfig =
        data.triggerConfig && typeof data.triggerConfig === "object"
          ? (data.triggerConfig as Record<string, unknown>)
          : {}

      const steps = stepsRaw
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null
          const s = raw as Record<string, unknown>
          if (typeof s.type !== "string" || !s.type) return null
          const config =
            s.config && typeof s.config === "object" && !Array.isArray(s.config)
              ? (s.config as Record<string, unknown>)
              : {}
          const id =
            typeof s.id === "string" && s.id.trim() ? s.id : undefined
          return { id, type: s.type, config }
        })
        .filter(
          (s): s is { id: string | undefined; type: string; config: Record<string, unknown> } =>
            s !== null,
        )

      if (steps.length === 0 && stepsRaw.length > 0) {
        toast.error("Nenhum step válido encontrado no JSON.")
        return
      }

      const created = await createMutation.mutateAsync({
        name,
        description,
        triggerType,
        triggerConfig,
        active: false,
      })

      try {
        await replaceMutation.mutateAsync({
          id: created.id,
          body: {
            name,
            description,
            triggerType,
            triggerConfig,
            steps,
          },
        })
      } catch (stepErr) {
        toast.warning(
          `Automação criada mas falhou ao salvar os ${steps.length} passos: ${
            stepErr instanceof Error ? stepErr.message : "erro desconhecido"
          }. Abra no editor para revisar.`,
        )
        router.push(`/automations/${created.id}`)
        return
      }

      toast.success(
        `Automação "${name}" importada (pausada, ${steps.length} ${
          steps.length === 1 ? "passo" : "passos"
        }).`,
      )
      router.push(`/automations/${created.id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao importar automação.",
      )
    } finally {
      setIsImporting(false)
    }
  }

  const isLoading = automationsQuery.isLoading
  const isError = automationsQuery.isError && !isDemo
  const isEmpty = !isLoading && !isError && !isDemo && items.length === 0

  if (ready && !isManagerUp) return <RestrictedScreen />

  return (
    <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_1fr] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3 overflow-hidden sm:gap-4">
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />

        <PageHeader
          icon={<IconRobot size={22} stroke={2.2} />}
          title="Automações"
          center={
            <AutomationsSearchFilterBar
              search={query}
              onSearch={setQuery}
              filter={filter}
              onFilterChange={setFilter}
              counts={{ all: items.length, active: summary.active, paused: summary.paused }}
              onClearAll={() => {
                setQuery("")
                setFilter(0)
              }}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <PageSegmentedControl
                size="compact"
                aria-label="Automações e campanhas"
                items={[
                  { value: "automations", label: "Automações" },
                  { value: "campaigns", label: "Campanhas" },
                ]}
                value="automations"
                onChange={(v) => {
                  if (v === "campaigns") router.push("/campaigns")
                }}
              />
              <AutomationsActionsMenu
                onNew={() => router.push("/automations/new")}
                onImport={handleImportClick}
                importing={isImporting}
              />
            </div>
          }
        />

        <AutomationsMiniDash
          active={summary.active}
          total={items.length}
          runsToday={summary.runsToday}
          avgSuccess={summary.avgSuccess}
          paused={summary.paused}
        />

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
          <AutomationsGallery
            automations={filtered}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}

        {!isLoading && !isError && filtered.length === 0 && items.length > 0 && (
          <EmptyState
            icon={<IconBolt size={28} />}
            title="Nenhum resultado"
            description="Nenhuma automação corresponde à busca ou ao filtro selecionado."
          />
        )}
      </main>

      {confirmDialog}
    </div>
  )
}

// ── Mini-dash ────────────────────────────────────────────────────────────

function AutomationsMiniDash({
  active,
  total,
  runsToday,
  avgSuccess,
  paused,
}: {
  active: number
  total: number
  runsToday: number
  avgSuccess: number
  paused: number
}) {
  const coverage = total > 0 ? Math.round((active / total) * 100) : 0
  const cards: {
    key: string
    label: string
    value: string
    percent?: number
    accent: string
    icon: React.ReactNode
  }[] = [
    {
      key: "active",
      label: `Ativas · de ${total}`,
      value: active.toLocaleString("pt-BR"),
      percent: coverage,
      accent: "var(--brand-primary)",
      icon: <IconBolt size={16} stroke={2.2} />,
    },
    {
      key: "runs",
      label: "Execuções hoje",
      value: runsToday.toLocaleString("pt-BR"),
      accent: "var(--brand-secondary, #a78bfa)",
      icon: <IconActivity size={16} />,
    },
    {
      key: "success",
      label: "Taxa média de sucesso",
      value: `${avgSuccess}%`,
      accent: "var(--color-success)",
      icon: <IconCircleCheck size={16} />,
    },
    {
      key: "paused",
      label: "Pausadas",
      value: paused.toLocaleString("pt-BR"),
      accent: "var(--text-muted)",
      icon: <IconClock size={16} />,
    },
  ]

  return (
    <section
      className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Indicadores"
    >
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `color-mix(in srgb, ${c.accent} 14%, transparent)`,
              color: c.accent,
            }}
          >
            {c.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[11.5px] font-semibold tracking-[0.01em] text-[var(--text-muted)]">
              {c.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[22px] font-bold leading-none text-[var(--text-primary)] tabular-nums">
                {c.value}
              </span>
              {c.percent !== undefined && (
                <span
                  className="font-display text-[12px] font-bold tabular-nums"
                  style={{ color: c.accent }}
                >
                  {c.percent}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

// ── Busca + popover de filtros (status) ──────────────────────────────────

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  )
}

function AutomationsSearchFilterBar({
  search,
  onSearch,
  filter,
  onFilterChange,
  counts,
  onClearAll,
}: {
  search: string
  onSearch: (v: string) => void
  filter: number
  onFilterChange: (v: number) => void
  counts: { all: number; active: number; paused: number }
  onClearAll: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const activeCount = filter !== 0 ? 1 : 0
  const countFor = (index: number) =>
    index === 0 ? counts.all : index === 1 ? counts.active : counts.paused

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  return (
    <div ref={ref} className="relative w-full">
      <IconSearch
        size={15}
        className="absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar e filtrar automações..."
        aria-label="Buscar e filtrar automações"
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtros"
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
          activeCount > 0 || open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
        )}
      >
        <IconAdjustmentsHorizontal size={15} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(100vw-2rem,380px)] flex-col overflow-visible rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-left shadow-[var(--glass-shadow-lg)] backdrop-blur-md">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                Filtrar por status
              </span>
              <CountBadge count={activeCount} />
            </div>
            <button
              type="button"
              onClick={onClearAll}
              disabled={activeCount === 0 && !search}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((label, index) => {
                const selected = filter === index
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onFilterChange(index)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                      selected
                        ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                    )}
                  >
                    {selected && <IconCheck size={12} stroke={2.4} />}
                    {label}
                    <span
                      className={cn(
                        "min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-bold",
                        selected
                          ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]"
                          : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                      )}
                    >
                      {countFor(index)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Menu hamburger (CTAs da página) ──────────────────────────────────────

function AutomationsActionsMenu({
  onNew,
  onImport,
  importing,
}: {
  onNew: () => void
  onImport: () => void
  importing: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const items: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    disabled?: boolean
    divider?: boolean
  }[] = [
    {
      icon: <IconPlus size={16} stroke={2.4} />,
      label: "Nova automação",
      onClick: onNew,
    },
    {
      icon: importing ? (
        <IconLoader2 size={16} className="animate-spin" />
      ) : (
        <IconUpload size={16} />
      ),
      label: importing ? "Importando…" : "Importar .json",
      onClick: onImport,
      disabled: importing,
      divider: true,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-[filter,box-shadow] hover:brightness-105",
          open && "ring-2 ring-[var(--brand-primary)]/35 brightness-95",
        )}
      >
        <IconMenu2 size={18} stroke={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
          {items.map((it) => (
            <div key={it.label}>
              {it.divider && <div className="my-1 h-px bg-[var(--glass-border)]" />}
              <button
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)] disabled:opacity-40"
              >
                <span className="text-[var(--text-muted)]">{it.icon}</span>
                {it.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
