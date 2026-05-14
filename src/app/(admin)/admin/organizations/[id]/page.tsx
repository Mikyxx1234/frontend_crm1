import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PageHeader } from "@/components/ui/page-header";
import { getOrganizationById } from "@/services/organizations";
import OrganizationDetailClient from "./organization-detail-client";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await getOrganizationById(id);
  if (!org) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para organizações
      </Link>

      <PageHeader
        icon={<Building2 />}
        eyebrow={org.slug}
        title={org.name}
        description={`Criada em ${format(org.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
      />

      <OrganizationDetailClient
        organization={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          industry: org.industry,
          size: org.size,
          phone: org.phone,
          onboardingCompletedAt: org.onboardingCompletedAt
            ? org.onboardingCompletedAt.toISOString()
            : null,
          counts: {
            users: org.users.length,
            contacts: org._count.contacts,
            deals: org._count.deals,
            pipelines: org._count.pipelines,
            channels: org._count.channels,
            conversations: org._count.conversations,
          },
          users: org.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isSuperAdmin: u.isSuperAdmin,
            type: u.type,
            isErased: u.isErased,
            createdAt: u.createdAt.toISOString(),
          })),
          invites: org.invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            token: i.token,
            expiresAt: i.expiresAt.toISOString(),
            createdAt: i.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
