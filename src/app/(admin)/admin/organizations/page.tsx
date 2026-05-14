import Link from "next/link";
import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { listOrganizations } from "@/services/organizations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_BADGE = {
  ACTIVE: { label: "Ativa", variant: "success" as const },
  SUSPENDED: { label: "Suspensa", variant: "warning" as const },
  ARCHIVED: { label: "Arquivada", variant: "secondary" as const },
};

export default async function AdminOrganizationsPage() {
  const organizations = await listOrganizations({});

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Building2 />}
        eyebrow="Plataforma"
        title="Organizações"
        description={`${organizations.length} empresa${organizations.length === 1 ? "" : "s"} cadastrada${organizations.length === 1 ? "" : "s"} no CRM.`}
      />

      {organizations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Nenhuma organização ainda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Empresas aparecem aqui assim que um cliente se cadastra em
            <Link href="/" className="mx-1 underline">
              /
            </Link>
            e completa o signup.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Organização</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Onboarding</th>
                <th className="px-4 py-3 text-right font-semibold">Usuários</th>
                <th className="px-4 py-3 text-right font-semibold">Contatos</th>
                <th className="px-4 py-3 text-left font-semibold">Criada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {organizations.map((org) => {
                const badge = STATUS_BADGE[org.status];
                return (
                  <tr key={org.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="flex flex-col"
                      >
                        <span className="font-semibold text-foreground">
                          {org.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {org.slug}
                          {org.industry ? ` · ${org.industry}` : ""}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {org.onboardingCompletedAt ? (
                        <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-0.5 text-success">
                          Concluído
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-0.5 text-warning">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {org.userCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {org.contactCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDistanceToNow(org.createdAt, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
