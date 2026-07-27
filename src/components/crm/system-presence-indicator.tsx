"use client";

import { cn } from "@/lib/utils";

/**
 * Indicador visual reutilizável de PRESENÇA DE USO ("CRM aberto").
 *
 * Não confundir com `AgentStatus` (Online/Ausente/Offline da Distribuição):
 * este indicador reflete apenas se o agente está com o CRM aberto no
 * momento. Ordenar seletores por "online primeiro" mantém disponíveis
 * offline visíveis — a escolha continua livre.
 */
interface SystemPresenceIndicatorProps {
  systemOnline: boolean | undefined;
  lastSeenAt: string | null | undefined;
  /** `dot` = só a bolinha; `label` = bolinha + texto ("Online" / "Visto há Xmin"). */
  variant?: "dot" | "label";
  className?: string;
}

export function SystemPresenceIndicator({
  systemOnline,
  lastSeenAt,
  variant = "dot",
  className,
}: SystemPresenceIndicatorProps) {
  const label = describeSystemPresence({ systemOnline, lastSeenAt });
  const online = Boolean(systemOnline);

  // Azul = CRM aberto (uso do sistema). Verde fica só no Online da Distribuição.
  const dotClass = cn(
    "inline-block h-2 w-2 shrink-0 rounded-full",
    online
      ? "bg-[#38bdf8] shadow-[0_0_0_2px_var(--glass-bg-strong)]"
      : "bg-[var(--text-muted)]/40",
  );

  if (variant === "dot") {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label={`Uso do sistema: ${label}`}
        title={label}
      >
        <span className={dotClass} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px]",
        online ? "text-[#38bdf8]" : "text-[var(--text-muted)]",
        className,
      )}
    >
      <span className={dotClass} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function describeSystemPresence(input: {
  systemOnline: boolean | undefined;
  lastSeenAt: string | null | undefined;
}): string {
  if (input.systemOnline) return "CRM aberto agora";
  if (!input.lastSeenAt) return "Nunca acessou";
  const seen = new Date(input.lastSeenAt).getTime();
  if (Number.isNaN(seen)) return "Offline";
  const diffMs = Date.now() - seen;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "Offline agora";
  if (min < 60) return `Visto há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Visto há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `Visto há ${d} d`;
  return "Offline há mais de 30 d";
}

/**
 * Ordena usuários "online no sistema" primeiro, preservando ordem
 * relativa dos demais.
 */
export function sortByPresence<T extends { systemOnline?: boolean }>(
  list: readonly T[],
): T[] {
  return [...list].sort((a, b) => {
    const ao = a.systemOnline ? 0 : 1;
    const bo = b.systemOnline ? 0 : 1;
    return ao - bo;
  });
}
