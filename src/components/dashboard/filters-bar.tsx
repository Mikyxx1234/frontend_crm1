"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  Filter,
  RotateCcw,
} from "lucide-react";
import {
  useDashboardStore,
  type ComparisonMode,
  type PeriodPreset,
} from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Mês" },
  { key: "year", label: "Ano" },
];

const COMPARISON_OPTIONS: { key: ComparisonMode; label: string }[] = [
  { key: "off", label: "Desligado" },
  { key: "previous_period", label: "Período anterior" },
  { key: "previous_month", label: "Mês anterior" },
];

type PipelineOption = { id: string; name: string };
type UserOption = { id: string; name: string };

export function FiltersBar() {
  const {
    periodPreset,
    from,
    to,
    comparisonMode,
    filters,
    setPeriod,
    setComparison,
    setFilter,
  } = useDashboardStore();

  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");

  const { data: pipelines = [] } = useQuery<PipelineOption[]>({
    queryKey: ["pipelines-list"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/pipelines"));
      const j = await r.json();
      return Array.isArray(j) ? j : j.pipelines ?? [];
    },
    staleTime: 120_000,
  });

  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/users"));
      const j = await r.json();
      return Array.isArray(j) ? j : [];
    },
    staleTime: 120_000,
  });

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setPeriod("custom", new Date(customFrom).toISOString(), new Date(customTo + "T23:59:59").toISOString());
    }
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Period presets + comparison */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period pills */}
        <div className="flex items-center rounded-xl border border-border/60 bg-card p-1 shadow-sm">
          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                periodPreset === p.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-2 py-1 shadow-sm">
          <Calendar className="size-3.5 text-muted-foreground" />
          <input
            type="date"
            value={customFrom || from.split("T")[0]}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-7 border-0 bg-transparent text-xs text-foreground outline-none"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            value={customTo || to.split("T")[0]}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-7 border-0 bg-transparent text-xs text-foreground outline-none"
          />
          {(customFrom || customTo) && (
            <button
              type="button"
              onClick={handleCustomApply}
              className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white"
            >
              OK
            </button>
          )}
        </div>

        {/* Comparison toggle */}
        <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-2 py-1 shadow-sm">
          <ArrowLeftRight className={cn(
            "size-3.5",
            comparisonMode !== "off" ? "text-primary" : "text-muted-foreground",
          )} />
          <select
            value={comparisonMode}
            onChange={(e) => setComparison(e.target.value as ComparisonMode)}
            className="h-7 border-0 bg-transparent text-xs font-medium text-foreground outline-none"
          >
            {COMPARISON_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Advanced filters toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            showAdvanced
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border/60 bg-card text-muted-foreground shadow-sm hover:text-foreground",
          )}
        >
          <Filter className="size-3.5" />
          Filtros
          <ChevronDown className={cn("size-3 transition-transform", showAdvanced && "rotate-180")} />
        </button>
      </div>

      {/* Row 2: Advanced filters (collapsible) */}
      {showAdvanced && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <FilterSelect
            label="Pipeline"
            value={filters.pipelineId ?? ""}
            onChange={(v) => setFilter("pipelineId", v || null)}
            options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
          />
          <FilterSelect
            label="Responsável"
            value={filters.ownerId ?? ""}
            onChange={(v) => setFilter("ownerId", v || null)}
            options={users.map((u) => ({ value: u.id, label: u.name }))}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter("status", (v || "ALL") as "ALL" | "OPEN" | "WON" | "LOST")}
            options={[
              { value: "ALL", label: "Todos" },
              { value: "OPEN", label: "Abertos" },
              { value: "WON", label: "Ganhos" },
              { value: "LOST", label: "Perdidos" },
            ]}
            showAll={false}
          />
          <button
            type="button"
            onClick={() => {
              setFilter("pipelineId", null);
              setFilter("ownerId", null);
              setFilter("source", null);
              setFilter("status", "ALL");
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3" /> Limpar
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  showAll = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  showAll?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 rounded-lg border border-border/60 bg-white px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20"
      >
        {showAll && <option value="">Todos</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
