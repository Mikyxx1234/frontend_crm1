"use client";

import OldProfilePage from "@/features/legacy-v1/settings/profile";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function ProfileV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Perfil"
      description="Dados pessoais e tokens de acesso"
    >
      <OldProfilePage />
    </SettingsV2Shell>
  );
}
