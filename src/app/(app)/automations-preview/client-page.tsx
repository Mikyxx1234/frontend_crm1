"use client"

import { useState } from "react"
import {
  IconActivity,
  IconArrowRight,
  IconBolt,
  IconCircleCheck,
  IconClock,
  IconDots,
  IconPlayerPlayFilled,
  IconTrendingUp,
} from "@tabler/icons-react"

import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { PageHeader } from "@/components/crm/page-header"
import { SwitchGlass } from "@/components/crm/switch-glass"
import { MiniFlow } from "@/components/crm/mini-flow"
import { getFlow } from "@/lib/automation-flow"
import { automations, type Automation } from "@/lib/automations-data"
import { cn } from "@/lib/utils"

const ACCENT_GRADIENT: Record<Automation["accent"], string> = {
  blue: "av-blue",
  purple: "av-purple",
  mint: "av-mint",
  coral: "av-coral",
  teal: "av-teal",
}

const ACCENT_HEX: Record<Automation["accent"], string> = {
  blue: "#5D90FF",
  purple: "#D15DFF",
  mint: "#25B38B",
  coral: "#FF5D6D",
  teal: "#10D8D8",
}

function useFlowSteps(id: string) {
  return getFlow(id).map((n) => ({ blockType: n.blockType }))
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "relative flex h-2 w-2 shrink-0 items-center justify-center rounded-full",
        active ? "bg-[var(--color-online)]" : "bg-[var(--color-offline)]",
      )}
      aria-hidden
    >
      {active && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-online)] opacity-60" />
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* VARIANTE A — Linha horizontal (row dense, estilo lista premium)     */
/* ------------------------------------------------------------------ */
function VariantA({ a, onToggle }: { a: Automation; onToggle: (id: string) => void }) {
  const steps = useFlowSteps(a.id)
  return (
    <div
      className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--card)] px-4 py-3.5 shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]"
      style={{ "--wa": ACCENT_HEX[a.accent] } as React.CSSProperties}
    >
      <span
        className={cn("h-10 w-1 shrink-0 rounded-full", ACCENT_GRADIENT[a.accent])}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <StatusDot active={a.active} />
          <h3 className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
            {a.name}
          </h3>
        </div>
        <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
          <IconBolt size={12} style={{ color: "var(--wa)" }} />
          {a.trigger}
        </span>
      </div>
      <div className="hidden md:block">
        <MiniFlow steps={steps} max={4} size="sm" />
      </div>
      <div className="hidden w-28 shrink-0 flex-col items-end lg:flex">
        <span className="font-display text-[15px] font-bold text-[var(--text-primary)]">
          {a.successRate}%
        </span>
        <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          sucesso · {a.runsToday} hoje
        </span>
      </div>
      <SwitchGlass
        checked={a.active}
        onChange={() => onToggle(a.id)}
        aria-label={`${a.active ? "Desativar" : "Ativar"} ${a.name}`}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* VARIANTE B — Hero stat (métrica grande em destaque)                 */
