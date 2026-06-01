"use client";

import OldChannelsPage from "@/app/old/settings/channels/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function ChannelsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Canais"
      description="WhatsApp, Instagram, Facebook e demais canais conectados"
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 backdrop-blur-md">
        <OldChannelsPage />
      </div>
    </SettingsV2Shell>
  );
}
