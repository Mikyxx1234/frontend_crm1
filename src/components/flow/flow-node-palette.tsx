"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { IconPin, IconPinFilled, IconPlus as Plus } from "@tabler/icons-react"
import {
  Flag,
  GitBranch,
  GitFork,
  LayoutGrid,
  MessageSquare,
  Play,
  Users,
  Video,
  Webhook,
  Zap,
} from "lucide-react"

import { TooltipGlass } from "@/components/crm/tooltip-glass"
import { KIND_META, type NodeKind } from "@/lib/flow-data"
import { cn } from "@/lib/utils"

export const FLOW_PALETTE_DRAG_TYPE = "application/x-flow-kind"

const KIND_ICON: Record<NodeKind, typeof MessageSquare> = {
  trigger: Zap,
  template: LayoutGrid,
  interactive: LayoutGrid,
  media: Video,
  message: MessageSquare,
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

const PIN_KEY = "fluxo.blocksDrawer.pinned"

function readPinned(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(PIN_KEY) === "1"
  } catch {
    return false
  }
}

function writePinned(next: boolean) {
  try {
    window.localStorage.setItem(PIN_KEY, next ? "1" : "0")
  } catch {
    /* private mode / quota */
  }
}

export function readFlowPaletteKind(dataTransfer: DataTransfer | null): NodeKind | null {
  if (!dataTransfer) return null
  const raw = dataTransfer.getData(FLOW_PALETTE_DRAG_TYPE)
  if (!raw || !(raw in KIND_META)) return null
  return raw as NodeKind
}

function PaletteBody({
  pinned,
  onTogglePin,
  onAdd,
}: {
  pinned?: boolean
  onTogglePin?: () => void
  onAdd: (kind: NodeKind) => void
}) {
  return (
    <div className="scrollbar-thin flex h-full w-full flex-col gap-4 overflow-y-auto border-r border-[var(--glass-border-subtle)] bg-[var(--color-bg-card)] p-4">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--glass-border-subtle)] pb-3">
        <div className="min-w-0">
          <p className="font-heading text-[15px] font-extrabold tracking-tighter text-[var(--text-primary)]">
            Blocos
          </p>
          <p className="mt-0.5 text-[11px] font-medium tracking-tight text-[var(--text-muted)]">
            Clique ou arraste para o canvas
          </p>
        </div>
        {onTogglePin ? (
          <TooltipGlass label={pinned ? "Desafixar" : "Fixar"} side="bottom">
            <button
              type="button"
              aria-label={pinned ? "Desafixar" : "Fixar"}
              aria-pressed={!!pinned}
              onClick={onTogglePin}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors",
                pinned
                  ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
              )}
            >
              {pinned ? (
                <IconPinFilled size={16} stroke={1.7} />
              ) : (
                <IconPin size={16} stroke={1.7} />
              )}
            </button>
          </TooltipGlass>
        ) : null}
      </div>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
            {g.title}
          </p>
          <ul className="flex flex-col gap-1">
            {g.items.map((kind) => {
              const Icon = KIND_ICON[kind] ?? Plus
              const meta = KIND_META[kind]
              return (
                <li key={kind}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(FLOW_PALETTE_DRAG_TYPE, kind)
                      e.dataTransfer.effectAllowed = "copy"
                    }}
                    onClick={() => onAdd(kind)}
                    className="group/item flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--color-bg-card)] px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-[var(--color-primary-soft)]/40 hover:shadow-[var(--shadow-indigo-glow)] active:cursor-grabbing"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-subtle)] text-[var(--brand-primary)] ring-1 ring-[var(--color-border)] transition-all group-hover/item:scale-105">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-bold leading-tight tracking-tight text-foreground">
                      {meta.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function FlowNodePaletteDrawer({
  onAdd,
}: {
  onAdd: (kind: NodeKind) => void
}) {
  const [pinned, setPinned] = useState(false)
  const [open, setOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isPinned = readPinned()
    setPinned(isPinned)
    if (isPinned) setOpen(true)
  }, [])

  const togglePinned = useCallback(() => {
    setPinned((prev) => {
      const next = !prev
      writePinned(next)
      if (next) setOpen(true)
      return next
    })
  }, [])

  const visible = pinned || open

  useEffect(() => {
    if (pinned || !open) return
    const onPointerDown = (e: PointerEvent) => {
      if (drawerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [pinned, open])

  useEffect(() => {
    if (pinned || !open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [pinned, open])

  const handleAdd = useCallback(
    (kind: NodeKind) => {
      onAdd(kind)
      if (!pinned) setOpen(false)
    },
    [onAdd, pinned],
  )

  return (
    <>
      {!visible ? (
        <button
          type="button"
          aria-label="Blocos"
          aria-expanded={false}
          aria-controls="fluxo-blocks-drawer"
          onClick={() => setOpen(true)}
          className={cn(
            "absolute top-1/2 left-0 z-20 hidden -translate-y-1/2 md:flex",
            "h-28 w-8 items-center justify-center rounded-r-xl",
            "border border-l-0 border-[var(--glass-border)]",
            "bg-[var(--color-bg-card)] text-[var(--text-primary)]",
            "shadow-[var(--glass-shadow-sm)]",
            "transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
          )}
        >
          <span className="text-[11px] font-bold tracking-wide [writing-mode:vertical-lr] rotate-180">
            Blocos
          </span>
        </button>
      ) : null}

      <div
        id="fluxo-blocks-drawer"
        ref={drawerRef}
        aria-hidden={!visible}
        onDragEnd={() => {
          if (!pinned) setOpen(false)
        }}
        className={cn(
          "hidden min-h-0 md:flex",
          pinned
            ? "relative w-[240px] shrink-0"
            : cn(
                "absolute inset-y-0 left-0 z-30 w-[240px] shadow-[var(--glass-shadow-sm)]",
                "transition-transform motion-reduce:transition-none",
                open
                  ? "translate-x-0 duration-[var(--drawer-duration)] ease-[var(--ease-drawer-open)]"
                  : "-translate-x-full pointer-events-none duration-[var(--drawer-duration-close)] ease-[var(--ease-drawer-close)]",
              ),
        )}
      >
        <PaletteBody pinned={pinned} onTogglePin={togglePinned} onAdd={handleAdd} />
      </div>
    </>
  )
}
