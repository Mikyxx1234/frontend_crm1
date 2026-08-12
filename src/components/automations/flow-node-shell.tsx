"use client";

import type { ReactNode } from "react";
import { IconAlertTriangle as AlertTriangle } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FlowNodeAccent =
  | "primary"
  | "cyan"
  | "amber"
  | "orange"
  | "rose"
  | "green"
  | "slate"
  | "violet";

export type FlowNodeShellProps = {
  selected?: boolean;
  incomplete?: boolean;
  accent?: FlowNodeAccent;
  stepIndex?: number;
  /** Largura quando selecionado (inline editor). */
  expanded?: boolean;
  /** Classes extras no card (ex.: overflow-visible). */
  className?: string;
  children: ReactNode;
};

/**
 * Chrome denso estilo n8n / React Flow: borda fina, acento à esquerda,
 * sem glass/lift. Conteúdo (header, body, outputs) fica nos children.
 */
export function FlowNodeShell({
  selected,
  incomplete,
  accent = "primary",
  stepIndex,
  expanded,
  className,
  children,
}: FlowNodeShellProps) {
  return (
    <div
      className={cn(
        "wf-node group/node relative",
        `wf-node--${accent}`,
        selected && "wf-node--selected",
        incomplete && "wf-node--incomplete",
        expanded && "wf-node--expanded",
        className
      )}
    >
      {stepIndex != null && (
        <span className="wf-node__index" aria-hidden>
          {stepIndex}
        </span>
      )}
      {incomplete && (
        <TooltipHost label="Configuração incompleta — esse passo vai falhar em runtime" side="top">
          <span className="wf-node__warn">
            <AlertTriangle className="size-3" strokeWidth={2.6} />
          </span>
        </TooltipHost>
      )}
      {children}
    </div>
  );
}

export type FlowNodeHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Ações à direita (delete, kebab). */
  actions?: ReactNode;
  /** Badge abaixo do subtítulo. */
  badge?: ReactNode;
  className?: string;
};

export function FlowNodeHeader({
  icon,
  title,
  subtitle,
  eyebrow,
  actions,
  badge,
  className,
}: FlowNodeHeaderProps) {
  return (
    <div className={cn("wf-node__head node-drag-handle", className)}>
      <span className="wf-node__ico">{icon}</span>
      <div className="wf-node__titles">
        {eyebrow && <p className="wf-node__eyebrow">{eyebrow}</p>}
        <p className="wf-node__title">{title}</p>
        {subtitle && <p className="wf-node__sub">{subtitle}</p>}
        {badge && <div className="wf-node__badge-slot">{badge}</div>}
      </div>
      {actions && <div className="wf-node__actions">{actions}</div>}
    </div>
  );
}

export function FlowNodeDeleteButton({
  onDelete,
  label = "Remover passo",
}: {
  onDelete?: () => void;
  label?: string;
}) {
  if (!onDelete) return null;
  return (
    <TooltipHost label={label} side="top">
      <button
        type="button"
        className="wf-node__del"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={label}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </TooltipHost>
  );
}
