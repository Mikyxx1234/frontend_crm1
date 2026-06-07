"use client";

/**
 * PRÉVIA VISUAL — Central de Widgets
 *
 * Página temporária para comparar 3 variações visuais de card de
 * integração/plugin, todas respeitando o DS v2. Usa dados mockados que
 * espelham os widgets reais ("Distribuição Inteligente" e "Agentes de IA").
 *
 * Escolhida a variante, aplicamos no WidgetCard real e removemos esta rota.
 */

import { motion } from "framer-motion";
import {
  IconCheck,
  IconCircleCheckFilled,
  IconPlus,
  IconPlugConnected,
  IconRobot,
  IconRoute,
  IconTrash,
  type IconProps,
} from "@tabler/icons-react";

import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Mock — espelha o shape de WidgetDto + apresentação resolvida
// ---------------------------------------------------------------------------

interface MockWidget {
  slug: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  Icon: React.ComponentType<IconProps>;
  /** Token de cor do DS v2 usado como accent. */
  accentToken: string;
  installed: boolean;
}

const MOCK_WIDGETS: MockWidget[] = [
  {
    slug: "smart-distribution",
    name: "Distribuição Inteligente",
    category: "Operação Comercial",
    description:
      "Automatize a distribuição de leads entre consultores usando regras inteligentes, disponibilidade, fila, prioridade e equilíbrio operacional.",
    features: [
      "Distribuição automática de leads",
      "Regras por consultor, fila ou time",
      "Priorização inteligente",
      "Equilíbrio operacional",
    ],
    Icon: IconRoute,
    accentToken: "--brand-primary",
    installed: true,
  },
  {
    slug: "ai-agents",
    name: "Agentes de IA",
    category: "Inteligência Artificial",
    description:
      "Configure agentes de IA para atendimento, qualificação, recomendação de cursos, reativação de leads e automações conversacionais dentro do CRM.",
    features: [
      "Agentes de atendimento",
      "Qualificação automática",
      "Respostas inteligentes",
      "Integração com fluxos e automações",
    ],
    Icon: IconRobot,
    accentToken: "--color-info",
    installed: false,
  },
];

// ---------------------------------------------------------------------------
// Status badge compartilhado
// ---------------------------------------------------------------------------

function StatusBadge({ installed }: { installed: boolean }) {
  if (installed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-online)]/30 bg-[color-mix(in_srgb,var(--color-online)_12%,transparent)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--color-online)]">
        <IconCircleCheckFilled className="size-3.5" />
        Instalado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-2.5 py-1 font-display text-[11px] font-semibold text-[var(--text-secondary)]">
      Disponível
    </span>
  );
}

function ActionButton({ installed }: { installed: boolean }) {
  if (installed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-[var(--color-danger-text)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]"
      >
        <IconTrash />
        Remover
      </Button>
    );
  }
  return (
    <Button variant="default" size="sm" className="w-full">
      <IconPlus />
      Instalar
    </Button>
  );
}

function FeatureList({
  features,
  accent,
}: {
  features: string[];
  accent: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-center gap-2 font-body text-[12.5px] text-[var(--text-secondary)]"
        >
          <IconCheck className="size-3.5 shrink-0" style={{ color: accent }} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// VARIANTE A — "Painel" (atual): glass limpo, ícone canto superior esquerdo
// ---------------------------------------------------------------------------

function CardVariantA({ widget }: { widget: MockWidget }) {
  const accent = `var(${widget.accentToken})`;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      style={{ "--wa": accent } as React.CSSProperties}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-6 shadow-[var(--glass-shadow-sm)] backdrop-blur-[16px] transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: "color-mix(in srgb, var(--wa) 14%, transparent)" }}
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow-sm)] transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: "color-mix(in srgb, var(--wa) 12%, var(--glass-bg-overlay))",
            color: "var(--wa)",
          }}
        >
          <widget.Icon className="size-6" />
        </div>
        <StatusBadge installed={widget.installed} />
      </div>
      <h3 className="mt-4 font-display text-[17px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
        {widget.name}
      </h3>
      <p className="mt-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {widget.category}
      </p>
      <p className="mt-2 font-body text-[13px] leading-relaxed text-[var(--text-muted)]">
        {widget.description}
      </p>
      <div className="mt-5 flex flex-1 flex-col">
        <FeatureList features={widget.features} accent="var(--wa)" />
        <div className="mt-auto pt-5">
          <ActionButton installed={widget.installed} />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VARIANTE B — "Faixa lateral": barra de accent à esquerda + cabeçalho em linha
