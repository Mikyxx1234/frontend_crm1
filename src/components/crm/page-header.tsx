/**
 * @deprecated DS-012 — componente legado (v1). O canônico é
 * `components/ui/page-header.tsx`. Não adicionar novos imports.
 * Remoção física após aposentadoria das rotas que ainda o usam.
 */
"use client"

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
 * Mobile (< lg): título numa linha; busca + ações numa faixa
 * `toolbar-hscroll` (mesmo padrão do Pipeline / kanban).
 * Desktop (lg+): grid de 3 colunas (identidade | busca à esquerda | ações).
 * Descrições de página foram removidas do padrão NavRail.
 */
interface PageHeaderProps {
  icon: React.ReactNode
  title: string
  /** @deprecated Ignorado — NavRail não exibe mais descrição sob o título. */
  description?: string
  /** Voltar à lista pai — botão quadrado ghost à esquerda do ícone. */
  back?: PageHeaderBack
  /**
   * Busca — alinhada à ESQUERDA (logo após o título) em desktop;
   * na faixa rolável no mobile. Tipicamente um `<SearchInput />`.
   */
  center?: React.ReactNode
  /**
   * Outros controles — à DIREITA em desktop; na faixa rolável no mobile.
   * Filtros, switchers de view, botões de ação.
   */
  actions?: React.ReactNode
  className?: string
}

function Identity({
  icon,
  title,
  back,
}: {
  icon: React.ReactNode
  title: string
  back?: PageHeaderBack
}) {
  return (
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
      </div>
    </div>
  )
}

export function PageHeader({
  icon,
  title,
  back,
  center,
  actions,
  className,
}: PageHeaderProps) {
  const hasControls = Boolean(center || actions)

  return (
    <div className={cn("flex flex-col gap-2 px-1", className)}>
      {/* Desktop: título | busca (esq.) | ações */}
      <div
        className={cn(
          "hidden items-center gap-4 lg:grid",
          hasControls ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr]",
        )}
      >
        <Identity icon={icon} title={title} back={back} />
        {center ? (
          <div className="flex min-w-0 flex-1 items-center justify-start">
            {center}
          </div>
        ) : (
          <div />
        )}
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {/* Mobile / tablet: título + faixa horizontal rolável */}
      <div className="flex flex-col gap-2 lg:hidden">
        <Identity icon={icon} title={title} back={back} />
        {hasControls ? (
          <div className="toolbar-hscroll flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            {center ? (
              <div className="shrink-0 [&_.relative]:!w-[min(220px,70vw)] [&_.relative]:!max-w-none">
                {center}
              </div>
            ) : null}
            {actions ? (
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                {actions}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
