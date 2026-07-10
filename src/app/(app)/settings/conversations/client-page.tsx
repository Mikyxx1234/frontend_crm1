"use client";

import * as React from "react";
import { IconMessageCircle } from "@tabler/icons-react";

import { useUserRole } from "@/hooks/use-user-role";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { SettingsV2Shell, SETTINGS_HUB_BACK } from "../_v2-shell";
import { ConversationsConfigTab } from "@/features/conversations-settings/components/ConversationsConfigTab";
import { DepartmentsTab } from "@/features/conversations-settings/components/DepartmentsTab";
import { AgentsTab } from "@/features/conversations-settings/components/AgentsTab";
import { QuickMessagesTab } from "@/features/conversations-settings/components/QuickMessagesTab";

const TABS = [
  { id: "configuracoes", label: "Configurações" },
  { id: "departamentos", label: "Departamentos" },
  { id: "atendentes", label: "Atendentes" },
  { id: "mensagens-rapidas", label: "Mensagens rápidas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ConversationsSettingsClientPage() {
  const { role, isSuperAdmin, ready } = useUserRole();
  const isOrgAdmin = isSuperAdmin || role === "ADMIN";

  const [activeTab, setActiveTab] = React.useState<TabId>("configuracoes");

  if (ready && !isOrgAdmin) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="As configurações de conversas são gerenciadas apenas por administradores da organização."
      />
    );
  }

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Conversas"
      description="Departamentos, atendentes, permissões e mensagens rápidas"
      icon={<IconMessageCircle size={22} />}
    >
      {/* Inner tab navigation */}
      <div className="flex gap-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex-1 rounded-[var(--radius-md)] px-4 py-2 font-display text-[13px] font-semibold transition-colors",
              activeTab === tab.id
                ? "bg-white text-[var(--text-primary)] shadow-sm dark:bg-[var(--glass-bg-strong)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1">
        {activeTab === "configuracoes" && <ConversationsConfigTab />}
        {activeTab === "departamentos" && <DepartmentsTab />}
        {activeTab === "atendentes" && <AgentsTab />}
        {activeTab === "mensagens-rapidas" && <QuickMessagesTab />}
      </div>
    </SettingsV2Shell>
  );
}
