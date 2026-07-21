"use client";

/**
 * Painel de configuração de Telefonia IP — reutilizado tanto pelo drawer
 * de configuração do widget na Central (`/widgets`) quanto por qualquer
 * outra superfície que precise expor as mesmas configs.
 *
 * O corpo é o mesmo antes usado em `/settings/softphone`. Quando renderizado
 * fora do `SettingsV2Shell` (drawer, modal), `useSettingsHeaderSlots()`
 * retorna null e o componente cai no fallback inline com as pills
 * Api4Com/PBX no topo, mantendo a UX equivalente.
 */

import { useEffect, useMemo, useState } from "react";
import {
  IconCloud,
  IconKey,
  IconPhoneCheck,
  IconServer,
  IconWebhook,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { PageSegmentedControl } from "@/components/crm/page-toolbar";
import { Separator } from "@/components/ui/separator";
import {
  Api4ComConnectForm,
  Api4ComStatusCard,
} from "@/features/softphone/components/api4com-connect-form";
import { ExtensionSettingsForm } from "@/features/softphone/components/extension-settings-form";
import { ProviderConfigForm } from "@/features/softphone/components/provider-config-form";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";

type RamalType = "api4com" | "pbx";

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard variant="panel" className="min-w-0 overflow-hidden">
      <div className="flex min-w-0 items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="mt-0.5 text-pretty break-words text-[12.5px] text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <Separator className="bg-[var(--glass-border-subtle)]" />
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </GlassCard>
  );
}

export function SoftphoneConfig() {
  const slots = useSettingsHeaderSlots();
  const [ramalType, setRamalType] = useState<RamalType>("api4com");

  const actionsNode = useMemo(
    () => (
      <PageSegmentedControl
        items={[
          {
            value: "api4com",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <IconCloud size={14} /> Api4Com
              </span>
            ),
          },
          {
            value: "pbx",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <IconServer size={14} /> PBX
              </span>
            ),
          },
        ]}
        value={ramalType}
        onChange={(v) => setRamalType(v as RamalType)}
        size="compact"
        aria-label="Tipo de ramal"
      />
    ),
    [ramalType],
  );

  useEffect(() => {
    if (!slots) return;
    slots.setActions(actionsNode);
    return () => slots.setActions(null);
  }, [slots, actionsNode]);

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-3 sm:gap-4">
      <SectionCard
        icon={<IconPhoneCheck size={18} />}
        title="Status da conexão"
        description="Situação atual do seu ramal e do registro de chamadas."
      >
        <Api4ComStatusCard onReconnect={() => setRamalType("api4com")} />
      </SectionCard>

      <SectionCard
        icon={<IconKey size={18} />}
        title="Configuração do ramal"
        description="Escolha o tipo de conexão (nas pills do topo) e informe as credenciais do seu ramal."
      >
        <div className="flex min-w-0 flex-col gap-4">
          {!slots ? (
            <PageSegmentedControl
              items={[
                {
                  value: "api4com",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <IconCloud size={14} /> Api4Com
                    </span>
                  ),
                },
                {
                  value: "pbx",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <IconServer size={14} /> PBX
                    </span>
                  ),
                },
              ]}
              value={ramalType}
              onChange={(v) => setRamalType(v as RamalType)}
              size="compact"
              aria-label="Tipo de ramal"
              className="self-start"
            />
          ) : null}

          <p className="rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)] px-3.5 py-2.5 text-pretty break-words text-[12.5px] text-[var(--text-muted)]">
            {ramalType === "api4com"
              ? "Conexão gerenciada Api4Com. Informe e-mail e senha — o CRM detecta o ramal vinculado e configura o webhook automaticamente."
              : "Para qualquer PBX com WebSocket SIP (Asterisk, FreePBX, etc.). Informe manualmente wss://, ramal e senha SIP."}
          </p>

          {ramalType === "api4com" ? <Api4ComConnectForm /> : <ExtensionSettingsForm />}
        </div>
      </SectionCard>

      <SectionCard
        icon={<IconWebhook size={18} />}
        title="Provedor / Webhook"
        description="Configuração de webhook para o histórico de chamadas (nível organização). Para Api4Com, cole a URL gerada no painel de integrações (evento channel-hangup)."
      >
        <ProviderConfigForm />
      </SectionCard>
    </div>
  );
}

export default SoftphoneConfig;
