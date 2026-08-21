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
  { icon: typeof CircleCheck; color: string; tint: string }
> = {
  success: { icon: CircleCheck, color: "var(--route-response)", tint: "var(--topic-financeiro-tint)" },
  alert: { icon: TriangleAlert, color: "var(--topic-documentos)", tint: "var(--topic-documentos-tint)" },
  error: { icon: CircleX, color: "var(--route-error)", tint: "var(--topic-fallback-tint)" },
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
        showCloseButton={false}
        panelClassName="max-h-[min(70vh,520px)]"
        bodyClassName="flex min-h-0 flex-col gap-0 overflow-hidden p-0"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Microscope className="h-4 w-4 shrink-0 text-brand" />
              Inspeção da sessão
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              Sessão {entry.sessionId}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: status.tint, color: status.color }}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="w-40 shrink-0 border-r border-border bg-muted/30 px-3 py-3">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Seções
            </p>
            <div className="flex flex-col gap-0.5">
              {sections.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(i)}
                  className={cn(
                    "flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                    i === activeSection
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 truncate">{s.label}</span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px]",
                      i === activeSection ? "text-brand/70" : "text-muted-foreground",
                    )}
                  >
                    {Object.keys(s.data).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
              <h3 className="min-w-0 truncate text-xs font-medium text-foreground">{section.label}</h3>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <ToggleButton active={view === "tree"} onClick={() => setView("tree")} icon={Network}>
                  Árvore
                </ToggleButton>
                <ToggleButton active={view === "raw"} onClick={() => setView("raw")} icon={Code2}>
                  Raw
                </ToggleButton>
                <button
                  type="button"
                  onClick={copyJson}
                  className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[var(--route-response)]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
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
  if (typeof v === "number") return "var(--topic-documentos)"
  if (typeof v === "boolean") return "var(--route-navigation)"
  return "var(--route-response)"
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
            <span className="shrink-0 text-brand">{k}:</span>
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
