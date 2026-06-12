"use client";

import { IconBell } from "@tabler/icons-react";

import OldNotificationsPage from "@/app/old/settings/notifications/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function NotificationsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Notificações"
      description="Push, e-mail e alertas por canal"
      icon={<IconBell size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <OldNotificationsPage />
      </div>
    </SettingsV2Shell>
  );
}
