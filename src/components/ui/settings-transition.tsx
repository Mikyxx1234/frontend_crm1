"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * SettingsTransition — Linear-style "Context Shift" para telas de settings.
 *
 * O conteúdo principal (children) desliza 60px à esquerda e reduz para 0.98
 * enquanto um painel entra da direita (480px), com overlay escuro sutil por
 * trás. Fecha via ESC, click fora ou click no overlay.
 *
 * Design:
 *   - GPU-only (translate + scale + opacity) → 60fps.
 *   - `will-change: transform` só enquanto animando; removido no repouso via
 *     `initial={false}` + `layout` do Framer, sem thrashing de layout.
 *   - Glassmorphism (backdrop-blur + border sutil) e dark mode compatíveis.
 *
 * A11y:
 *   - `role="dialog"` + `aria-modal="true"` no painel.
 *   - ESC fecha; click fora fecha; overlay tem `aria-hidden`.
 *   - Foco inicial no primeiro elemento focável do painel; retorna ao
 *     elemento que abriu ao fechar.
 *   - `inert` no conteúdo principal enquanto aberto (bloqueia tab + interação
 *     assistiva atrás do overlay).
 *   - Scroll do body travado enquanto aberto.
 *
 * Uso: envolve TODO o conteúdo da página que precisa "recuar" e passa o
 * conteúdo do painel via prop `panel`. Ver exemplo no fim do arquivo.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const DURATION = 0.3;

export interface SettingsTransitionProps {
  /** Estado controlado. */
  isOpen: boolean;
  /** Handler de fechamento (ESC, overlay, botão de fechar interno). */
  onClose: () => void;
  /** Conteúdo principal da aplicação — sofre o "context shift". */
  children: React.ReactNode;
  /** Conteúdo renderizado dentro do painel de settings. */
  panel: React.ReactNode;
  /** Aria-label do painel. Default: "Settings". */
  panelAriaLabel?: string;
  /** Largura do painel em px. Default: 480. */
  panelWidth?: number;
  /** Deslocamento horizontal do conteúdo principal em px. Default: 60. */
  shiftX?: number;
  /** Escala do conteúdo principal quando aberto. Default: 0.98. */
  shiftScale?: number;
  /** Opacidade do overlay (0..1). Default: 0.12. */
  overlayOpacity?: number;
}

// `inert` só entrou na tipagem HTML do React em 19+. Cast pra evitar
// friction em bases mais antigas — comportamento nativo é preservado.
type InertProps = { inert?: "" };

export function SettingsTransition({
  isOpen,
  onClose,
  children,
  panel,
  panelAriaLabel = "Settings",
  panelWidth = 480,
  shiftX = 60,
  shiftScale = 0.98,
  overlayOpacity = 0.12,
}: SettingsTransitionProps) {
  const panelRef = React.useRef<HTMLElement>(null);
  const openerRef = React.useRef<HTMLElement | null>(null);

  // ESC → close.
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Foco + body scroll lock. Guarda o elemento que abriu pra devolver o
  // foco ao fechar (WAI-ARIA APG dialog pattern).
  React.useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      (focusable ?? panelRef.current)?.focus({ preventScroll: true });
    });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      openerRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const inertProps: InertProps = isOpen ? { inert: "" } : {};

  return (
    <div className="relative min-h-screen">
      {/* Conteúdo principal — o "context shift". `transformOrigin` na
          esquerda pra o encolhimento não deslocar o topo do conteúdo. */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? -shiftX : 0,
          scale: isOpen ? shiftScale : 1,
        }}
        transition={{ duration: DURATION, ease: EASE }}
        style={{
          transformOrigin: "left center",
          // `will-change` só quando útil evita reserva permanente de layer.
          willChange: isOpen ? "transform" : undefined,
        }}
      >
        <div {...inertProps} aria-hidden={isOpen}>
          {children}
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="settings-overlay"
              aria-hidden
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: overlayOpacity }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION, ease: EASE }}
              className="fixed inset-0 z-40 bg-black backdrop-blur-[2px]"
              style={{ willChange: "opacity" }}
            />

            <motion.aside
              key="settings-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={panelAriaLabel}
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: DURATION, ease: EASE }}
              style={{
                width: panelWidth,
                maxWidth: "calc(100vw - 24px)",
                willChange: "transform",
              }}
              className={[
                "fixed right-3 top-3 bottom-3 z-50 overflow-hidden rounded-3xl",
                "border border-black/5 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)]",
                "bg-white/80 backdrop-blur-xl backdrop-saturate-150",
                "dark:border-white/5 dark:bg-neutral-900/70 dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]",
                "focus:outline-none",
              ].join(" ")}
            >
              {/* Camada de conteúdo scrollable — o container externo mantém
                  o border-radius e o clipping; o interno rola. */}
              <div className="h-full overflow-y-auto overscroll-contain">
                {panel}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * Exemplo de uso (não é exportado — remova ou copie para sua página):
 *
 * "use client";
 * import * as React from "react";
 * import { SettingsTransition } from "@/components/ui/settings-transition";
 *
 * export default function AppShell() {
 *   const [open, setOpen] = React.useState(false);
 *   return (
 *     <SettingsTransition
 *       isOpen={open}
 *       onClose={() => setOpen(false)}
 *       panel={
 *         <div className="p-6">
 *           <h2 className="text-lg font-semibold">Settings</h2>
 *           <p className="mt-2 text-sm text-neutral-500">
 *             Preferências, integrações, workspace…
 *           </p>
 *         </div>
 *       }
 *     >
 *       <main className="min-h-screen bg-neutral-50 p-8 dark:bg-neutral-950">
 *         <button
 *           type="button"
 *           onClick={() => setOpen(true)}
 *           className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-neutral-900"
 *         >
 *           Open settings
 *         </button>
 *       </main>
 *     </SettingsTransition>
 *   );
 * }
 * ───────────────────────────────────────────────────────────────────── */
