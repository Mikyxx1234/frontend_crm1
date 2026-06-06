"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface ElegantShapeProps {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient: string;
  speed?: number;
}

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient,
  speed = 1,
}: ElegantShapeProps) {
  const safeSpeed = speed > 0 ? speed : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4 / safeSpeed,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 / safeSpeed },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{
          duration: 12 / safeSpeed,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        <div
          style={{ background: gradient }}
          className={cn(
            "absolute inset-0 rounded-full",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export interface HeroGeometricProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title1?: string;
  title2?: string;
  description?: string;
  /** Cor de destaque dos shapes / título. */
  color1?: string;
  /** Cor secundária dos shapes / fundo. */
  color2?: string;
  /** Multiplicador da velocidade das animações (1 = normal). */
  speed?: number;
  /** Cor base do fundo. Padrão claro (azul-marinho suave). */
  baseColor?: string;
  /** Conteúdo sobreposto ao efeito (ex.: formulário). */
  children?: React.ReactNode;
}

/** Converte hex (#rrggbb) em "r, g, b" para usar em rgba(). */
function hexToRgb(hex: string): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = Number.parseInt(full.substring(0, 2), 16) || 0;
  const g = Number.parseInt(full.substring(2, 4), 16) || 0;
  const b = Number.parseInt(full.substring(4, 6), 16) || 0;
  return `${r}, ${g}, ${b}`;
}

/**
 * Fundo "geometric" animado: shapes flutuantes com gradiente, derivado de
 * `color1`/`color2`. Pode exibir um título centralizado (title1/title2/
 * description) e/ou receber `children` sobrepostos ao efeito.
 */
export function HeroGeometric({
  title1,
  title2,
  description,
  color1 = "#5b6ff5",
  color2 = "#a78bfa",
  speed = 1,
  baseColor = "#141d33",
  className,
  children,
  ...props
}: HeroGeometricProps) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1 / (speed > 0 ? speed : 1),
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  return (
    <div
      className={cn(
        "relative min-h-dvh w-full overflow-hidden",
        className,
      )}
      style={{
        backgroundColor: baseColor,
        backgroundImage: `radial-gradient(125% 125% at 50% 8%, ${baseColor} 30%, rgba(${rgb1}, 0.45) 78%, rgba(${rgb2}, 0.55) 100%)`,
      }}
      {...props}
    >
      {/* Brilho de fundo */}
      <div
        className="pointer-events-none absolute inset-0 blur-3xl"
        style={{
          background: `linear-gradient(135deg, rgba(${rgb1}, 0.28), transparent 50%, rgba(${rgb2}, 0.28))`,
        }}
      />

      {/* Shapes animados */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient={`linear-gradient(to right, rgba(${rgb1}, 0.8), transparent)`}
          speed={speed}
          className="left-[-10%] top-[15%] md:left-[-5%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient={`linear-gradient(to right, rgba(${rgb2}, 0.8), transparent)`}
          speed={speed}
          className="right-[-5%] top-[70%] md:right-[0%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient={`linear-gradient(to right, rgba(${rgb1}, 0.75), transparent)`}
          speed={speed}
          className="bottom-[5%] left-[5%] md:bottom-[10%] md:left-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient={`linear-gradient(to right, rgba(${rgb2}, 0.75), transparent)`}
          speed={speed}
          className="right-[15%] top-[10%] md:right-[20%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient={`linear-gradient(to right, rgba(${rgb1}, 0.75), transparent)`}
          speed={speed}
          className="left-[20%] top-[5%] md:left-[25%] md:top-[10%]"
        />
      </div>

      {/* Título opcional */}
      {(title1 || title2 || description) && (
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 pt-24 text-center md:pt-32">
          {(title1 || title2) && (
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mb-6 text-4xl font-bold tracking-tight md:text-6xl"
            >
              {title1 ? (
                <span className="bg-linear-to-b from-white to-white/80 bg-clip-text text-transparent">
                  {title1}
                </span>
              ) : null}
              {title2 ? (
                <>
                  {" "}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${color1}, ${color2})`,
                    }}
                  >
                    {title2}
                  </span>
                </>
              ) : null}
            </motion.h1>
          )}
          {description ? (
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="max-w-xl whitespace-pre-line text-base leading-relaxed text-white/60 md:text-lg"
            >
              {description}
            </motion.p>
          ) : null}
        </div>
      )}

      {/* Vinheta suave (usa a cor base) + conteúdo sobreposto */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${baseColor}cc, transparent 35%, transparent 70%, ${baseColor}99)`,
        }}
      />
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default HeroGeometric;
