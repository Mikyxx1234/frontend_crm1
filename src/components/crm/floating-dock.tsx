"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Efeito "FloatingDock" (estilo Aceternity / macOS dock) adaptado para a
 * orientação VERTICAL da NavRail do CRM.
 *
 * - `DockProvider` renderiza o `<nav>` e rastreia o Y do mouse num
 *   MotionValue compartilhado por contexto.
 * - `DockButton` mede a posição do seu CONTAINER (tamanho fixo) e magnifica
 *   apenas via `scale` (transform). Como o transform não reflui o layout,
 *   o centro medido permanece estável → o mapeamento cursor→ícone fica
 *   exato em todos os botões (inclusive os de baixo). Reflow de width/height
 *   causava drift do centro e desalinhava o pico nos ícones inferiores.
 *
 * Não usa `useId` → sem risco de hydration mismatch (ver nota em
 * nav-rail-v2.tsx). Os `<Link href>` são preservados: rotas intactas.
 */

const DockMouseYContext = React.createContext<MotionValue<number> | null>(null);

/** Escala no pico da magnificação (1 = sem efeito). Efeito forte estilo
 *  dock macOS — o ícone também salta para fora do trilho (ver `POP_X`) para
 *  não estourar nas bordas do painel ao crescer. */
const MAX_SCALE = 1.55;
/** Raio (px) de influência do cursor em torno do centro do botão. Maior =
 *  mais vizinhos acompanham o pico (efeito "onda"). */
const INFLUENCE = 120;
/** Deslocamento horizontal (px) no pico — empurra o ícone para fora do
 *  trilho (à direita, em direção ao conteúdo) como no dock do macOS. */
const POP_X = 12;

const SPRING = { mass: 0.1, stiffness: 210, damping: 13 } as const;

interface DockProviderProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function DockProvider({
  children,
  className,
  "aria-label": ariaLabel,
}: DockProviderProps) {
  const mouseY = useMotionValue<number>(Number.POSITIVE_INFINITY);

  return (
    <DockMouseYContext.Provider value={mouseY}>
      <nav
        aria-label={ariaLabel}
        onMouseMove={(e) => mouseY.set(e.clientY)}
        onMouseLeave={() => mouseY.set(Number.POSITIVE_INFINITY)}
        className={cn("relative z-50", className)}
      >
        {children}
      </nav>
    </DockMouseYContext.Provider>
  );
}

export interface DockButtonProps {
  /** Ícone exibido no botão. */
  children: React.ReactNode;
  title: string;
  /** Quando presente, renderiza um `<Link>` (rota preservada). */
  href?: string;
  /** Usado quando não há `href` (ex.: toggle de tema). */
  onClick?: () => void;
  active?: boolean;
  className?: string;
  /**
   * Desativa o "pop" horizontal (POP_X) no pico da magnificação. Usado nos
   * itens dentro da área rolável da NavRail: ali o container tem
   * `overflow-x: clip` (para permitir scroll vertical sem quebrar a rail no
   * zoom), então o ícone não pode saltar para fora do trilho — senão seria
   * cortado. A magnificação por `scale` continua e cabe dentro do padding.
   */
  disablePop?: boolean;
}

export function DockButton({
  children,
  title,
  href,
  onClick,
  active,
  className,
  disablePop,
}: DockButtonProps) {
  const mouseY = React.useContext(DockMouseYContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const fallback = useMotionValue(Number.POSITIVE_INFINITY);
  const source = mouseY ?? fallback;

  // Rótulo (tooltip) renderizado via PORTAL no <body>. A área rolável da
  // NavRail usa `overflow-x: clip` (necessário para o scroll vertical sem
  // cortar a magnificação), o que também cortava o rótulo que aparece à
  // direita do trilho — por isso a legenda "sumia". O portal escapa de
  // qualquer overflow do ancestral; posicionamos por coordenadas de viewport
  // (position: fixed) calculadas a partir do retângulo do container.
  const [labelPos, setLabelPos] = React.useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const showLabel = React.useCallback(() => {
    const b = ref.current?.getBoundingClientRect();
    if (!b) return;
    setLabelPos({ top: b.top + b.height / 2, left: b.right });
  }, []);
  const hideLabel = React.useCallback(() => setLabelPos(null), []);

  // Distância (px) do cursor ao centro vertical do CONTAINER (tamanho fixo).
  const distance = useTransform(source, (y) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Number.POSITIVE_INFINITY;
    return y - (bounds.y + bounds.height / 2);
  });

  const scaleTarget = useTransform(
    distance,
    [-INFLUENCE, 0, INFLUENCE],
    [1, MAX_SCALE, 1],
  );
  const scale = useSpring(scaleTarget, SPRING);
  // Salto horizontal: no pico o ícone avança `POP_X` para fora do trilho,
  // reforçando a sensação de "dock" e evitando clipping nas bordas.
  // `disablePop` zera o salto para itens em containers com overflow-x clip.
  const peakX = disablePop ? 0 : POP_X;
  const xTarget = useTransform(distance, [-INFLUENCE, 0, INFLUENCE], [0, peakX, 0]);
  const x = useSpring(xTarget, SPRING);
  // z-index sobe junto com a escala para o ícone magnificado ficar por cima
  // dos vizinhos (que ele passa a sobrepor ao crescer via transform).
  const zIndex = useTransform(scale, (s) => Math.round(s * 20));

  // Só o efeito de magnificação (scale). Sem mudança de cor/fundo no hover —
  // o estado ativo (item selecionado) continua destacado.
  const innerClasses = cn(
    "flex h-full w-full items-center justify-center rounded-[var(--radius-md)]",
    active
      ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
      : "bg-transparent text-[var(--text-muted)]",
    className,
  );

  const content = href ? (
    <Link href={href} aria-label={title} className={innerClasses}>
      {children}
    </Link>
  ) : (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      className={innerClasses}
    >
      {children}
    </button>
  );

  return (
    <div
      ref={ref}
      onMouseEnter={showLabel}
      onMouseLeave={hideLabel}
      className="group relative flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <motion.div
        style={{ scale, x, zIndex, transformOrigin: "center" }}
        className="h-full w-full"
      >
        {content}
      </motion.div>

      {/* Rótulo no hover — portaled no <body> para não ser cortado pelo
          `overflow-x: clip` do container rolável da NavRail. Aparece à
          direita do trilho, centralizado verticalmente no ícone. */}
      {mounted &&
        labelPos &&
        createPortal(
          <span
            style={{
              position: "fixed",
              top: labelPos.top,
              left: labelPos.left + 12,
              transform: "translateY(-50%)",
            }}
            className={cn(
              "pointer-events-none z-(--z-popover) whitespace-nowrap rounded-[var(--radius-md)]",
              "border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] backdrop-blur-md",
              "px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)]",
              "shadow-[var(--glass-shadow)]",
            )}
          >
            {title}
          </span>,
          document.body,
        )}
    </div>
  );
}
