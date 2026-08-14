import type { CampaignStatus } from "./types";

export function DraftPlaceholder({ status }: { status?: CampaignStatus }) {
  const text =
    status === "SCHEDULED"
      ? "Aguardando disparo — métricas após o início do envio."
      : status === "CANCELLED"
        ? "Campanha cancelada — sem métricas."
        : "Rascunho — configure e lance a campanha para ver métricas.";

  return <p className="font-body text-xs italic text-[var(--text-muted)]">{text}</p>;
}
