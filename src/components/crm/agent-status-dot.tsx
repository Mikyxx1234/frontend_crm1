import { cn } from "@/lib/utils";
import {
  AGENT_STATUS_META,
  type AgentOnlineStatus,
} from "@/components/crm/agent-status";

/**
 * Bolinha CANÔNICA de status do agente (Online / Ausente / Offline).
 *
 * Fonte única de verdade visual: cores vindas de `AGENT_STATUS_META` — as
 * mesmas usadas no popup "Definir Status" e na NavRail. Sempre renderiza
 * `absolute` no canto inferior-direito do avatar pai, à FRENTE do avatar
 * (z-30) para não ser cortada pelo `overflow-hidden` do círculo.
 *
 * Uso: envolver o `UserAvatar` num `<span className="relative isolate ...">`
 * e colocar `<AgentStatusDot />` como irmão. O `isolate` cria stacking
 * context próprio, evitando que a bolinha suma atrás de outros elementos.
 */
interface AgentStatusDotProps {
  status: AgentOnlineStatus;
  /** Diâmetro em px. Default 14 (equivalente a h-3.5 w-3.5 da NavRail). */
  size?: number;
  /** Espessura da borda em px. Default 3 (mesmo da NavRail). */
  borderWidth?: number;
  /**
   * Cor da borda de contraste (recorta a bolinha do fundo). Default
   * `var(--nav-bg)` — combina com o trilho escuro. Em superfícies claras
   * (ex.: cards da Distribuição), passar `var(--glass-bg-base)` ou o token
   * de fundo do container.
   */
  borderColor?: string;
  className?: string;
}

export function AgentStatusDot({
  status,
  size = 14,
  borderWidth = 3,
  borderColor = "var(--nav-bg)",
  className,
}: AgentStatusDotProps) {
  const meta = AGENT_STATUS_META[status];
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 z-30 rounded-full shadow-[0_1px_5px_rgba(0,0,0,0.35)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: meta.color,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
      aria-label={`Status: ${meta.label}`}
    />
  );
}
