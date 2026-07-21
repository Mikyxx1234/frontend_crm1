"use client";

import { IconTicket } from "@tabler/icons-react";

import { QuotasPage } from "@/features/quotas/quotas-page";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function CotasClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Cotas de desconto"
      description="Cupons com estoque, vigência e cumulatividade"
      icon={<IconTicket size={22} />}
    >
      <QuotasPage />
    </SettingsV2Shell>
  );
}
