"use client";

import { usePathname } from "next/navigation";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { useSettingsDrawer } from "@/features/settings/settings-drawer-context";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { SettingsSidebar } from "./_components/settings-sidebar";
import { SettingsSlide } from "./_components/settings-slide";

/**
 * Layout master-detail de /settings.
 *
 * Grid: NavRailV2 | SettingsSidebar (gaveta) | painel direito.
 * A gaveta abre no hover da engrenagem da NavRail; fecha ao sair,
 * salvo se estiver pinada (persistido em localStorage).
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open, onDrawerEnter, onDrawerLeave } = useSettingsDrawer();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const isHub = pathname === "/settings" || pathname === "/settings/";

  // Mobile: lista→detalhe. No hub mostra só o menu (sem NavRail, sem
  // painel direito); numa sub-rota mostra só a página, full-width.
  if (isMobile && isHub) {
    return (
      <div className="v2-screen flex min-w-0 flex-col overflow-hidden p-3 sm:p-4">
        <SettingsSidebar open />
      </div>
    );
  }

  if (isMobile && !isHub) {
    return (
      <div className="v2-screen flex min-w-0 flex-col overflow-hidden p-3 sm:p-4">
        <SettingsSlide>{children}</SettingsSlide>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "v2-screen grid min-w-0 grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4",
        // Transição do grid: a coluna do meio anima entre 0 e 288px, no
        // mesmo tempo/curva do slide da sidebar (abrir e fechar).
        //
        // As duas listas de tracks precisam ser ESTRUTURALMENTE iguais
        // (mesma contagem e mesma função por track) — `minmax(240px,288px)`
        // contra um `0px` cru não é interpolável e o browser cai em
        // animação discreta, trocando a largura de uma vez na metade do
        // tempo. Era isso que fazia a gaveta "pular" em vez de deslizar.
        "transition-[grid-template-columns] duration-[var(--drawer-duration)] motion-reduce:transition-none",
        open
          ? "grid-cols-[var(--nav-rail-w,72px)_minmax(240px,288px)_minmax(0,1fr)] ease-[var(--ease-drawer-open)]"
          : "grid-cols-[var(--nav-rail-w,72px)_minmax(0px,0px)_minmax(0,1fr)] ease-[var(--ease-drawer-close)]",
      )}
    >
      <NavRailSpacer />

      {/* Coluna da sidebar — clipa em 0 quando fechada. Hover na área
          cancela o fechamento iniciado ao sair da engrenagem. */}
      <div
        className="relative min-w-0 overflow-hidden"
        onMouseEnter={onDrawerEnter}
        onMouseLeave={onDrawerLeave}
      >
        <SettingsSidebar open={open} />
      </div>

      <div className="relative flex min-w-0 flex-col overflow-hidden">
        <SettingsSlide>{children}</SettingsSlide>
      </div>
    </div>
  );
}
