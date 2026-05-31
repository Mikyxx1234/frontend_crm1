"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  IconChevronLeft,
  IconBolt,
  IconDeviceFloppy,
  IconDotsVertical,
} from "@tabler/icons-react"
import { SwitchGlass } from "../switch-glass"
import { ButtonGlass } from "../button-glass"

interface BuilderTopbarProps {
  name: string
  active: boolean
  onToggle: () => void
  onRename: (value: string) => void
  onSave: () => void
  saved: boolean
}

export function BuilderTopbar({ name, active, onToggle, onRename, onSave, saved }: BuilderTopbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md shadow-[var(--glass-shadow-sm)]">
      {/* Esquerda: voltar + breadcrumb + nome editável */}
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href="/v2/automations"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
          aria-label="Voltar para automações"
        >
          <IconChevronLeft size={20} />
        </Link>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)]">
          <IconBolt size={18} />
        </span>

        <div className="flex min-w-0 flex-col">
          <Link
            href="/v2/automations"
            className="font-body text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            Automações
          </Link>
          <input
            value={name}
            onChange={(e) => onRename(e.target.value)}
            className="w-full min-w-0 truncate rounded-[var(--radius-sm)] border border-transparent bg-transparent font-display text-[15px] font-bold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--glass-bg-subtle)] focus:border-[var(--brand-primary)] focus:bg-white"
            aria-label="Nome da automação"
          />
        </div>
      </div>

      {/* Direita: status + ações */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5">
          <SwitchGlass checked={active} onChange={onToggle} size="sm" aria-label="Ativar automação" />
          <span
            className={cn(
              "font-display text-[11px] font-bold uppercase tracking-[0.06em]",
              active ? "text-[var(--color-success)]" : "text-[var(--text-muted)]",
            )}
          >
            {active ? "Ativa" : "Pausada"}
          </span>
        </div>

        <ButtonGlass variant="icon" size="icon" aria-label="Mais opções">
          <IconDotsVertical size={18} />
        </ButtonGlass>

        <ButtonGlass variant="primary" size="default" onClick={onSave}>
          <IconDeviceFloppy size={16} /> {saved ? "Salvo" : "Salvar"}
        </ButtonGlass>
      </div>
    </header>
  )
}
