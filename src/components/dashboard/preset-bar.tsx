"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { IconActivity as Activity, IconBriefcase2 as BriefcaseBusiness, IconHeadphones as Headphones, IconLayoutDashboard as LayoutDashboard, IconDeviceDesktop as Monitor, IconUsers as Users } from "@tabler/icons-react";

import {
  DASHBOARD_PRESETS,
  useDashboardStore,
  type DashboardPresetId,
} from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

/**
 * Seletor de preset. Aplicar um preset troca o conjunto de widgets
 * visíveis + layout. Mudanças subsequentes do usuário marcam o preset
 * como "custom" (indicado com um rótulo à direita). Clicar no mesmo
 * preset novamente re-aplica (função "reset parcial" por contexto).
 */
type PresetId = Exclude<DashboardPresetId, "custom">;

const PRESET_ICONS: Record<PresetId, typeof LayoutDashboard> = {
  default: LayoutDashboard,
  comercial: BriefcaseBusiness,
  atendimento: Headphones,
  equipe: Users,
  monitor: Monitor,
};

const PRESETS_ORDER: PresetId[] = ["default", "comercial", "atendimento", "equipe", "monitor"];

export function PresetBar() {
  const preset = useDashboardStore((s) => s.preset);
  const applyPreset = useDashboardStore((s) => s.applyPreset);

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <div className="flex shrink-0 items-center rounded-xl border border-border/60 bg-card p-1 shadow-sm">
        {PRESETS_ORDER.map((p) => {
          const def = DASHBOARD_PRESETS[p];
          const Icon = PRESET_ICONS[p];
          const active = preset === p;
          return (
            <TooltipGlass key={p} label={def.description} side="bottom">
            <button
              type="button"
              onClick={() => applyPreset(p)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="preset-active-bg"
                  className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="relative size-3.5" />
              <span className="relative">{def.label}</span>
            </button>
            </TooltipGlass>
          );
        })}
      </div>

      {preset === "custom" && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-[var(--color-warning)]/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-warn)]">
          <Activity className="size-3" /> Personalizado
        </span>
      )}
    </div>
  );
}
