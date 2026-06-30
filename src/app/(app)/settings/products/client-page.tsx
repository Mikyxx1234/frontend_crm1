"use client";

import { IconPackage } from "@tabler/icons-react";

import { ProductsV2Page } from "@/features/products-v2/products-page";
import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

export default function ProductsV2ClientPage() {
  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Produtos"
      description="Catálogo multi-tipo: físico, serviço, curso e vaga"
      icon={<IconPackage size={22} />}
    >
      <ProductsV2Page />
    </SettingsV2Shell>
  );
}
