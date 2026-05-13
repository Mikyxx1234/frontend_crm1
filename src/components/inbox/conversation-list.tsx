"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import {
  Check, CheckCheck, CheckSquare, FileText, Film, Image as ImageIcon, LayoutTemplate, ListChecks, Loader2, MessageSquare, Mic, Paperclip, Phone, Square, StickyNote, Tag as TagIcon, Timer, UserPlus, UserRound,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { MotionDiv, staggerItem } from "@/components/ui/motion";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { SwipeRow } from "@/components/inbox/swipe-row";
import { cn } from "@/lib/utils";
import { ds } from "@/lib/design-system";
import type { InboxFilters } from "@/components/inbox/inbox-filters";

export type ConversationLastMessagePreview = {
  content: string;
  messageType: string;
  mediaUrl: string | null;
  direction: string;
};

export type ConversationListRow = {
  id: string;
  externalId: string | null;
  channel: string;
  status: string;
  inboxName: string | null;
  updatedAt: string;
  lastInboundAt?: string | null;
  lastMessageDirection?: string | null;
  lastMessagePreview: ConversationLastMessagePreview | null;
  unreadCount?: number;
  hasError?: boolean;
  contact: { id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null };
  tags?: { id?: string; name: string; color: string }[];
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
};

type ListResponse = { items: ConversationListRow[]; total: number; page: number; perPage: number };
type InboxTab = "entrada" | "esperando" | "respondidas" | "automacao" | "finalizados" | "erro";

function buildUrl(tab: InboxTab, filters: InboxFilters): string {
  const q = new URLSearchParams({ perPage: "60", tab });
  if (filters.ownerId) q.set("ownerId", filters.ownerId);
  if (filters.channel) q.set("channel", filters.channel);
  if (filters.stageId) q.set("stageId", filters.stageId);
  if (filters.tagIds?.length) q.set("tagIds", filters.tagIds.join(","));
  if (filters.sortBy) q.set("sortBy", filters.sortBy);
  if (filters.sortOrder) q.set("sortOrder", filters.sortOrder);
  return `/api/conversations?${q.toString()}`;
}

async function fetchConversations(tab: InboxTab, filters: InboxFilters): Promise<ListResponse> {
  const res = await fetch(apiUrl(buildUrl(tab, filters)));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar conversas");
  return data as ListResponse;
}

