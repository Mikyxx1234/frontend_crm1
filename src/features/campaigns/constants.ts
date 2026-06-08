import type { CampaignStatus, RecipientStatus } from "./types";

/** Tom semântico usado para colorir badges/pills no DS glass. */
export type StatusTone =
  | "neutral"
  | "info"
  | "brand"
  | "success"
  | "warning"
  | "danger";

export const STATUS_META: Record<
  CampaignStatus,
  { label: string; tone: StatusTone }
> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  SCHEDULED: { label: "Agendada", tone: "info" },
  PROCESSING: { label: "Processando", tone: "brand" },
  SENDING: { label: "Enviando", tone: "brand" },
  PAUSED: { label: "Pausada", tone: "warning" },
  COMPLETED: { label: "Concluída", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
  FAILED: { label: "Falhou", tone: "danger" },
};

export const RECIPIENT_META: Record<
  RecipientStatus,
  { label: string; tone: StatusTone }
> = {
  PENDING: { label: "Pendente", tone: "neutral" },
  SENDING: { label: "Enviando", tone: "info" },
  SENT: { label: "Enviado", tone: "success" },
  DELIVERED: { label: "Entregue", tone: "success" },
  READ: { label: "Lido", tone: "brand" },
  FAILED: { label: "Falhou", tone: "danger" },
};

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  brand:
    "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  danger:
    "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
};

export const CAMPAIGN_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "SCHEDULED", label: "Agendada" },
  { value: "SENDING", label: "Enviando" },
  { value: "PAUSED", label: "Pausada" },
  { value: "COMPLETED", label: "Concluída" },
  { value: "FAILED", label: "Falhou" },
];
