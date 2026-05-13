"use client";

import { apiUrl } from "@/lib/api";
/**
 * DealActions — barra compacta de ações do deal ativo (Sales Hub).
 * ─────────────────────────────────────────────────────────────────
 * Antes, todas essas ações moravam no `DealCrmPanel` à direita. Como
 * o operador pediu "uma tela só" (remover sidebar direita), migramos
 * as três operações críticas pra dentro do próprio card ativo na
 * Fila, em um formato mais compacto:
 *
 *   ▸ DealStageSelector (exportado separadamente)  — agora mora
 *     DENTRO do cabeçalho slate-100 do card ativo (por pedido do
 *     operador: "colocar o botão de mudar fase dentro da área de
 *     destaque")
 *   ▸ DealActions                                   — stepper
 *     horizontal + botões Ganho/Perdido na faixa abaixo do header
 *
 * Ambos compartilham a MESMA API das mutations originais do
 * `DealCrmPanel` (endpoints `/api/deals/:id/move` POST e
 * `/api/deals/:id` PATCH) e o MESMO update otimista via
 * `applyQuickMove` no cache `pipeline-board`. Isso preserva a
 * consistência com Kanban/List views — mover um deal aqui reflete
 * imediatamente em qualquer outra view aberta.
 */

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { BoardDeal } from "@/components/pipeline/kanban-types";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { cn, formatCurrency } from "@/lib/utils";
import { SUBTLE_SPRING } from "@/lib/design-system";

type StatusFilter = "OPEN" | "WON" | "LOST" | "ALL";

type DealActionsProps = {
  deal: BoardDeal & { stageId: string };
  stages: BoardStage[];
  pipelineId: string;
  statusFilter: StatusFilter;
  onMoved?: (dealId: string) => void;
};

type DealStageSelectorProps = DealActionsProps & {
  /**
   * Quando true (default), o seletor também renderiza o valor formatado
   * do deal no canto direito. Útil pra o header do card ativo, onde
   * removemos a pílula "FASE DO FUNIL" original — agora o seletor de
   * etapa carrega ambas as informações em uma linha só.
   */
  showValue?: boolean;
};

const boardQueryKey = (pid: string, status: StatusFilter = "OPEN") =>
  ["pipeline-board", pid, status] as const;

function cloneBoard(stages: BoardStage[]): BoardStage[] {
  return stages.map((s) => ({ ...s, deals: s.deals.map((d) => ({ ...d })) }));
}

function applyQuickMove(
  stages: BoardStage[],
  dealId: string,
  fromId: string,
  toId: string,
): BoardStage[] {
  const next = cloneBoard(stages);
  const src = next.find((s) => s.id === fromId);
  const dst = next.find((s) => s.id === toId);
  if (!src || !dst) return stages;
  const idx = src.deals.findIndex((d) => d.id === dealId);
  if (idx < 0) return stages;
  const [moved] = src.deals.splice(idx, 1);
  if (!moved) return stages;
  dst.deals.unshift(moved);
  for (const col of next) col.deals.forEach((d, i) => { d.position = i; });
  return next;
}

function dealValue(deal: BoardDeal): number {
  if (typeof deal.value === "number") return deal.value;
  const n = Number(deal.value);
  return Number.isNaN(n) ? 0 : n;
}

type MovePayload = { dealId: string; fromStageId: string; toStageId: string };
type StatusPayload = { dealId: string; status: "WON" | "LOST" };

/**
 * Hook compartilhado — mutation de mover um deal entre etapas com
 * update otimista no cache `pipeline-board`. Exportado para que o
 * `DealQueue` possa construir seu próprio trigger inline (seta no
 * "ETAPA ATUAL") sem duplicar a lógica de estado.
 */
export function useMoveMutation({
  pipelineId,
  statusFilter,
  stages,
  onMoved,
}: Pick<DealActionsProps, "pipelineId" | "statusFilter" | "stages" | "onMoved">) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: MovePayload) => {
      const res = await fetch(apiUrl(`/api/deals/${vars.dealId}/move`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: vars.toStageId, position: 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Não foi possível mover o negócio.",
        );
      return data;
    },
    onMutate: async (vars: MovePayload) => {
      const qk = boardQueryKey(pipelineId, statusFilter);
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData<BoardStage[]>(qk);
      if (prev)
        queryClient.setQueryData(
          qk,
          applyQuickMove(prev, vars.dealId, vars.fromStageId, vars.toStageId),
        );
      return { prev };
    },
    onSuccess: (_d, vars) => {
      const dest = stages.find((s) => s.id === vars.toStageId);
      if (dest) toast.success(`Movido para "${dest.name}"`, { duration: 2000 });
      onMoved?.(vars.dealId);
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(
          boardQueryKey(pipelineId, statusFilter),
          ctx.prev,
        );
      toast.error(e instanceof Error ? e.message : "Erro ao mover negócio");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", pipelineId],
      });
    },
  });
}

