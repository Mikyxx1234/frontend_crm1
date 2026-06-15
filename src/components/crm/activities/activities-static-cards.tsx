"use client"

import { IconBolt, IconMapPin } from "@tabler/icons-react"

export function ProductivityTipCard() {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-xl)] p-4 text-white shadow-[var(--glass-shadow)]"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
        style={{
          background: "color-mix(in srgb, white 12%, transparent)",
        }}
      />
      <div className="relative flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]"
          style={{
            backgroundColor: "color-mix(in srgb, white 18%, transparent)",
          }}
        >
          <IconBolt size={15} />
        </span>
        <p className="font-display text-[12px] font-bold uppercase tracking-[0.06em]">
          Dica de Produtividade
        </p>
      </div>
      <p className="relative mt-2 font-body text-[12px] leading-snug opacity-90">
        Conecte seu calendário para sincronizar reuniões automaticamente e
        receber lembretes no momento certo.
      </p>
      <button
        type="button"
        disabled
        title="Em breve"
        className="relative mt-3 cursor-not-allowed rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[11px] font-bold transition-opacity"
        style={{
          backgroundColor: "color-mix(in srgb, white 18%, transparent)",
          color: "white",
        }}
      >
        Conectar agora
      </button>
    </div>
  )
}

export function OperationsBaseCard() {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4 shadow-[var(--glass-shadow-sm)]">
      <p className="mb-2 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        Base de Operações
      </p>
      <div
        className="flex h-28 items-center justify-center rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--brand-primary) 12%, transparent), transparent 60%)",
        }}
      >
        <IconMapPin
          size={28}
          className="text-[var(--brand-primary)]"
          stroke={2}
        />
      </div>
      <p className="mt-2 text-center font-display text-[11px] font-bold text-[var(--text-secondary)]">
        São Paulo, BR
      </p>
    </div>
  )
}
