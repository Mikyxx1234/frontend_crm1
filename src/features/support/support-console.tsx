"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  IconArrowLeft,
  IconCircleCheck,
  IconClock,
  IconHeadset,
  IconLifebuoy,
  IconPlus,
  IconSend,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { AvatarGlass } from "@/components/crm/avatar-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { GlassCard } from "@/components/crm/glass-card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  useClaimSupportTicket,
  useCreateSupportTicket,
  useResolveSupportTicket,
  useSendSupportMessage,
  useSupportMessages,
  useSupportMeta,
  useSupportRealtime,
  useSupportTickets,
} from "./hooks";
import { SUPPORT_CATEGORIES, categoryLabel, type SupportTicket } from "./types";

type Mode = "mine" | "agent";

export function SupportConsole() {
  const { data: session } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id ?? "";

  const { data: meta, isLoading: metaLoading } = useSupportMeta();
  const [mode, setMode] = useState<Mode>("mine");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  useSupportRealtime(selectedId);

  const isAgent = meta?.isAgent ?? false;
  const scope = mode === "agent" ? "all" : "mine";
  const { data: tickets = [], isLoading: ticketsLoading } = useSupportTickets(
    scope,
    !!meta?.supportConfigured,
  );

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  if (metaLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[13px] text-[var(--text-muted)]">
        Carregando…
      </div>
    );
  }

  if (!meta?.supportConfigured) {
    return (
      <GlassCard variant="overlay" className="p-6 sm:p-8">
        <EmptyState
          icon={<IconLifebuoy size={28} className="text-[var(--brand-primary)]" />}
          title="Suporte ainda não configurado"
          description="Um administrador precisa marcar um departamento como “Suporte” em Configurações → Equipe → Departamentos para ativar o chat interno."
        />
      </GlassCard>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {isAgent && (
        <div className="flex shrink-0 gap-1 self-start rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1">
          <ModeTab active={mode === "mine"} onClick={() => { setMode("mine"); setSelectedId(null); setComposing(false); }} icon={IconLifebuoy} label="Meus chamados" />
          <ModeTab active={mode === "agent"} onClick={() => { setMode("agent"); setSelectedId(null); setComposing(false); }} icon={IconHeadset} label="Atendimento" />
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Lista */}
        <GlassCard
          variant="overlay"
          className={cn(
            "flex min-h-0 flex-col overflow-hidden p-0",
            selected || composing ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-border-subtle)] px-3.5 py-3">
            <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {mode === "agent" ? "Fila & atendimentos" : "Meus chamados"}
            </span>
            {mode === "mine" && (
              <ButtonGlass
                type="button"
                variant="primary"
                size="sm"
                onClick={() => { setComposing(true); setSelectedId(null); }}
              >
                <IconPlus size={14} />
                Novo
              </ButtonGlass>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {ticketsLoading ? (
              <p className="px-2 py-4 text-center text-[12px] text-[var(--text-muted)]">Carregando…</p>
            ) : tickets.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-[var(--text-muted)]">
                {mode === "agent" ? "Nenhum chamado na fila." : "Você ainda não abriu chamados."}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <TicketRow
                      ticket={t}
                      active={t.id === selectedId}
                      mode={mode}
                      onClick={() => { setSelectedId(t.id); setComposing(false); }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassCard>

        {/* Detalhe / form / chat */}
        <GlassCard
          variant="overlay"
          className={cn(
            "flex min-h-0 flex-col overflow-hidden p-0",
            !selected && !composing ? "hidden lg:flex" : "flex",
          )}
        >
          {composing ? (
            <NewTicketForm
              onCancel={() => setComposing(false)}
              onCreated={(t) => { setComposing(false); setSelectedId(t.id); }}
            />
          ) : selected ? (
            <ChatThread
              key={selected.id}
              ticket={selected}
              meId={meId}
              mode={mode}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={<IconHeadset size={26} className="text-[var(--brand-primary)]" />}
                title="Selecione um chamado"
                description={mode === "mine" ? "Ou abra um novo chamado para falar com o suporte." : "Escolha um chamado da fila ou dos seus atendimentos."}
              />
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[12.5px] font-bold transition-colors",
        active
          ? "bg-[var(--brand-primary)] text-white shadow-[0_3px_10px_rgba(91,111,245,0.3)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]",
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function StatusChip({ status }: { status: SupportTicket["status"] }) {
  const map = {
    OPEN: { label: "Em atendimento", cls: "bg-[var(--brand-primary)]/12 text-[var(--brand-primary)]" },
    PENDING: { label: "Na fila", cls: "bg-[var(--color-warning)]/12 text-[var(--color-warning)]" },
    RESOLVED: { label: "Resolvido", cls: "bg-[var(--color-success)]/12 text-[var(--color-success)]" },
  } as const;
  const m = map[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", m.cls)}>
      {status === "RESOLVED" ? <IconCircleCheck size={10} /> : status === "PENDING" ? <IconClock size={10} /> : null}
      {m.label}
    </span>
  );
}

function TicketRow({
  ticket,
  active,
  mode,
  onClick,
}: {
  ticket: SupportTicket;
  active: boolean;
  mode: Mode;
  onClick: () => void;
}) {
  const unread = mode === "agent" ? ticket.agentUnread : ticket.requesterUnread;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors",
        active ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-[var(--text-muted)]">#{ticket.number}</span>
        <span className="min-w-0 flex-1 truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
          {categoryLabel(ticket.category)}
        </span>
        {unread > 0 && (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </div>
      <p className="truncate text-[11.5px] text-[var(--text-muted)]">{ticket.description}</p>
      <div className="flex items-center gap-2">
        <StatusChip status={ticket.status} />
        {mode === "agent" && (
          <span className="truncate text-[10.5px] text-[var(--text-muted)]">
            {ticket.requester?.name}
          </span>
        )}
      </div>
    </button>
  );
}

function NewTicketForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (t: SupportTicket) => void;
}) {
  const [category, setCategory] = useState(SUPPORT_CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const create = useCreateSupportTicket();

  const submit = () => {
    if (!description.trim()) return;
    create.mutate(
      { category, description: description.trim() },
      {
        onSuccess: (t) => {
          toast.success(`Chamado #${t.number} aberto`);
          onCreated(t);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
      <h3 className="font-display text-base font-bold text-[var(--text-primary)]">Novo chamado</h3>
      <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
        Descreva seu problema. Um agente do suporte vai atender você por aqui.
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Tipo do problema
          </label>
          <DropdownGlass
            options={SUPPORT_CATEGORIES}
            value={category}
            onValueChange={setCategory}
            placeholder="Selecione"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Breve descrição
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Não consigo acessar o pipeline de vendas…"
            rows={5}
            className="w-full resize-y rounded-xl text-sm"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <ButtonGlass type="button" variant="glass" onClick={onCancel}>
          Cancelar
        </ButtonGlass>
        <ButtonGlass
          type="button"
          variant="primary"
          disabled={!description.trim() || create.isPending}
          onClick={submit}
        >
          <IconSend size={15} />
          Abrir chamado
        </ButtonGlass>
      </div>
    </div>
  );
}

function ChatThread({
  ticket,
  meId,
  mode,
  onBack,
}: {
  ticket: SupportTicket;
  meId: string;
  mode: Mode;
  onBack: () => void;
}) {
  const { data: messages = [] } = useSupportMessages(ticket.id);
  const send = useSendSupportMessage(ticket.id);
  const claim = useClaimSupportTicket();
  const resolve = useResolveSupportTicket();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const doSend = () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    send.mutate(value, { onError: (e: Error) => { toast.error(e.message); setText(value); } });
  };

  const isQueueForAgent = mode === "agent" && ticket.status === "PENDING";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3.5 py-2.5">
        <button type="button" onClick={onBack} className="lg:hidden text-[var(--text-muted)]" aria-label="Voltar">
          <IconArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[var(--text-muted)]">#{ticket.number}</span>
            <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
              {categoryLabel(ticket.category)}
            </span>
            <StatusChip status={ticket.status} />
          </div>
          <p className="truncate text-[11px] text-[var(--text-muted)]">
            {mode === "agent"
              ? `Solicitante: ${ticket.requester?.name ?? "—"}`
              : ticket.assignedTo
                ? `Atendente: ${ticket.assignedTo.name}`
                : "Aguardando um atendente…"}
          </p>
        </div>
        {mode === "agent" && ticket.status !== "RESOLVED" && (
          <div className="flex shrink-0 items-center gap-1.5">
            {isQueueForAgent && (
              <ButtonGlass
                type="button"
                variant="primary"
                size="sm"
                disabled={claim.isPending}
                onClick={() => claim.mutate(ticket.id, { onError: (e: Error) => toast.error(e.message) })}
              >
                Assumir
              </ButtonGlass>
            )}
            <ButtonGlass
              type="button"
              variant="glass"
              size="sm"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(ticket.id, { onError: (e: Error) => toast.error(e.message) })}
            >
              <IconCircleCheck size={14} />
              Resolver
            </ButtonGlass>
          </div>
        )}
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.map((m) => {
          if (m.authorType === "system") {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
                  {m.content}
                </span>
              </div>
            );
          }
          const mine = m.authorId === meId;
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine && (
                <AvatarGlass size="sm" name={m.author?.name ?? "?"} imageUrl={m.author?.avatarUrl ?? undefined} />
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug",
                  mine
                    ? "rounded-br-sm bg-[var(--brand-primary)] text-white"
                    : "rounded-bl-sm border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-primary)]",
                )}
              >
                {!mine && (
                  <p className="mb-0.5 text-[10.5px] font-semibold opacity-70">{m.author?.name}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      {ticket.status === "RESOLVED" && mode === "agent" ? (
        <div className="shrink-0 border-t border-[var(--glass-border-subtle)] px-4 py-3 text-center text-[12px] text-[var(--text-muted)]">
          Chamado resolvido.
        </div>
      ) : (
        <div className="flex shrink-0 items-end gap-2 border-t border-[var(--glass-border-subtle)] p-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                doSend();
              }
            }}
            placeholder="Escreva sua mensagem…"
            rows={1}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl text-sm"
          />
          <ButtonGlass
            type="button"
            variant="primary"
            size="icon"
            disabled={!text.trim() || send.isPending}
            onClick={doSend}
            aria-label="Enviar"
          >
            <IconSend size={16} />
          </ButtonGlass>
        </div>
      )}
    </div>
  );
}
