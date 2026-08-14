"use client";

/**
 * Painel de configuração de Telefonia IP — drawer da Central (`/widgets`).
 *
 * Guias:
 *  - Integração: token ADMIN + gateway + webhook da org
 *  - Usuários: quem está provisionado, ramal e toggle
 *  - PBX: ramal SIP manual (fallback)
 */

import { useEffect, useMemo, useState } from "react";
import {
  IconCloud,
  IconKey,
  IconServer,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { PageSegmentedControl } from "@/components/crm/page-toolbar";
import { Separator } from "@/components/ui/separator";
import { Api4ComConnectForm } from "@/features/softphone/components/api4com-connect-form";
import { Api4ComIntegrationForm } from "@/features/softphone/components/api4com-integration-form";
import { Api4ComUsersList } from "@/features/softphone/components/api4com-users-list";
import { ExtensionSettingsForm } from "@/features/softphone/components/extension-settings-form";
import { ProviderConfigForm } from "@/features/softphone/components/provider-config-form";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";

type ConfigTab = "integracao" | "usuarios" | "pbx";

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
  const [tab, setTab] = useState<ConfigTab>("integracao");

  const actionsNode = useMemo(
    () => (
      <PageSegmentedControl
        items={[
          {
            value: "integracao",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <IconCloud size={14} /> Integração
              </span>
            ),
          },
          {
            value: "usuarios",
            label: (
              <span className="inline-flex items-center gap-1.5">
                <IconUsers size={14} /> Usuários
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
        value={tab}
        onChange={(v) => setTab(v as ConfigTab)}
        size="compact"
        aria-label="Seção de telefonia"
      />
    ),
    [tab],
  );

  useEffect(() => {
    if (!slots) return;
    slots.setActions(actionsNode);
    return () => slots.setActions(null);
  }, [slots, actionsNode]);

  return (
    <div className="flex min-w-0 w-full max-w-full flex-col gap-3 sm:gap-4">
      {!slots ? (
        <PageSegmentedControl
          items={[
            {
              value: "integracao",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <IconCloud size={14} /> Integração
                </span>
              ),
            },
            {
              value: "usuarios",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <IconUsers size={14} /> Usuários
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
          value={tab}
          onChange={(v) => setTab(v as ConfigTab)}
          size="compact"
          aria-label="Seção de telefonia"
          className="self-start"
        />
      ) : null}

      {tab === "integracao" ? (
        <>
          <SectionCard
            icon={<IconKey size={18} />}
            title="Token e integração"
            description="Token ADMIN da API4Comm e gateway desta organização. O webhook é criado automaticamente para a org."
          >
            <Api4ComIntegrationForm />
          </SectionCard>
          <SectionCard
            icon={<IconCloud size={18} />}
            title="Conexão manual (opcional)"
            description="Fallback: conectar um ramal com e-mail e senha da API4Comm. O fluxo principal é o token acima + toggle em Usuários."
          >
            <Api4ComConnectForm />
          </SectionCard>
        </>
      ) : null}

      {tab === "usuarios" ? (
        <SectionCard
          icon={<IconUsers size={18} />}
          title="Usuários e ramais"
          description="Ative a telefonia por usuário. O CRM cria o agente e o ramal na API4Comm; desligar apaga os recursos remotos."
        >
          <Api4ComUsersList />
        </SectionCard>
      ) : null}

      {tab === "pbx" ? (
        <>
          <SectionCard
            icon={<IconServer size={18} />}
            title="Ramal SIP manual"
            description="Para qualquer PBX com WebSocket SIP (Asterisk, FreePBX, etc.). Informe wss://, ramal e senha."
          >
            <ExtensionSettingsForm />
          </SectionCard>
          <SectionCard
            icon={<IconWebhook size={18} />}
            title="Webhook do PBX"
            description="Provedor genérico para histórico de chamadas quando não usa API4Comm."
          >
            <ProviderConfigForm />
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

export default SoftphoneConfig;
