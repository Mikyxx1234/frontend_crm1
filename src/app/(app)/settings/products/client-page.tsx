"use client";

import { IconPackage } from "@tabler/icons-react";

import { ProductsV2Page } from "@/features/products-v2/products-page";
import { SettingsV2Shell } from "../_v2-shell";

/**
 * Produtos v2 (multi-tipo): catálogo com seletor de tipo (Físico, Serviço,
 * Curso, Vaga), ofertas por unidade, stakeholders e painel de alocação/estoque.
 * Tudo aditivo sobre os contratos `/api/products*` existentes.
 */
export default function ProductsV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Produtos"
      description="Catálogo multi-tipo: físico, serviço, curso e vaga"
      icon={<IconPackage size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <ProductsV2Page />
      </div>
    </SettingsV2Shell>
  );
}