// ---------------------------------------------------------------------------

function CardVariantB({ widget }: { widget: MockWidget }) {
  const accent = `var(${widget.accentToken})`;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      style={{ "--wa": accent } as React.CSSProperties}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow-sm)] backdrop-blur-[16px] transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]"
    >
      {/* Barra de accent vertical (grossa) */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: "var(--wa)" }}
      />
      {/* Cabeçalho em faixa com fundo de accent */}
      <div
        className="flex items-center gap-3 px-6 py-4 pl-7"
        style={{
          backgroundColor: "color-mix(in srgb, var(--wa) 8%, transparent)",
          borderBottom:
            "1px solid color-mix(in srgb, var(--wa) 20%, transparent)",
        }}
      >
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] shadow-[var(--glass-shadow-sm)] transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: "var(--wa)",
            color: "var(--text-on-brand, #fff)",
          }}
        >
          <widget.Icon className="size-[22px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[16px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
            {widget.name}
          </h3>
          <p
            className="mt-0.5 font-body text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--wa)" }}
          >
            {widget.category}
          </p>
        </div>
        <StatusBadge installed={widget.installed} />
      </div>
      <div className="flex flex-1 flex-col p-6 pl-7">
        <p className="font-body text-[13px] leading-relaxed text-[var(--text-muted)]">
          {widget.description}
        </p>
        <div className="mt-4 flex flex-1 flex-col">
          <FeatureList features={widget.features} accent="var(--wa)" />
          <div className="mt-auto pt-5">
            <ActionButton installed={widget.installed} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VARIANTE C — "Cabeçalho realçado": banner com accent suave + ícone destacado
// ---------------------------------------------------------------------------

function CardVariantC({ widget }: { widget: MockWidget }) {
  const accent = `var(${widget.accentToken})`;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      style={{ "--wa": accent } as React.CSSProperties}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow-sm)] backdrop-blur-[16px] transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]"
    >
      {/* Banner com accent forte */}
      <div
        className="relative flex items-start justify-end gap-3 px-6 pb-10 pt-5"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--wa) 38%, transparent), color-mix(in srgb, var(--wa) 12%, transparent))",
        }}
      >
        <StatusBadge installed={widget.installed} />
      </div>
      {/* Ícone sobreposto na borda do banner */}
      <div className="-mt-8 px-6">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] border-2 border-[var(--glass-bg-modal)] shadow-[var(--glass-shadow)] transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: "var(--wa)",
            color: "var(--text-on-brand, #fff)",
          }}
        >
          <widget.Icon className="size-8" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-3">
        <h3 className="font-display text-[17px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">
          {widget.name}
        </h3>
        <p className="mt-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {widget.category}
        </p>
        <p className="mt-2 font-body text-[13px] leading-relaxed text-[var(--text-muted)]">
          {widget.description}
        </p>
        <div className="mt-4 flex flex-1 flex-col">
          <FeatureList features={widget.features} accent="var(--wa)" />
          <div className="mt-auto pt-5">
            <ActionButton installed={widget.installed} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VARIANTE D — "Compacto branco": card pequeno, sem lista, foco no essencial
// ---------------------------------------------------------------------------

