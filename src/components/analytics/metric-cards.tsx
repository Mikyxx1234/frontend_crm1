"use client";

/**
 * MetricCards (Bento / Linear-Stripe)
 * ────────────────────────────────────
 * KPIs principais do Analytics no DNA Studioia: cards `rounded-[24px]` com
 * `bg-white`, borda `slate-100`, ícone em caixa colorida suave, label pequena
 * em caixa alta + valor grande em `font-bold tracking-tight`, trend pill ao
 * lado do ícone. Entrada animada com Framer Motion (fade-in + slide-up).
 *
 * Referência visual: `Studioia/src/components/AnalyticsPreview.tsx`.
 */

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ChartBar as BarChart3,
  Briefcase,
  Clock,
  DollarSign,
  MessageSquare,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  bentoAccentMap,
  bentoCardClass,
  bentoLabelClass,
  bentoValueClass,
  type BentoAccent,
} from "@/lib/dashboard-tokens";
import { cn, formatCurrency } from "@/lib/utils";

export type DashboardMetrics = {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalRevenue: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  avgDealSize: number;
  conversionRate: number;
  avgCycleTime: number;
  newContacts: number;
  activeConversations: number;
  // Campos opcionais de tendência — backend pode preencher futuramente.
  trends?: Partial<Record<keyof DashboardMetrics, number>>;
};

type MetricDef = {
  key: keyof Omit<DashboardMetrics, "trends">;
  label: string;
  icon: LucideIcon;
  format: (v: number) => string;
  accent: BentoAccent;
};

const METRICS: MetricDef[] = [
  {
    key: "totalDeals",
    label: "Total de negócios",
    icon: Briefcase,
    format: (v) => new Intl.NumberFormat("pt-BR").format(v),
    accent: "blue",
  },
  {
    key: "wonDeals",
    label: "Negócios ganhos",
    icon: Target,
    format: (v) => new Intl.NumberFormat("pt-BR").format(v),
    accent: "emerald",
  },
  {
    key: "totalRevenue",
    label: "Receita total",
    icon: DollarSign,
    format: (v) => formatCurrency(v),
    accent: "violet",
  },
  {
    key: "pipelineValue",
    label: "Valor no pipeline",
    icon: BarChart3,
    format: (v) => formatCurrency(v),
    accent: "amber",
  },
  {
    key: "conversionRate",
    label: "Taxa de conversão",
    icon: TrendingUp,
    format: (v) =>
      `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`,
    accent: "cyan",
  },
  {
    key: "avgCycleTime",
    label: "Ciclo médio",
    icon: Clock,
    format: (v) =>
      `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)} dias`,
    accent: "rose",
  },
  {
    key: "newContacts",
    label: "Novos contatos",
    icon: Users,
    format: (v) => new Intl.NumberFormat("pt-BR").format(v),
    accent: "indigo",
  },
  {
    key: "activeConversations",
    label: "Conversas ativas",
    icon: MessageSquare,
    format: (v) => new Intl.NumberFormat("pt-BR").format(v),
    accent: "blue",
  },
];

function TrendPill({ value }: { value: number }) {
  const isUp = value >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const abs = Math.abs(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        isUp
          ? "bg-emerald-50 text-emerald-600"
          : "bg-rose-50 text-rose-600",
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {isUp ? "+" : "-"}
      {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(abs)}
      %
    </span>
  );
}

function MetricSkeleton({ accent }: { accent: BentoAccent }) {
  const tone = bentoAccentMap[accent];
  return (
    <div className={bentoCardClass}>
      <div className="mb-5 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-2xl",
            tone.bg,
          )}
        >
          <span className={cn("size-5 animate-pulse rounded bg-white/60", tone.text)} />
        </span>
        <span className="h-5 w-14 animate-pulse rounded-full bg-slate-100" />
      </div>
      <span className="block h-3 w-24 animate-pulse rounded bg-slate-100" />
      <span className="mt-2 block h-8 w-32 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function MetricCards({
  data,
  isLoading,
  className,
}: {
  data?: DashboardMetrics | null;
  isLoading?: boolean;
  className?: string;
}) {
  const gridClass = cn(
    "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4",
    className,
  );

  if (isLoading) {
    return (
      <div className={gridClass}>
        {METRICS.map((m) => (
          <MetricSkeleton key={m.key} accent={m.accent} />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {METRICS.map((m, idx) => {
        const Icon = m.icon;
        const raw = data?.[m.key] ?? 0;
        const trend = data?.trends?.[m.key];
        const tone = bentoAccentMap[m.accent];
        return (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: idx * 0.06,
              type: "spring",
              stiffness: 340,
              damping: 28,
            }}
            className={cn(bentoCardClass, "group")}
          >
            <div className="mb-5 flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-[1.06]",
                  tone.bg,
                  tone.text,
                )}
              >
                <Icon className="size-5" strokeWidth={2.25} />
              </span>
              {typeof trend === "number" && <TrendPill value={trend} />}
            </div>
            <span className={bentoLabelClass}>{m.label}</span>
            <h3 className={cn(bentoValueClass, "mt-1")}>
              {m.format(typeof raw === "number" ? raw : 0)}
            </h3>
          </motion.div>
        );
      })}
    </div>
  );
}
