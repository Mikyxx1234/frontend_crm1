"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, Flame, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AUTOMATION_TEMPLATES,
  CATEGORY_META,
  type AutomationTemplate,
  type AutomationTemplateCategory,
} from "@/lib/automation-templates";
import { cn } from "@/lib/utils";

/**
 * Galeria de automações pré-prontas. Renderizada no passo 0 do wizard
 * "nova automação": o operador escolhe um template (que pré-preenche
 * nome/trigger/steps e salta direto para o canvas) ou clica em "começar
 * do zero" pra seguir o wizard padrão.
 *
 * Design:
 *  - Hero com call-to-action "do zero" em destaque fixo.
 *  - Filtros de categoria em pills (All + 6 categorias).
 *  - Cards em grid 1/2/3 cols com accent color sutil no ícone,
 *    label de categoria, tempo de setup e badge "Mais usado".
 */

type TemplateGalleryProps = {
  onApplyTemplate: (template: AutomationTemplate) => void;
  onStartBlank: () => void;
};

const ACCENT_STYLES: Record<
  AutomationTemplate["accent"],
  { bg: string; text: string; ring: string }
> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200/70" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200/70" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200/70" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200/70" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200/70" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200/70" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200/70" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", ring: "ring-fuchsia-200/70" },
};

type FilterId = "all" | AutomationTemplateCategory;

export function TemplateGallery({ onApplyTemplate, onStartBlank }: TemplateGalleryProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filters = useMemo<Array<{ id: FilterId; label: string; count: number }>>(() => {
    const all = AUTOMATION_TEMPLATES.length;
    const byCat = (Object.keys(CATEGORY_META) as AutomationTemplateCategory[]).map((cat) => ({
      id: cat as FilterId,
      label: CATEGORY_META[cat].label,
      count: AUTOMATION_TEMPLATES.filter((t) => t.category === cat).length,
    }));
    return [{ id: "all", label: "Todos", count: all }, ...byCat];
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return AUTOMATION_TEMPLATES;
    return AUTOMATION_TEMPLATES.filter((t) => t.category === filter);
  }, [filter]);

  return (
    <div className="space-y-6">
      <HeroCard onStartBlank={onStartBlank} total={AUTOMATION_TEMPLATES.length} />

      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-black/6 bg-white text-slate-600 hover:border-black/10 hover:text-slate-900",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((tpl, i) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            index={i}
            onApply={() => onApplyTemplate(tpl)}
          />
        ))}
      </div>
    </div>
  );
}

function HeroCard({ onStartBlank, total }: { onStartBlank: () => void; total: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/6 bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white sm:p-6">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-violet-500/15 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <Sparkles className="size-5 text-blue-200" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-200/90">
              Templates
            </p>
            <h2 className="text-[18px] font-black tracking-tight sm:text-[20px]">
              Comece com um fluxo pronto
            </h2>
            <p className="mt-1 max-w-lg text-[12px] text-slate-300 sm:text-[13px]">
              {total} automações inspiradas nas práticas mais usadas do mercado — adapte os detalhes e ative em minutos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartBlank}
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur transition-colors hover:border-white/20 hover:bg-white/10"
        >
          <Plus className="size-4" />
          Começar do zero
        </button>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  index,
  onApply,
}: {
  template: AutomationTemplate;
  index: number;
  onApply: () => void;
}) {
  const Icon = template.icon;
  const accent = ACCENT_STYLES[template.accent];
  const category = CATEGORY_META[template.category];

  return (
    <motion.button
      type="button"
      onClick={onApply}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/6 bg-white p-4 text-left transition-all hover:border-black/10 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      {template.popular && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/70">
          <Flame className="size-3" />
          Mais usado
        </span>
      )}

      <div
        className={cn(
          "mb-3 flex size-10 items-center justify-center rounded-xl ring-1 ring-inset",
          accent.bg,
          accent.text,
          accent.ring,
        )}
      >
        <Icon className="size-5" />
      </div>

      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {category.label}
      </p>
      <h3 className="mt-1 text-[14px] font-black tracking-tight text-slate-900">
        {template.name}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[12px] font-medium leading-snug text-slate-500">
        {template.tagline}
      </p>

      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {template.setupMinutes} min
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              template.ready
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                template.ready ? "bg-emerald-500" : "bg-slate-400",
              )}
            />
            {template.ready ? "Pronto" : "Ajustar"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-400 transition-colors group-hover:text-blue-600">
          Usar
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.button>
  );
}
