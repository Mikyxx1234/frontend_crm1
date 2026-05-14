import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { LandingClient } from "./landing-client";

/**
 * Raiz publica. Decide server-side:
 *  - Nao logado: mostra landing com form de signup inline (passo 1 =
 *    empresa + admin + senha). Ao submeter, vira organization + user
 *    ADMIN numa transacao, faz signIn() e joga no wizard /onboarding
 *    pros passos 2..5 (detalhes, branding, pipeline, time, canal).
 *  - Logado sem onboarding: manda pro wizard.
 *  - Logado com onboarding completo: manda pro dashboard.
 *  - Super-admin sem org (EduIT): manda pro painel /admin.
 *
 * Essa pagina substitui o fluxo antigo de convite-por-admin. Agora
 * qualquer empresa se cadastra direto por esse form.
 */
export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    const u = session.user as {
      id: string;
      organizationId?: string | null;
      isSuperAdmin?: boolean;
    };
    if (u.isSuperAdmin && !u.organizationId) {
      redirect("/admin/organizations");
    }
    if (u.organizationId) {
      // Conferir se o onboarding ja foi concluido pra decidir rota.
      const { prismaBase } = await import("@/lib/prisma-base");
      const org = await prismaBase.organization.findUnique({
        where: { id: u.organizationId },
        select: { onboardingCompletedAt: true },
      });
      if (org && !org.onboardingCompletedAt) {
        redirect("/onboarding");
      }
      redirect("/dashboard");
    }
  }

  return <LandingClient />;
}
