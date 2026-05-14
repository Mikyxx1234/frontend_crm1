import { redirect } from "next/navigation";

import { auth } from "@/lib/auth-public";
import OnboardingWizard from "./wizard";

/**
 * Wizard de onboarding self-service.
 *
 * No frontend separado a página é SSR mas NÃO consulta o banco — só
 * valida session via JWT. Os dados iniciais da org são buscados pelo
 * próprio wizard (client-side) via `GET /api/organization` (rewrite
 * pro backend). Isso evita duplicar a lógica de DB e mantém o frontend
 * sem dependência de Prisma.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const u = session.user as {
    id: string;
    organizationId?: string | null;
    isSuperAdmin?: boolean;
  };

  if (!u.organizationId) {
    if (u.isSuperAdmin) redirect("/admin/organizations");
    redirect("/");
  }

  return <OnboardingWizard initialOrganization={null} />;
}
