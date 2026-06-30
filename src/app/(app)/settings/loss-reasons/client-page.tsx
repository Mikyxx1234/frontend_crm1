"use client";

import { IconThumbDown } from "@tabler/icons-react";

import OldLossReasonsPage from "@/features/legacy-v1/settings/loss-reasons";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function LossReasonsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Motivos de perda"
      description="Razões padrão para marcar negócios como perdidos"
      icon={<IconThumbDown size={22} />}
    >
      <OldLossReasonsPage />
    </SettingsV2Shell>
  );
}

