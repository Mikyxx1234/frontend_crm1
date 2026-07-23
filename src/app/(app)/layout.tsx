/*
 * Layout do route group (app) — NOVO FRONTEND v2 servindo a raiz.
 *
 * Após a migração:
 *  - As rotas v2 (dashboard, inbox, pipeline, contacts, companies,
 *    activities, automations, settings) vivem aqui SEM o prefixo `/v2/`.
 *  - O frontend antigo (v1) foi movido para `src/app/old/*` e
 *    continua acessível em `/old/*`.
 *
 * Decisões:
 *  - NÃO usa DashboardShell legado (cada página v2 tem seu próprio NavRail).
 *  - Importa globals-v2.css com tokens/utilities adicionais.
 *  - Auth/Providers vêm do root layout (NextAuth + React Query).
 */

import "@/styles/globals-v2.css";
import { BiometricLockGate } from "@/components/layout/biometric-lock-gate";
import { MobileAppUpdateDialog } from "@/components/layout/mobile-app-update-dialog";
import { NativeApkUpdateDialog } from "@/components/layout/native-apk-update-dialog";
import { UpdateAvailableBanner } from "@/components/layout/update-banner";
import { SoftphoneWidget } from "@/features/softphone/components";
import { ChatThemeApplier } from "@/components/providers/chat-theme-applier";
import { MobileBottomNav } from "@/components/crm/mobile-bottom-nav";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { RouteTransition } from "@/components/crm/route-transition";

// O TooltipProvider (Radix) é provido uma única vez na raiz (app/providers.tsx),
// cobrindo tanto os TooltipGlass quanto os TooltipContent/TooltipHost. Não é
// necessário aninhar outro provider aqui.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ChatThemeApplier />
      <div className="v2-root v2-min-screen">
        {/* Trilho de navegação ÚNICO e PERSISTENTE. Vive aqui (fora do
            RouteTransition) para NÃO remontar ao navegar — antes cada página
            renderizava o seu, e a troca de rota (key do RouteTransition +
            troca do componente de página) remontava o trilho, fazendo os
            ícones/avatar piscarem. Posição fixa sobre a 1ª coluna do grid
            (que as páginas reservam via `--nav-rail-w` + <NavRailSpacer/>),
            mantendo o mesmo recuo (p-3/p-4) das shells. */}
        <div
          className="fixed left-3 top-3 bottom-3 z-40 max-md:hidden sm:left-4 sm:top-4 sm:bottom-4"
          style={{ width: "var(--nav-rail-w, 72px)" }}
        >
          <NavRailV2 />
        </div>
        <RouteTransition>{children}</RouteTransition>
        <UpdateAvailableBanner />
        <MobileAppUpdateDialog />
        <NativeApkUpdateDialog />
        <SoftphoneWidget />
        {/* Teste mobile: barra inferior global (hide-on-scroll). md+ não renderiza. */}
        <MobileBottomNav />
      </div>
      <BiometricLockGate />
    </>
  );
}
