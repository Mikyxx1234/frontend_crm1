"use client"

import { useMemo, useState } from "react"
import {
  CircleCheck,
  TriangleAlert,
  CircleX,
  Microscope,
  User,
  Briefcase,
  Phone,
  GitBranch,
  Inbox,
  Loader2,
  MessageSquare,
  Radio,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InputGlass } from "@/components/crm/input-glass"
import { blockKeyForStepType, getBlockMeta } from "@/components/crm/flow-block-icon"
import {
  automationLogToEntry,
  formatDateTime,
  isTriggerEcho,
  matchesLogQuery,
  type LogEntry,
  type LogStatus,
} from "@/lib/logs-data"
import { useAutomationLogs } from "@/features/automations-v2/hooks"
import { SessionInspectionModal } from "./session-inspection-modal"

export type LogsTarget = {
  /** Id do passo; o gatilho usa `"trigger"`, convenção aceita pela API. */
  nodeId: string
  title: string
  ref: number
  initialTab?: TabKey
}

type TabKey = "entered" | "success" | "alert" | "error"

const STATUS_STYLE: Record<
  LogStatus,
  { icon: typeof CircleCheck; iconClass: string }
> = {
  success: { icon: CircleCheck, iconClass: "bg-[var(--color-success)] text-[var(--color-success-foreground)]" },
  alert: { icon: TriangleAlert, iconClass: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]" },
  error: { icon: CircleX, iconClass: "bg-[var(--color-danger)] text-white" },
}

