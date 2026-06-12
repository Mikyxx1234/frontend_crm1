"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconArrowUpRight,
  IconCheck,
  IconCircleCheckFilled,
  IconLayoutGrid,
  IconLoader2,
  IconPlus,
  IconPuzzle,
  IconRobot,
  IconRoute,
  IconTrash,
  type IconProps,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { WidgetDto } from "@/features/widgets/types";

/** Mapeia chave de icone (widgets INTERNAL) para componente tabler.
 *  Widgets PARTNER usam `icon` como URL de imagem — vide `WidgetIcon`. */
const ICON_BY_KEY: Record<string, React.ComponentType<IconProps>> = {
  route: IconRoute,
  bot: IconRobot,
};

function WidgetIcon({ widget, className }: { widget: WidgetDto; className?: string }) {
  const [imgError, setImgError] = useState(false);
  // PARTNER: `icon` eh URL de imagem (http/https). Se a URL falhar
  // (404, CORS, content-type errado, parceiro fora do ar), caimos no
  // IconPuzzle pra nao quebrar o layout do card.
  // `referrerPolicy=no-referrer` impede que o parceiro saiba que origem
  // do CRM esta listando o widget (privacidade do tenant).
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
    return <IconPuzzle className={className} />;
  }
  const Cmp = ICON_BY_KEY[widget.icon] ?? IconLayoutGrid;
  return <Cmp className={className} />;
}

/** Rota interna pra widgets INTERNAL — quando o slug nao esta no mapa,
 *  cai na rota generica `/widgets/[slug]` (que sabe redirecionar). */
const INTERNAL_ROUTE_BY_SLUG: Record<string, string> = {
  smart_distribution: "/widgets/distribution",
};

interface WidgetCardProps {
  widget: WidgetDto;
  canManage: boolean;
  pending: boolean;
  onInstall: (slug: string) => void;
  onUninstall: (slug: string) => void;
  /** Card maior (destaque) no bento grid. */
  featured?: boolean;
}

export function WidgetCard({
  widget,
  canManage,
  pending,
  onInstall,
  onUninstall,
  featured = false,
}: WidgetCardProps) {
  const installed = widget.installed;
  const comingSoon = widget.availability === "coming_soon";
  const disabled = Boolean(widget.disabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-6 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]",
        featured && "sm:col-span-2 sm:flex-row sm:items-stretch sm:gap-6",
      )}
    >
      {/* Glow decorativo no hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--brand-primary)]/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className={cn("flex flex-col", featured && "sm:w-1/2 sm:shrink-0")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-transform duration-300 group-hover:scale-105">
            <WidgetIcon widget={widget} className="size-6" />
          </div>

          <div className="flex flex-col items-end gap-1">
            <StatusBadge installed={installed} comingSoon={comingSoon} disabled={disabled} />
            {widget.ownerType === "PARTNER" && widget.partnerName && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2 py-0.5 font-display text-[10px] font-semibold text-[var(--text-muted)]">
                Parceiro: {widget.partnerName}
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-4 font-display text-[17px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          {widget.name}
        </h3>
        <p className="mt-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {widget.category}
        </p>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-[var(--text-muted)]">
          {widget.description}
        </p>
      </div>

      <div className={cn("mt-5 flex flex-1 flex-col", featured && "sm:mt-0")}>
        <ul className="flex flex-col gap-2">
          {widget.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 font-body text-[12.5px] text-[var(--text-secondary)]"
            >
              <IconCheck className="size-3.5 shrink-0 text-[var(--brand-primary)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          {comingSoon ? (
            <Button variant="ghost" size="sm" disabled className="w-full">
              Em breve
            </Button>
          ) : installed ? (
            <div className="space-y-2">
              {disabled && widget.disabledReason && (
                <div className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1.5 text-[11px] text-[var(--text-muted)]">
                  {widget.disabledReason}
                </div>
              )}
              <div className="flex gap-2">
                {!disabled && (
                  <Button asChild variant="default" size="sm" className="flex-1">
                    <Link
                      href={
                        widget.ownerType === "PARTNER"
                          ? `/widgets/${widget.slug}`
                          : INTERNAL_ROUTE_BY_SLUG[widget.slug] ?? `/widgets/${widget.slug}`
                      }
                    >
                      <IconArrowUpRight />
                      Abrir
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canManage || pending}
                  onClick={() => onUninstall(widget.slug)}
                  aria-label="Remover widget"
                  className={cn(
                    "text-[var(--color-danger-text)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]",
                    disabled && "flex-1",
                  )}
                >
                  {pending ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconTrash />
                  )}
                  {disabled && <span>Remover</span>}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              disabled={!canManage || pending}
              onClick={() => onInstall(widget.slug)}
              className="w-full"
            >
              {pending ? <IconLoader2 className="animate-spin" /> : <IconPlus />}
              Instalar
            </Button>
          )}

          {!canManage && !comingSoon && (
            <p className="mt-2 text-center font-body text-[11px] text-[var(--text-muted)]">
              Apenas administradores podem gerenciar widgets.
            </p>
          )}
        </div>
      </div>
    </motion.div>
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
  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--color-danger-text)]">
        Indisponível
      </span>
    );
  }
  if (comingSoon) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--text-muted)]">
        Em breve
      </span>
    );
  }
  if (installed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-online)]/30 bg-[color-mix(in_srgb,var(--color-online)_12%,transparent)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--color-online)]">
        <IconCircleCheckFilled className="size-3.5" />
        Instalado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--text-secondary)]">
      Disponível
    </span>
  );
}
