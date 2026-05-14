import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DNA de headers do CRM — fonte única de verdade (layout compacto ~44px).
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Todos os títulos de página do app respeitam esse padrão. Páginas com
 * layout especial (Inbox, Pipeline) que não usam o componente `<PageHeader>`
 * *devem* importar essas classes pra manter consistência visual.
 *
 * Anatomia do padrão:
 *
 *   ┌──┐  Título · descrição na mesma linha                      [ ações ]
 *   │🔵│
 *   └──┘
 *    ^
 *    └─ icon badge 28×28, bg/text primary (var(--color-primary))
 *
 * Decisões:
 *   • Cor da marca = `primary` — acento no ícone.
 *   • Fonte — `font-heading` (display) herdada via `globals.css`.
 *   • Título — `text-[15px] font-semibold` (uma linha com descrição).
 *   • Descrição — `text-[12px]` muted, baseline com o título.
 *   • Ícone — `size-7`, rounded-lg, ícone SVG size-4.
 */
export const pageHeaderTitleClass =
  "font-heading text-[15px] font-semibold tracking-tight text-foreground";

export const pageHeaderDescriptionClass =
  "text-[12px] text-muted-foreground";

export const pageHeaderEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

/**
 * Badge do ícone da página. Reutilizado pelo `<PageHeader>` e por headers
 * custom (Pipeline, Inbox). `[&>svg]:size-4` mantém o ícone proporcional.
 */
export const pageHeaderIconBadgeClass =
  "flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-4";

/**
 * CTA primário que acompanha o PageHeader (botão "Novo X" à direita).
 * Preenchido com primary puro em vez da variant default do shadcn
 * (que usa `primary` = azul marinho, destoa visualmente ao lado do
 * icon badge azul vivo). Aplique via `className` no `<Button>`:
 *
 *   <Button className={pageHeaderPrimaryCtaClass}>Novo Lead</Button>
 */
export const pageHeaderPrimaryCtaClass =
  "bg-primary text-white shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30";

type PageHeaderProps = {
  /** Texto do H1 ou node customizado (ex.: título + badge). */
  title: React.ReactNode;
  /** Subtítulo/descrição na mesma linha do título (baseline). */
  description?: React.ReactNode;
  /** Pequeno rótulo acima do título (breadcrumb curto, categoria, etc.). */
  eyebrow?: React.ReactNode;
  /** Ícone opcional à esquerda do título. */
  icon?: React.ReactNode;
  /** Ações à direita (botões, menus), alinhadas à mesma linha do título. */
  actions?: React.ReactNode;
  /** Classe extra no container externo. */
  className?: string;
  /** Classe extra aplicada no H1 (para sobrescrever cor/peso em casos específicos). */
  titleClassName?: string;
  /** Classe extra aplicada na descrição. */
  descriptionClassName?: string;
  /** Renderiza borda inferior separando o header do conteúdo. */
  bordered?: boolean;
};

/**
 * Cabeçalho padrão das páginas do dashboard.
 *
 * Uso típico:
 *
 *   <PageHeader
 *     title="Campanhas"
 *     description="Envie mensagens em massa com controle de velocidade."
 *     actions={<Button>Nova campanha</Button>}
 *   />
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  icon,
  actions,
  className,
  titleClassName,
  descriptionClassName,
  bordered = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        bordered && "border-b border-zinc-200 pb-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className={cn(pageHeaderEyebrowClass, "mb-0.5")}>{eyebrow}</div>
        ) : null}
        <div className="flex items-center gap-2.5">
          {icon ? (
            <div className={pageHeaderIconBadgeClass}>{icon}</div>
          ) : null}
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className={cn(pageHeaderTitleClass, titleClassName)}>
              {title}
            </h1>
            {description ? (
              <p
                className={cn(
                  pageHeaderDescriptionClass,
                  descriptionClassName,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
