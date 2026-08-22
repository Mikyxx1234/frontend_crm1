"use client"

import { useMemo, useState } from "react"
import { Microscope, Network, Code2, Copy, Check, X, CircleCheck, TriangleAlert, CircleX } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { LogEntry, LogStatus } from "@/lib/logs-data"
import { statusMeta } from "@/lib/logs-data"

const STATUS_STYLE: Record<
  LogStatus,
  { icon: typeof CircleCheck; pillClass: string }
> = {
  success: {
    icon: CircleCheck,
    pillClass: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  },
  alert: {
    icon: TriangleAlert,
    pillClass: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  },
  error: {
    icon: CircleX,
    pillClass: "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  },
}

type ViewMode = "tree" | "raw"

export function SessionInspectionModal({
  entry,
  open,
  onOpenChange,
}: {
  entry: LogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sections = useMemo(() => {
    if (!entry) return []
    return [
      { key: "summary", label: "Resumo", data: entry.summary },
      { key: "params", label: "Parâmetros", data: entry.params },
    ]
  }, [entry])

  const [activeSection, setActiveSection] = useState(0)
  const [view, setView] = useState<ViewMode>("tree")
  const [copied, setCopied] = useState(false)

  if (!entry) return null
  const status = STATUS_STYLE[entry.status]
  const StatusIcon = status.icon
  const meta = statusMeta(entry.status)
  const section = sections[activeSection] ?? sections[0]
  const data = section.data

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        showCloseButton
        panelClassName="max-w-3xl max-h-[min(85vh,640px)]"
        bodyClassName="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Microscope className="size-5 shrink-0 text-[var(--brand-primary)]" />
              Inspeção da sessão
            </DialogTitle>
            <DialogDescription className="mt-1 break-all font-mono text-xs text-muted-foreground">
              Sessão {entry.sessionId}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                status.pillClass,
              )}
            >
              <StatusIcon className="size-4" />
              {meta.label}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[180px_1fr] overflow-hidden border-t border-border">
          <nav className="border-r border-border p-3" aria-label="Seções">
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Seções
            </p>
            <ul className="space-y-1">
              {sections.map((s, i) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(i)}
                    aria-current={i === activeSection ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                      i === activeSection
                        ? "bg-[var(--color-primary-soft)] font-medium text-[var(--brand-primary)]"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {s.label}
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        i === activeSection ? "text-[var(--brand-primary)]" : "text-muted-foreground",
                      )}
                    >
                      {Object.keys(s.data).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">{section.label}</h3>
              <div className="flex items-center gap-1">
                <ToggleButton active={view === "tree"} onClick={() => setView("tree")} icon={Network}>
                  Árvore
                </ToggleButton>
                <ToggleButton active={view === "raw"} onClick={() => setView("raw")} icon={Code2}>
                  Raw
                </ToggleButton>
                <ToggleButton active={false} onClick={copyJson} icon={copied ? Check : Copy}>
                  {copied ? "Copiado" : "Copiar"}
                </ToggleButton>
              </div>
            </div>

            <div className="max-h-[45vh] overflow-auto rounded-lg border border-border bg-[var(--glass-bg-base)] p-4">
              {view === "tree" ? <TreeView data={data} /> : <RawView data={data} />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Network
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
        active
          ? "bg-card font-semibold text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

function valueColor(v: unknown) {
  if (typeof v === "number" || typeof v === "boolean") return "var(--brand-primary)"
  return "var(--color-success-text)"
}

function renderValue(v: string | number | boolean) {
  if (typeof v === "string") return `"${v}"`
  return String(v)
}

function TreeView({ data }: { data: Record<string, string | number | boolean> }) {
  const entries = Object.entries(data)
  return (
    <div className="font-mono text-[13px] leading-relaxed">
      <div className="text-muted-foreground">{"{…}"}</div>
      <div className="mt-0.5 flex flex-col gap-0.5 pl-4">
        {entries.map(([k, v]) => (
          <div key={k} className="flex min-w-0 gap-1.5">
            <span className="shrink-0 text-[var(--brand-primary)]">{k}:</span>
            <span className="min-w-0 break-all" style={{ color: valueColor(v) }}>{renderValue(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RawView({ data }: { data: Record<string, string | number | boolean> }) {
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-[13px] leading-relaxed text-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
