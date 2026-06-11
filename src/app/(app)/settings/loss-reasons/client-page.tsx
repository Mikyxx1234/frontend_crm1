"use client";

import { IconThumbDown } from "@tabler/icons-react";

import OldLossReasonsPage from "@/app/old/settings/loss-reasons/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function LossReasonsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Motivos de perda"
      description="Razões padrão para marcar negócios como perdidos"
      icon={<IconThumbDown size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <OldLossReasonsPage />
      </div>
    </SettingsV2Shell>
  );
}
