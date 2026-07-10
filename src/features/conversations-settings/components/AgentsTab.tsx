"use client";

import { IconUser } from "@tabler/icons-react";
import { GlassCard } from "@/components/crm/glass-card";

// TODO: Full AgentsTab implementation (future task)
export function AgentsTab() {
  return (
    <GlassCard variant="panel" className="flex flex-col items-center gap-3 py-16 text-center">
      <IconUser size={36} className="text-[var(--text-muted)] opacity-40" />
      <p className="font-display text-sm font-semibold text-[var(--text-muted)]">
        Gerenciamento de atendentes
      </p>
      <p className="max-w-xs font-body text-[12.5px] text-[var(--text-muted)]">
        Em breve: adicione e gerencie atendentes da organização nesta seção.
      </p>
    </GlassCard>
  );
}
