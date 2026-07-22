"use client";

import { IconLifebuoy } from "@tabler/icons-react";

import { SupportConsole } from "@/features/support/support-console";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function SupportClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Suporte"
      description="Chat interno com o time de suporte"
      icon={<IconLifebuoy size={22} />}
    >
      <SupportConsole />
    </SettingsV2Shell>
  );
}