export function LogsModal({
  automationId,
  target,
  open,
  onOpenChange,
}: {
  automationId: string
  target: LogsTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const query = useAutomationLogs(
    automationId,
    target?.nodeId ?? null,
    open && target !== null,
  )

  const logs = useMemo(() => {
    const pages = query.data?.pages ?? []
    // A rota responde `items`; o editor legado lê `logs ?? items` e mantemos
    // a mesma tolerância.
    const rows = pages
      .flatMap((page) => page.logs ?? page.items ?? [])
      .filter((row) => !isTriggerEcho(row))
    const entered = rows.map(automationLogToEntry)
    return {
      entered,
      success: entered.filter((e) => e.status === "success"),
      alert: entered.filter((e) => e.status === "alert"),
      error: entered.filter((e) => e.status === "error"),
      total: pages[0]?.total ?? entered.length,
    }
  }, [query.data])

  const [tab, setTab] = useState<TabKey>(target?.initialTab ?? "success")
  const [queryText, setQueryText] = useState("")
  const [selected, setSelected] = useState<LogEntry | null>(null)

  // Sincroniza a aba inicial quando o alvo muda
  const [lastNode, setLastNode] = useState<string | null>(null)
  if (target && target.nodeId !== lastNode) {
    setLastNode(target.nodeId)
    setTab(target.initialTab ?? "success")
    setQueryText("")
    setSelected(null)
  }

  if (!target) return null

  const tabs: { key: TabKey; label: string; count: number; tone?: LogStatus }[] = [
    { key: "entered", label: "Entraram", count: logs.entered.length },
    { key: "success", label: "Sucessos", count: logs.success.length, tone: "success" },
    { key: "alert", label: "Alertas", count: logs.alert.length, tone: "alert" },
    { key: "error", label: "Erros", count: logs.error.length, tone: "error" },
  ]

  const scoped =
    tab === "entered"
      ? logs.entered
      : tab === "success"
        ? logs.success
        : tab === "alert"
          ? logs.alert
          : logs.error
  const list = scoped.filter((entry) => matchesLogQuery(entry, queryText))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="lg"
          showCloseButton={false}
          panelClassName="max-w-3xl h-[min(85vh,720px)]"
          bodyClassName="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0"
        >
          <header className="shrink-0 px-6 pb-0 pt-6">
            <DialogTitle className="text-xl font-semibold text-balance text-foreground">
              Logs — {target.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {query.isPending
                ? "Carregando registros…"
                : query.isError
                  ? "Não foi possível carregar os registros."
                  : `${logs.total.toLocaleString("pt-BR")} registro(s)${
                      logs.total > logs.entered.length
                        ? ` · exibindo os ${logs.entered.length} mais recentes`
                        : ""
                    }`}
            </DialogDescription>

            <div
              role="tablist"
              aria-label="Filtrar logs por status"
              className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-3"
            >
              {tabs.map((t) => {
                const active = tab === t.key
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "group relative flex items-center gap-2 pb-3 text-sm transition-colors",
                      active
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{t.label}</span>
                    <span
                      className={cn(
                        "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                        active
                          ? "bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t.count}
                    </span>
                    {active && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--brand-primary)]" />
                    )}
                  </button>
                )
              })}
            </div>

            <div className="py-4">
              <label className="sr-only" htmlFor="automation-logs-search">
                Buscar logs por contato, negócio, telefone ou mensagem
              </label>
              <InputGlass
                id="automation-logs-search"
                type="search"
                withSearch
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Buscar evento, contato, telefone ou mensagem…"
                autoComplete="off"
              />
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6">
            {query.isPending ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState
                message={query.error?.message ?? "Erro ao carregar os logs."}
                onRetry={() => query.refetch()}
              />
            ) : list.length === 0 ? (
              <EmptyState
                hasQuery={queryText.trim().length > 0}
                canLoadMore={query.hasNextPage === true}
                onLoadMore={() => query.fetchNextPage()}
                loadingMore={query.isFetchingNextPage}
              />
            ) : (
              <>
                <ul className="space-y-3 py-4">
                  {list.map((entry) => (
                    <LogRow
                      key={entry.id}
                      entry={entry}
                      onDetails={() => setSelected(entry)}
                    />
                  ))}
                </ul>
                {query.hasNextPage && (
                  <div className="flex justify-center pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={query.isFetchingNextPage}
                      onClick={() => query.fetchNextPage()}
                    >
                      {query.isFetchingNextPage
                        ? "Carregando…"
                        : `Carregar mais (${logs.entered.length.toLocaleString("pt-BR")} de ${logs.total.toLocaleString("pt-BR")})`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <footer className="flex shrink-0 justify-end border-t border-border p-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </footer>
        </DialogContent>
      </Dialog>

      <SessionInspectionModal
        entry={selected}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </>
  )
}

function LogRow({
  entry,
  onDetails,
}: {
  entry: LogEntry
  onDetails: () => void
}) {
  const style = STATUS_STYLE[entry.status]
  const Icon = style.icon
  const detail =
    (entry.reason && entry.reason !== entry.title ? entry.reason : null) ||
    (entry.message && entry.message !== entry.title ? entry.message : null)
  const quotedSnippet =
    entry.snippet && entry.snippet !== detail ? `“${entry.snippet}”` : null
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border bg-[var(--glass-bg-base)] p-4 transition-colors hover:border-[var(--brand-primary)]/30 hover:bg-[var(--color-primary-soft)]/40">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          style.iconClass,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{entry.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
          {formatDateTime(entry.timestamp)}
        </p>
        {detail && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {detail}
          </p>
        )}
        {quotedSnippet && (
          <p className="mt-0.5 inline-flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="line-clamp-2">{quotedSnippet}</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-4" aria-hidden />
            {entry.contactLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="size-4" aria-hidden />
            {entry.dealLabel}
          </span>
          {entry.contactPhone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-4" aria-hidden />
              {entry.contactPhone}
            </span>
          )}
          {entry.channelLabel && (
            <span className="inline-flex items-center gap-1.5">
              <Radio className="size-4" aria-hidden />
              {entry.channelLabel}
            </span>
          )}
          {entry.eventLabel &&
            !entry.title.toLowerCase().includes(entry.eventLabel.toLowerCase()) && (
              <span className="inline-flex items-center gap-1.5">
                <Inbox className="size-4" aria-hidden />
                {entry.eventLabel}
              </span>
            )}
          {entry.stepType && (
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-4" aria-hidden />
              {getBlockMeta(blockKeyForStepType(entry.stepType)).label}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={onDetails}
      >
        <Microscope className="size-4" aria-hidden />
        Detalhes
      </Button>
    </li>
  )
}

function EmptyState({
  hasQuery,
  canLoadMore,
  onLoadMore,
  loadingMore,
}: {
  hasQuery?: boolean
  canLoadMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-4 w-4" />
      </span>
      <p className="text-sm text-muted-foreground">
        {hasQuery
          ? canLoadMore
            ? "Nenhum registro para esta busca nos carregados."
            : "Nenhum registro para esta busca."
          : "Nenhum registro nesta categoria."}
      </p>
      {hasQuery && canLoadMore && onLoadMore && (
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? "Carregando…" : "Carregar mais registros"}
        </Button>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Carregando registros…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--route-error)]/10 text-[var(--route-error)]">
        <CircleX className="h-4 w-4" />
      </span>
      <p className="text-sm font-semibold text-foreground">
        Não foi possível carregar os logs
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}
