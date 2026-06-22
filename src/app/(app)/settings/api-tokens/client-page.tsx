"use client";

import { IconKey } from "@tabler/icons-react";

import OldApiTokensPage from "@/features/legacy-v1/settings/api-tokens";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function ApiTokensV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="API e Webhooks"
      description="Tokens de integração e eventos"
      icon={<IconKey size={22} />}
    >
      <OldApiTokensPage />
    </SettingsV2Shell>
  );
}
