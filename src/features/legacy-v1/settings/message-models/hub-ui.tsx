"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Blocos visuais compartilhados pelo hub "Modelos de mensagem" (DS v2).
 * Espelham os mockups (settings-message-templates*.html): faixa de stats,
 * callouts, barra de abas com contadores, toolbar (busca + chips).
 * Reusados pelas abas Visão geral, Internos, WhatsApp e Flows para manter
 * consistência visual. Sem hex fora dos tokens; apenas var(--token).
 */

type StatTone = "brand" | "success" | "violet" | "warn";

const STAT_TONE: Record<StatTone, string> = {
  brand: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
  violet: "bg-[color-mix(in_srgb,var(--brand-secondary)_22%,transparent)] text-[var(--brand-secondary)]",
  warn: "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
};

export function HubStatGrid({ children }: { children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
      {children}
    </section>
  );
}

export function HubStat({
  tone,
  icon,
  value,
  label,
}: {
  tone: StatTone;
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]", STAT_TONE[tone])}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[21px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
          {value}
        </div>
        <div className="mt-1 text-[11.5px] font-semibold text-[var(--text-muted)]">{label}</div>
      </div>
    </div>
  );
}

const CALLOUT_TONE = {
  info: {
    box: "border-[var(--color-info-border)] bg-[var(--color-info-bg)]",
    icon: "text-[var(--brand-primary)]",
  },
  warn: {
    box: "border-[var(--color-warn-border)] bg-[var(--color-warn-bg)]",
    icon: "text-[var(--color-warn)]",
  },
  danger: {
    box: "border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[var(--color-danger-bg)]",
    icon: "text-[var(--color-danger)]",
  },
} as const;

export function HubCallout({
  tone = "warn",
  icon,
  children,
}: {
  tone?: "warn" | "info" | "danger";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = CALLOUT_TONE[tone];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-[12.5px] text-[var(--text-secondary)]",
        t.box,
      )}
      role="note"
    >
      {icon ? <span className={cn("shrink-0", t.icon)}>{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export type HubTabDef = { value: string; label: string; count?: number };

export function HubTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: HubTabDef[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex w-fit max-w-full flex-wrap gap-1 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-full)] px-4 py-2 text-[13px] font-bold transition-colors",
              isActive
                ? "bg-[var(--glass-bg-modal)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? (
              <span
                className={cn(
                  "min-w-[20px] rounded-[var(--radius-full)] px-1.5 text-center text-[11px] font-bold",
                  isActive ? "bg-[var(--color-enterprise-bg)]" : "bg-[color-mix(in_srgb,var(--text-muted)_15%,transparent)]",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function HubToolbar({
  searchValue,
  onSearchChange,
  placeholder,
  children,
}: {
  searchValue: string;
  onSearchChange: (v: string) => void;
  placeholder: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-3.5">
      <div className="flex min-w-[240px] flex-1 items-center gap-2.5 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2.5 transition-colors focus-within:border-[var(--input-border-focus)] focus-within:bg-[var(--glass-bg-modal)] focus-within:ring-[3px] focus-within:ring-[var(--input-ring-focus)]">
        <Search className="size-[18px] shrink-0 text-[var(--text-muted)]" />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border-none bg-transparent text-[13.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>
      {children ? <div className="flex flex-wrap items-center gap-1.5">{children}</div> : null}
    </div>
  );
}

export function HubChip({
  active,
  onClick,
  children,
  dot,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3.5 py-2 text-[12.5px] font-bold transition-colors",
        active
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--input-border-focus)] hover:text-[var(--brand-primary)]",
      )}
    >
      {dot ? <span className="size-2 rounded-full" style={{ background: dot }} /> : null}
      {children}
      {typeof count === "number" ? (
        <span
          className={cn(
            "rounded-[var(--radius-full)] px-1.5 text-[11px]",
            active ? "bg-white/25" : "bg-[color-mix(in_srgb,var(--text-muted)_15%,transparent)]",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Painel glass (lista/tabela) — base das abas. */
export function HubPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow)] backdrop-blur-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Cabeçalho de seção (sub-header) em card glass — ícone, título, descrição e ações. */
export function HubSubHeader({
  tone = "brand",
  icon,
  title,
  children,
  actions,
}: {
  tone?: "brand" | "success";
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="flex flex-wrap items-start gap-3.5 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-5 py-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)]",
          tone === "success"
            ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
            : "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-[280px] flex-1">
        <h2 className="text-[17px] font-extrabold tracking-tight text-[var(--text-primary)]">{title}</h2>
        {children ? (
          <div className="mt-1 max-w-[760px] text-[12.5px] leading-relaxed text-[var(--text-muted)]">{children}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2.5">{actions}</div> : null}
    </section>
  );
}
