import { NavRailV2 } from "@/components/crm/nav-rail-v2";

import { SettingsSidebar } from "./_components/settings-sidebar";
import { SettingsSlide } from "./_components/settings-slide";

/**
 * Layout master-detail de /settings.
 *
 * Grid persistente: NavRailV2 (72px) | SettingsSidebar (lista) | painel direito.
 * O painel direito envolve `{children}` num wrapper com `key={pathname}` para
 * animar a entrada do conteúdo da direita a cada troca de sub-rota.
 *
 * Sub-páginas continuam usando o `SettingsV2Shell` (agora sem NavRailV2),
 * então recebem o PageHeader/slots dentro deste painel — sem duplicação.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_minmax(240px,300px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <NavRailV2 />
      <SettingsSidebar />
      <SettingsSlide>{children}</SettingsSlide>
    </div>
  );
}
