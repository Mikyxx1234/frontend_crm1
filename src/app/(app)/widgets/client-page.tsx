"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { IconPlugConnected } from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";

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

  const widgets: WidgetDto[] = widgetsQuery.data?.items ?? [];

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
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
        <PageHeader
          icon={<IconPlugConnected size={22} />}
          title="Widgets"
          description="Central de extensões — instale recursos extras na sua organização"
        />

        {widgetsQuery.isLoading ? (
          <LoadingState />
        ) : widgetsQuery.error ? (
          <ErrorState message={widgetsQuery.error.message} />
        ) : widgets.length === 0 ? (
          <EmptyState />
        ) : (
          <WidgetsBento
            widgets={widgets}
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
    <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[280px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]"
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
      <IconPlugConnected size={32} className="text-[var(--text-muted)]" />
      <p className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
        Nenhum widget disponível
      </p>
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        Em breve novos recursos aparecerão por aqui.
      </p>
    </div>
  );
}
