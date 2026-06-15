"use client";

import { IconDeviceMobile } from "@tabler/icons-react";

import { MobileLayoutClientPage as OldMobileLayoutPage } from "@/app/old/settings/mobile-layout/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function MobileLayoutV2ClientPage() {
  return (
    <SettingsV2Shell
      title="App Mobile"
      description="Barra inferior do PWA"
      icon={<IconDeviceMobile size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <OldMobileLayoutPage />
      </div>
    </SettingsV2Shell>
  );
}
