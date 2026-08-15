"use client";

/**
 * Painel de configuração de Telefonia IP — corpo do FormDialog em /widgets.
 *
 *  - Integração: token ADMIN + gateway + webhook da org
 *  - Usuários: ramal e toggle por pessoa
 *  - PBX: ramal SIP genérico (opcional)
 */

import { useEffect, useMemo, useState } from "react";
import { IconCloud, IconServer, IconUsers } from "@tabler/icons-react";

import { PageSegmentedControl } from "@/components/crm/page-toolbar";
import { Api4ComIntegrationForm } from "@/features/softphone/components/api4com-integration-form";
import { Api4ComUsersList } from "@/features/softphone/components/api4com-users-list";
import { ExtensionSettingsForm } from "@/features/softphone/components/extension-settings-form";
import { ProviderConfigForm } from "@/features/softphone/components/provider-config-form";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";

type ConfigTab = "integracao" | "usuarios" | "pbx";

const TABS = [
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
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

export function SoftphoneConfig() {
  const slots = useSettingsHeaderSlots();
  const [tab, setTab] = useState<ConfigTab>("integracao");

  const actionsNode = useMemo(
    () => (
      <PageSegmentedControl
        items={[...TABS]}
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
    <div className="flex min-w-0 w-full flex-col gap-5">
      {!slots ? (
        <PageSegmentedControl
          items={[...TABS]}
          value={tab}
          onChange={(v) => setTab(v as ConfigTab)}
          size="compact"
          aria-label="Seção de telefonia"
          className="self-start"
        />
      ) : null}

      {tab === "integracao" ? <Api4ComIntegrationForm /> : null}

      {tab === "usuarios" ? <Api4ComUsersList /> : null}

      {tab === "pbx" ? (
        <div className="flex flex-col gap-6">
          <div>
            <SectionLabel>Ramal SIP</SectionLabel>
            <ExtensionSettingsForm />
          </div>
          <div>
            <SectionLabel>Webhook do PBX</SectionLabel>
            <ProviderConfigForm />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SoftphoneConfig;
