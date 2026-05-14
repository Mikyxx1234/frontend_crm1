import { redirect } from "next/navigation";

import { auth } from "@/lib/auth-public";
import { LandingClient } from "./landing-client";

/**
 * Raiz pública. No frontend separado decidimos só com a session (JWT):
 *  - Não logado: mostra a landing com form de signup. Submit chama
 *    `/api/signup` (rewrite pro backend), que cria organization + user
 *    ADMIN, faz signIn, e o redirecionamento pro wizard fica no client.
 *  - Logado com organizationId: vai pro dashboard. O wizard de onboarding
 *    só é alcançado por link direto / signup flow — o checagem de
 *    `onboardingCompletedAt` fica no backend via `/api/organization`.
 *  - Logado sem organizationId mas super-admin: painel /admin.
 *
 * Diferença do monólito: aqui NÃO consultamos `prismaBase` server-side
 * porque o frontend não tem Prisma. O wizard de onboarding e o admin
 * fazem fetch via `/api/*` quando precisam de dados frescos.
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
      redirect("/dashboard");
    }
  }

  return <LandingClient />;
}
