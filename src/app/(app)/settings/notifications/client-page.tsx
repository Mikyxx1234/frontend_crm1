"use client";

import { IconBell } from "@tabler/icons-react";

import OldNotificationsPage from "@/features/legacy-v1/settings/notifications";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function NotificationsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Notificações"
      description="Push, e-mail e alertas por canal"
      icon={<IconBell size={22} />}
    >
      <OldNotificationsPage />
    </SettingsV2Shell>
  );
}
