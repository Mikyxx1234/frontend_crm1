"use client";

import * as React from "react";
import Link from "next/link";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * Design System v2 — elementos de toolbar de página.
 *
 * Hierarquia canônica (respeitar em todas as telas /v2):
 *   1. PageHeader        → identidade + `back` + busca compacta no `center` + `actions`
 *   2. PageToolbarRow    → controles extras raros — preferir `actions` ou painel
 *   3. PageFilterBar     → dropdowns / date pickers estruturais (opcional)
 *   4. conteúdo
 *
 * Busca sempre em `PageHeader.center` via `PageSearchBar variant="compact"`.
 * Tabs/segmented → `PageHeader.actions` (`PageSegmentedControl size="compact"`) ou
 * topo do painel de conteúdo quando não couber (ex.: campanhas com muitos status).
 *
 * Cabeçalho de colunas em listas → referência `/logs` (Feed):
 *   `listTableHeadRowClass` + `SortableHeader` / `ListColumnLabel` em `sortable-header.tsx`
 *   (sentence case, 13px semibold, sort opcional — sem caixa alta).
 */

/** Classes padrão do gatilho DropdownGlass em barras de filtro. */
export const PAGE_FILTER_DROPDOWN_CLASS = "min-w-[180px]";

// ── Voltar (legado — preferir PageHeader `back`) ─────────────────────────────

export interface PageBackLinkProps {
  href: string;
  label: string;
  className?: string;
}

/** @deprecated Use `PageHeader` com prop `back`. Mantido para wrappers legacy. */
export function PageBackLink({ href, label, className }: PageBackLinkProps) {
  return (
    <Link
      href={href}
      aria-label={`Voltar para ${label}`}
      className={cn(
        "inline-flex w-fit items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]",
        className,
      )}
    >
      <IconArrowLeft size={14} stroke={2.4} className="shrink-0" />
      {label}
    </Link>
  );
}

// ── Busca ────────────────────────────────────────────────────────────────────

export type PageSearchBarVariant = "toolbar" | "compact";

export interface PageSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** `toolbar` = linha abaixo do header (flex-1, 42px). `compact` = centro do PageHeader. */
  variant?: PageSearchBarVariant;
  className?: string;
  "aria-label"?: string;
}

export function PageSearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
  variant = "toolbar",
  className,
  "aria-label": ariaLabel,
}: PageSearchBarProps) {
  if (variant === "compact") {
    return (
      <div className={cn("relative w-full max-w-md", className)}>
        <IconSearch
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-4 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[42px] flex-1 items-center gap-2.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 text-[var(--text-muted)]",
        className,
      )}
    >
      <IconSearch size={18} className="shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="min-w-0 flex-1 border-none bg-transparent font-body text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </div>
  );
}

// ── Layout rows ────────────────────────────────────────────────────────────

export function PageToolbarRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-3.5", className)}>
      {children}
    </div>
  );
}

export function PageFilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-3", className)}>
      {children}
    </div>
  );
}

// ── Segmented control (pills) ────────────────────────────────────────────────

export interface PageSegmentItem {
  value: string;
  label: React.ReactNode;
}

export interface PageSegmentedControlProps {
  items: readonly PageSegmentItem[];
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  /** `compact` — cabe no slot `actions` do PageHeader. */
  size?: "default" | "compact";
  className?: string;
}

export function PageSegmentedControl({
  items,
  value,
  onChange,
  "aria-label": ariaLabel,
  size = "default",
  className,
}: PageSegmentedControlProps) {
  const compact = size === "compact";
  return (
    <div
      className={cn(
        "flex shrink-0 flex-nowrap gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "cursor-pointer rounded-full font-display font-bold transition-colors",
              compact
                ? "px-3 py-1 text-xs"
                : "px-4 py-2 text-[13px]",
              active
                ? "bg-[var(--glass-bg-modal)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
                : "bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Botões de página ─────────────────────────────────────────────────────────

const ghostBase =
  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 font-display text-[13px] font-bold transition-colors";

export function pageGhostButtonClass(active?: boolean) {
  return cn(
    ghostBase,
    active
      ? "border-transparent bg-[var(--glass-bg-modal)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
      : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]",
  );
}

export const pagePrimaryButtonClass =
  "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export interface PageGhostButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function PagePillButton({
  active,
  className,
  children,
  type = "button",
  ...props
}: PageGhostButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 font-display text-[13px] font-bold transition-colors",
        active
          ? "border-transparent bg-[var(--glass-bg-modal)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const PageGhostButton = React.forwardRef<
  HTMLButtonElement,
  PageGhostButtonProps
>(function PageGhostButton(
  { active, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(pageGhostButtonClass(active), className)}
      {...props}
    >
      {children}
    </button>
  );
});
PageGhostButton.displayName = "PageGhostButton";

export interface PagePrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
}

export function PagePrimaryButton({
  href,
  className,
  children,
  type = "button",
  ...props
}: PagePrimaryButtonProps) {
  const cls = cn(pagePrimaryButtonClass, className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} {...props}>
      {children}
    </button>
  );
}
