"use client"

import { IconBolt, IconMapPin } from "@tabler/icons-react"

export function ProductivityTipCard() {
  return (
    <section
      aria-label="Dica de produtividade"
      className="flex items-center gap-3.5 rounded-[var(--radius-xl)] border border-[var(--glass-border)] border-l-4 border-l-[var(--brand-primary)] bg-[var(--glass-bg-base)] px-[18px] py-4 shadow-[var(--glass-shadow)] backdrop-blur-md"
    >
      <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
        <IconBolt size={20} stroke={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-[var(--brand-primary)]">
          Dica de produtividade
        </p>
        <p className="mt-0.5 font-body text-[13px] text-[var(--text-secondary)]">
          Conecte seu calendário para sincronizar reuniões automaticamente e
          receber lembretes no momento certo.
        </p>
      </div>
      <button
        type="button"
        disabled
        title="Em breve"
        className="shrink-0 cursor-not-allowed rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--text-secondary)]"
      >
        Conectar agora
      </button>
    </section>
  )
}

export function OperationsBaseCard() {
  return (
    <section
      aria-label="Base de operações"
      className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md"
    >
      <p className="mb-3 flex items-center gap-2 font-display text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-muted)]">
        <IconMapPin size={14} stroke={2.2} className="text-[var(--brand-primary)]" />
        Base de operações
      </p>
      <div
        className="relative flex h-[120px] items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)]"
        style={{
          background: `
            radial-gradient(circle at 50% 45%, rgba(91,111,245,0.18), transparent 60%),
            repeating-linear-gradient(0deg, var(--glass-border-subtle) 0 1px, transparent 1px 26px),
            repeating-linear-gradient(90deg, var(--glass-border-subtle) 0 1px, transparent 1px 26px),
            var(--glass-bg-overlay)
          `,
        }}
        role="img"
        aria-label="Mapa: São Paulo, BR"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)]">
          <IconMapPin size={20} stroke={2.2} />
        </span>
      </div>
      <p className="mt-2.5 text-center font-display text-[13px] font-bold text-[var(--text-secondary)]">
        São Paulo, BR
      </p>
    </section>
  )
}