/* ------------------------------------------------------------------ */
function VariantB({ a, onToggle }: { a: Automation; onToggle: (id: string) => void }) {
  const steps = useFlowSteps(a.id)
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--card)] p-5 shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--glass-shadow)]"
      style={{ "--wa": ACCENT_HEX[a.accent] } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <StatusDot active={a.active} />
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {a.active ? "Ativa" : "Pausada"}
            </span>
          </div>
          <h3 className="truncate font-display text-[16px] font-bold text-[var(--text-primary)]">
            {a.name}
          </h3>
        </div>
        <SwitchGlass checked={a.active} onChange={() => onToggle(a.id)} aria-label="toggle" />
      </div>

      {/* Hero metric */}
      <div className="my-4 flex items-end gap-3">
        <div
          className="flex flex-col rounded-[var(--radius-lg)] px-4 py-3"
          style={{ background: "color-mix(in srgb, var(--wa) 12%, transparent)" }}
        >
          <span
            className="font-display text-[34px] font-extrabold leading-none"
            style={{ color: "var(--wa)" }}
          >
            {a.runsToday}
          </span>
          <span className="mt-1 font-body text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            execuções hoje
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between font-body text-[12px]">
            <span className="text-[var(--text-muted)]">Sucesso</span>
            <span className="font-display font-bold text-[var(--text-primary)]">
              {a.successRate}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${a.successRate}%`, background: "var(--wa)" }}
            />
          </div>
          <span className="flex items-center gap-1 font-body text-[11px] text-[var(--text-muted)]">
            <IconActivity size={12} /> {a.runs.toLocaleString("pt-BR")} no total
          </span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--glass-border-subtle)] pt-3">
        <MiniFlow steps={steps} max={4} size="sm" />
        <span className="flex items-center gap-1 font-display text-[12px] font-bold text-[var(--brand-primary)]">
          Abrir <IconArrowRight size={13} />
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* VARIANTE C — Timeline vertical do fluxo                             */
/* ------------------------------------------------------------------ */
function VariantC({ a, onToggle }: { a: Automation; onToggle: (id: string) => void }) {
  const steps = useFlowSteps(a.id).slice(0, 4)
  return (
    <div
      className="group flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--card)] shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--glass-shadow)]"
      style={{ "--wa": ACCENT_HEX[a.accent] } as React.CSSProperties}
    >
      <div
        className="flex items-center justify-between gap-3 px-5 py-3.5"
        style={{ background: "color-mix(in srgb, var(--wa) 8%, transparent)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot active={a.active} />
          <h3 className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
            {a.name}
          </h3>
        </div>
        <SwitchGlass checked={a.active} onChange={() => onToggle(a.id)} aria-label="toggle" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="flex w-fit items-center gap-1.5 rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--text-secondary)]">
          <IconBolt size={12} style={{ color: "var(--wa)" }} /> {a.trigger}
        </span>

        {/* Timeline */}
        <ol className="relative ml-1 flex flex-col gap-3 border-l border-dashed border-[var(--glass-border)] pl-4 pt-1">
          {steps.map((s, i) => (
            <li key={i} className="relative">
              <span
                className="absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--card)]"
                style={{ background: "var(--wa)" }}
                aria-hidden
              />
              <span className="font-body text-[12.5px] capitalize text-[var(--text-secondary)]">
                {s.blockType.replace(/[-_]/g, " ")}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--glass-border-subtle)] pt-3 font-body text-[11px] text-[var(--text-muted)]">
          <span>{a.runs.toLocaleString("pt-BR")} execuções</span>
          <span>{a.successRate}% sucesso</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* VARIANTE D — Glass com gradiente de accent (imersivo)               */
/* ------------------------------------------------------------------ */
function VariantD({ a, onToggle }: { a: Automation; onToggle: (id: string) => void }) {
  const steps = useFlowSteps(a.id)
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] p-5 shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--glass-shadow)]"
      style={{
        "--wa": ACCENT_HEX[a.accent],
        background:
          "linear-gradient(150deg, color-mix(in srgb, var(--wa) 16%, var(--card)) 0%, var(--card) 55%)",
      } as React.CSSProperties}
    >
      {/* Glow decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--wa)" }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] text-white shadow-[var(--glass-shadow-sm)]",
            ACCENT_GRADIENT[a.accent],
          )}
        >
          <IconBolt size={20} />
        </div>
        <SwitchGlass checked={a.active} onChange={() => onToggle(a.id)} aria-label="toggle" />
      </div>

      <h3 className="relative mt-3 truncate font-display text-[16px] font-bold text-[var(--text-primary)]">
        {a.name}
      </h3>
      <p className="relative mt-1 line-clamp-2 font-body text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
        {a.description}
      </p>

      <div className="relative mt-4 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] p-3 backdrop-blur-md">
        <MiniFlow steps={steps} max={5} size="sm" />
      </div>

      <div className="relative mt-4 flex items-center justify-between font-body text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <IconTrendingUp size={13} style={{ color: "var(--wa)" }} /> {a.successRate}% sucesso
        </span>
        <span>{a.runsToday} hoje</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* VARIANTE E — Minimal mono (foco no toggle e ação)                   */
/* ------------------------------------------------------------------ */
function VariantE({ a, onToggle }: { a: Automation; onToggle: (id: string) => void }) {
  return (
    <div
      className="group flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--card)] p-5 shadow-[var(--glass-shadow-sm)] transition-all duration-200 hover:border-[color-mix(in_srgb,var(--wa)_45%,transparent)] hover:shadow-[var(--glass-shadow)]"
      style={{ "--wa": ACCENT_HEX[a.accent] } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.06em]",
            a.active
              ? "text-[var(--color-online)]"
              : "text-[var(--text-muted)]",
          )}
          style={
            a.active
              ? { background: "color-mix(in srgb, var(--color-online) 14%, transparent)" }
              : { background: "var(--glass-bg-subtle)" }
          }
        >
          <StatusDot active={a.active} />
          {a.active ? "Ativa" : "Pausada"}
        </span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-subtle)] hover:text-[var(--text-primary)]"
          aria-label="Mais opções"
        >
          <IconDots size={16} />
        </button>
      </div>

      <div>
        <h3 className="truncate font-display text-[17px] font-bold text-[var(--text-primary)]">
          {a.name}
        </h3>
        <p className="mt-1 line-clamp-2 font-body text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          {a.description}
        </p>
      </div>

      <div className="flex items-center gap-4 font-body text-[12px] text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <IconActivity size={13} style={{ color: "var(--wa)" }} />
          {a.runs.toLocaleString("pt-BR")}
        </span>
        <span className="flex items-center gap-1">
          <IconCircleCheck size={13} style={{ color: "var(--wa)" }} />
          {a.successRate}%
        </span>
        <span className="flex items-center gap-1">
          <IconClock size={13} style={{ color: "var(--wa)" }} />
          {a.lastRun}
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--glass-border-subtle)] pt-4">
        <button
          type="button"
          onClick={() => onToggle(a.id)}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 font-display text-[12px] font-bold text-white transition-transform hover:-translate-y-px"
          style={{ background: "var(--wa)" }}
        >
          <IconPlayerPlayFilled size={13} /> {a.active ? "Pausar" : "Ativar"}
        </button>
        <button
          type="button"
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 font-display text-[12px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-white"
        >
          Editar <IconArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Página de prévia                                                    */
/* ------------------------------------------------------------------ */
function Section({
  label,
  title,
  description,
  children,
}: {
  label: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="rounded-full bg-[var(--brand-primary)] px-2.5 py-0.5 font-display text-[11px] font-bold text-white">
          {label}
        </span>
        <h2 className="font-display text-[18px] font-bold text-[var(--text-primary)]">
          {title}
        </h2>
        <span className="font-body text-[12.5px] text-[var(--text-muted)]">
          {description}
        </span>
      </div>
      {children}
    </section>
  )
}

export default function AutomationsPreviewClientPage() {
  const [state, setState] = useState(automations)
  const toggle = (id: string) =>
    setState((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)),
    )

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-8 overflow-y-auto pb-10">
        <PageHeader
          icon={<IconBolt size={22} />}
          title="Automações · Prévia de variações"
          description="5 construções visuais diferentes para os cards, no DS v2."
        />

        <Section
          label="Variante A"
          title="Linha horizontal"
          description="Lista densa com barra de accent, mini-fluxo e métrica."
        >
          <div className="flex flex-col gap-2.5">
            {state.map((a) => (
              <VariantA key={a.id} a={a} onToggle={toggle} />
            ))}
          </div>
        </Section>

        <Section
          label="Variante B"
          title="Hero stat"
          description="Métrica grande em destaque com barra de progresso."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.map((a) => (
              <VariantB key={a.id} a={a} onToggle={toggle} />
            ))}
          </div>
        </Section>

        <Section
          label="Variante C"
          title="Timeline vertical"
          description="Cabeçalho tingido e os passos do fluxo em linha do tempo."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.map((a) => (
              <VariantC key={a.id} a={a} onToggle={toggle} />
            ))}
          </div>
        </Section>

        <Section
          label="Variante D"
          title="Glass imersivo"
          description="Gradiente de accent, glow e fluxo em painel translúcido."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.map((a) => (
              <VariantD key={a.id} a={a} onToggle={toggle} />
            ))}
          </div>
        </Section>

        <Section
          label="Variante E"
          title="Minimal com ações"
          description="Foco no status, métricas em linha e botões de ação."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.map((a) => (
              <VariantE key={a.id} a={a} onToggle={toggle} />
            ))}
          </div>
        </Section>
      </main>
    </div>
  )
}
