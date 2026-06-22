"use client";

import { IconSparkles } from "@tabler/icons-react";

import OldAiSettingsPage from "@/features/legacy-v1/settings/ai";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function AiSettingsClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="IA"
      description="Chave da OpenAI e configuração dos agentes"
      icon={<IconSparkles size={22} />}
    >
      <OldAiSettingsPage />
    </SettingsV2Shell>
  );
}
