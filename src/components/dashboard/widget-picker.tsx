"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BriefcaseBusiness,
  Check,
  Headphones,
  Search,
  Users,
  X,
} from "lucide-react";

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
  team: "text-amber-600 bg-amber-500/10",
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
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
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
            className="fixed inset-x-4 top-[10vh] z-50 mx-auto flex max-h-[80vh] max-w-3xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-float"
          >
            <header className="flex items-center gap-3 border-b border-border/40 px-6 py-4">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="size-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Adicionar widgets</h2>
                <p className="text-xs text-muted-foreground">
                  Escolha o que exibir no seu dashboard. Arraste para reposicionar depois.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex items-center gap-2 border-b border-border/40 px-6 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <Search className="size-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nome ou descrição..."
                  className="flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
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
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
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
                          <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                            {CATEGORY_LABELS[cat]}
                          </h3>
                          <span className="text-[11px] text-muted-foreground/60">
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
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-sm",
                                )}
                              >
                                <div className={cn(
                                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-all",
                                  active
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-card text-transparent group-hover:border-primary/40",
                                )}>
                                  <Check className="size-3" strokeWidth={3} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-foreground">
                                    {def.label}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
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

            <footer className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20 px-6 py-3">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">{visibleWidgets.size}</span> widgets ativos
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/90"
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
          ? "bg-primary text-white shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
