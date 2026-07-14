"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowUpRight as ArrowUpRight, IconChartBar as BarChart3, IconRobot as Bot, IconCalendar as Calendar, IconCheck as Check, IconLayoutGrid as LayoutGrid, IconLoader2 as Loader2, IconPhone as Phone, IconPlus as Plus, IconPuzzle as Puzzle, IconRoute as Route, IconTrash as Trash2, IconWebhook as Webhook } from "@tabler/icons-react"
import type { Icon as LucideIcon } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import type { WidgetDto } from "@/features/widgets/types";

/** Mapeia chave de icone (widgets INTERNAL) para componente lucide.
 *  Widgets PARTNER usam `icon` como URL de imagem — vide `WidgetIcon`. */
const ICON_BY_KEY: Record<string, LucideIcon> = {
  route: Route,
  bot: Bot,
  phone: Phone,
  calendar: Calendar,
  report: BarChart3,
  webhook: Webhook,
};

function WidgetIcon({ widget, className }: { widget: WidgetDto; className?: string }) {
  const [imgError, setImgError] = useState(false);
  // PARTNER: `icon` eh URL de imagem (http/https). Se a URL falhar
  // (404, CORS, content-type errado, parceiro fora do ar), caimos no
  // Puzzle pra nao quebrar o layout do card. `referrerPolicy=no-referrer`
  // impede que o parceiro saiba a origem do CRM (privacidade do tenant).
  if (widget.ownerType === "PARTNER") {
    const looksLikeUrl = /^https?:\/\//i.test(widget.icon);
    if (looksLikeUrl && !imgError) {
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={widget.icon}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setImgError(true)}
          className={cn("object-contain", className)}
        />
      );
    }
    return <Puzzle className={className} />;
  }
  const Cmp = ICON_BY_KEY[widget.icon] ?? LayoutGrid;
  return <Cmp className={className} />;
}

/** Rota interna pra widgets INTERNAL — quando o slug nao esta no mapa,
 *  cai na rota generica `/widgets/[slug]` (que sabe redirecionar). */
const INTERNAL_ROUTE_BY_SLUG: Record<string, string> = {
  smart_distribution: "/widgets/distribution",
  calls_history: "/widgets/calls",
};

interface WidgetCardProps {
  widget: WidgetDto;
  canManage: boolean;
  pending: boolean;
  onInstall: (slug: string) => void;
  onUninstall: (slug: string) => void;
}

/**
 * WidgetCard — DS v2 (fiel ao mockup widgets.html)
 * ─────────────────────────────────────────────────
 *  - ícone glass com cor da marca + badge de status (Instalado/Disponível)
 *  - categoria (uppercase, mono/label) + nome
 *  - descrição (text-pretty) + lista de recursos com check
 *  - rodapé: ação primária full-width (Instalar / Abrir) + excluir quando
 *    instalado
 */
export function WidgetCard({
  widget,
  canManage,
  pending,
  onInstall,
  onUninstall,
}: WidgetCardProps) {
  const installed = widget.installed;
  const comingSoon = widget.availability === "coming_soon";
  const disabled = Boolean(widget.disabled);

  const openHref =
    widget.ownerType === "PARTNER"
      ? `/widgets/${widget.slug}`
      : INTERNAL_ROUTE_BY_SLUG[widget.slug] ?? `/widgets/${widget.slug}`;

  const primaryBtn =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2.5 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

  const iconDangerBtn =
    "flex size-[42px] shrink-0 items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] transition-colors hover:border-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <article className="relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[var(--brand-primary)] hover:shadow-[var(--glass-shadow)]">
      {/* Topo: ícone + badge de status */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
          <WidgetIcon widget={widget} className="size-6" />
        </span>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge installed={installed} comingSoon={comingSoon} disabled={disabled} />
          {widget.ownerType === "PARTNER" && widget.partnerName && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2 py-0.5 font-display text-[10px] font-semibold text-[var(--text-muted)]">
              Parceiro: {widget.partnerName}
            </span>
          )}
        </div>
      </div>

      {/* Título + categoria */}
      <div className="px-5 pt-4">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.6px] text-[var(--text-muted)]">
          {widget.category}
        </p>
        <h3 className="mt-0.5 font-display text-[18px] font-extrabold tracking-[-0.3px] text-[var(--text-primary)]">
          {widget.name}
        </h3>
      </div>

      <p className="text-pretty px-5 pt-2.5 font-body text-[13.5px] leading-[1.55] text-[var(--text-secondary)]">
        {widget.description}
      </p>

      {/* Recursos */}
      {widget.features.length > 0 && (
        <ul className="flex flex-col gap-2 px-5 pt-3.5">
          {widget.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 font-body text-[13px] text-[var(--text-secondary)]"
            >
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                <Check className="size-3" strokeWidth={3.2} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Rodapé: ação primária + excluir */}
      <div className="mt-auto px-5 pb-5 pt-4">
        {disabled && widget.disabledReason && (
          <div className="mb-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)]">
            {widget.disabledReason}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {comingSoon ? (
            <button
              type="button"
              disabled
              className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2.5 font-display text-[13px] font-bold text-[var(--text-muted)]"
            >
              Em breve
            </button>
          ) : installed ? (
            <>
              {!disabled && (
                <Link href={openHref} className={primaryBtn}>
                  <ArrowUpRight className="size-4" strokeWidth={2.4} />
                  Abrir
                </Link>
              )}
              <button
                type="button"
                disabled={!canManage || pending}
                onClick={() => onUninstall(widget.slug)}
                aria-label={`Remover ${widget.name}`}
                title="Remover"
                className={cn(iconDangerBtn, disabled && "flex-1 w-auto gap-1.5")}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {disabled && <span className="font-display text-[13px] font-bold">Remover</span>}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canManage || pending}
              onClick={() => onInstall(widget.slug)}
              className={primaryBtn}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" strokeWidth={2.5} />
              )}
              Instalar
            </button>
          )}
        </div>

        {!canManage && !comingSoon && (
          <p className="mt-2 text-center font-body text-[11px] text-[var(--text-muted)]">
            Apenas administradores podem gerenciar widgets.
          </p>
        )}
      </div>
    </article>
  );
}

function StatusBadge({
  installed,
  comingSoon,
  disabled,
}: {
  installed: boolean;
  comingSoon: boolean;
  disabled?: boolean;
}) {
  const base =
    "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 font-display text-[11px] font-bold tracking-[0.2px]";

  if (disabled) {
    return (
      <span className={cn(base, "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]")}>
        <span className="size-1.5 rounded-full bg-[var(--color-danger-text)]" />
        Indisponível
      </span>
    );
  }
  if (comingSoon) {
    return (
      <span
        className={cn(
          base,
          "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
        )}
      >
        Em breve
      </span>
    );
  }
  if (installed) {
    return (
      <span className={cn(base, "bg-[var(--color-success-bg)] text-[var(--color-success-text)]")}>
        <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
        Instalado
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
      )}
    >
      Disponível
    </span>
  );
}
