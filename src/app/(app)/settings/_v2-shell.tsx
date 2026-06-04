"use client";

import Link from "next/link";
import { IconArrowLeft, IconSettings } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { ButtonGlass } from "@/components/crm/button-glass";

/**
 * Shell glass que envolve sub-páginas de settings portadas da v1.
 *
 * O conteúdo (children) ainda é o `client-page.tsx` da v1 (shadcn),
 * mas servido sem o DashboardShell antigo — apenas dentro do
 * NavRailV2 + PageHeader v2. O v0 pode reimplementar visualmente
 * cada sub-página depois.
 */
export function SettingsV2Shell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3.5 overflow-hidden">
        <PageHeader
          icon={<IconSettings size={22} />}
          title={title}
          description={description ?? "Configurações"}
          actions={
            <Link href="/settings">
              <ButtonGlass variant="glass">
                <IconArrowLeft size={16} /> Voltar
              </ButtonGlass>
            </Link>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto pr-2">
          {children}
        </div>
      </main>
    </div>
  );
}
