"use client";

import * as React from "react";
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
}

export function DockButton({
  children,
  title,
  href,
  onClick,
  active,
  className,
}: DockButtonProps) {
  const mouseY = React.useContext(DockMouseYContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const fallback = useMotionValue(Number.POSITIVE_INFINITY);
  const source = mouseY ?? fallback;

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
  const xTarget = useTransform(distance, [-INFLUENCE, 0, INFLUENCE], [0, POP_X, 0]);
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
      className="group relative flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <motion.div
        style={{ scale, x, zIndex, transformOrigin: "center" }}
        className="h-full w-full"
      >
        {content}
      </motion.div>

      {/* Rótulo no hover — aparece à direita do trilho. Resolve a falta de
          legenda dos ícones sem ocupar espaço fixo. */}
      <span
        className={cn(
          "pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 translate-x-[-8px]",
          "whitespace-nowrap rounded-[var(--radius-md)] border border-[var(--glass-border)]",
          "bg-[var(--dropdown-solid-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text-primary)]",
          "opacity-0 shadow-[var(--glass-shadow)] transition-all duration-150 ease-out",
          "group-hover:translate-x-0 group-hover:opacity-100",
        )}
      >
        {title}
      </span>
    </div>
  );
}
