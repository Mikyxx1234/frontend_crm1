"use client";

import { IconBuilding } from "@tabler/icons-react";

import { OrgUnitsPage } from "@/features/org-units/org-units-page";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function UnidadesClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Unidades"
      description="Filiais / CNPJs. Base para preços por unidade (ofertas) e alocações de cota."
      icon={<IconBuilding size={22} />}
    >
      <OrgUnitsPage />
    </SettingsV2Shell>
  );
}
