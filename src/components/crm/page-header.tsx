import Link from "next/link"
import { IconChevronLeft } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

export type PageHeaderBack = {
  href: string
  /** Nome da rota pai — ex.: "Contatos", "Campanhas". */
  label: string
}

/**
 * Cabeçalho de página DS v2 — identidade (ícone tile 44px + título 22px bold).
 *
 * Controles de busca/filtro/ação:
 *   - Busca → `center` com `PageSearchBar variant="compact"` (uma linha, sem toolbar extra)
 *   - Tabs/segmented → `PageHeader.actions` (`PageSegmentedControl size="compact"`) ou
 *     topo do painel de conteúdo quando não couber no header
 *   - Dropdowns estruturais → `PageFilterBar`
 *
 * Rotas drill-down: prop `back` — botão quadrado ghost à esquerda do ícone
 * (mesmo padrão do BuilderTopbar de automações).
 */
interface PageHeaderProps {
  icon: React.ReactNode
  title: string
  description?: string
  /** Voltar à lista pai — botão quadrado ghost à esquerda do ícone. */
  back?: PageHeaderBack
  /**
   * Busca — renderizada no CENTRO absoluto do header.
   * Tipicamente um `<SearchInput />`.
   */
  center?: React.ReactNode
  /**
   * Outros controles — renderizados à DIREITA.
   * Filtros, switchers de view, botões de ação.
   */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, back, center, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("grid items-center gap-4 px-1", actions || center ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr]", className)}>
      {/* Esquerda: voltar (opcional) + ícone + título */}
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        {back ? (
          <Link
            href={back.href}
            aria-label={`Voltar para ${back.label}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
          >
            <IconChevronLeft size={20} stroke={2.2} />
          </Link>
        ) : null}

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]">
          {icon}
        </div>

        <div className="flex min-w-0 flex-col">
          <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
            {title}
          </h1>
          {description && (
            <p className="truncate font-body text-[13px] text-[var(--text-muted)]">{description}</p>
          )}
        </div>
      </div>

      {/* Centro: busca — ocupa o espaço restante entre esquerda e direita */}
      {center ? (
        <div className="flex min-w-0 flex-1 items-center justify-end px-4">
          {center}
        </div>
      ) : (
        /* Spacer quando não há center mas há actions */
        <div />
      )}

      {/* Direita: outros controles */}
      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
