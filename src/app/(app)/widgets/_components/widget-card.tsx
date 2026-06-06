"use client";

import { motion } from "framer-motion";
import {
  IconCheck,
  IconCircleCheckFilled,
  IconLayoutGrid,
  IconLoader2,
  IconPlus,
  IconRobot,
  IconRoute,
  IconTrash,
  type IconProps,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { WidgetDto } from "@/features/widgets/types";

/** Mapeia a chave de icone do catalogo para um componente tabler. */
const ICON_BY_KEY: Record<string, React.ComponentType<IconProps>> = {
  route: IconRoute,
  bot: IconRobot,
};

function WidgetIcon({ icon, className }: { icon: string; className?: string }) {
  const Cmp = ICON_BY_KEY[icon] ?? IconLayoutGrid;
  return <Cmp className={className} />;
}

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-6 shadow-[var(--glass-shadow-sm)] backdrop-blur-[16px] transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]",
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] transition-transform duration-300 group-hover:scale-105">
            <WidgetIcon icon={widget.icon} className="size-6" />
          </div>

          <StatusBadge installed={installed} comingSoon={comingSoon} />
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
            <Button
              variant="ghost"
              size="sm"
              disabled={!canManage || pending}
              onClick={() => onUninstall(widget.slug)}
              className="w-full text-[var(--color-danger-text)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]"
            >
              {pending ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconTrash />
              )}
              Remover
            </Button>
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
}: {
  installed: boolean;
  comingSoon: boolean;
}) {
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
