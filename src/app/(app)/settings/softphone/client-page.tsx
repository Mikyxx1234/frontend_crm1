"use client";

import { useState } from "react";
import {
  IconPhone as Phone,
  IconPhoneCheck,
  IconKey,
  IconWebhook,
  IconCloud,
  IconServer,
} from "@tabler/icons-react";

import { GlassCard } from "@/components/crm/glass-card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";
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

/** Card selecionável do seletor de tipo de ramal (Api4Com / PBX). */
function TypeSelectCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
        active
          ? "border-[var(--brand-primary)] bg-[var(--color-enterprise-bg)]"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] hover:border-[var(--input-border-focus)]",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors",
          active
            ? "bg-[var(--brand-primary)] text-white"
            : "border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] text-[var(--text-muted)]",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-bold text-[var(--text-primary)]">
          {title}
        </div>
        <div className="mt-0.5 text-pretty break-words text-[12px] text-[var(--text-muted)]">
          {description}
        </div>
      </div>
    </button>
  );
}

export default function SoftphoneSettingsClientPage() {
  const [ramalType, setRamalType] = useState<RamalType>("api4com");

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Telefonia VoIP"
      description="Chamadas no navegador — tudo dentro do CRM"
      icon={<Phone size={22} />}
    >
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
          description="Escolha o tipo de conexão e informe as credenciais do seu ramal."
        >
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row">
              <TypeSelectCard
                active={ramalType === "api4com"}
                onClick={() => setRamalType("api4com")}
                icon={<IconCloud size={20} />}
                title="Api4Com"
                description="Conexão gerenciada, pronta para usar."
              />
              <TypeSelectCard
                active={ramalType === "pbx"}
                onClick={() => setRamalType("pbx")}
                icon={<IconServer size={20} />}
                title="PBX genérico (avançado)"
                description="WebSocket SIP: Asterisk, FreePBX, etc."
              />
            </div>

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
    </SettingsV2Shell>
  );
}
