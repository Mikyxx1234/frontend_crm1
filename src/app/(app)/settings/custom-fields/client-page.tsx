"use client";

import { IconForms } from "@tabler/icons-react";

import OldCustomFieldsPage from "@/features/legacy-v1/settings/custom-fields";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

/**
 * Fase 1b (migração v1→v2): rota canônica `/settings/custom-fields` dentro do
 * shell v2. A reimplementação visual com drag-and-drop dedicado entra na
 * Fase 5/6; aqui mantemos a paridade funcional reusando o `client-page` v1
 * (que já suporta reordenação via @hello-pangea/dnd).
 */
export default function CustomFieldsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Campos personalizados"
      description="Crie campos extras para contatos, empresas, negócios e produtos"
      icon={<IconForms size={22} />}
    >
      <OldCustomFieldsPage />
    </SettingsV2Shell>
  );
}

