"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  useCreateAutomation,
  useDeleteAutomation,
  useReplaceAutomation,
  useToggleAutomation,
} from "@/features/automations-v2/hooks"
import { dtoToAutomation } from "@/features/automations-v2/automation-adapter"
import { MOCK_AUTOMATIONS_PAGE } from "@/features/automations-v2/mock-automations"
import { shouldAutoDemoEmpty } from "@/lib/page-mock-mode"
import { AUTOMATION_TRIGGER_TYPES } from "@/lib/automation-workflow"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"

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
              <PageGhostButton
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                <IconUpload size={15} />
                {isImporting ? "Importando..." : "Importar .json"}
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
