"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconPhone as Phone,
  IconPhoneCheck,
  IconKey,
  IconWebhook,
  IconCloud,
  IconServer,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { PageSegmentedControl } from "@/components/crm/page-toolbar";
import { Separator } from "@/components/ui/separator";
import {
  SETTINGS_HUB_BACK,
  SettingsV2Shell,
  useSettingsHeaderSlots,
} from "../_v2-shell";
import {
  Api4ComConnectForm,
  Api4ComStatusCard,
} from "@/features/softphone/components/api4com-connect-form";
import { ExtensionSettingsForm } from "@/features/softphone/components/extension-settings-form";
import { ProviderConfigForm } from "@/features/softphone/components/provider-config-form";

type RamalType = "api4com" | "pbx";

/** Card de seção: badge de ícone + título + descrição, hairline, conteúdo. */
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

export default function SoftphoneSettingsClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Telefonia IP"
      description="Chamadas no navegador — tudo dentro do CRM"
      icon={<Phone size={22} />}
    >
      <SoftphoneBody />
    </SettingsV2Shell>
  );
}

function SoftphoneBody() {
  const slots = useSettingsHeaderSlots();
  const [ramalType, setRamalType] = useState<RamalType>("api4com");

  // Pills de página (Api4Com / PBX) no slot de ações do PageHeader —
  // controlam qual formulário de configuração é exibido.
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
          {/* Fallback do seletor quando fora do shell (sem slots de header). */}
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
