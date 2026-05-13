"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceShell
//
// Substitui o Radix <Sheet> usado pelo <DealDetail> antigo. Diferenca chave:
// nao ha backdrop nem overlay — o workspace cobre 100% da viewport (sidebar
// navy do shell incluida) pra dar foco total no deal, estilo Kommo.
//
// Comportamento:
//  - Anima x:24→0 + opacity, easing rapido (~220ms);
//  - Bloqueia scroll do body enquanto aberto;
//  - ESC fecha;
//  - Foco inicial no botao Fechar (focus-trap leve — nao prendemos foco
//    porque o conteudo interno tem inputs/menus de portal que precisariam
//    sair do escopo);
//  - z-[60] cobre <aside> da dashboard-shell (z-40), mas portais Radix
//    (Tooltip, Dialog, Confirm) ficam acima (z-[70]+ por default).
// ─────────────────────────────────────────────────────────────────────────────

type WorkspaceShellProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel?: string;
};

export function WorkspaceShell({
  open,
  onClose,
  children,
  closeLabel = "Fechar negocio",
}: WorkspaceShellProps) {
  const closeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="deal-workspace"
          role="dialog"
          aria-modal="true"
          aria-label="Workspace do negocio"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            "fixed inset-0 z-[60] flex flex-col overflow-hidden",
            "bg-white font-outfit text-slate-900",
          )}
        >
          {/* Botão fechar global — sempre visível no canto, além do que o
              header já mostra. Garante saída 1-clique mesmo em scroll.
              Discreto: sem shadow-premium nem backdrop-blur — uma simples
              hairline `border-black/6` + bg branco. Combina com o
              vocabulário flat do sales-hub. */}
          <div className="pointer-events-none absolute right-4 top-3 z-[70] sm:right-6 sm:top-4">
            <TooltipHost label="Fechar (Esc)" side="bottom">
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className={cn(
                  "pointer-events-auto inline-flex size-8 items-center justify-center rounded-full",
                  "border border-black/6 bg-white text-slate-500",
                  "transition-colors hover:bg-slate-50 hover:text-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                  "active:scale-95",
                )}
              >
                <X className="size-4" strokeWidth={2.2} />
              </button>
            </TooltipHost>
          </div>

          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
