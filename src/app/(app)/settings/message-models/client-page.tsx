"use client";

import { IconTemplate } from "@tabler/icons-react";

import OldMessageModelsPage from "@/app/old/settings/message-models/client-page";
import { SettingsV2Shell } from "../_v2-shell";

/**
 * Fase 1d (migração v1→v2): rota canônica `/settings/message-models` no shell
 * v2. Engloba modelos internos, WhatsApp WABA e Flows (Kommo). A
 * reimplementação visual entra na Fase 5/6.
 */
export default function MessageModelsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Modelos de mensagem"
      description="Internos, WhatsApp WABA e Flows (Kommo)"
      icon={<IconTemplate size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <OldMessageModelsPage />
      </div>
    </SettingsV2Shell>
  );
}
