"use client"

import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { IconCircleX, IconClock, IconMessage } from "@tabler/icons-react"
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar"
import { AVATAR_SIZE } from "@/lib/avatar"
import { summarizeSendError } from "@/lib/meta-error-catalog"
import {
  StatusTicks,
  type DeliveryTickStatus,
} from "@/components/crm/status-ticks"
import { TooltipGlass } from "@/components/crm/tooltip-glass"
import { AwaitingReplyFooter } from "@/components/crm/awaiting-reply-footer"
import { Chip } from "./chip"
import { TagChip } from "./tag-chip"

export type AvatarColor =
  | "green"
  | "blue"
  | "orange"
  | "purple"
  | "pink"
  | "coral"
  | "teal"
  | "mint"
  | "gray"
export type TagType = "hot" | "warm" | "cold" | "vip" | "partner" | "ref"

export interface Deal {
  id: string
  name: string
  subtitle: string
  initials: string
  /** @deprecated Preferir ChatAvatar (sólido determinístico). Mantido p/ adapters. */
  avatarColor: AvatarColor
  online?: boolean
  dealNumber: string
  date: string
  message?: {
    text: string
    time: string
    /** Direção da última msg — ticks só quando `out`. */
    direction?: "in" | "out"
    /** Status de entrega (outbound), mesma semântica do inbox. */
    status?: DeliveryTickStatus
    /** Motivo quando status=failed. */
    sendError?: string | null
    /** Textos das msgs inbound aguardando — tooltip em balões separados. */
    awaitingTexts?: string[]
  }
  timeAgo?: string
  tags?: { label: string; type: TagType }[]
  owner: {
    initials: string
    name: string
    avatarColor: AvatarColor
  }
  /** Motivo da perda — exibido em destaque quando o deal está perdido. */
  lostReason?: string
  /** Canal do contato/conversa — badge no avatar (padrão Inbox). */
  channel?: string | null
  contactId?: string | null
  avatarUrl?: string | null
  phone?: string | null
  /** Mensagens não lidas do deal — badge no canto (mesmo visual do inbox). */
  unreadCount?: number
}

interface DealCardProps {
  deal: Deal
  onClick?: () => void
  /**
   * Slot opcional que substitui o bloco padrao de tags.
   * Usado pelo kanban-v2 / Flow para injetar o `TagsPopover` real.
   * Omitir (undefined) quando não houver tags — a linha inteira some.
   */
  tagsSlot?: React.ReactNode
  /**
   * Slot opcional que substitui o Chip do responsavel no rodape
   * do card — permite plugar o `AssigneePopover` no kanban-v2.
   */
  ownerSlot?: React.ReactNode
  /**
   * Slot opcional renderizado no canto direito do rodape — usado para
   * o menu de "mover de fase" (alternativa ao drag-and-drop).
   */
  moveMenuSlot?: React.ReactNode
  /**
   * Seleção em massa. Quando `onToggleSelect` é passado, o card exibe um
   * checkbox no canto superior esquerdo (visível em hover ou quando
   * selecionado) e ganha um anel de destaque ao ser selecionado.
   */
  isSelected?: boolean
  onToggleSelect?: () => void
  /**
   * Modo seleção global. Quando `true`, o checkbox fica permanentemente
   * visível em todos os cards e o conteúdo desloca para a direita para
   * abrir espaço (estilo Kommo).
   */
  selectionMode?: boolean
  /**
   * Layout da linha de tags:
   * - `true` — `flex-wrap` livre
   * - `false`/omitido — `nowrap` + `overflow-hidden` (Flow: 1 linha + chips truncados + `+N`)
   */
  tagsWrap?: boolean
  /**
   * Flow: card recolhido — só a linha do contato (avatar/nome/#).
   * Preview, tags e responsável animam para fora sem desmontar a seleção.
   */
  compact?: boolean
}

function dealOpenHref(deal: Deal): string {
  const raw = deal.dealNumber.replace(/^#/, "")
  const param = /^\d+$/.test(raw) ? raw : deal.id
  return `/pipeline?deal=${encodeURIComponent(param)}`
}

const COMPACT_SECTION_TRANSITION = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as const,
}

/** Tooltip: cada msg aguardando em um balão (ordem cronológica). */
function AwaitingMessagesTooltip({ texts }: { texts: string[] }) {
  const unique = texts.map((t) => t.trim()).filter(Boolean)
  if (unique.length === 0) return null
  return (
    <div className="flex max-h-56 w-full min-w-[12rem] flex-col gap-1.5 overflow-y-auto py-0.5">
      {unique.map((text, i) => (
        <div
          key={`${i}-${text.slice(0, 24)}`}
          className="rounded-2xl rounded-bl-md bg-white/14 px-2.5 py-1.5 text-left text-[11px] font-normal not-italic leading-snug whitespace-pre-wrap break-words shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
        >
          {text}
        </div>
      ))}
    </div>
  )
}

