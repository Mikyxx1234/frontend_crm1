/**
 * @deprecated DS-012 — componente legado (v1). O canônico é
 * `components/crm/deal-card.tsx` (usado pelo pipeline-v2).
 * Não adicionar novos imports. Remoção física após aposentadoria do kanban v1.
 */
"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IconAlertCircle as AlertCircle, IconCheck as Check, IconChevronDown as ChevronDown, IconClock as Clock, IconGripVertical as GripVertical, IconMessageCircle as MessageCircle, IconPlus as Plus, IconTag as TagIcon, IconX as X } from "@tabler/icons-react";

import type { CardVisibleFields } from "@/components/pipeline/card-fields-config";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { prettifyChatMessageBody } from "@/lib/whatsapp-outbound-template-label";
import {
  cn,
  dealNumericValue,
  formatCurrency,
  formatDate,
  resolveContactAvatarDisplayUrl,
  tagPillStyle,
} from "@/lib/utils";
import { ds } from "@/lib/design-system";
import { dt } from "@/lib/design-tokens";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { TooltipHost } from "@/components/ui/tooltip";

type KanbanCardProps = {
  deal: BoardDeal;
  users: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    agentStatus?: {
      status: "ONLINE" | "OFFLINE" | "AWAY";
      availableForVoiceCalls?: boolean;
      updatedAt?: string;
    } | null;
  }[];
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;
  onMarkWon: () => void;
  onMarkLost: (reason: string) => void;
  isDragging?: boolean;
  statusBusy?: "won" | "lost" | null;
  visibleFields?: CardVisibleFields;
  onClick?: () => void;
  isHighlighted?: boolean;
  /**
   * Seleção em massa (compartilhada com a view Lista). Quando `isSelected`
   * for true, o card ganha borda accent + ring sutil. O checkbox aparece
   * em hover do card (top-left, opacity-0 → group-hover:opacity-100) ou
   * fica sempre visível quando o card está selecionado, pra o usuário
   * conseguir desmarcar sem precisar passar o mouse exatamente em cima.
   */
  isSelected?: boolean;
  onToggleSelect?: () => void;
};

/** Prévia curta da última mensagem do cliente (entrada). */
function summarizeInboundMessage(raw: string): string {
  let t = prettifyChatMessageBody(raw).trim();
  if (!t) return "";
  if (t === "[interactive]") return "Resposta interativa";
  const firstLine = t.split("\n")[0]?.trim() ?? t;
  if (/^✅ Cliente aceitou:/i.test(firstLine)) return firstLine.length > 88 ? `${firstLine.slice(0, 85)}…` : firstLine;
  if (/^❌ Cliente recusou/i.test(firstLine)) return firstLine.length > 88 ? `${firstLine.slice(0, 85)}…` : firstLine;
  if (/^\[Template:/i.test(t)) return "Resposta a template";
  if (/^\[(?:imagem|image|áudio|audio|vídeo|video|documento|document|sticker)\]$/i.test(t)) return "📎 Mídia recebida";
  if (/^📎\s*audio\./i.test(t)) return "🎤 Áudio";
  if (/^📎\s/.test(t)) {
    const short = t.replace(/^📎\s*/, "").slice(0, 56);
    return short ? `📎 ${short}${t.length > 60 ? "…" : ""}` : "📎 Anexo";
  }
  t = t.replace(/\s+/g, " ");
  if (t.length <= 88) return t;
  return `${t.slice(0, 85)}…`;
}

function lastInteractionLabel(deal: BoardDeal): string | null {
  const raw = deal.lastMessage?.createdAt ?? deal.updatedAt;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "agora";
  if (diffMs < 3_600_000) {
    const m = Math.floor(diffMs / 60_000);
    return `${m}min`;
  }
  if (diffMs < 48 * 3_600_000) {
    const h = Math.floor(diffMs / 3_600_000);
    return `${h}h`;
  }
  const days = Math.floor(diffMs / (24 * 3_600_000));
  if (days < 14) return `${days}d`;
  return formatDistanceToNowStrict(d, { addSuffix: false, locale: ptBR });
}

function statusLabelCompact(status: string): string | null {
  const u = status.toUpperCase();
  if (u === "OPEN") return null;
  if (u === "WON") return "Ganho";
  if (u === "LOST") return "Perdido";
  return status;
}

/**
 * Canais válidos para o `ChatAvatar`. Recebe a string crua do banco
 * (`Conversation.channel`) e devolve o tipo aceito pelo componente —
 * ou `null` se for um canal que ainda não tem badge implementado.
 */
function normalizeChannel(raw: string | null | undefined): ChatAvatarChannel {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "whatsapp" || v === "instagram" || v === "email" || v === "meta") {
    return v as ChatAvatarChannel;
  }
  return null;
}

