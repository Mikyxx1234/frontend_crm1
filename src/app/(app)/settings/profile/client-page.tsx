"use client";

import OldProfilePage from "@/app/old/settings/profile/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function ProfileV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Perfil"
      description="Dados pessoais e tokens de acesso"
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 backdrop-blur-md">
        <OldProfilePage />
      </div>
    </SettingsV2Shell>
  );
}
