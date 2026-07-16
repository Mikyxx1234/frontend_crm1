"use client";

import { useState } from "react";
import { IconPhone as Phone } from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { TabsGlass } from "@/components/crm/tabs-glass";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";
import { Api4ComConnectForm } from "@/features/softphone/components/api4com-connect-form";
import { ExtensionSettingsForm } from "@/features/softphone/components/extension-settings-form";
import { ProviderConfigForm } from "@/features/softphone/components/provider-config-form";

const MAIN_TABS = ["Meu Ramal", "Provedor / Webhook"] as const;
const RAMAL_TABS = ["Api4Com", "PBX genérico (avançado)"] as const;

export default function SoftphoneSettingsClientPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [ramalMode, setRamalMode] = useState(0);

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Softphone"
      description="Chamadas no navegador — tudo dentro do CRM"
      icon={<Phone size={22} />}
      center={
        <TabsGlass
          tabs={[...MAIN_TABS]}
          activeTab={activeTab}
          onChange={setActiveTab}
          scrollable
        />
      }
    >
      {activeTab === 0 && (
        <div className="flex min-w-0 w-full max-w-full flex-col gap-3 sm:gap-6">
          <TabsGlass
            tabs={[...RAMAL_TABS]}
            activeTab={ramalMode}
            onChange={setRamalMode}
            scrollable
          />

          <GlassCard variant="panel" className="min-w-0 overflow-hidden p-3 sm:p-5">
            {ramalMode === 0 && <Api4ComConnectForm />}

            {ramalMode === 1 && (
              <div className="flex flex-col gap-4">
                <p className="font-body text-[13px] text-[var(--text-muted)]">
                  Para qualquer PBX com WebSocket SIP (Asterisk, FreePBX, etc.).
                  Informe manualmente wss://, ramal e senha SIP.
                </p>
                <ExtensionSettingsForm />
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 1 && (
        <div className="flex min-w-0 w-full max-w-full flex-col gap-3 sm:gap-6">
          <GlassCard variant="panel" className="min-w-0 overflow-hidden p-3 sm:p-5">
            <p className="mb-4 font-body text-[13px] text-[var(--text-muted)]">
              Configure o webhook para o histórico de chamadas. Para Api4Com,
              escolha o provedor <strong>Api4Com</strong> e cole a URL gerada no
              painel de integrações da Api4Com (webhook{" "}
              <code className="text-[11px]">channel-hangup</code>).
            </p>
            <ProviderConfigForm />
          </GlassCard>
        </div>
      )}
    </SettingsV2Shell>
  );
}
