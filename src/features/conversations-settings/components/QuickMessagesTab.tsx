"use client";

import { IconBolt } from "@tabler/icons-react";
import { GlassCard } from "@/components/crm/glass-card";

// TODO: Full QuickMessagesTab implementation (future task)
export function QuickMessagesTab() {
  return (
    <GlassCard variant="panel" className="flex flex-col items-center gap-3 py-16 text-center">
      <IconBolt size={36} className="text-[var(--text-muted)] opacity-40" />
      <p className="font-display text-sm font-semibold text-[var(--text-muted)]">
        Mensagens rápidas
      </p>
      <p className="max-w-xs font-body text-[12.5px] text-[var(--text-muted)]">
        Em breve: crie atalhos de texto para responder conversas mais rapidamente.
      </p>
    </GlassCard>
  );
}
