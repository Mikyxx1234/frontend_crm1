"use client";

import { IconSettings } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";

/**
 * Shell glass que envolve sub-páginas de settings portadas da v1.
 *
 * O conteúdo (children) ainda é o `client-page.tsx` da v1 (shadcn),
 * mas servido sem o DashboardShell antigo — apenas dentro do
 * NavRailV2 + PageHeader v2. O v0 pode reimplementar visualmente
 * cada sub-página depois.
 *
 * Não inclui mais o botão "Voltar": a navegação fica na NavRail,
 * e as páginas internas devem omitir um segundo PageHeader.
 */
export function SettingsV2Shell({
  title,
  description,
  children,
  icon = <IconSettings size={22} />,
  center,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Ícone do cabeçalho. Default: engrenagem (configurações). */
  icon?: React.ReactNode;
  /** Busca opcional, renderizada no centro do PageHeader. */
  center?: React.ReactNode;
  /** Controles/ações opcionais, renderizados à direita do PageHeader. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        <PageHeader
          icon={icon}
          title={title}
          description={description ?? "Configurações"}
          center={center}
          actions={actions}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto pr-2">
          {children}
        </div>
      </main>
    </div>
  );
}
