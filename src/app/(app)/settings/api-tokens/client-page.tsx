"use client";

import { IconKey } from "@tabler/icons-react";

import OldApiTokensPage from "@/app/old/settings/api-tokens/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function ApiTokensV2ClientPage() {
  return (
    <SettingsV2Shell
      title="API e Webhooks"
      description="Tokens de integração e eventos"
      icon={<IconKey size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <OldApiTokensPage />
      </div>
    </SettingsV2Shell>
  );
}
