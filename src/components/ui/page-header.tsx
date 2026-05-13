import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Classes padrão de tipografia para cabeçalhos de páginas do CRM.
 * Mantém uma única fonte de verdade para evitar que cada página
 * invente um tamanho/peso/cor diferente.
 *
 * Escolha do padrão:
 *   • Fonte — `font-heading` (Outfit) herdada via `globals.css`; aqui deixamos
 *     explícito para casos em que o h1 viva dentro de um container que
 *     sobrescreva a família.
 *   • Tamanho — `text-2xl md:text-3xl` (24 → 30px) equilibra densidade e
 *     presença; evita a variação entre xl/2xl/3xl que existia.
 *   • Peso — `font-bold` (700) é o meio-termo legível entre `semibold` (600,
 *     fraco demais) e `black` (900, muito pesado). Páginas "premium"
 *     específicas podem sobrepor via `className`.
 *   • Cor — `text-foreground` respeita dark mode (em vez de `slate-900`).
 *   • Tracking — `tracking-tight` dá o ar moderno usado no restante da UI.
 */
export const pageHeaderTitleClass =
  "font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl";

export const pageHeaderDescriptionClass =
  "mt-1 text-sm text-muted-foreground";

export const pageHeaderEyebrowClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

type PageHeaderProps = {
  /** Texto do H1 ou node customizado (ex.: título + badge). */
  title: React.ReactNode;
  /** Subtítulo/descrição exibido logo abaixo do título. */
  description?: React.ReactNode;
  /** Pequeno rótulo acima do título (breadcrumb curto, categoria, etc.). */
  eyebrow?: React.ReactNode;
  /** Ícone opcional à esquerda do título. */
  icon?: React.ReactNode;
  /** Ações à direita (botões, menus). Empilham abaixo em mobile. */
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
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        bordered && "border-b border-border pb-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className={cn(pageHeaderEyebrowClass, "mb-1.5")}>{eyebrow}</div>
        ) : null}
        <div className="flex items-center gap-3.5">
          {icon ? (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10 [&>svg]:size-5">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
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
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-start">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
