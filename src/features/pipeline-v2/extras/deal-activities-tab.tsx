"use client";

/*
 * Placeholder enxuto para a tab "Atividades" do DealDetailPanel.
 * Nao ha endpoint dedicado de atividades ainda — esse stub deixa
 * claro o estado e evita parecer um bug ao usuario.
 */

import { IconChecklist } from "@tabler/icons-react";

export function DealActivitiesTab() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-5.5 text-center text-[var(--text-muted,#718096)]">
      <IconChecklist size={36} className="opacity-40" />
      <div className="font-display text-[13px] font-semibold">
        Tarefas em breve
      </div>
      <p className="max-w-xs text-[12px]">
        Agendamentos, ligacoes e tarefas vinculadas a este negocio
        apareceram aqui em breve.
      </p>
    </div>
  );
}
