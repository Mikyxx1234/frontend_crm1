"use client";

import { IconArrowsShuffle } from "@tabler/icons-react";

import OldDistributionPage from "@/app/old/settings/distribution/client-page";
import { SettingsV2Shell } from "../_v2-shell";

/**
 * Fase 1c (migração v1→v2): rota canônica `/settings/distribution` dentro do
 * shell v2. Reusa o `client-page` v1 (que já consome `features/distribution`
 * api/hooks/types — sem duplicação de dados). A reskin visual entra na
 * Fase 5/6.
 */
export default function DistributionV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Distribuição"
      description="Round-robin, priorização e regras de atribuição"
      icon={<IconArrowsShuffle size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <OldDistributionPage />
      </div>
    </SettingsV2Shell>
  );
}
