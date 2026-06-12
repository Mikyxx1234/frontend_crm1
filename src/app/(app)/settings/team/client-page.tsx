"use client";

import OldTeamPage from "@/app/old/settings/team/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function TeamV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Equipe"
      description="Usuários, convites e permissões CRM"
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <OldTeamPage />
      </div>
    </SettingsV2Shell>
  );
}
