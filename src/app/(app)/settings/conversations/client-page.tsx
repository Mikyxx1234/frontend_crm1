"use client";

import * as React from "react";
import { IconMessageCircle } from "@tabler/icons-react";

import { useUserRole } from "@/hooks/use-user-role";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { SettingsV2Shell, SETTINGS_HUB_BACK } from "../_v2-shell";
import { ConversationsConfigTab } from "@/features/conversations-settings/components/ConversationsConfigTab";
import { DepartmentsTab } from "@/features/conversations-settings/components/DepartmentsTab";
import { AgentsTab } from "@/features/conversations-settings/components/AgentsTab";
const TABS = [
  { id: "configuracoes", label: "Configurações" },
  { id: "departamentos", label: "Departamentos" },
  { id: "atendentes", label: "Atendentes" },
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
      description="Departamentos, atendentes e permissões"
      icon={<IconMessageCircle size={22} />}
    >
      {/* Inner tab navigation */}
      <div className="toolbar-hscroll max-w-full min-w-0">
        <div className="inline-flex w-max flex-nowrap gap-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "shrink-0 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[13px] font-semibold transition-colors sm:px-4 sm:py-2",
                activeTab === tab.id
                  ? "bg-white text-[var(--text-primary)] shadow-sm dark:bg-[var(--glass-bg-strong)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1">
        {activeTab === "configuracoes" && <ConversationsConfigTab />}
        {activeTab === "departamentos" && <DepartmentsTab />}
        {activeTab === "atendentes" && <AgentsTab />}
      </div>
    </SettingsV2Shell>
  );
}
