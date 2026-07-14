"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { IconLayoutGrid } from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import {
  PageSearchBar,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar";

import {
  useInstallWidget,
  useUninstallWidget,
  useWidgets,
} from "@/features/widgets/hooks";
import type { WidgetDto } from "@/features/widgets/types";

import { WidgetsBento } from "./_components/widgets-bento";

interface WidgetsClientPageProps {
  navRail?: React.ReactNode;
}

export default function WidgetsClientPage({
  navRail,
}: WidgetsClientPageProps = {}) {
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const canManage = session?.user?.role === "ADMIN";

  const widgetsQuery = useWidgets(isAuthenticated);
  const installMutation = useInstallWidget();
  const uninstallMutation = useUninstallWidget();

  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "installed" | "available">("all");
  const [query, setQuery] = useState("");

  const widgets: WidgetDto[] = widgetsQuery.data?.items ?? [];

  const counts = useMemo(
    () => ({
      all: widgets.length,
      installed: widgets.filter((w) => w.installed).length,
      available: widgets.filter((w) => !w.installed).length,
    }),
    [widgets],
  );

  const filteredWidgets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return widgets.filter((w) => {
      const okFilter =
        filter === "all" ||
        (filter === "installed" && w.installed) ||
        (filter === "available" && !w.installed);
      const okQuery =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q);
      return okFilter && okQuery;
    });
  }, [widgets, filter, query]);

  const handleInstall = (slug: string) => {
    const widget = widgets.find((w) => w.slug === slug);
    setPendingSlug(slug);
    installMutation.mutate(slug, {
      onSuccess: () => {
        toast.success(`${widget?.name ?? "Widget"} instalado com sucesso.`);
      },
      onError: (err) => {
        toast.error(err.message || "Erro ao instalar widget.");
      },
      onSettled: () => setPendingSlug(null),
    });
  };

  const handleUninstall = (slug: string) => {
    const widget = widgets.find((w) => w.slug === slug);
    setPendingSlug(slug);
    uninstallMutation.mutate(slug, {
      onSuccess: () => {
        toast.success(`${widget?.name ?? "Widget"} removido.`);
      },
      onError: (err) => {
        toast.error(err.message || "Erro ao remover widget.");
      },
      onSettled: () => setPendingSlug(null),
    });
  };

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRailV2 />}

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
        <PageHeader
          icon={<IconLayoutGrid size={22} />}
          title="Widgets"
          description="Central de extensões — instale recursos extras na sua organização"
          center={
            <PageSearchBar
              variant="compact"
              value={query}
              onChange={setQuery}
              placeholder="Buscar widgets…"
              aria-label="Buscar widgets por nome ou categoria"
            />
          }
          actions={
            <PageSegmentedControl
              size="compact"
              aria-label="Filtrar widgets"
              value={filter}
              onChange={(v) => setFilter(v as typeof filter)}
              items={[
                { value: "all", label: <>Todos <span className="opacity-60">{counts.all}</span></> },
                { value: "installed", label: <>Instalados <span className="opacity-60">{counts.installed}</span></> },
                { value: "available", label: <>Disponíveis <span className="opacity-60">{counts.available}</span></> },
              ]}
            />
          }
        />

        {widgetsQuery.isLoading ? (
          <LoadingState />
        ) : widgetsQuery.error ? (
          <ErrorState message={widgetsQuery.error.message} />
        ) : widgets.length === 0 ? (
          <EmptyState />
        ) : filteredWidgets.length === 0 ? (
          <NoResultsState />
        ) : (
          <WidgetsBento
            widgets={filteredWidgets}
            canManage={canManage}
            pendingSlug={pendingSlug}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
          />
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[320px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
      {message || "Erro ao carregar widgets."}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-12 text-center">
      <IconLayoutGrid size={32} className="text-[var(--text-muted)]" />
      <p className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
        Nenhum widget disponível
      </p>
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        Em breve novos recursos aparecerão por aqui.
      </p>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-12 text-center">
      <IconLayoutGrid size={32} className="text-[var(--text-muted)]" />
      <p className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
        Nenhum widget encontrado
      </p>
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        Ajuste a busca ou o filtro selecionado.
      </p>
    </div>
  );
}