export function DealCard({ deal, onClick, tagsSlot, ownerSlot, moveMenuSlot, isSelected, onToggleSelect, selectionMode, tagsWrap = false, compact = false }: DealCardProps) {
  // O checkbox SÓ aparece quando o "modo seleção" global está ativo
  // (acionado pelo kebab "Selecionar..."). Removemos o antigo
  // comportamento de "aparecer no hover" para que entrada e saída
  // do modo sejam explícitas e previsíveis.
  const showCheckbox = !!selectionMode && !!onToggleSelect
  const unread = deal.unreadCount ?? 0
  // Cliente ainda não respondido — última msg inbound (aguarda reply do agente).
  const unreplied = deal.message?.direction === "in"
  return (
    <a
      href={dealOpenHref(deal)}
      draggable={false}
      aria-label={`Abrir negócio ${deal.dealNumber} — ${deal.name}`}
      aria-expanded={!compact}
      onClick={(e) => {
        if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        // `block` preserva o comportamento de caixa do antigo <article>
        // (a <a> é inline por padrão e quebraria a largura/altura do card).
        "group relative block cursor-pointer overflow-hidden rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] backdrop-blur-sm shadow-[var(--glass-shadow-sm)] transition-[border-color,box-shadow,background-color] duration-200",
        // Sem translate no selecionado: evita briga com height animation / coluna do chat.
        !isSelected && "hover:-translate-y-0.5 hover:bg-[var(--glass-bg-overlay)] hover:shadow-[var(--glass-shadow)]",
        isSelected && "border-[var(--brand-primary)]/50 ring-2 ring-[var(--brand-primary)]/40",
        "active:cursor-grabbing",
      )}
    >
      <div className={cn("py-1.5", showCheckbox ? "pl-9 pr-3" : "px-3")}>
        {/* Checkbox de seleção em massa — só renderizado quando o
            "modo seleção" está ativo. stopPropagation em vários eventos
            evita abrir o deal ou iniciar o drag. */}
        {showCheckbox ? (
          <label
            className="absolute left-2 top-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-sm backdrop-blur-md"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect() }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={!!isSelected}
              readOnly
              tabIndex={-1}
              className="pointer-events-none h-3.5 w-3.5 cursor-pointer accent-[var(--brand-primary)]"
            />
          </label>
        ) : null}

        {/* Top row: avatar Inbox (foto | sólido + badge canal) + name + dealNumber/date */}
        <div className="flex items-center gap-2">
        <ChatAvatar
          user={{
            // Cor do avatar = hash do contato (mesmo contato = mesma cor do
            // Inbox, que usa `contact.id`). Sem contato vinculado, cai no
            // nome (deal.name = nome do contato) — nunca no id do negócio,
            // que daria uma cor divergente pra mesma pessoa.
            id: deal.contactId ?? undefined,
            name: deal.name,
            imageUrl: deal.avatarUrl ?? null,
          }}
          phone={deal.phone ?? undefined}
          channel={(deal.channel as ChatAvatarChannel) ?? null}
          size={AVATAR_SIZE.sm}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
            {deal.name}
          </div>
          <div className="mt-px truncate text-[11px] text-[var(--text-muted)]">
            {deal.subtitle}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded-[var(--radius-sm)] bg-[var(--color-enterprise-bg)] px-1.5 py-px font-display text-[10px] font-bold text-[var(--brand-primary)]">
            {deal.dealNumber}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">{deal.date}</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!compact ? (
          <motion.div
            key="deal-card-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COMPACT_SECTION_TRANSITION}
            className="overflow-hidden"
          >
            {/* Message preview — tooltip no texto com a msg completa. */}
            {deal.message && (
              <div className="mt-1 flex items-start gap-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 text-[11.5px] italic leading-[1.35] text-[var(--text-secondary)]">
                {/* Ícone de conversa com borda azul — mesmo do card de
                    conversa do inbox, para padronizar a leitura visual. */}
                <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[rgba(91,111,245,0.40)] text-[var(--brand-primary)]">
                  <IconMessage size={9} />
                </span>
                {/* Ticks de entrega (outbound) — mesma linguagem do conversation-card. */}
                {deal.message.direction === "out" &&
                  (deal.message.status === "failed" ? (
                    <TooltipGlass
                      label={
                        summarizeSendError(deal.message.sendError) ||
                        "Falha no envio"
                      }
                      side="top"
                    >
                      <span className="mt-px inline-flex shrink-0 not-italic">
                        <StatusTicks status="failed" onLightBg size="card" />
                      </span>
                    </TooltipGlass>
                  ) : deal.message.status ? (
                    <span className="mt-px inline-flex shrink-0 not-italic">
                      <StatusTicks
                        status={deal.message.status}
                        onLightBg
                        size="card"
                      />
                    </span>
                  ) : (
                    <span className="mt-px inline-flex shrink-0 not-italic">
                      <StatusTicks status="sent" onLightBg size="card" />
                    </span>
                  ))}
                <TooltipGlass
                  label={
                    <AwaitingMessagesTooltip
                      texts={
                        deal.message.awaitingTexts &&
                        deal.message.awaitingTexts.length > 0
                          ? deal.message.awaitingTexts
                          : [deal.message.text]
                      }
                    />
                  }
                  side="top"
                  align="start"
                  className="max-w-sm font-normal"
                >
                  <span className="line-clamp-2 min-w-0 flex-1 cursor-default overflow-hidden">
                    {deal.message.text}
                  </span>
                </TooltipGlass>
                <span className="shrink-0 text-[10px] not-italic text-[var(--text-muted)]">
                  {deal.message.time}
                </span>
              </div>
            )}

            {!deal.message && deal.timeAgo && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <IconClock size={11} />
                {deal.timeAgo}
              </div>
            )}

            {/* Motivo da perda — destaque vermelho suave em deals perdidos,
                permite bater o olho e saber por que o negócio foi perdido. */}
            {deal.lostReason && (
              <div className="mt-1 flex items-start gap-1.5 rounded-[var(--radius-md)] border border-[rgba(239,68,68,0.20)] bg-[rgba(239,68,68,0.08)] px-2.5 py-1 text-[11px] leading-[1.35]">
                <span className="mt-px inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-danger-dark)]">
                  <IconCircleX size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-display text-[9.5px] font-bold uppercase tracking-wide text-[var(--color-danger-dark)]">
                    Motivo da perda
                  </span>
                  <span className="line-clamp-2 block text-[var(--color-danger-text)]">{deal.lostReason}</span>
                </span>
              </div>
            )}

            {/* Tags — slot tem prioridade. Sem slot, fallback estático.
                Sem tags e sem slot: não renderiza a linha. Com slot (mesmo
                só o `+` / Gerenciar), a linha aparece.
                stopPropagation em multiplos eventos para nao abrir o deal
                ou iniciar drag ao interagir com popovers injetados. */}
            {(tagsSlot != null || (deal.tags?.length ?? 0) > 0) && (
            <div
              className={cn(
                // py + -my: overflow clipa na padding-edge — sem isso, bordas
                // das pills (1px) + leading-tight ficam "raspadas" no Flow.
                "mb-1 mt-1 flex min-w-0 items-center gap-1 py-0.5 -my-0.5",
                tagsWrap
                  ? "flex-wrap"
                  : "flex-nowrap overflow-x-clip overflow-y-visible",
              )}
              onClick={tagsSlot ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
              onMouseDown={tagsSlot ? (e) => e.stopPropagation() : undefined}
              onPointerDown={tagsSlot ? (e) => e.stopPropagation() : undefined}
              onTouchStart={tagsSlot ? (e) => e.stopPropagation() : undefined}
            >
              {tagsSlot ?? (
                <>
                  {deal.tags?.map((tag, i) => (
                    <TagChip
                      key={i}
                      name={tag.label}
                      color={
                        tag.type === "hot"
                          ? "#ef4444"
                          : tag.type === "warm"
                            ? "#f59e0b"
                            : tag.type === "cold"
                              ? "#5b6ff5"
                              : tag.type === "vip"
                                ? "#a855f7"
                                : tag.type === "partner"
                                  ? "#0d9488"
                                  : "#64748b"
                      }
                    />
                  ))}
                </>
              )}
            </div>
            )}

            {/* Owner — slot tem prioridade. */}
            <div
              className="flex items-center gap-1.5 border-t border-[var(--glass-border-subtle)] pt-1"
              onClick={ownerSlot ? (e) => { e.preventDefault(); e.stopPropagation(); } : undefined}
              onMouseDown={ownerSlot ? (e) => e.stopPropagation() : undefined}
              onPointerDown={ownerSlot ? (e) => e.stopPropagation() : undefined}
              onTouchStart={ownerSlot ? (e) => e.stopPropagation() : undefined}
            >
              {ownerSlot ?? (
                <Chip variant="brand" className="cursor-pointer transition-colors hover:bg-[rgba(91,111,245,0.22)]">
                  {deal.owner.name}
                </Chip>
              )}
              {moveMenuSlot && (
                <div
                  className="ml-auto"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {moveMenuSlot}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>

      {unreplied ? <AwaitingReplyFooter unreadCount={unread} /> : null}
    </a>
  )
}
