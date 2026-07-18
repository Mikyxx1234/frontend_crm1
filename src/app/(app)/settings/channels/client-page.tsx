"use client";

import { IconAntenna } from "@tabler/icons-react";

import OldChannelsPage from "@/features/legacy-v1/settings/channels";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function ChannelsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Canais"
      description="WhatsApp, Instagram, Facebook e demais canais conectados"
      icon={<IconAntenna size={22} />}
    >
      <OldChannelsPage hideToolbar />
    </SettingsV2Shell>
  );
}
