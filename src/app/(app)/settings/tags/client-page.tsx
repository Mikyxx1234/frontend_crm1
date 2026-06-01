"use client";

import OldTagsPage from "@/app/old/settings/tags/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function TagsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Tags"
      description="Etiquetas de classificação para contatos e negócios"
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 backdrop-blur-md">
        <OldTagsPage />
      </div>
    </SettingsV2Shell>
  );
}
