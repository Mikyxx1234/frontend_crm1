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
 * Desktop (lg+): identidade com largura fixa → busca com largura fixa →
 * spacer → ações. Assim a barra começa sempre na mesma coluna, independente
 * do tamanho do título.
 * Descrições de página foram removidas do padrão NavRail.
 */

/** Largura da coluna de identidade (ícone + título) — alinha a busca entre páginas. */
const IDENTITY_COL = "w-[18rem]"
/** Largura da barra de busca no header. */
const SEARCH_COL = "w-[32rem]"

interface PageHeaderProps {
  icon: React.ReactNode
  title: string
  /** @deprecated Ignorado — NavRail não exibe mais descrição sob o título. */
  description?: string
  /** Voltar à lista pai — botão quadrado ghost à esquerda do ícone. */
  back?: PageHeaderBack
  /** Elemento renderizado ao lado do título (ex.: dropdown de funis). */
  titleAccessory?: React.ReactNode
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
  titleAccessory,
}: {
  icon: React.ReactNode
  title: string
  back?: PageHeaderBack
  titleAccessory?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 w-full items-center gap-3">
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

      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate font-display text-[22px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {titleAccessory ? <div className="flex shrink-0 items-center">{titleAccessory}</div> : null}
      </div>
    </div>
  )
}

export function PageHeader({
  icon,
  title,
  back,
  titleAccessory,
  center,
  actions,
  className,
}: PageHeaderProps) {
  const hasControls = Boolean(center || actions)

  return (
    <div className={cn("flex flex-col gap-2 px-1", className)}>
      {/* Desktop: identidade (largura fixa) → busca (largura fixa) → spacer → ações */}
      <div className="hidden items-center gap-4 lg:flex">
        <div className={cn(IDENTITY_COL, "shrink-0")}>
          <Identity icon={icon} title={title} back={back} titleAccessory={titleAccessory} />
        </div>
        {center ? (
          <div className={cn(SEARCH_COL, "min-w-0 shrink-0 [&_.relative]:!w-full [&_.relative]:!max-w-none")}>
            {center}
          </div>
        ) : null}
        <div className="min-w-0 flex-1" />
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {/* Mobile / tablet: título + faixa horizontal rolável */}
      <div className="flex flex-col gap-2 lg:hidden">
        <Identity icon={icon} title={title} back={back} titleAccessory={titleAccessory} />
        {hasControls ? (
          <div className="toolbar-hscroll flex max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
            {center ? (
              <div className="shrink-0 [&_.relative]:!w-[min(280px,75vw)] [&_.relative]:!max-w-none">
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
