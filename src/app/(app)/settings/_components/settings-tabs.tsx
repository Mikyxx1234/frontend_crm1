"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type SettingsTab = {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
};

/**
 * Barra de abas para sub-páginas de settings que agregam várias seções
 * (ex.: Produtos → Catálogo/Produtos/Cotas; Segurança → flags/API/Permissões).
 *
 * Fica no topo do corpo do `SettingsV2Shell` (não no slot `center`, que é
 * usado pelas features filhas para injetar busca/ações). Sticky para
 * permanecer visível ao rolar.
 */
export function SettingsTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: SettingsTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 -mx-1 mb-1 flex shrink-0 gap-1 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1 backdrop-blur-md [-webkit-overflow-scrolling:touch]",
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const on = active === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[12.5px] font-bold transition-colors",
              on
                ? "bg-[var(--brand-primary)] text-white shadow-[0_3px_10px_rgba(91,111,245,0.3)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]",
            )}
          >
            {Icon && <Icon size={14} className="shrink-0" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