function CardVariantD({ widget }: { widget: MockWidget }) {
  const accent = `var(${widget.accentToken})`;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      style={{ "--wa": accent } as React.CSSProperties}
      className="group flex flex-col rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-4 shadow-[var(--glass-shadow-sm)] transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-transform duration-300 group-hover:scale-105"
          style={{
            backgroundColor: "color-mix(in srgb, var(--wa) 12%, transparent)",
            color: "var(--wa)",
          }}
        >
          <widget.Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[14px] font-bold leading-tight text-[var(--text-primary)]">
            {widget.name}
          </h3>
          <p className="truncate font-body text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {widget.category}
          </p>
        </div>
        <StatusBadge installed={widget.installed} />
      </div>
      <p className="mt-3 line-clamp-2 font-body text-[12.5px] leading-relaxed text-[var(--text-muted)]">
        {widget.description}
      </p>
      <div className="mt-4">
        <ActionButton installed={widget.installed} />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VARIANTE E — "Branco minimal": superfície clara, accent só em detalhes
// ---------------------------------------------------------------------------

function CardVariantE({ widget }: { widget: MockWidget }) {
  const accent = `var(${widget.accentToken})`;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      style={{ "--wa": accent } as React.CSSProperties}
      className="group flex flex-col rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-modal)] p-5 shadow-[var(--glass-shadow-sm)] transition-all duration-300 hover:border-[color-mix(in_srgb,var(--wa)_40%,transparent)] hover:shadow-[var(--glass-shadow)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-8 w-1 rounded-full"
            style={{ backgroundColor: "var(--wa)" }}
          />
          <widget.Icon className="size-5" style={{ color: "var(--wa)" }} />
        </div>
        <StatusBadge installed={widget.installed} />
      </div>
      <h3 className="mt-3 font-display text-[15px] font-bold leading-tight text-[var(--text-primary)]">
        {widget.name}
      </h3>
      <p className="mt-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {widget.category}
      </p>
      <p className="mt-2 font-body text-[12.5px] leading-relaxed text-[var(--text-muted)]">
        {widget.description}
      </p>
      <div className="mt-4 flex flex-1 flex-col">
        <FeatureList features={widget.features.slice(0, 3)} accent="var(--wa)" />
        <div className="mt-auto pt-4">
          <ActionButton installed={widget.installed} />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// VARIANTE F — "Branco horizontal": ícone à esquerda, conteúdo ao lado
// ---------------------------------------------------------------------------

function CardVariantF({ widget }: { widget: MockWidget }) {
  const accent = `var(${widget.accentToken})`;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      style={{ "--wa": accent } as React.CSSProperties}
      className="group flex gap-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-4 shadow-[var(--glass-shadow-sm)] transition-shadow duration-300 hover:shadow-[var(--glass-shadow)]"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-[var(--radius-md)] transition-transform duration-300 group-hover:scale-105"
        style={{
          backgroundColor: "color-mix(in srgb, var(--wa) 12%, transparent)",
          color: "var(--wa)",
        }}
      >
        <widget.Icon className="size-6" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[14px] font-bold leading-tight text-[var(--text-primary)]">
              {widget.name}
            </h3>
            <p className="truncate font-body text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {widget.category}
            </p>
          </div>
          <StatusBadge installed={widget.installed} />
        </div>
        <p className="mt-1.5 line-clamp-2 font-body text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          {widget.description}
        </p>
        <div className="mt-3 flex items-center justify-end">
          {widget.installed ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-[var(--color-danger-text)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]"
            >
              <IconTrash />
              Remover
            </Button>
          ) : (
            <Button variant="default" size="sm">
              <IconPlus />
              Instalar
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Seção de variante
// ---------------------------------------------------------------------------

function VariantSection({
  label,
  title,
  description,
  Card,
}: {
  label: string;
  title: string;
  description: string;
  Card: React.ComponentType<{ widget: MockWidget }>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-on-brand,#fff)]">
          {label}
        </span>
        <div>
          <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="font-body text-[12.5px] text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_WIDGETS.map((w) => (
          <Card key={w.slug} widget={w} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function WidgetsPreviewClientPage({
  navRail,
}: {
  navRail?: React.ReactNode;
} = {}) {
  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}

      <main className="flex min-w-0 flex-col gap-8 overflow-y-auto pb-10 pr-1">
        <PageHeader
          icon={<IconPlugConnected size={22} />}
          title="Prévia — Cards de Widget"
          description="Três variações visuais para a Central de extensões (DS v2)"
        />

        <VariantSection
          label="Variante A"
          title="Painel (atual)"
          Card={CardVariantA}
          description="Glass limpo, ícone no canto e botão de largura total."
        />
        <VariantSection
          label="Variante B"
          title="Faixa lateral"
          Card={CardVariantB}
          description="Barra de accent à esquerda e cabeçalho em linha, mais compacto."
        />
        <VariantSection
          label="Variante C"
          title="Cabeçalho realçado"
          Card={CardVariantC}
          description="Banner com accent suave e ícone destacado sobre a borda."
        />
        <VariantSection
          label="Variante D"
          title="Compacto branco"
          Card={CardVariantD}
          description="Card pequeno em superfície branca, sem lista de recursos."
        />
        <VariantSection
          label="Variante E"
          title="Branco minimal"
          Card={CardVariantE}
          description="Superfície clara, accent só em detalhes e borda no hover."
        />
        <VariantSection
          label="Variante F"
          title="Branco horizontal"
          Card={CardVariantF}
          description="Layout em linha, ícone à esquerda e ação alinhada à direita."
        />
      </main>
    </div>
  );
}
