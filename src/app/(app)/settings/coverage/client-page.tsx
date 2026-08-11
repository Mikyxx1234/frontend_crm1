"use client";

import { IconCalendarTime } from "@tabler/icons-react";

import { CoverageBoard } from "@/features/settings/coverage/coverage-board";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function CoverageV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Cobertura"
      description="Grade de expedientes e gaps de cobertura por área"
      icon={<IconCalendarTime size={22} />}
    >
      <CoverageBoard />
    </SettingsV2Shell>
  );
}
