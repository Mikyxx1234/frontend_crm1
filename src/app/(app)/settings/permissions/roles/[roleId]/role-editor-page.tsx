"use client";

import { useRouter } from "next/navigation";
import { IconShieldCheck } from "@tabler/icons-react";

import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { RoleEditor } from "@/features/permissions/role-editor";
import { useUserRole } from "@/hooks/use-user-role";

import { SettingsV2Shell } from "../../../_v2-shell";

const PERMISSIONS_HREF = "/settings/permissions";

/**
 * Wrapper client da página de role. Reaproveita o `RoleEditor` (mesmo
 * componente que rodava no Sheet), agora em largura total. Navegação de
 * fechar/salvar/excluir volta para a lista de permissões.
 */
export function RoleEditorPage({ roleId }: { roleId: string }) {
  const router = useRouter();
  const { role, isSuperAdmin, ready } = useUserRole();

  const isNew = roleId === "new";
  const isOrgAdmin = isSuperAdmin || role === "ADMIN";

  if (ready && !isOrgAdmin) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="Permissões e roles são gerenciados apenas por administradores da organização."
      />
    );
  }

  const back = () => router.push(PERMISSIONS_HREF);

  return (
    <SettingsV2Shell
      title={isNew ? "Nova regra" : "Editar regra"}
      description="Permissões e controle de acesso"
      icon={<IconShieldCheck size={22} />}
      backHref={PERMISSIONS_HREF}
      backLabel="Voltar para permissões"
    >
      <div className="w-full">
        <RoleEditor roleId={isNew ? null : roleId} onClose={back} onSaved={back} />
      </div>
    </SettingsV2Shell>
  );
}
