"use client";

import { IconDeviceMobile } from "@tabler/icons-react";

import { MobileLayoutClientPage as OldMobileLayoutPage } from "@/features/legacy-v1/settings/mobile-layout";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function MobileLayoutV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="App Mobile"
      description="Barra inferior do PWA"
      icon={<IconDeviceMobile size={22} />}
    >
      <OldMobileLayoutPage />
    </SettingsV2Shell>
  );
}