export function KanbanCard({
  deal,
  users,
  dragHandleProps,
  onMarkLost,
  isDragging,
  visibleFields,
  onClick,
  isHighlighted,
  isSelected,
  onToggleSelect,
}: KanbanCardProps) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [lostOpen, setLostOpen] = React.useState(false);
  const [showTagComposer, setShowTagComposer] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [tagColor, setTagColor] = React.useState("#2563eb");

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => { const r = await fetch(apiUrl("/api/tags")); return r.ok ? r.json() : []; },
    staleTime: 60_000,
    enabled: showTagComposer,
  });
  const existingTagIds = new Set(deal.tags?.map((t) => t.id) ?? []);
  const tagSuggestions = allTags.filter(
    (t: { id: string; name: string }) => !existingTagIds.has(t.id) && t.name.toLowerCase().includes(tagInput.toLowerCase()),
  );

  const show = (field: keyof CardVisibleFields) => (visibleFields ? visibleFields[field] : true);

  const contactName = deal.contact?.name?.trim() || "";
  const dealTitle = deal.title?.trim() || contactName || "Sem título";
  const contactLine = show("contact") && contactName ? contactName : null;
  const productLine = show("product") ? deal.productName?.trim() || null : null;
  const interaction = lastInteractionLabel(deal);
  const valueNum = dealNumericValue(deal.value);
  const pending = deal.pendingActivities ?? 0;
  const statusMeta = show("status") ? statusLabelCompact(deal.status) : null;
  const createdAtLabel = deal.createdAt ? formatDate(deal.createdAt) : null;
  const primaryTags = show("tags") ? (deal.tags ?? []).slice(0, 3) : [];
  const hiddenTagsCount = show("tags") ? Math.max(0, (deal.tags?.length ?? 0) - primaryTags.length) : 0;

  const avatarRaw = deal.contact?.avatarUrl ?? null;
  const avatarSrc = resolveContactAvatarDisplayUrl(avatarRaw);
  const avatarChannel = normalizeChannel(deal.channel);

  const inboundPreview =
    show("contact") &&
    deal.lastMessage?.direction === "in" &&
    summarizeInboundMessage(deal.lastMessage.content);

  const submitLost = (reason: string) => {
    onMarkLost(reason);
    setLostOpen(false);
  };

  const ownerMutation = useMutation({
    mutationFn: async (ownerId: string | null) => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) throw new Error("Erro ao alterar responsável");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const tagMutation = useMutation({
    mutationFn: async ({ tagId, tagName, color }: { tagId?: string; tagName?: string; color?: string }) => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}/tags`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagId ? { tagId } : { tagName, color }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar tag");
    },
    onSuccess: () => {
      setTagInput("");
      setShowTagComposer(false);
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  // DNA Chat: marcador de atenção via dot 6px ao lado do título,
  // não mais barra-borda lateral 3px. Mantém o sinal visual sem
  // colar uma cor saturada no card inteiro.
  const attentionDot = deal.isRotting
    ? "bg-[var(--color-warning)]"
    : deal.priority === "HIGH"
      ? "bg-[var(--color-danger)]"
      : null;

  return (
    <>
      <div
        className={cn(
          // Surface: tokens de glass do tema — `bg-white/55` causava cartões
          // esbranquiçados em dark mode mesmo com o variant `.dark` ativo.
          "group relative cursor-pointer rounded-[18px] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] backdrop-blur-sm transition-all",
          dt.card.shadow,
          dt.card.kanbanHover,
          "hover:-translate-y-0.5 hover:bg-[var(--glass-bg-overlay)] hover:shadow-[var(--glass-shadow)]",
          isDragging && "rotate-1 border-primary/40 bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow-lg)]",
          isHighlighted && "animate-[kanban-highlight_3s_ease]",
          // Card selecionado em bulk-mode: borda accent + ring sutil. Override
          // de hover bg pra distinguir mesmo com mouse em cima de outro card.
          isSelected && "border-primary/60 bg-primary/5 ring-1 ring-primary/40 dark:bg-primary/10",
        )}
      >
        <div className="relative flex">
          {/* Checkbox de seleção em massa — aparece em hover do card OU
              fica permanentemente visível quando o card está selecionado.
              Ocupa largura FIXA (mesmo invisível) pra evitar layout shift
              quando o mouse entra. Fica à ESQUERDA do grip pra não competir
              pela mesma área de click e não atrapalhar o drag.
              `stopPropagation` em mouseDown/click previne que o click vaze
              pro card (abriria o DealWorkspace) ou interfira no DnD. */}
          {onToggleSelect ? (
            <label
              className={cn(
                "flex shrink-0 cursor-pointer items-start justify-center pl-1 pr-0 pt-2 transition-opacity",
                isSelected
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
              )}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label={isSelected ? "Desmarcar negócio" : "Marcar negócio"}
            >
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                onClick={(e) => e.stopPropagation()}
                className="size-3.5 cursor-pointer accent-primary"
              />
            </label>
          ) : null}

          <button
            type="button"
            className="flex shrink-0 cursor-grab touch-none items-start justify-center border-0 bg-transparent px-1.5 py-2 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink-soft)] active:cursor-grabbing"
            aria-label="Arrastar negócio"
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps}
          >
            <GripVertical className="size-4" strokeWidth={2} />
          </button>

          <div className="flex min-w-0 flex-1 gap-2 py-2 pr-2.5">
            <div
              role="button"
              tabIndex={0}
              onClick={onClick}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
              className="min-w-0 flex-1 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <div className="flex flex-col gap-2">
                {/* HEADER do card — avatar 28 + nome + data (canto sup. direito).
                    Mantém a identidade DNA Chat (avatar do contato + badge canal)
                    mas LIBERA o restante do conteúdo a ocupar 100% da largura
                    abaixo, eliminando o efeito de "coluna estreita à direita". */}
                <div className="flex items-start gap-2.5">
                  {contactLine ? (
                    <ChatAvatar
                      user={{
                        id: deal.contact?.id,
                        name: contactLine,
                        imageUrl: avatarSrc,
                      }}
                      phone={deal.contact?.phone ?? undefined}
                      channel={avatarChannel}
                      size={28}
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      {attentionDot ? (
                        <TooltipHost label={deal.isRotting ? "Negócio parado" : "Alta prioridade"} side="top">
                          <span
                            className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", attentionDot)}
                            aria-label={deal.isRotting ? "Negócio parado" : "Alta prioridade"}
                          />
                        </TooltipHost>
                      ) : null}
                      <p className={cn("min-w-0 flex-1 truncate leading-tight", dt.text.title)}>
                        {contactLine || dealTitle}
                      </p>
                    </div>

                    {contactLine && dealTitle && contactLine !== dealTitle ? (
                      <p className="mt-0.5 min-w-0 truncate text-[13px] font-medium text-[var(--color-ink-soft)]">
                        {dealTitle}
                      </p>
                    ) : null}
                  </div>

                  {/* #ID + data de criação — mesmo padrão do Sales Hub
                      (`deal-queue.tsx`): `#123` em `font-bold` no token de ink,
                      seguido pela data em `--color-ink-muted` `tabular-nums`. O "#"
                      já carrega a semântica de identificador, dispensa o
                      label "LEAD ID:". Quando o deal não tem `number`
                      ainda (criado offline / pendente sync) cai pra "—". */}
                  {(deal.number != null || createdAtLabel) ? (
                    <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                      <span className="text-[11px] font-semibold tabular-nums text-[var(--color-ink-soft)]">
                        #{deal.number ?? "—"}
                      </span>
                      {createdAtLabel ? (
                        <span className={cn(dt.text.time, "text-[11px]")}>
                          {createdAtLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Daqui pra baixo TODO conteúdo é full-width — sem indent
                    do avatar. Resolve a queixa "informações alinhadas
                    à direita / não usam toda a área". */}
                <div className="min-w-0">
                  {/* Contexto: ícone canal + última interação. Inbound preview
                      mantém o aviso visual quando o cliente respondeu, mas em
                      soft chip (sem borda) alinhado ao DNA Chat. */}
                  {inboundPreview ? (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-ink-muted)]">
                      <MessageCircle className="size-3 shrink-0 text-[var(--color-info)] dark:text-[var(--color-info)]" strokeWidth={2} />
                      <p className="min-w-0 flex-1 truncate">{inboundPreview}</p>
                      {interaction ? <span className="shrink-0 tabular-nums">{interaction}</span> : null}
                    </div>
                  ) : interaction ? (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--color-ink-muted)]">
                      <Clock className="size-3" strokeWidth={2} />
                      <span className="tabular-nums">{interaction}</span>
                    </div>
                  ) : null}

                  {/* Produto + valor: linha flat, sem caixinha. Tipografia
                      do design-system (`ds.text.body` = 13/medium/slate-700).
                      O valor saiu do verde (emerald-700) pra slate-900 —
                      alinhado com o Sales Hub e com o DNA neutro do chat
                      (cores fortes só pra status/ações, nunca pra texto). */}
                  {productLine ? (
                    <div className="mt-1 flex items-center gap-2 text-[12px]">
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {productLine}
                      </span>
                      {deal.productType === "SERVICE" && (
                        <span className={cn(ds.chip.softer, "shrink-0")}>
                          Serviço
                        </span>
                      )}
                      {show("value") && valueNum > 0 ? (
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                          {formatCurrency(valueNum)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Chips: tarefas + tags + status. Tudo soft (sem border, sem shadow).
                      Tags consomem `ds.tag.*` — DNA único Chat ⇄ Sales Hub ⇄ Kanban. */}
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {show("activities") && pending > 0 ? (
                      <TooltipHost
                        label={
                          deal.hasOverdueActivity
                            ? `${pending} tarefa(s) — vencida`
                            : `${pending} tarefa(s) pendente(s)`
                        }
                        side="top"
                      >
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-medium tabular-nums",
                            deal.hasOverdueActivity
                              ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] dark:bg-[var(--color-danger)]/15 dark:text-red-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
                          )}
                        >
                          {deal.hasOverdueActivity ? (
                            <><AlertCircle className="size-3" strokeWidth={2} />{pending} vencida</>
                          ) : (
                            <><Clock className="size-3" strokeWidth={2} />{pending} tarefa</>
                          )}
                        </span>
                      </TooltipHost>
                    ) : null}

                    {primaryTags.length > 0 && (
                      <TagIcon size={11} className={ds.tag.icon} aria-hidden="true" />
                    )}

                    {primaryTags.map((tag) => (
                      <TooltipHost key={tag.id} label={tag.name} side="top">
                        <span className={cn("max-w-full truncate", dt.pill.sm)} style={tagPillStyle(tag.name, tag.color)}>
                          {tag.name}
                        </span>
                      </TooltipHost>
                    ))}

                    {hiddenTagsCount > 0 ? (
                      <span className={ds.tag.more}>+{hiddenTagsCount}</span>
                    ) : null}

                    {show("tags") ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTagComposer((value) => !value);
                        }}
                        className={ds.tag.add}
                        aria-label="Adicionar tag"
                      >
                        <Plus className="size-3" strokeWidth={2} />
                      </button>
                    ) : null}

                    {statusMeta ? (
                      <span className={ds.chip.soft}>{statusMeta}</span>
                    ) : null}

                  </div>

                  {showTagComposer ? (
                    <div
                      className="mt-2 rounded-xl bg-[var(--color-bg-subtle)] p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && tagInput.trim() && canCreateTag) {
                              e.preventDefault();
                              tagMutation.mutate({ tagName: tagInput.trim(), color: tagColor });
                            }
                          }}
                          placeholder={canCreateTag ? "Buscar ou criar tag" : "Buscar tag"}
                          className="h-7 min-w-0 flex-1 rounded-lg bg-[var(--color-input)] px-2 text-[12px] text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {canCreateTag && (
                          <button
                            type="button"
                            onClick={() => {
                              if (tagInput.trim()) tagMutation.mutate({ tagName: tagInput.trim(), color: tagColor });
                            }}
                            disabled={!tagInput.trim() || tagMutation.isPending}
                            className="inline-flex h-7 items-center justify-center rounded-lg bg-primary px-2 text-[11px] font-medium text-primary-foreground disabled:opacity-50"
                          >
                            <Check className="size-3" strokeWidth={2} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowTagComposer(false)}
                          className="inline-flex h-7 items-center justify-center rounded-lg px-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-hover)] hover:text-foreground"
                        >
                          <X className="size-3" strokeWidth={2} />
                        </button>
                      </div>
                      {tagInput && tagSuggestions.length > 0 && (
                        <div className="mt-1.5 max-h-24 overflow-y-auto rounded-lg bg-[var(--color-popover)] backdrop-blur-md">
                          {tagSuggestions.slice(0, 6).map((t: { id: string; name: string; color: string }) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => { tagMutation.mutate({ tagId: t.id }); setTagInput(""); }}
                              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-hover)]"
                            >
                              <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {canCreateTag && (
                        <div className="mt-2 flex items-center gap-1.5">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setTagColor(color)}
                              className={cn(
                                "size-3.5 rounded-full transition",
                                tagColor === color ? "scale-110 ring-2 ring-[var(--color-border)] ring-offset-1" : "",
                              )}
                              style={{ backgroundColor: color }}
                              aria-label={`Selecionar cor ${color}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {show("owner") ? (
                    <div
                      className="mt-1.5 border-t border-[var(--color-border-soft)] pt-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CardOwnerSelector
                        currentOwner={deal.owner}
                        users={users}
                        onChange={(ownerId) => ownerMutation.mutate(ownerId)}
                        isPending={ownerMutation.isPending}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LossReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        onConfirm={submitLost}
      />
    </>
  );
}

const TAG_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#f97316", "#16a34a", "#0891b2", "#dc2626", "#475569"];

function CardOwnerSelector({
  currentOwner,
  users,
  onChange,
  isPending,
}: {
  currentOwner: BoardDeal["owner"];
  users: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    agentStatus?: {
      status: "ONLINE" | "OFFLINE" | "AWAY";
      availableForVoiceCalls?: boolean;
      updatedAt?: string;
    } | null;
  }[];
  onChange: (ownerId: string | null) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const currentUserRow = users.find((user) => user.id === currentOwner?.id);
  const currentStatus = currentUserRow?.agentStatus?.status ?? "OFFLINE";
  // currentOwner pode vir do board (sem avatarUrl em alguns paths
  // antigos). Usa o `users` carregado pela tela como fallback —
  // garante que a foto de perfil cadastrada em `/settings/profile`
  // herde mesmo se o snapshot do deal estiver defasado.
  const currentAvatarUrl =
    currentOwner?.avatarUrl ?? currentUserRow?.avatarUrl ?? null;

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={isPending}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[var(--color-bg-hover)]",
          open && "bg-[var(--color-bg-hover)]",
        )}
      >
        {currentOwner?.name ? (
          <OwnerAvatar
            id={currentOwner.id}
            name={currentOwner.name}
            imageUrl={currentAvatarUrl}
            status={currentStatus}
            size={20}
          />
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[10px] font-bold text-[var(--color-ink-muted)]">
            ?
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--color-ink-soft)]">
          {currentOwner?.name ?? "Sem responsável"}
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-[var(--color-ink-muted)] transition-transform", open && "rotate-180 text-primary")} strokeWidth={2} />
      </button>

      {open ? (
        <div className={cn("absolute left-0 right-0 top-full z-20 mt-1 p-1", ds.popover.base)}>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--color-bg-subtle)]"
          >
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-subtle)] text-[10px] font-semibold text-[var(--color-ink-muted)]">
              ?
            </div>
            <span className="min-w-0 truncate text-[13px] font-medium text-[var(--color-ink-soft)]">Sem responsável</span>
          </button>
          {users.map((user) => {
            const status = user.agentStatus?.status ?? "OFFLINE";
            const selected = currentOwner?.id === user.id;
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onChange(user.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--color-bg-subtle)]",
                  selected && "bg-primary/10 dark:bg-primary/15",
                )}
              >
                <OwnerAvatar
                  id={user.id}
                  name={user.name}
                  imageUrl={user.avatarUrl ?? null}
                  status={status}
                  size={24}
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">{user.name}</span>
                  <span className="block text-[11px] text-[var(--color-ink-muted)]">{presenceLabel(status)}</span>
                </div>
                {selected ? <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * OwnerAvatar — avatar 24px do agente (kanban / sales hub / lista).
 * Wrapper do `ChatAvatar` com defaults pra owner: `channel={null}`
 * (sem badge whatsapp), `hideCartoon` (sem ilustração de cliente) e
 * fallback para iniciais sólidas. Sobrepõe o `PresenceDot` no canto
 * inferior direito pra indicar status do agente em todos os lugares
 * onde o avatar do responsável aparece — mesma identidade visual em
 * todo o app.
 */
function OwnerAvatar({
  id,
  name,
  imageUrl,
  status,
  size = 24,
}: {
  id?: string;
  name: string | null | undefined;
  imageUrl: string | null | undefined;
  status: "ONLINE" | "OFFLINE" | "AWAY";
  size?: number;
}) {
  return (
    <div className="relative shrink-0">
      <ChatAvatar
        user={{ id: id ?? name ?? "?", name: name ?? "?", imageUrl: imageUrl ?? null }}
        size={size}
        channel={null}
        hideCartoon
      />
      <PresenceDot
        status={status}
        className="absolute -bottom-0.5 -right-0.5 z-10"
      />
    </div>
  );
}

function PresenceDot({
  status,
  className,
}: {
  status: "ONLINE" | "OFFLINE" | "AWAY";
  className?: string;
}) {
  return (
    <span
      className={cn(
        // Ring usa `--color-card` (branco em light, navy em dark) — evita
        // o anel branco fixo que ficava destoante sobre cards escuros.
        "inline-flex size-2 rounded-full ring-2 ring-[var(--color-card)]",
        status === "ONLINE" && "bg-[var(--color-success)]",
        status === "AWAY" && "bg-amber-400",
        status === "OFFLINE" && "bg-slate-400 dark:bg-slate-500",
        className,
      )}
      aria-hidden
    />
  );
}

function presenceLabel(status: "ONLINE" | "OFFLINE" | "AWAY") {
  if (status === "ONLINE") return "Online";
  if (status === "AWAY") return "Ausente";
  return "Offline";
}
