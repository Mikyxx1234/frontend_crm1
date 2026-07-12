"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PermissionMatrix — contêiner glass para uma matriz de permissões. Renderiza
 * um cabeçalho opcional (título em caps discreto + legenda de escopos) e
 * empilha `PermissionRow`s com dividers hairline.
 */
export function PermissionMatrix({
  title,
  legend,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  /** Legenda de escopos (ScopeLegend), renderizada à direita do título. */
  legend?: React.ReactNode;
  /** Ações do cabeçalho (ex.: botão colapsar tudo). */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || legend || actions);
  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow)] backdrop-blur-md",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-3.5 py-2.5">
          {title && (
            <span className="font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
              {title}
            </span>
          )}
          {legend}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="flex flex-col px-1.5 py-1">{children}</div>
    </div>
  );
}
