"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

type GlassModalContextValue = {
  panelRef: React.RefObject<HTMLElement | null>;
  titleId: string;
};

const GlassModalContext = React.createContext<GlassModalContextValue | null>(null);

/**
 * @deprecated DS-002 — o shell canônico de modal é o `Dialog` de
 * `@/components/ui/dialog` (presets sm/md/lg/xl/2xl, foco/Esc nativos via
 * `<dialog>`). Todos os usos foram migrados; NÃO adicionar novos usos.
 * Este arquivo será removido após um ciclo de release sem regressões.
 */
export function GlassModal({
  open,
  onOpenChange,
  children,
  closeOnBackdrop = true,
  initialFocus = "first",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Fecha ao clicar no backdrop. Default: true. */
  closeOnBackdrop?: boolean;
  /** `"first"` foca o primeiro elemento tabulável; `"panel"` foca o painel. */
  initialFocus?: "first" | "panel";
}) {
  const panelRef = React.useRef<HTMLElement | null>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (typeof window === "undefined" || !open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    if (open) {
      const active = document.activeElement;
      previouslyFocusedRef.current =
        active instanceof HTMLElement ? active : null;

      const frame = requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;

        if (initialFocus === "panel") {
          panel.focus();
          return;
        }

        const focusable = getFocusableElements(panel);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          panel.focus();
        }
      });

      return () => cancelAnimationFrame(frame);
    }

    const previous = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (previous?.isConnected) {
      requestAnimationFrame(() => previous.focus());
    }
  }, [open, initialFocus]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <GlassModalContext.Provider value={{ panelRef, titleId }}>
      <div
        className="fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={closeOnBackdrop ? () => onOpenChange(false) : undefined}
        role="presentation"
      >
        {children}
      </div>
    </GlassModalContext.Provider>,
    document.body,
  );
}

type GlassModalPanelProps<T extends React.ElementType = "div"> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
  /** id do elemento que rotula o diálogo (default: título do GlassModalHeader). */
  "aria-labelledby"?: string;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children" | "aria-labelledby">;

export function GlassModalPanel<T extends React.ElementType = "div">({
  as,
  className,
  children,
  onClick,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: GlassModalPanelProps<T>) {
  const ctx = React.useContext(GlassModalContext);
  const Component = as ?? "div";

  return (
    <Component
      ref={ctx?.panelRef as React.Ref<HTMLElement>}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy ?? ctx?.titleId}
      tabIndex={-1}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick?.(e as React.MouseEvent<HTMLElement>);
      }}
      className={cn(
        "w-[420px] max-w-[90vw] rounded-[var(--radius-xl)] border border-[var(--glass-border)]",
        "bg-[var(--glass-bg-modal)] p-5 shadow-2xl backdrop-blur-md outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function GlassModalHeader({
  title,
  icon,
  description,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(GlassModalContext);

  return (
    <div className={cn(icon || description ? "mb-3" : "mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {icon}
        <h3
          id={ctx?.titleId}
          className="font-display text-base font-bold text-[var(--text-primary)]"
        >
          {title}
        </h3>
      </div>
      {description ? (
        <p className="mt-2 font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function GlassModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(className)}>{children}</div>;
}

export function GlassModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex justify-end gap-2", className)}>{children}</div>;
}
