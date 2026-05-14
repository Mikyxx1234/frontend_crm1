import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prismaBase } from "@/lib/prisma-base";
import OnboardingWizard from "./wizard";

/**
 * Wizard de onboarding self-service. Diferente do fluxo antigo de
 * convite-por-token, agora ele depende EXCLUSIVAMENTE da session —
 * o user foi criado em /api/signup e ja esta logado. Se o onboarding
 * ja foi concluido antes, volta pro dashboard.
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
    // Super-admin EduIT ou estado invalido — manda pro painel ou pra raiz.
    if (u.isSuperAdmin) redirect("/admin/organizations");
    redirect("/");
  }

  const org = await prismaBase.organization.findUnique({
    where: { id: u.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      size: true,
      phone: true,
      logoUrl: true,
      primaryColor: true,
      onboardingCompletedAt: true,
    },
  });

  if (!org) redirect("/");
  if (org.onboardingCompletedAt) redirect("/dashboard");

  return (
    <OnboardingWizard
      initialOrganization={{
        id: org.id,
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        size: org.size,
        phone: org.phone,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
      }}
    />
  );
}