function shortTime(dateStr: string): string {
  try {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}sem`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch { return ""; }
}

const SESSION_HOURS = 24;

type PreviewVisual = {
  icon: React.ComponentType<{ size?: number; className?: string }> | null;
  iconClass: string;
  label: string;
};

function extractExtension(name: string): string {
  const m = name.match(/\.([a-z0-9]{1,6})(?:$|\?)/i);
  return m ? m[1].toLowerCase() : "";
}

function describePreview(preview: ConversationLastMessagePreview | null): PreviewVisual {
  if (!preview) return { icon: null, iconClass: "", label: "Sem mensagem" };

  const { content, messageType, mediaUrl } = preview;
  const mt = (messageType || "").toLowerCase();
  const raw = content.trim();

  // Template (identificado pelo marker no content)
  if (/\[TEMPLATE:/i.test(raw)) {
    return { icon: LayoutTemplate, iconClass: "text-violet-500", label: "Template" };
  }

  // Nota interna — sinalização explícita: ícone `StickyNote` (post-it,
  // mais semântico que `FileText`) + prefixo "Nota: " antes do conteúdo.
  // Cor `slate-500` (cinza médio) alinhada com a paleta NEUTRA da nota
  // renderizada no chat (faixa borda-a-borda em `slate-50` / borda
  // `slate-300`). Antes era âmbar, mas a paleta amarela "competia"
  // com badges de prioridade; cinza separa nota de mensagem real sem
  // alarmar visualmente.
  if (mt === "note") {
    const noteText = raw.replace(/^"+|"+$/g, "").trim();
    return {
      icon: StickyNote,
      iconClass: "text-slate-500",
      label: noteText ? `Nota: ${noteText}` : "Nota interna",
    };
  }

  // Chamada WhatsApp (evento) — preview enxuto. O `content` cru vem
  // da string verbosa de `buildTerminateChatLine`/`buildConnectChatLine`
  // (`Chamada · fim · 13s · 18:22`). Aqui extraímos só duração ou
  // status; o ícone Phone + label compacto bastam no card. Inclui
  // mensagens antigas (pre-2026-04-18) que vinham com `· ok` e
  // `· agente: X` na string.
  if (mt === "whatsapp_call") {
    const lower = raw.toLowerCase();
    const isFailed = lower.includes("falhou");
    const isTerminate = lower.includes("fim");
    const dur = raw.match(/(\d+m\d{2}s|\d+s)\b/)?.[1];
    let label: string;
    if (isFailed) label = "Chamada não completada";
    else if (isTerminate) label = dur ? `Chamada · ${dur}` : "Chamada finalizada";
    else if (lower.includes("entrada")) label = "Chamada recebida";
    else if (lower.includes("saída") || lower.includes("saida")) label = "Chamada realizada";
    else label = "Chamada";
    return {
      icon: Phone,
      iconClass: isFailed ? "text-rose-500" : "text-brand-blue",
      label,
    };
  }

  // Bracketed markers ([imagem], [áudio], etc.)
  if (/^\[(imagem|image|sticker)\]$/i.test(raw) || mt === "image" || mt === "sticker") {
    return { icon: ImageIcon, iconClass: "text-pink-500", label: "Imagem" };
  }
  if (mt === "whatsapp_call_recording") {
    return { icon: Phone, iconClass: "text-brand-blue", label: "Gravação de chamada" };
  }
  if (/^\[(áudio|audio|ptt)\]$/i.test(raw) || mt === "audio" || mt === "ptt") {
    return { icon: Mic, iconClass: "text-cyan-500", label: "Áudio" };
  }
  if (/^\[(vídeo|video)\]$/i.test(raw) || mt === "video") {
    return { icon: Film, iconClass: "text-rose-500", label: "Vídeo" };
  }
  if (/^\[(documento|document)\]$/i.test(raw) || mt === "document") {
    return { icon: FileText, iconClass: "text-indigo-500", label: extractDocLabel(raw) };
  }

  // Prefixo 📎 → anexo com nome
  if (/^📎\s/.test(raw)) {
    const name = raw.replace(/^📎\s*/, "").trim();
    const ext = extractExtension(name);
    if (/^(mp3|wav|ogg|m4a|aac|amr|opus|webm)$/i.test(ext)) {
      return { icon: Mic, iconClass: "text-cyan-500", label: "Áudio" };
    }
    if (/^(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(ext)) {
      return { icon: ImageIcon, iconClass: "text-pink-500", label: "Imagem" };
    }
    if (/^(mp4|mov|avi|3gp|mkv)$/i.test(ext)) {
      return { icon: Film, iconClass: "text-rose-500", label: "Vídeo" };
    }
    // Documento — tenta mostrar nome curto
    return {
      icon: FileText,
      iconClass: ext === "pdf" ? "text-rose-600" : /^(doc|docx)$/.test(ext) ? "text-blue-600" : /^(xls|xlsx|csv)$/.test(ext) ? "text-emerald-600" : "text-indigo-500",
      label: truncateFileName(name, 28),
    };
  }

  // Attachment type sem prefixo
  if (mt === "attachment" || mt === "file") {
    const u = mediaUrl ?? "";
    if (/\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(u)) return { icon: ImageIcon, iconClass: "text-pink-500", label: "Imagem" };
    if (/\.(mp3|wav|ogg|m4a|aac|amr|opus|webm)($|\?)/i.test(u)) return { icon: Mic, iconClass: "text-cyan-500", label: "Áudio" };
    if (/\.(mp4|mov|avi|3gp|mkv)($|\?)/i.test(u)) return { icon: Film, iconClass: "text-rose-500", label: "Vídeo" };
    return { icon: Paperclip, iconClass: "text-slate-500", label: "Anexo" };
  }

  // Texto comum
  return { icon: null, iconClass: "", label: raw || "Sem mensagem" };
}

function extractDocLabel(raw: string): string {
  const m = raw.match(/^\[(documento|document)\](.*)$/i);
  const rest = m?.[2]?.trim() ?? "";
  return rest || "Documento";
}

function truncateFileName(name: string, max: number): string {
  if (name.length <= max) return name;
  const ext = extractExtension(name);
  if (ext) {
    const base = name.slice(0, name.length - ext.length - 1);
    const keep = Math.max(4, max - ext.length - 2);
    return `${base.slice(0, keep)}…${ext ? `.${ext}` : ""}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

function getSessionTimer(lastInboundAt: string | null | undefined): { label: string; color: string } | null {
  if (!lastInboundAt) return null;
  const minsLeft = SESSION_HOURS * 60 - differenceInMinutes(new Date(), new Date(lastInboundAt));
  if (minsLeft <= 0) return { label: "Expirada", color: "var(--color-destructive)" };
  const h = Math.floor(minsLeft / 60);
  const m = minsLeft % 60;
  const label = h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") + "m" : ""}` : `${m}m`;
  if (h < 1) return { label, color: "var(--color-destructive)" };
  if (h < 8) return { label, color: "var(--color-warning)" };
  return { label, color: "var(--color-status-online)" };
}

type SelfAssignResponse = {
  settings: Record<string, boolean>;
  self: { role: string | null; canSelfAssign: boolean };
};

async function fetchSelfAssignCapability(): Promise<SelfAssignResponse> {
  const res = await fetch(apiUrl("/api/settings/self-assign"));
  if (!res.ok) throw new Error("Erro ao carregar permissões");
  return res.json();
}

export function ConversationList({
  tab, search, selectedId, onSelect, filters = {},
  selectionMode = false, selectedIds, onToggleSelect, onSelectAll,
  currentUserId,
}: {
  tab: InboxTab; search: string; selectedId: string | null;
  onSelect: (row: ConversationListRow) => void;
  filters?: InboxFilters; selectionMode?: boolean;
  selectedIds?: Set<string>; onToggleSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  currentUserId?: string | null;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inbox-conversations", tab, filters],
    queryFn: () => fetchConversations(tab, filters),
    refetchInterval: 20_000,
  });

  const { data: selfAssignData } = useQuery({
    queryKey: ["self-assign-capability"],
    queryFn: fetchSelfAssignCapability,
    staleTime: 60_000,
  });
  const canSelfAssign = selfAssignData?.self.canSelfAssign ?? false;

  const assignMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/actions`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", assignedToId: userId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload?.message === "string" ? payload.message : "Falha ao atribuir");
      }
      return payload;
    },
    onSuccess: () => {
      toast.success("Conversa atribuída a você");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível atribuir a conversa");
    },
  });

  // Swipe actions: mark-read e resolve. Acessam endpoints já existentes
  // e simplesmente invalidam a lista. Toasts curtos pra feedback.
  const markReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/read`), {
        method: "POST",
      });
      if (!res.ok) throw new Error("Falha ao marcar como lida");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/actions`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload?.message === "string" ? payload.message : "Falha ao finalizar");
      }
    },
    onSuccess: () => {
      toast.success("Conversa finalizada");
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = React.useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const assignee = row.assignedTo?.name?.toLowerCase() ?? "";
      return (
        row.contact.name.toLowerCase().includes(q)
        || (row.contact.phone ?? "").includes(q)
        || assignee.includes(q)
      );
    });
  }, [data?.items, search]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/3 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
        <p className="text-[13px] text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar."}
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <MessageSquare className="size-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">{search ? "Nenhum resultado" : "Nenhuma conversa nesta aba"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      {selectionMode && onSelectAll && filtered.length > 0 && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <button type="button" onClick={() => onSelectAll(filtered.map((r) => r.id))}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent transition-colors hover:text-primary">
            <ListChecks className="size-3.5" /> Selecionar tudo ({filtered.length})
          </button>
          {selectedIds && selectedIds.size > 0 && (
            <button type="button" onClick={() => onSelectAll([])}
              className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">Limpar</button>
          )}
        </div>
      )}

      <ul>
        {filtered.map((row) => (
          <ConversationItem
            key={row.id}
            row={row}
            active={row.id === selectedId}
            selectionMode={selectionMode}
            checked={selectedIds?.has(row.id) ?? false}
            onSelect={onSelect}
            onToggleSelect={onToggleSelect}
            currentUserId={currentUserId}
            canSelfAssign={canSelfAssign}
            onSelfAssign={(conversationId) => {
              if (!currentUserId) return;
              assignMutation.mutate({ conversationId, userId: currentUserId });
            }}
            assigningId={assignMutation.isPending ? assignMutation.variables?.conversationId : undefined}
            onMarkRead={() => markReadMutation.mutate(row.id)}
            onResolve={() => resolveMutation.mutate(row.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function ConversationItem({
  row, active, selectionMode, checked, onSelect, onToggleSelect,
  canSelfAssign, onSelfAssign, assigningId,
  onMarkRead, onResolve,
}: {
  row: ConversationListRow;
  active: boolean;
  selectionMode: boolean;
  checked: boolean;
  onSelect: (row: ConversationListRow) => void;
  onToggleSelect?: (id: string) => void;
  currentUserId?: string | null;
  canSelfAssign?: boolean;
  onSelfAssign?: (conversationId: string) => void;
  assigningId?: string;
  onMarkRead?: () => void;
  onResolve?: () => void;
}) {
  const unread = (row.unreadCount ?? 0) > 0;
  const time = row.updatedAt ? shortTime(row.updatedAt) : "";
  const timer = getSessionTimer(row.lastInboundAt);

  const hasTags = row.tags && row.tags.length > 0;
  const visibleTags = (row.tags ?? []).slice(0, 2);
  const extraTagCount = (row.tags ?? []).length - 2;

  // Em mobile habilitamos swipe-to-action. Em desktop fica desativado
  // pra não atrapalhar drag de seleção / scroll mouse.
  const swipeActions = React.useMemo(() => {
    const arr: Array<{ key: string; label: string; icon: React.ReactNode; bg: string; onTrigger: () => void }> = [];
    if (unread && onMarkRead) {
      arr.push({
        key: "read",
        label: "Lida",
        icon: <Check className="size-5" strokeWidth={2.6} />,
        bg: "bg-blue-500",
        onTrigger: onMarkRead,
      });
    }
    if (onResolve && row.status === "OPEN") {
      arr.push({
        key: "resolve",
        label: "Fim",
        icon: <CheckCheck className="size-5" strokeWidth={2.6} />,
        bg: "bg-emerald-500",
        onTrigger: onResolve,
      });
    }
    return arr;
  }, [unread, onMarkRead, onResolve, row.status]);

  const item = (
    <MotionDiv
      {...staggerItem}
      layout
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 p-4 transition-colors duration-150",
        // Paleta alinhada ao DNA do chat/sales-hub: azul para estados
        // de atividade (unread/ativo), slate para neutro. Verde fica
        // reservado só para sinalização semântica (Ganho, timer ok).
        active
          ? "bg-blue-50/60"
          : unread
            ? "bg-blue-50/30 hover:bg-blue-50/50"
            : "bg-white hover:bg-slate-50",
      )}
      onClick={() => !selectionMode && onSelect(row)}
      aria-label={unread ? `${row.contact.name || "Conversa"} — ${row.unreadCount} mensagens não lidas` : undefined}
    >
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
        {!active && unread && (
          <div aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
        )}

        {selectionMode && (
          <button
            type="button"
            className="mt-3 shrink-0 text-muted-foreground transition-colors hover:text-accent"
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(row.id); }}
          >
            {checked ? <CheckSquare className="size-4 text-accent" /> : <Square className="size-4" />}
          </button>
        )}

        {/* Avatar column — 60px avatar com badge de unread e canal */}
        <ChatAvatar
          user={{ id: row.contact.id, name: row.contact.name, imageUrl: row.contact.avatarUrl }}
          phone={row.contact.phone ?? undefined}
          unreadCount={selectionMode ? 0 : row.unreadCount}
          channel={row.channel as ChatAvatarChannel}
          size={52}
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-start justify-between gap-2">
            <h3
              className={cn(
                "truncate text-[16px] leading-tight tracking-tight text-slate-900",
              )}
              style={{ fontWeight: 800 }}
            >
              {row.contact.name || row.contact.phone || "Sem nome"}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {time && (
                <span className={cn(
                  "text-[11px] tabular-nums",
                  unread ? "font-black text-blue-600" : "font-bold text-slate-400",
                )}>
                  {time}
                </span>
              )}
              {unread && (
                <TooltipHost
                  label={`${row.unreadCount} nova${row.unreadCount === 1 ? "" : "s"} mensage${row.unreadCount === 1 ? "m" : "ns"}`}
                  side="left"
                >
                  <span
                    className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm tabular-nums"
                    aria-label={`${row.unreadCount} mensagens não lidas`}
                  >
                    {row.unreadCount! > 99 ? "99+" : row.unreadCount}
                  </span>
                </TooltipHost>
              )}
            </div>
          </div>

          <div className={cn(
            "mb-2 flex items-center gap-1.5 text-[12px]",
            unread ? "font-semibold text-slate-700" : "font-medium text-slate-500",
          )}>
            {row.lastMessageDirection === "out" && (
              <CheckCheck size={14} className={cn("shrink-0", active ? "text-blue-600" : "text-slate-300")} />
            )}
            {(() => {
              const { icon: PreviewIcon, iconClass, label } = describePreview(row.lastMessagePreview);
              return (
                <>
                  {PreviewIcon && <PreviewIcon size={13} className={cn("shrink-0", iconClass)} />}
                  <span className={cn("truncate", !PreviewIcon && !unread && "text-slate-400")}>{label}</span>
                </>
              );
            })()}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-1">
              {hasTags && (
                <TagIcon size={11} className={ds.tag.icon} aria-hidden="true" />
              )}
              {hasTags && visibleTags.map((tag) => (
                <TooltipHost key={tag.id ?? tag.name} label={tag.name} side="top">
                  {/* Tag chip — `ds.tag.solid` é a fonte única de verdade
                      pro DNA Chat ⇄ Sales Hub ⇄ Kanban ⇄ Lista. Não trocar
                      por classe local (quebra consistência visual). */}
                  <span
                    className={ds.tag.solid}
                    style={{ backgroundColor: tag.color }}
                  >
                    <span className="truncate">{tag.name}</span>
                  </span>
                </TooltipHost>
              ))}
              {extraTagCount > 0 && (
                <span className={ds.tag.more}>+{extraTagCount}</span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {row.assignedTo ? (
                <TooltipHost label={`Responsável: ${row.assignedTo.name}`} side="left">
                  <div className="relative">
                    <ChatAvatar
                      user={{
                        id: row.assignedTo.id,
                        name: row.assignedTo.name,
                        imageUrl: row.assignedTo.avatarUrl ?? null,
                      }}
                      size={28}
                      channel={null}
                      hideCartoon
                      className="ring-2 ring-white shadow-sm"
                    />
                  </div>
                </TooltipHost>
              ) : canSelfAssign && onSelfAssign ? (
                <TooltipHost label="Atribuir para mim" side="left">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelfAssign(row.id); }}
                    disabled={assigningId === row.id}
                    aria-label="Atribuir para mim"
                    className={cn(
                      // Mesma paleta do DNA do chat/sales-hub: blue como
                      // cor primária de ação. Evita a competição visual
                      // do verde (reservado pra "Ganho" e timer saudável).
                      "inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-95 disabled:opacity-60",
                    )}
                  >
                    {assigningId === row.id ? (
                      <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <UserPlus size={10} aria-hidden="true" />
                    )}
                    <span>Pegar</span>
                  </button>
                </TooltipHost>
              ) : (
                <TooltipHost label="Sem responsável atribuído" side="left">
                  <div className="flex size-[28px] items-center justify-center rounded-full border border-dashed border-slate-200 bg-white text-slate-300">
                    <UserRound size={14} />
                  </div>
                </TooltipHost>
              )}
              {timer && (
                timer.label === "Expirada" ? (
                  <span className="rounded-md border border-red-100 bg-red-50 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#dc2626] tabular-nums">
                    Expirada
                  </span>
                ) : (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums leading-none"
                    style={{ color: timer.color, backgroundColor: `${timer.color}14`, border: `1px solid ${timer.color}22` }}
                  >
                    {timer.label}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
    </MotionDiv>
  );

  // Sem ações revelaveis ou em modo seleção, retorna direto.
  if (selectionMode || swipeActions.length === 0) {
    return item;
  }

  return (
    <SwipeRow rightActions={swipeActions} className="bg-white">
      {item}
    </SwipeRow>
  );
}
