"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export interface HeatmapCell {
  /** Índice da coluna (ex: hora 0-23). */
  x: number
  /** Índice da linha (ex: dia da semana 0-6). */
  y: number
  /** Valor numérico da célula. */
  value: number
}

interface HeatmapGridProps {
  data: HeatmapCell[]
  /** Rótulos do eixo X (colunas). */
  xLabels: string[]
  /** Rótulos do eixo Y (linhas). */
  yLabels: string[]
  /** Cor base usada na intensidade (default: brand). */
  baseColor?: string
  /** Formata o valor exibido no tooltip. */
  formatValue?: (value: number) => string
  className?: string
}

export function HeatmapGrid({
  data,
  xLabels,
  yLabels,
  baseColor = "var(--brand-primary)",
  formatValue = (v) => String(v),
  className,
}: HeatmapGridProps) {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)

  const { max, lookup } = useMemo(() => {
    const lookup = new Map<string, number>()
    let max = 0
    for (const cell of data) {
      lookup.set(`${cell.x}-${cell.y}`, cell.value)
      if (cell.value > max) max = cell.value
    }
    return { max: max || 1, lookup }
  }, [data])

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="min-w-[640px]">
        {/* Linhas */}
        <div className="flex flex-col gap-1">
          {yLabels.map((yLabel, y) => (
            <div key={yLabel} className="flex items-center gap-1.5">
              <span className="w-9 shrink-0 text-right font-display text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {yLabel}
              </span>
              <div className="flex flex-1 gap-1">
                {xLabels.map((_, x) => {
                  const value = lookup.get(`${x}-${y}`) ?? 0
                  const intensity = value / max
                  const isHover = hover?.x === x && hover?.y === y
                  return (
                    <div
                      key={x}
                      className="relative flex-1"
                      onMouseEnter={() => setHover({ x, y })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <div
                        className={cn(
                          "aspect-square w-full rounded-[5px] border transition-all duration-150",
                          isHover ? "border-[var(--brand-primary)] scale-[1.08]" : "border-transparent",
                        )}
                        style={{
                          background:
                            value === 0
                              ? "var(--glass-bg-subtle)"
                              : `color-mix(in srgb, ${baseColor} ${Math.round(18 + intensity * 82)}%, transparent)`,
                        }}
                        role="img"
                        aria-label={`${yLabel} ${xLabels[x]}: ${formatValue(value)}`}
                      />
                      {isHover && (
                        <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--tooltip-bg)] px-2 py-1 font-display text-[11px] font-semibold text-[var(--tooltip-text)] shadow-[var(--glass-shadow)]">
                          {xLabels[x]} · {formatValue(value)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Eixo X */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="w-9 shrink-0" />
          <div className="flex flex-1 gap-1">
            {xLabels.map((label, i) => (
              <span
                key={i}
                className="flex-1 text-center font-display text-[9px] font-medium text-[var(--text-muted)]"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
