"use client";

import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { ButtonGlass } from "@/components/crm/button-glass";

/**
 * Shell glass para páginas top-level v2 fora de Settings (ex.: Relatórios,
 * Agentes de IA). Espelha o layout de `SettingsV2Shell` — NavRailV2 +
 * PageHeader + área scroll — mas sem o botão "Voltar para configurações"
 * default. Por design, top-level pages costumam ter o NavRail como única
 * navegação primária; o `backHref` é opcional para casos pontuais.
 */
export function AppV2PageShell({
  title,
  description,
  icon,
  actions,
  children,
  backHref,
  backLabel = "Voltar",
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  const headerActions = backHref ? (
    <div className="flex items-center gap-2">
      {actions}
      <Link href={backHref}>
        <ButtonGlass variant="glass">
          <IconArrowLeft size={16} /> {backLabel}
        </ButtonGlass>
      </Link>
    </div>
  ) : (
    actions
  );

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        <PageHeader
          icon={icon}
          title={title}
          description={description}
          actions={headerActions}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto pr-2">
          {children}
        </div>
      </main>
    </div>
  );
}
