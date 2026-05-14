"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Headphones,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
} from "lucide-react";

import { getSidebarAllowlistTrackedHrefs } from "@/components/layout/dashboard-shell";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { WidgetPicker } from "@/components/dashboard/widget-picker";
import { PresetBar } from "@/components/dashboard/preset-bar";
import { dashboardPageTitleClass } from "@/lib/dashboard-tokens";
import {
  initDashboardLayout,
  useDashboardStore,
  type DashboardPresetId,
} from "@/stores/dashboard-store";
import { useDashboardLayoutSync } from "@/hooks/use-dashboard-layout-sync";
import {
  canSeeItem,
  computeHiddenSidebarRoutesFromAllowList,
  type Viewer,
} from "@/lib/nav-visibility";
import { cn } from "@/lib/utils";

const VALID_PRESETS: DashboardPresetId[] = [
  "default", "comercial", "atendimento", "equipe", "monitor", "custom",
];

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function DashboardHomePage() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const firstName = session?.user?.name?.split(/\s+/)[0] ?? "usuário";
  const today = dateFormatter.format(new Date());

  const resetLayout = useDashboardStore((s) => s.resetLayout);
  const applyPreset = useDashboardStore((s) => s.applyPreset);
  const dirty = useDashboardStore((s) => s.dirty);
  const preset = useDashboardStore((s) => s.preset);

  const { data: permissionsPanel } = useQuery({
    queryKey: ["settings-permissions-panel"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/settings/permissions"));
      if (!r.ok) return { permissionKeys: [] as string[], scopeGrants: undefined };
      return r.json() as {
        permissionKeys?: string[];
        scopeGrants?: { sidebar?: { routes?: Record<string, string[]> } };
      };
    },
    enabled: sessionStatus === "authenticated",
    staleTime: 60_000,
  });

  const roleFromSession = (session?.user as { role?: UserRole } | undefined)?.role ?? null;
  const sidebarAllowList =
    roleFromSession != null
      ? permissionsPanel?.scopeGrants?.sidebar?.routes?.[roleFromSession]
      : undefined;
  const hiddenRoutes = computeHiddenSidebarRoutesFromAllowList(
    getSidebarAllowlistTrackedHrefs(),
    sidebarAllowList,
  );
  const navViewer: Viewer = {
    role: roleFromSession,
    isSuperAdmin: Boolean((session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin),
    permissions: permissionsPanel?.permissionKeys ?? [],
    hiddenRoutes,
  };
  const showInboxAnalyticsLink = canSeeItem(
    {
      href: "/analytics/inbox",
      allowedRoles: [UserRole.ADMIN, UserRole.MANAGER],
      requiredPermission: "report:view",
    },
    navViewer,
  );

  const [editing, setEditing] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [tvWall, setTvWall] = React.useState(false);

  // Hidrata do localStorage imediatamente (evita flash do default).
  React.useEffect(() => {
    initDashboardLayout();
  }, []);

  // Sincroniza com o backend (GET ao montar + PUT no dirty com debounce).
  useDashboardLayoutSync(true);

  // Suporta ?preset=monitor etc. — útil pra redirect do /monitor antigo e links diretos.
  const appliedFromUrlRef = React.useRef(false);
  React.useEffect(() => {
    if (appliedFromUrlRef.current) return;
    const p = searchParams.get("preset");
    if (!p) return;
    if (!VALID_PRESETS.includes(p as DashboardPresetId)) return;
    if (p === "custom") return;
    appliedFromUrlRef.current = true;
    applyPreset(p as Exclude<DashboardPresetId, "custom">);
    if (p === "monitor") setTvWall(true);
  }, [searchParams, applyPreset]);

  // TV Wall: auto-remove padding do main pra ganhar espaço útil.
  React.useEffect(() => {
    if (!tvWall) return;
    document.documentElement.classList.add("dashboard-tvwall");
    return () => {
      document.documentElement.classList.remove("dashboard-tvwall");
    };
  }, [tvWall]);

  if (sessionStatus === "loading") {
    return (
      <div className="flex h-[calc(100dvh-3rem)] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const rowHeight = tvWall ? 56 : 72;
  const isMonitor = tvWall || preset === "monitor";

  return (
    <div
      className={cn(
        "w-full space-y-5",
        tvWall && "dark fixed inset-0 z-60 overflow-y-auto bg-[#0b1221] p-6 text-slate-100",
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className={cn(
            dashboardPageTitleClass,
            tvWall && "text-slate-50",
          )}>
            {tvWall ? "Monitor — War Room" : `Olá, ${firstName}`}
          </h1>
          <p className={cn(
            "text-sm capitalize",
            tvWall ? "text-[var(--color-ink-muted)]" : "text-muted-foreground",
          )}>
            {today}
            {dirty && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                <Save className="size-3" /> salvando...
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão: Adicionar widget (só no modo edição) */}
          {editing && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
                tvWall
                  ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  : "border-primary/30 bg-primary/5 text-primary shadow-sm hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]",
              )}
            >
              <Plus className="size-3.5" />
              Widget
            </button>
          )}

          {/* Resetar layout (só no modo edição) */}
          {editing && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Restaurar o layout padrão?")) resetLayout();
              }}
              title="Restaurar layout padrão"
              className={cn(
                "flex size-9 items-center justify-center rounded-xl border transition-all",
                tvWall
                  ? "border-white/10 bg-white/5 text-[var(--color-ink-muted)] hover:bg-white/10 hover:text-slate-100"
                  : "border-border/60 bg-card text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:text-foreground hover:shadow-[var(--shadow-lg)]",
              )}
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}

          {/* Toggle TV Wall */}
          <button
            type="button"
            onClick={() => setTvWall((v) => !v)}
            title={tvWall ? "Sair do modo TV" : "Modo TV (tela cheia)"}
            className={cn(
              "flex size-9 items-center justify-center rounded-xl border transition-all",
              tvWall
                ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                : "border-border/60 bg-card text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:text-foreground hover:shadow-[var(--shadow-lg)]",
            )}
          >
            {tvWall ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>

          {/* Toggle edição */}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all",
              editing
                ? "border-primary bg-primary text-white shadow-[var(--shadow-lg)]"
                : tvWall
                  ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  : "border-border/60 bg-card text-muted-foreground shadow-sm hover:-translate-y-0.5 hover:text-foreground hover:shadow-[var(--shadow-lg)]",
            )}
          >
            <Pencil className="size-3.5" />
            {editing ? "Concluir" : "Editar"}
          </button>
        </div>
      </div>

      {/* Barra de presets + atalho p/ métricas de inbox no contexto Atendimento */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <PresetBar />
        {!tvWall && preset === "atendimento" && showInboxAnalyticsLink && (
          <Link
            href="/analytics/inbox"
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-[var(--shadow-sm)] lumen-transition hover:shadow-[var(--shadow-md)]",
            )}
          >
            <Headphones className="size-3.5 shrink-0 text-primary" aria-hidden />
            Relatório de inbox
            <ChevronRight className="size-3.5 shrink-0 text-[var(--color-ink-muted)]" aria-hidden />
          </Link>
        )}
      </div>

      {/* Filtros só fora do modo TV Wall — TV limpa ao máximo */}
      {!tvWall && <FiltersBar />}

      {/* Grid */}
      <WidgetGrid editing={editing} rowHeight={rowHeight} />

      {/* Picker */}
      <WidgetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      {/* Selo "Monitor" — identificação visual do antigo monitor */}
      {isMonitor && !tvWall && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-bold uppercase tracking-wider text-emerald-700">
            Modo Monitor ativo
          </span>
          <span className="text-muted-foreground">
            · use o ícone <Maximize2 className="inline size-3" /> para TV Wall
          </span>
        </div>
      )}
    </div>
  );
}