/**
 * Trigger de troca de etapa — popover com lista vertical de todas as
 * etapas. Extraído para ser ancorado DENTRO do header slate-100 do
 * card ativo (antes morava na faixa branca abaixo, junto do stepper).
 */
export function DealStageSelector({
  deal,
  stages,
  pipelineId,
  statusFilter,
  onMoved,
  showValue = true,
}: DealStageSelectorProps) {
  const [stageOpen, setStageOpen] = React.useState(false);
  const moveMutation = useMoveMutation({
    pipelineId,
    statusFilter,
    stages,
    onMoved,
  });

  const currentStage = stages.find((s) => s.id === deal.stageId) ?? null;
  const stageColor = currentStage?.color ?? "#6366f1";

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setStageOpen((v) => !v);
        }}
        disabled={moveMutation.isPending}
        aria-haspopup="listbox"
        aria-expanded={stageOpen}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-all hover:border-slate-300",
          stageOpen &&
            "border-blue-600 bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
          moveMutation.isPending && "cursor-wait opacity-60",
        )}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: stageColor }}
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Etapa
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-black tracking-tight text-slate-900">
          {currentStage?.name ?? "—"}
        </span>
        {showValue && deal.value != null && (
          <span className="shrink-0 text-[12px] font-black tabular-nums tracking-tight text-slate-700">
            {formatCurrency(dealValue(deal))}
          </span>
        )}
        {/* Chevron vira 180° quando aberto — affordance clara de
            "este elemento abre uma lista". Substitui o antigo
            ArrowRightLeft rotacionado, que deixava a intenção
            menos evidente. */}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-500 transition-transform",
            stageOpen && "rotate-180 text-blue-600",
          )}
          strokeWidth={2.5}
        />
      </button>

      <AnimatePresence>
        {stageOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            // z-50 + popover próprio: como o card ativo agora NÃO tem
            // overflow-hidden, a lista aparece inteira sobre qualquer
            // elemento abaixo. max-h calibrada pra caber ~7 etapas
            // sem precisar rolar; caso ultrapasse, o scroll custom
            // aparece só quando necessário.
            className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_-16px_rgba(15,23,42,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Mover para
              </span>
              <span className="text-[10px] font-bold tabular-nums text-slate-400">
                {stages.length} etapas
              </span>
            </div>
            <ul
              role="listbox"
              className="scrollbar-thin max-h-[280px] overflow-y-auto py-1"
            >
              {stages.map((stage) => {
                const isCurrent = stage.id === deal.stageId;
                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => {
                        if (!isCurrent) {
                          moveMutation.mutate({
                            dealId: deal.id,
                            fromStageId: deal.stageId,
                            toStageId: stage.id,
                          });
                        }
                        setStageOpen(false);
                      }}
                      disabled={isCurrent}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-bold tracking-tight text-slate-700 transition-colors hover:bg-slate-50",
                        isCurrent &&
                          "cursor-default bg-blue-50/60 text-blue-700",
                      )}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                      />
                      <span className="truncate">{stage.name}</span>
                      {isCurrent && (
                        <Check
                          className="ml-auto size-3.5 text-blue-600"
                          strokeWidth={2.5}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * DealStageBar — progress-bar de etapas "sabor Kommo" (dentro do card).
 * ────────────────────────────────────────────────────────────────────
 * Substitui o antigo `DealStageSelector` dropdown dentro do
 * `ActiveContactCard`. Mostra o pipeline como UMA barra contínua
 * flat, dividida em segmentos clicáveis por finos separadores
 * brancos. Clicar em qualquer segmento move o deal pra aquela etapa.
 *
 * DNA visual:
 *   Linha 1 — Label "ETAPA" + bullet + nome da etapa em foco
 *             (hover se houver, senão a atual).
 *   Linha 2 — Barra horizontal contínua de 8px:
 *               • Etapa atual  → cor sólida + altura 14px (pop) +
 *                                 ring branco interno + seta ▲ abaixo
 *               • Anteriores   → cor da etapa com 55% alpha
 *               • Futuras      → `bg-slate-200` (vazio "por fazer")
 *               • Hover        → altura sobe pra 12px + brilho
 *             Separadores brancos de 2px entre segmentos
 *             (simulados via `box-shadow: inset -1px 0 0 white`)
 *             pra comunicar "sequência" sem gaps visíveis.
 *
 * Motivo do redesign: as pílulas rounded-full anteriores pareciam
 * "balas isoladas". A nova barra contínua dá identidade de PROGRESSO
 * — o operador enxerga instantaneamente onde o deal está, por onde
 * já passou e o que falta.
 */
export function DealStageBar({
  deal,
  stages,
  pipelineId,
  statusFilter,
  onMoved,
}: DealActionsProps) {
  const [hoverStageId, setHoverStageId] = React.useState<string | null>(null);

  const moveMutation = useMoveMutation({
    pipelineId,
    statusFilter,
    stages,
    onMoved,
  });

  const currentIdx = stages.findIndex((s) => s.id === deal.stageId);
  const currentStage = currentIdx >= 0 ? stages[currentIdx] : null;
  const hoverStage = hoverStageId
    ? stages.find((s) => s.id === hoverStageId)
    : null;

  const shownStage = hoverStage ?? currentStage;
  const shownName = shownStage?.name ?? "—";
  const shownColor = shownStage?.color ?? "#6366f1";

  return (
    <div
      className="flex flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Label superior: "ETAPA" + bullet + nome da etapa em foco. */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Etapa
        </span>
        <span
          className="size-2 shrink-0 rounded-full transition-colors"
          style={{ backgroundColor: shownColor }}
        />
        <span className="min-w-0 flex-1 truncate text-[13px] font-black tracking-tight text-slate-900">
          {shownName}
        </span>
        {moveMutation.isPending && (
          <span className="text-[10px] font-bold text-slate-400">
            movendo…
          </span>
        )}
      </div>

      {/* Barra contínua. Padding vertical invisível amplia a hit-area
          pra clicar ser fácil mesmo com a barra visual fina. */}
      <div
        className="relative flex h-[14px] w-full items-center py-1"
        onMouseLeave={() => setHoverStageId(null)}
        role="group"
        aria-label="Mover deal entre etapas"
      >
        <div className="flex h-full w-full overflow-hidden rounded-full bg-slate-200">
          {stages.map((stage, idx) => {
            const isCurrent = stage.id === deal.stageId;
            const isPast = currentIdx >= 0 && idx < currentIdx;
            const isHovered = stage.id === hoverStageId;
            const isLast = idx === stages.length - 1;

            // Estado visual:
            //   • current → cor sólida 100%
            //   • past    → cor da etapa em 55% alpha (rastro)
            //   • future  → transparente (herda slate-200 do trilho)
            let background: string | undefined;
            if (isCurrent) background = stage.color;
            else if (isPast) background = `${stage.color}8c`; // ~55% alpha

            return (
              <motion.button
                key={stage.id}
                type="button"
                onClick={() => {
                  if (isCurrent || moveMutation.isPending) return;
                  moveMutation.mutate({
                    dealId: deal.id,
                    fromStageId: deal.stageId,
                    toStageId: stage.id,
                  });
                }}
                onMouseEnter={() => setHoverStageId(stage.id)}
                disabled={moveMutation.isPending}
                aria-label={
                  isCurrent
                    ? `Etapa atual: ${stage.name}`
                    : `Mover para ${stage.name}`
                }
                aria-current={isCurrent}
                animate={{
                  opacity:
                    isHovered || isCurrent || hoverStageId === null
                      ? 1
                      : 0.85,
                }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "relative h-full flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50",
                  !isCurrent &&
                    !moveMutation.isPending &&
                    "cursor-pointer",
                  isCurrent && "cursor-default",
                  moveMutation.isPending &&
                    !isCurrent &&
                    "cursor-wait opacity-70",
                )}
                style={{
                  backgroundColor: background,
                  // Separador branco sutil entre segmentos (evita o
                  // "bloco colorido contínuo sem leitura"). Invisível
                  // no último segmento.
                  boxShadow: isLast
                    ? undefined
                    : "inset -1px 0 0 rgba(255,255,255,0.9)",
                }}
              >
                {/* Destaque do hover — barra interna azul finíssima
                    no topo do segmento alvo. Não desloca layout. */}
                {isHovered && !isCurrent && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-blue-600"
                    aria-hidden
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Marcador de POSIÇÃO ATUAL — um "pin" fino vertical que
            atravessa a barra do topo à base, com cabeça colorida
            acima. Anima via layoutId quando o deal muda de etapa.
            Largura absoluta calculada via % do currentIdx. */}
        {currentStage && currentIdx >= 0 && stages.length > 0 && (
          <motion.div
            layoutId={`deal-stage-pin-${deal.id}`}
            transition={SUBTLE_SPRING}
            className="pointer-events-none absolute top-0 flex h-full flex-col items-center"
            style={{
              left: `calc(${((currentIdx + 0.5) / stages.length) * 100}% - 3px)`,
            }}
          >
            <span
              className="absolute inset-y-0 w-[3px] rounded-full ring-2 ring-white"
              style={{ backgroundColor: currentStage.color }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Stepper visual compacto: uma barrinha por etapa, preenchidas até a
 * etapa atual. Sem botões nem actions — é só um indicador de progresso.
 * Foi extraído do antigo `DealActions` pra poder morar no rodapé do
 * header slate-100 do card ativo (sem competir por espaço com outras
 * ações que migraram pro header do chat).
 */
export function DealStepper({
  deal,
  stages,
}: Pick<DealActionsProps, "deal" | "stages">) {
  const stageIdx = stages.findIndex((s) => s.id === deal.stageId);
  const currentStage = stageIdx >= 0 ? stages[stageIdx] : null;
  const stageColor = currentStage?.color ?? "#6366f1";

  return (
    <div className="flex gap-1">
      {stages.map((s, i) => {
        const filled = stageIdx >= 0 && i <= stageIdx;
        return (
          <motion.div
            key={s.id}
            layout
            transition={SUBTLE_SPRING}
            className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/70"
          >
            <motion.div
              layout
              animate={{ width: filled ? "100%" : "0%" }}
              transition={SUBTLE_SPRING}
              className="h-full rounded-full"
              style={{ backgroundColor: stageColor }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Ganho / Perdido em uma única linha horizontal compacta. Por pedido
 * do operador ("otimizar o card") esses botões saíram do rodapé do
 * card ativo e passaram a morar no header do chat — área permanente
 * da tela, sempre acessível enquanto a conversa está aberta.
 *
 * Variante visual: tons suaves (emerald-50 / red-50) quando a
 * ação ainda é possível; tom sólido e shadow quando o deal já
 * está travado no status respectivo.
 */
export function DealOutcomeButtons({
  deal,
  pipelineId,
}: Pick<DealActionsProps, "deal" | "pipelineId">) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async (vars: StatusPayload) => {
      const res = await fetch(apiUrl(`/api/deals/${vars.dealId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: vars.status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Não foi possível atualizar o status.",
        );
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.status === "WON" ? "Negócio ganho" : "Negócio perdido",
        { duration: 2000 },
      );
      queryClient.invalidateQueries({
        queryKey: ["pipeline-board", pipelineId],
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    },
  });

  const dealStatus = (deal.status ?? "OPEN").toUpperCase() as
    | "OPEN"
    | "WON"
    | "LOST";

  // DNA design-system: estrutura idêntica a soft chips (rounded-full,
  // px-2 py-0.5, text-12 medium). Estado "venceu/perdeu" promove o
  // chip a um tom sólido sem mudar a forma.
  const baseChip =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors disabled:opacity-60";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          statusMutation.mutate({ dealId: deal.id, status: "WON" });
        }}
        whileTap={{ scale: 0.97 }}
        transition={SUBTLE_SPRING}
        disabled={statusMutation.isPending || dealStatus === "WON"}
        className={cn(
          baseChip,
          dealStatus === "WON"
            ? "bg-emerald-500 text-white"
            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        )}
      >
        <Trophy className="size-3.5" strokeWidth={2} />
        Ganho
      </motion.button>
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          statusMutation.mutate({ dealId: deal.id, status: "LOST" });
        }}
        whileTap={{ scale: 0.97 }}
        transition={SUBTLE_SPRING}
        disabled={statusMutation.isPending || dealStatus === "LOST"}
        className={cn(
          baseChip,
          dealStatus === "LOST"
            ? "bg-rose-500 text-white"
            : "bg-rose-50 text-rose-700 hover:bg-rose-100",
        )}
      >
        <XCircle className="size-3.5" strokeWidth={2} />
        Perdido
      </motion.button>
    </div>
  );
}
