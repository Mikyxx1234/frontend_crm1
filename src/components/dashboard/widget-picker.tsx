"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconChartBar as BarChart3, IconBriefcase2 as BriefcaseBusiness, IconCheck as Check, IconHeadphones as Headphones, IconSearch as Search, IconUsers as Users, IconX as X } from "@tabler/icons-react";

import {
  ALL_WIDGETS,
  CATEGORY_LABELS,
  useDashboardStore,
  WIDGET_REGISTRY,
  type WidgetCategory,
  type WidgetId,
} from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: WidgetCategory[] = ["sales", "service", "team"];

const CATEGORY_ICONS: Record<WidgetCategory, typeof BarChart3> = {
  sales: BriefcaseBusiness,
  service: Headphones,
  team: Users,
};

const CATEGORY_ACCENTS: Record<WidgetCategory, string> = {
  sales: "text-violet-600 bg-violet-500/10",
  service: "text-cyan-600 bg-cyan-500/10",
  team: "text-[var(--color-warn)] bg-[var(--color-warning)]/10",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function WidgetPicker({ open, onClose }: Props) {
  const visibleWidgets = useDashboardStore((s) => s.visibleWidgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);

  const [query, setQuery] = React.useState("");
  const [activeCat, setActiveCat] = React.useState<WidgetCategory | "all">("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_WIDGETS.filter((id) => {
      const def = WIDGET_REGISTRY[id];
      if (!def) return false;
      if (activeCat !== "all" && def.category !== activeCat) return false;
      if (!q) return true;
      return (
        def.label.toLowerCase().includes(q) ||
        def.description.toLowerCase().includes(q)
      );
    });
  }, [query, activeCat]);

  const byCategory = React.useMemo(() => {
    const out: Record<WidgetCategory, WidgetId[]> = {
      sales: [],
      service: [],
      team: [],
    };
    for (const id of filtered) {
      const def = WIDGET_REGISTRY[id];
      if (!def) continue;
      out[def.category].push(id);
    }
    return out;
  }, [filtered]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Adicionar widgets"
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 top-[10vh] z-50 mx-auto flex max-h-[80vh] max-w-3xl flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
          >
            <header className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-6 py-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                <BarChart3 className="size-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-[var(--text-primary)]">Adicionar widgets</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Escolha o que exibir no seu dashboard. Arraste para reposicionar depois.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex items-center gap-2 border-b border-[var(--glass-border-subtle)] px-6 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2">
                <Search className="size-3.5 text-[var(--text-muted)]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome ou descrição..."
                  className="flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>

              <CategoryPill
                active={activeCat === "all"}
                onClick={() => setActiveCat("all")}
                label="Todas"
              />
              {CATEGORY_ORDER.map((cat) => (
                <CategoryPill
                  key={cat}
                  active={activeCat === cat}
                  onClick={() => setActiveCat(cat)}
                  label={CATEGORY_LABELS[cat]}
                />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filtered.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
                  Nenhum widget encontrado.
                </div>
              ) : (
                <div className="space-y-6">
                  {CATEGORY_ORDER.map((cat) => {
                    const list = byCategory[cat];
                    if (list.length === 0) return null;
                    const Icon = CATEGORY_ICONS[cat];
                    return (
                      <section key={cat}>
                        <header className="mb-2 flex items-center gap-2">
                          <span className={cn(
                            "flex size-6 items-center justify-center rounded-lg",
                            CATEGORY_ACCENTS[cat],
                          )}>
                            <Icon className="size-3" />
                          </span>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            {CATEGORY_LABELS[cat]}
                          </h3>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {list.length} {list.length === 1 ? "widget" : "widgets"}
                          </span>
                        </header>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {list.map((id) => {
                            const def = WIDGET_REGISTRY[id];
                            const active = visibleWidgets.has(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => toggleWidget(id)}
                                className={cn(
                                  "group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                                  active
                                    ? "border-[var(--brand-primary)]/40 bg-[var(--color-enterprise-bg)]"
                                    : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] hover:-translate-y-0.5 hover:border-[var(--brand-primary)]/20 hover:shadow-sm",
                                )}
                              >
                                <div className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all",
                                  active
                                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                    : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-transparent group-hover:border-[var(--brand-primary)]/40",
                                )}>
                                  <Check className="size-3" strokeWidth={3} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                                    {def.label}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-muted)]">
                                    {def.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-6 py-3">
              <p className="text-[11px] text-[var(--text-muted)]">
                <span className="font-bold text-[var(--text-primary)]">{visibleWidgets.size}</span> widgets ativos
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--brand-primary-dark)]"
              >
                Pronto
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-[var(--brand-primary)] text-white shadow-sm"
          : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
      )}
    >
      {label}
    </button>
  );
}
