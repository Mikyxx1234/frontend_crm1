"use client";

import { IconArrowsShuffle } from "@tabler/icons-react";

import OldDistributionPage from "@/features/legacy-v1/settings/distribution";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useUserRole } from "@/hooks/use-user-role";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

/**
 * Fase 1c (migração v1→v2): rota canônica `/settings/distribution` dentro do
 * shell v2. Reusa o `client-page` v1 (que já consome `features/distribution`
 * api/hooks/types — sem duplicação de dados). A reskin visual entra na
 * Fase 5/6.
 *
 * Gate de acesso (defense-in-depth): alem do filtro de visibilidade na
 * sidebar (settings-nav.ts), bloqueamos render direto via URL. Requer
 * `distribution:manage` OU role ADMIN/MANAGER legado. Sem isso, mostra
 * RestrictedScreen — evita que MEMBER com role custom mal-configurada veja
 * a tela apenas digitando a rota.
 */
export default function DistributionV2ClientPage() {
  const { ready, isManagerUp } = useUserRole();
  const { data: perms, isLoading: permsLoading } = useMyPermissions();

  const canManage =
    isManagerUp ||
    (perms?.permissions?.includes("*") ?? false) ||
    (perms?.permissions?.includes("distribution:manage") ?? false);

  if (!ready || permsLoading) return null;
  if (!canManage) {
    return (
      <RestrictedScreen
        title="Distribuição"
        description="Você não tem permissão para gerenciar a distribuição de leads."
      />
    );
  }

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Distribuição"
      description="Round-robin, priorização e regras de atribuição"
      icon={<IconArrowsShuffle size={22} />}
    >
      <OldDistributionPage />
    </SettingsV2Shell>
  );
}

