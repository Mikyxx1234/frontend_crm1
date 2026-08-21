"use client"

import { useMemo, useState } from "react"
import {
  CircleCheck,
  TriangleAlert,
  CircleX,
  Microscope,
  User,
  Briefcase,
  Inbox,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getNodeLogs,
  formatDateTime,
  type LogEntry,
  type LogStatus,
} from "@/lib/logs-data"
import { SessionInspectionModal } from "./session-inspection-modal"

export type LogsTarget = {
  nodeId: string
  title: string
  ref: number
  stats: { sucessos: number; alertas: number; erros: number }
  initialTab?: TabKey
}

type TabKey = "entered" | "success" | "alert" | "error"

const STATUS_STYLE: Record<
  LogStatus,
  { icon: typeof CircleCheck; color: string }
> = {
  success: { icon: CircleCheck, color: "var(--route-response)" },
  alert: { icon: TriangleAlert, color: "var(--topic-documentos)" },
  error: { icon: CircleX, color: "var(--route-error)" },
}

export function LogsModal({
  target,
  open,
  onOpenChange,
}: {
  target: LogsTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const logs = useMemo(
    () =>
      target
        ? getNodeLogs(target.nodeId, target.title, target.ref, target.stats)
        : null,
    [target],
  )

  const [tab, setTab] = useState<TabKey>(target?.initialTab ?? "success")
  const [selected, setSelected] = useState<LogEntry | null>(null)

  // Sincroniza a aba inicial quando o alvo muda
  const [lastNode, setLastNode] = useState<string | null>(null)
  if (target && target.nodeId !== lastNode) {
    setLastNode(target.nodeId)
    setTab(target.initialTab ?? "success")
  }

  if (!target || !logs) return null

  const tabs: { key: TabKey; label: string; count: number; tone?: LogStatus }[] = [
    { key: "entered", label: "Entraram", count: logs.entered.length },
    { key: "success", label: "Sucessos", count: logs.success.length, tone: "success" },
    { key: "alert", label: "Alertas", count: logs.alert.length, tone: "alert" },
    { key: "error", label: "Erros", count: logs.error.length, tone: "error" },
  ]

  const list =
    tab === "entered"
      ? logs.entered
      : tab === "success"
        ? logs.success
        : tab === "alert"
          ? logs.alert
          : logs.error

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="xl"
          showCloseButton={false}
          panelClassName="h-[min(82vh,720px)]"
          bodyClassName="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0"
        >
          <div className="shrink-0 border-b border-border px-5 py-3">
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
              Logs — {target.title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
              {logs.total.toLocaleString("pt-BR")} registro(s)
            </DialogDescription>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-5 py-2">
            {tabs.map((t) => {
              const active = tab === t.key
              const toneColor = t.tone ? STATUS_STYLE[t.tone].color : "var(--muted-foreground)"
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: active ? `color-mix(in oklch, ${toneColor} 15%, transparent)` : "var(--muted)",
                      color: active ? toneColor : "var(--muted-foreground)",
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            {list.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col gap-2 px-5 py-3">
                {list.map((entry) => (
                  <LogRow
                    key={entry.id}
                    entry={entry}
                    onDetails={() => setSelected(entry)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end border-t border-border bg-muted/40 px-5 py-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
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
  return (
    <div className="flex items-start justify-between gap-3 overflow-hidden rounded-xl bg-[var(--color-bg-card)] p-3 ring-1 ring-border/70">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: style.color }}
          >
            <Icon className="h-3 w-3" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-foreground">
              {entry.status === "success" ? "Concluído com sucesso" : entry.message}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
          <Chip icon={User} label={entry.contactLabel} />
          <Chip icon={Briefcase} label={entry.dealLabel} />
        </div>
      </div>

      <button
        type="button"
        onClick={onDetails}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-brand"
      >
        <Microscope className="h-3.5 w-3.5" />
        Detalhes
      </button>
    </div>
  )
}

function Chip({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-4 w-4" />
      </span>
      <p className="text-sm text-muted-foreground">Nenhum registro nesta categoria.</p>
    </div>
  )
}
