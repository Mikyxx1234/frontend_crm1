"use client";

import { IconClock } from "@tabler/icons-react";

import OldSchedulesPage from "@/features/legacy-v1/settings/schedules";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function SchedulesV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Horários e disponibilidade"
      description="Expediente e status dos agentes"
      icon={<IconClock size={22} />}
    >
      <OldSchedulesPage />
    </SettingsV2Shell>
  );
}

