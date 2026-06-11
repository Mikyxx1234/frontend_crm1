"use client";

import { IconPackage } from "@tabler/icons-react";

import OldProductsPage from "@/app/old/settings/products/client-page";
import { SettingsV2Shell } from "../_v2-shell";

/**
 * Fase 1a (migração v1→v2): roteamento canônico de Produtos sob `(app)/settings/products`
 * dentro do shell v2 (NavRailV2 + PageHeader + glass tokens).
 *
 * Estratégia híbrida (igual a Tags/Channels/Team/Profile): mantemos o
 * `client-page` da v1 como filho, garantindo paridade de comportamento com zero
 * regressão funcional enquanto a navegação e o cromo passam a viver no v2.
 * A reimplementação visual via V0 entra na Fase 5/6 quando desibridarmos.
 */
export default function ProductsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Produtos"
      description="Catálogo de produtos e serviços usados nos negócios"
      icon={<IconPackage size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <OldProductsPage />
      </div>
    </SettingsV2Shell>
  );
}
