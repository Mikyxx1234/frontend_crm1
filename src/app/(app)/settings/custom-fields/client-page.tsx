"use client";

import { IconForms } from "@tabler/icons-react";

import OldCustomFieldsPage from "@/app/old/settings/custom-fields/client-page";
import { SettingsV2Shell } from "../_v2-shell";

/**
 * Fase 1b (migração v1→v2): rota canônica `/settings/custom-fields` dentro do
 * shell v2. A reimplementação visual com drag-and-drop dedicado entra na
 * Fase 5/6; aqui mantemos a paridade funcional reusando o `client-page` v1
 * (que já suporta reordenação via @hello-pangea/dnd).
 */
export default function CustomFieldsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Campos personalizados"
      description="Crie campos extras para contatos, empresas, negócios e produtos"
      icon={<IconForms size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <OldCustomFieldsPage />
      </div>
    </SettingsV2Shell>
  );
}
