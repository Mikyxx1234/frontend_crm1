"use client";

import { IconClock } from "@tabler/icons-react";

import OldSchedulesPage from "@/app/old/settings/schedules/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function SchedulesV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Horários e disponibilidade"
      description="Expediente e status dos agentes"
      icon={<IconClock size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <OldSchedulesPage />
      </div>
    </SettingsV2Shell>
  );
}
