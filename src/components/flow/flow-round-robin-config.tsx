"use client"

import { Input } from "@/components/ui/input"
import {
  ROUND_ROBIN_MAX_OPTIONS,
  ROUND_ROBIN_MIN_OPTIONS,
  newRoundRobinOptionId,
  normalizeRoundRobinConfig,
  roundRobinOptionLabel,
  type RoundRobinOption,
} from "@/lib/automation-round-robin"
import type { NodeConfig } from "@/lib/flow-data"

export function FlowRoundRobinConfig({
  cfg,
  onChange,
}: {
  cfg: NodeConfig
  onChange: (next: NodeConfig) => void
}) {
  const options = normalizeRoundRobinConfig(cfg).options

  function commit(next: RoundRobinOption[]) {
    onChange({ ...cfg, options: next })
  }

  return (
    <section className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Cada execução segue a próxima opção, em rodízio. Destino = arrastar o handle.
      </p>
      {options.map((option, i) => (
        <div key={option.id} className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[color-mix(in_oklch,var(--color-cyan)_14%,transparent)] text-[10px] font-bold text-[var(--color-cyan)]">
            {i + 1}
          </span>
          <Input
            value={option.label ?? ""}
            onChange={(e) =>
              commit(options.map((o) => (o.id === option.id ? { ...o, label: e.target.value } : o)))
            }
            placeholder={roundRobinOptionLabel(option, i)}
            className="h-8 text-[13px]"
          />
          {options.length > ROUND_ROBIN_MIN_OPTIONS && (
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Remover opção"
              onClick={() => commit(options.filter((o) => o.id !== option.id))}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={options.length >= ROUND_ROBIN_MAX_OPTIONS}
        className="w-full rounded-md border border-dashed border-[var(--brand-primary)]/40 py-2 text-[12px] font-semibold text-[var(--brand-primary)] hover:bg-[var(--color-primary-soft)] disabled:opacity-40"
        onClick={() => commit([...options, { id: newRoundRobinOptionId() }])}
      >
        + Adicionar outra opção
      </button>
    </section>
  )
}
