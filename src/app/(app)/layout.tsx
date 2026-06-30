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
import { TooltipProvider } from "@/components/crm/tooltip-glass";
import { UpdateAvailableBanner } from "@/components/layout/update-banner";
import { SoftphoneWidget } from "@/features/softphone/components";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delay={300}>
      <div
        className="v2-root v2-min-screen bg-[var(--bg-base)]"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 10%, var(--bg-mesh-1, #b8cfec) 0px, transparent 50%)",
        }}
      >
        {children}
        <UpdateAvailableBanner />
        <SoftphoneWidget />
      </div>
    </TooltipProvider>
  );
}
