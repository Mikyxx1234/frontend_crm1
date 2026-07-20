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
import { MobileAppUpdateDialog } from "@/components/layout/mobile-app-update-dialog";
import { UpdateAvailableBanner } from "@/components/layout/update-banner";
import { SoftphoneWidget } from "@/features/softphone/components";
import { ChatThemeApplier } from "@/components/providers/chat-theme-applier";
import { MobileBottomNav } from "@/components/crm/mobile-bottom-nav";

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
        {children}
        <UpdateAvailableBanner />
        <MobileAppUpdateDialog />
        <SoftphoneWidget />
        {/* Teste mobile: barra inferior global (hide-on-scroll). md+ não renderiza. */}
        <MobileBottomNav />
      </div>
    </>
  );
}
