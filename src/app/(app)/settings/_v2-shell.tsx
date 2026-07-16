"use client";

import * as React from "react";
import { IconSettings } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader, type PageHeaderBack } from "@/components/crm/page-header";

/** Atalho voltar ao hub de configurações — use em sub-páginas de `/settings/*`. */
export const SETTINGS_HUB_BACK: PageHeaderBack = {
  href: "/settings",
  label: "Configurações",
};

/**
 * Slots de header preenchidos por uma sub-página filha.
 *
 * Permite que o conteúdo (children) injete controles (ex.: barra de abas,
 * botão de ação) na MESMA linha do `PageHeader` — padrão Pipeline — sem
 * elevar estado/queries para fora do componente. Quando não há provider
 * (ex.: rota `/old` standalone), o hook devolve `null` e o filho renderiza
 * os controles inline.
 */
type SettingsHeaderSlotSetters = {
  setCenter: (node: React.ReactNode) => void;
  setActions: (node: React.ReactNode) => void;
};

const SettingsHeaderSlotsContext =
  React.createContext<SettingsHeaderSlotSetters | null>(null);

export function useSettingsHeaderSlots(): SettingsHeaderSlotSetters | null {
  return React.useContext(SettingsHeaderSlotsContext);
}

/**
 * Shell glass que envolve sub-páginas de settings portadas da v1.
 *
 * O conteúdo (children) ainda é o `client-page.tsx` da v1 (shadcn),
 * mas servido sem o DashboardShell antigo — apenas dentro do
 * NavRailV2 + PageHeader v2. O v0 pode reimplementar visualmente
 * cada sub-página depois.
 *
 * Sub-páginas de `/settings/*` podem passar `back={SETTINGS_HUB_BACK}` para
 * atalho ao hub. Listas top-level continuam usando só a NavRail.
 */
export function SettingsV2Shell({
  title,
  description,
  children,
  icon = <IconSettings size={22} />,
  back,
  center,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Ícone do cabeçalho. Default: engrenagem (configurações). */
  icon?: React.ReactNode;
  /** Voltar ao hub ou seção pai (opcional). */
  back?: PageHeaderBack;
  /** Busca opcional, renderizada no centro do PageHeader. */
  center?: React.ReactNode;
  /** Controles/ações opcionais, renderizados à direita do PageHeader. */
  actions?: React.ReactNode;
}) {
  const [slotCenter, setSlotCenter] = React.useState<React.ReactNode>(null);
  const [slotActions, setSlotActions] = React.useState<React.ReactNode>(null);

  const slotSetters = React.useMemo<SettingsHeaderSlotSetters>(
    () => ({ setCenter: setSlotCenter, setActions: setSlotActions }),
    [],
  );

  return (
    <SettingsHeaderSlotsContext.Provider value={slotSetters}>
      <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
        <NavRailV2 />

        <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden sm:gap-3.5">
          <PageHeader
            back={back}
            icon={icon}
            title={title}
            description={description ?? "Configurações"}
            center={center ?? slotCenter}
            actions={actions ?? slotActions}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-1 sm:gap-3.5 [-webkit-overflow-scrolling:touch]">
            {children}
          </div>
        </main>
      </div>
    </SettingsHeaderSlotsContext.Provider>
  );
}
