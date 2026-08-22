"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  IconMessage as MessageSquare,
  IconSearch as Search,
  IconSparkles as Sparkles,
  IconX as X,
  IconBolt as Zap,
} from "@tabler/icons-react"
import type { Icon as LucideIcon } from "@tabler/icons-react"
import {
  Flag,
  GitBranch,
  GitFork,
  LayoutGrid,
  MessageSquare as LucideMessage,
  Play,
  Users,
  Video,
  Webhook,
  Zap as LucideZap,
} from "lucide-react"

import { KIND_META, type NodeKind } from "@/lib/flow-data"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<NodeKind, typeof LucideMessage> = {
  trigger: LucideZap,
  template: LayoutGrid,
  interactive: LayoutGrid,
  media: Video,
  message: LucideMessage,
  webhook: Webhook,
  distribution: Users,
  move_stage: GitFork,
  finish: Flag,
  condition: GitBranch,
  action: Play,
}

const GROUPS: { title: string; items: NodeKind[] }[] = [
  { title: "Mensagens", items: ["message", "template", "interactive", "media"] },
  { title: "Ações", items: ["trigger", "webhook", "distribution", "move_stage", "finish"] },
]

const GROUP_VISUAL: Record<
  string,
  { Icon: LucideIcon; bg: string; fg: string }
> = {
  Mensagens: {
    Icon: MessageSquare,
    bg: "bg-[var(--color-primary)]/8",
    fg: "text-[var(--color-info)]",
  },
  Acoes: {
    Icon: Zap,
    bg: "bg-[var(--color-warn-bg)]",
    fg: "text-[var(--color-warn)]",
  },
}

function visualForGroup(title: string) {
  const norm = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return (
    GROUP_VISUAL[norm] ?? {
      Icon: Sparkles,
      bg: "bg-[var(--glass-bg-overlay)]",
      fg: "text-[var(--text-muted)]",
    }
  )
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (kind: NodeKind) => void
}

export function FlowStepPickerModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const q = normalize(query.trim())
  const filteredGroups = React.useMemo(() => {
    if (!q) return GROUPS
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((kind) => {
        const meta = KIND_META[kind]
        return (
          normalize(meta.label).includes(q) ||
          normalize(meta.description).includes(q)
        )
      }),
    })).filter((g) => g.items.length > 0)
  }, [q])

  const stopWheel = React.useCallback((e: React.WheelEvent | React.TouchEvent) => {
    e.stopPropagation()
  }, [])

  if (!portalTarget) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="flow-picker-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            onWheel={stopWheel}
            onTouchMove={stopWheel}
            className="fixed inset-0 z-70 bg-black/30 backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            key="flow-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Adicionar bloco"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "fixed left-1/2 top-1/2 z-71 -translate-x-1/2 -translate-y-1/2",
              "w-[min(720px,calc(100vw-32px))] max-h-[min(80vh,720px)]",
              "flex flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--glass-border)]",
              "bg-[var(--color-bg-card)] shadow-[var(--glass-shadow-lg)]",
            )}
            onClick={(e) => e.stopPropagation()}
            onWheel={stopWheel}
            onTouchMove={stopWheel}
          >
            <div className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--color-bg-card)] px-6 pt-6 pb-5 sm:px-7">
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                    "bg-linear-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white",
                    "shadow-[var(--glass-shadow)] ring-1 ring-white/40",
                  )}
                >
                  <Zap className="size-5" strokeWidth={2.4} />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-bold leading-tight tracking-tighter text-[var(--text-primary)] sm:text-[22px]">
                    Adicionar bloco
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium tracking-tight text-[var(--text-muted)]">
                    Escolha um passo para o fluxo de atendimento.
                  </p>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <SearchInput inputRef={inputRef} value={query} onChange={setQuery} />
                  <CloseButton onClose={onClose} />
                </div>
                <div className="sm:hidden">
                  <CloseButton onClose={onClose} />
                </div>
              </div>

              <div className="mt-3 sm:hidden">
                <SearchInput inputRef={inputRef} value={query} onChange={setQuery} />
              </div>
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {filteredGroups.length === 0 ? (
                <p className="py-12 text-center text-[13px] tracking-tight text-[var(--text-muted)]">
                  Nenhum bloco encontrado para &quot;{query}&quot;.
                </p>
              ) : (
                filteredGroups.map((group, idx) => {
                  const visual = visualForGroup(group.title)
                  const Icon = visual.Icon
                  return (
                    <section key={group.title} className={cn(idx > 0 && "mt-6")}>
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center rounded-md",
                            visual.bg,
                            visual.fg,
                          )}
                        >
                          <Icon className="size-3" strokeWidth={2.6} />
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-widest",
                            visual.fg,
                          )}
                        >
                          {group.title}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {group.items.map((kind) => (
                          <KindCard
                            key={kind}
                            kind={kind}
                            onClick={() => {
                              onSelect(kind)
                              onClose()
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  )
}

function SearchInput({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      className={cn(
        "relative flex h-9 items-center gap-1.5 rounded-full border border-[var(--glass-border)]",
        "bg-[var(--input-bg)] pl-3 pr-1 transition-colors",
        "focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20",
      )}
    >
      <Search className="size-3.5 shrink-0 text-[var(--text-muted)]" strokeWidth={2.2} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pesquisar blocos..."
        className={cn(
          "h-full min-w-0 flex-1 border-0 bg-transparent text-[13px]",
          "tracking-tight text-[var(--text-primary)] outline-none",
          "placeholder:font-medium placeholder:text-[var(--text-muted)]",
          "w-[200px]",
        )}
      />
    </div>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full",
        "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
        "transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)] active:scale-95",
      )}
    >
      <X className="size-4" strokeWidth={2.2} />
    </button>
  )
}

function KindCard({ kind, onClick }: { kind: NodeKind; onClick: () => void }) {
  const meta = KIND_META[kind]
  const Icon = KIND_ICON[kind]
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      className={cn(
        "group/card flex w-full items-start gap-3 rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--color-bg-card)]",
        "px-3.5 py-3 text-left transition-all duration-150",
        "hover:border-[var(--brand-primary)]/30 hover:shadow-[var(--glass-shadow)]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          "bg-[var(--color-primary-soft)] text-[var(--brand-primary)] ring-1 ring-[var(--glass-border-subtle)]",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold tracking-tight text-[var(--text-primary)]">
          {meta.label}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] font-medium leading-snug tracking-tight text-[var(--text-muted)]">
          {meta.description}
        </p>
      </div>
    </motion.button>
  )
}
