import { UserAvatar } from "@/components/crm/user-avatar";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import type { EntityViewer } from "@/features/pipeline-v2/hooks";

/**
 * Pilha de avatares "Vendo agora" (presença estilo Kommo) — mostra os OUTROS
 * usuários com o mesmo deal aberto. Até 5 avatares sobrepostos + "+N".
 * Não renderiza nada quando ninguém mais está vendo.
 *
 * `compact`: só os avatares (sem o rótulo "Vendo agora"), para caber em
 * linhas de controle apertadas (ex.: header do slide-over do kanban).
 */
export function DealViewersStack({
  viewers,
  compact = false,
}: {
  viewers: EntityViewer[];
  compact?: boolean;
}) {
  if (viewers.length === 0) return null;
  const MAX = 5;
  const shown = viewers.slice(0, MAX);
  const overflow = viewers.length - shown.length;
  const names = viewers.map((v) => v.name).join(", ");

  const stack = (
    <TooltipGlass label={names} side="bottom">
      <div className="flex items-center">
        {shown.map((v, i) => (
          <div
            key={v.userId}
            className="rounded-full ring-2 ring-[#2e3b6e]"
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: shown.length - i }}
          >
            <UserAvatar name={v.name} imageUrl={v.avatarUrl} size={26} status="online" />
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white ring-2 ring-[#2e3b6e]"
            style={{ marginLeft: -8 }}
          >
            +{overflow}
          </div>
        )}
      </div>
    </TooltipGlass>
  );

  if (compact) return stack;

  return (
    <div className="mb-4 flex items-center gap-2 text-white/70">
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
        Vendo agora
      </span>
      {stack}
    </div>
  );
}
