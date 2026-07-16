"use client";

import { IconBuilding } from "@tabler/icons-react";

import { useUserRole } from "@/hooks/use-user-role";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { DepartmentsTab } from "@/features/conversations-settings/components/DepartmentsTab";

import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function DepartmentsClientPage() {
  const { role, isSuperAdmin, ready } = useUserRole();
  const canView = isSuperAdmin || role === "ADMIN" || role === "MANAGER";

  if (ready && !canView) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="Departamentos são gerenciados apenas por administradores e gerentes da organização."
      />
    );
  }

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Departamentos"
      description="Times de atendimento (comercial, suporte, financeiro…)"
      icon={<IconBuilding size={22} />}
    >
      <DepartmentsTab />
    </SettingsV2Shell>
  );
}
