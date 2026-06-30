"use client";

import { IconBoxMultiple } from "@tabler/icons-react";

import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useUserRole } from "@/hooks/use-user-role";
import { CatalogsManager } from "@/features/catalogs-v2/catalogs-page";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export function CatalogsSettingsClientPage() {
  const { role, isSuperAdmin, ready } = useUserRole();
  const canManage = isSuperAdmin || role === "ADMIN" || role === "MANAGER";

  if (ready && !canManage) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="Catálogos são gerenciados por administradores e gestores."
      />
    );
  }

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Catálogos"
      description="Catálogo Universal por Capacidades — monte catálogos por perguntas de negócio"
      icon={<IconBoxMultiple size={22} />}
    >
      <CatalogsManager />
    </SettingsV2Shell>
  );
}
