"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

import { SettingsSidebar } from "./_components/settings-sidebar";
import { SettingsSlide } from "./_components/settings-slide";

/**
 * Layout master-detail de /settings.
 *
 * Grid persistente: NavRailV2 (72px) | SettingsSidebar (lista) | painel direito.
 * O painel direito envolve `{children}` num wrapper com `key={pathname}` para
 * animar a entrada do conteúdo da direita a cada troca de sub-rota.
 *
 * A sidebar é retrátil: clicando no botão do próprio header, o grid transita
 * a largura da coluna do meio para 0 (retrai para a esquerda) e um botão
 * flutuante aparece à beira do painel direito para expandi-la de volta.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
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
        // Transição do grid: a coluna do meio anima entre 0 e 288px.
        "transition-[grid-template-columns] duration-300 ease-out",
        open
          ? "grid-cols-[var(--nav-rail-w,72px)_minmax(240px,288px)_minmax(0,1fr)]"
          : "grid-cols-[var(--nav-rail-w,72px)_0px_minmax(0,1fr)]",
      )}
    >
      <NavRailV2 />

      {/* Coluna da sidebar — sempre montada; o overflow-hidden clipa quando a
          coluna colapsa a 0. Dentro, a própria sidebar aplica translate-x e
          fade pra transição parecer com o grid. */}
      <div className="relative min-w-0 overflow-hidden">
        <SettingsSidebar open={open} />
      </div>

      <div className="relative flex min-w-0 flex-col overflow-hidden">
        {/* Abinha recolher/expandir — MESMO botão do aside (chevron):
            fica na costura entre a lista e o painel. `<` recolhe, `>` reabre. */}
        <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2">
          <TooltipGlass label={open ? "Recolher menu" : "Mostrar menu"} side="right">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Recolher menu de configurações" : "Expandir menu de configurações"}
              className="pointer-events-auto flex h-14 w-6 items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] shadow-[var(--glass-shadow)] backdrop-blur-md transition-all hover:bg-[var(--brand-primary)] hover:text-white"
            >
              {open ? (
                <IconChevronLeft size={14} strokeWidth={3} />
              ) : (
                <IconChevronRight size={14} strokeWidth={3} />
              )}
            </button>
          </TooltipGlass>
        </div>

        <SettingsSlide>{children}</SettingsSlide>
      </div>
    </div>
  );
}
