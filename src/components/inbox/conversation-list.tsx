"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Film,
  Filter,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  ListChecks,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  Plus,
  Search,
  Square,
  StickyNote,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { MotionDiv, staggerItem } from "@/components/ui/motion";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { PresenceDashboard } from "@/components/inbox/presence-dashboard";
import { SwipeRow } from "@/components/inbox/swipe-row";
import { dt } from "@/lib/design-tokens";
import { cn, tagPillStyle } from "@/lib/utils";
import type { InboxFilters } from "@/components/inbox/inbox-filters";
import type { InboxTab } from "@/services/conversations";

export type { InboxTab };

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
  lastMessageAt?: string | null;
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

export const TAB_CHIPS: Record<InboxTab, { label: string }> = {
  todos: { label: "Todos" },
  entrada: { label: "Entrada" },
  esperando: { label: "Esperando" },
  respondidas: { label: "Respondidos" },
  automacao: { label: "Automação" },
  finalizados: { label: "Finalizados" },
  erro: { label: "Erros" },
};

/** Ordem no seletor de categoria (dropdown). */
export const TAB_ORDER: InboxTab[] = [
  "todos",
  "esperando",
  "entrada",
  "respondidas",
  "automacao",
  "finalizados",
  "erro",
];

type TabSemanticTone = "default" | "success" | "danger";

type TabConfig = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: TabSemanticTone;
  dividerBefore?: boolean;
};

const TAB_CONFIG: Record<InboxTab, TabConfig> = {
  todos: { label: "Todos", icon: List, tone: "default" },
  esperando: { label: "Esperando", icon: Clock, tone: "default" },
  entrada: { label: "Entrada", icon: Activity, tone: "default" },
  respondidas: { label: "Respondidos", icon: MessageCircle, tone: "default" },
  automacao: { label: "Automação", icon: Bot, tone: "default" },
  finalizados: { label: "Finalizados", icon: CheckCircle2, tone: "success", dividerBefore: true },
  erro: { label: "Erros", icon: AlertCircle, tone: "danger", dividerBefore: true },
};

function inboxTabTriggerToneClasses(tone: TabSemanticTone) {
  switch (tone) {
    case "success":
      return {
        icon: "text-[var(--color-success)]",
        label: "text-[var(--color-success)]",
        count: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
      };
    case "danger":
      return {
        icon: "text-[var(--color-destructive)]",
        label: "text-[var(--color-destructive)]",
        count: "bg-destructive/10 text-[var(--color-destructive)]",
      };
    default:
      return {
        icon: "text-primary",
        label: "text-primary",
        count: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
      };
  }
}

function inboxTabRowSurface(tone: TabSemanticTone, isActive: boolean) {
  if (isActive) return "bg-[var(--color-primary-soft)]";
  switch (tone) {
    case "success":
      return "hover:bg-[var(--color-success)]/10";
    case "danger":
      return "hover:bg-[var(--color-destructive)]/10";
    default:
      return "hover:bg-[var(--color-bg-subtle)]";
  }
}

function inboxTabRowIconClass(tone: TabSemanticTone, isActive: boolean) {
  if (isActive) return "text-primary";
  switch (tone) {
    case "success":
      return "text-[var(--color-success)]";
    case "danger":
      return "text-[var(--color-destructive)]";
    default:
      return "text-[var(--color-ink-muted)]";
  }
}

function inboxTabRowLabelClass(tone: TabSemanticTone, isActive: boolean) {
  if (isActive) return "font-semibold text-primary";
  switch (tone) {
    case "success":
      return "font-medium text-[var(--color-success)]";
    case "danger":
      return "font-medium text-[var(--color-destructive)]";
    default:
      return "font-medium text-foreground";
  }
}

function inboxTabRowCountClass(tone: TabSemanticTone, isActive: boolean) {
  if (isActive) {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]";
  }
  switch (tone) {
    case "success":
      return "bg-[var(--color-success)]/15 text-[var(--color-success)]";
    case "danger":
      return "bg-destructive/10 text-[var(--color-destructive)]";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export type AgentPresenceStatus = "ONLINE" | "OFFLINE" | "AWAY";

export type InboxListHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  /** Busca já aplicada na API (debounced) — mostra aviso de busca global. */
  appliedSearch?: string;
  activeTab: InboxTab;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectionMode: boolean;
  onExitSelectionMode: () => void;
  onEnterSelectionMode: () => void;
  counts: Record<InboxTab, number>;
  onTabChange: (tab: InboxTab) => void;
  myUserId?: string | null;
  sessionUserName?: string | null;
  sessionUserImage?: string | null;
  myAgentStatus: AgentPresenceStatus;
  agentCapacity?: {
    activeConversations: number;
    maxConcurrent: number;
    loadPct: number;
    tone: "healthy" | "busy" | "overloaded";
  } | null;
  agentCapacityLoading?: boolean;
};

export function InboxListHeader({
  search,
  onSearchChange,
  appliedSearch = "",
  activeTab,
  showFilters,
  onToggleFilters,
  selectionMode,
  onExitSelectionMode,
  onEnterSelectionMode,
  counts,
  onTabChange,
  myUserId,
  sessionUserName,
  sessionUserImage,
  myAgentStatus,
  agentCapacity,
  agentCapacityLoading,
}: InboxListHeaderProps) {
  return (
    <div className="shrink-0 bg-white">
      <div className="flex items-center justify-between px-3 pb-1.5 pt-3">
        <span className="text-[14px] font-semibold text-slate-900">Conversas</span>
        <div className="flex min-w-0 max-w-[min(100%,11rem)] items-center gap-2">
          {myUserId ? (
            <div className="flex items-center gap-1.5">
              <PresenceDashboard
                agent={{ id: myUserId, name: sessionUserName ?? "Agente", imageUrl: sessionUserImage ?? null }}
                status={myAgentStatus}
                capacity={agentCapacity?.loadPct}
                activeConversations={agentCapacity?.activeConversations}
                maxConcurrent={agentCapacity?.maxConcurrent}
                tone={agentCapacity?.tone}
                capacityLoading={agentCapacityLoading}
                compact
              />

              {counts.esperando > 0 ? (
                <TooltipHost label={`${counts.esperando} esperando você`} side="bottom">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTabChange("esperando");
                    }}
                    className="relative inline-flex h-7 items-center justify-center rounded-[4px] px-2 text-[var(--color-destructive)] lumen-transition hover:bg-slate-50"
                    aria-label={`Esperando: ${counts.esperando}`}
                  >
                    <Clock className="size-3.5" strokeWidth={2.5} />
                    <span className="ml-1 inline-flex min-w-[16px] items-center justify-center rounded-[4px] bg-[var(--color-destructive)] px-1 py-0.5 text-[9px] font-bold leading-none text-white tabular-nums">
                      {counts.esperando > 99 ? "99+" : counts.esperando}
                    </span>
                  </button>
                </TooltipHost>
              ) : null}
            </div>
          ) : null}
          <TooltipHost label={selectionMode ? "Sair seleção" : "Nova conversa"} side="bottom">
            <button
              type="button"
              onClick={() => (selectionMode ? onExitSelectionMode() : onEnterSelectionMode())}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)] transition-colors hover:bg-primary/90"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
            </button>
          </TooltipHost>
        </div>
      </div>

      {appliedSearch.trim().length > 0 && (
        <p className="mx-3 mb-1.5 rounded-lg border border-primary/20 bg-[var(--color-primary-soft)] px-2.5 py-1.5 text-[11px] font-medium text-primary">
          Buscando em <span className="font-semibold">todas as filas</span> — o contato pode aparecer mesmo fora da
          aba atual.
        </p>
      )}

      <div className="flex items-center gap-1.5 px-3 pb-2">
        <div className="flex h-8 flex-1 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5">
          <Search className="size-3 shrink-0 text-slate-400" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nome, telefone ou responsável…"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
          />
          {search ? (
            <button type="button" onClick={() => onSearchChange("")} className="text-slate-400 hover:text-slate-600">
              <X className="size-3" />
            </button>
          ) : null}
        </div>
        <TooltipHost label="Filtros" side="bottom">
          <button
            type="button"
            onClick={onToggleFilters}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:text-slate-600",
              showFilters && "border-blue-200 bg-blue-50 text-blue-600",
            )}
          >
            <Filter className="size-3.5" />
          </button>
        </TooltipHost>
      </div>

    </div>
  );
}

function buildUrl(tab: InboxTab, filters: InboxFilters, search: string): string {
  const q = new URLSearchParams({ perPage: "60", tab });
  if (filters.ownerId) q.set("ownerId", filters.ownerId);
  if (filters.channel) q.set("channel", filters.channel);
  if (filters.stageId) q.set("stageId", filters.stageId);
  if (filters.tagIds?.length) q.set("tagIds", filters.tagIds.join(","));
  if (filters.sortBy) q.set("sortBy", filters.sortBy);
  if (filters.sortOrder) q.set("sortOrder", filters.sortOrder);
  const s = search.trim();
  if (s) q.set("search", s);
  return `/api/conversations?${q.toString()}`;
}

async function fetchConversations(tab: InboxTab, filters: InboxFilters, search: string): Promise<ListResponse> {
  const res = await fetch(buildUrl(tab, filters, search));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar conversas");
  return data as ListResponse;
}

function InboxCategorySelect({
  activeTab,
  onTabChange,
  tabCounts,
  allowedTabKeys,
}: {
  activeTab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  tabCounts: Record<InboxTab, number>;
  allowedTabKeys?: readonly InboxTab[];
}) {
  const [selectOpen, setSelectOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  const includesTab = React.useCallback(
    (k: InboxTab) => !allowedTabKeys?.length || allowedTabKeys.includes(k),
    [allowedTabKeys],
  );

  const visibleKeys = React.useMemo(
    () => TAB_ORDER.filter(includesTab),
    [includesTab],
  );

  React.useEffect(() => {
    if (!selectOpen) return;
    function handleClick(e: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selectOpen]);

  React.useEffect(() => {
    setSelectOpen(false);
  }, [activeTab]);

  const activeConfig = TAB_CONFIG[activeTab];
  const ActiveIcon = activeConfig.icon;
  const triggerTone = inboxTabTriggerToneClasses(activeConfig.tone);
  const activeCount = tabCounts[activeTab] ?? 0;

  return (
    <div className="shrink-0 border-b border-border px-3 pb-2 pt-1" ref={selectRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setSelectOpen((v) => !v)}
          aria-expanded={selectOpen}
          aria-haspopup="listbox"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left shadow-[var(--shadow-sm)] transition-colors lumen-transition",
            "hover:border-input",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ActiveIcon className={cn("size-3.5 shrink-0", triggerTone.icon)} />
            <span className={cn("truncate text-[12px] font-semibold", triggerTone.label)}>
              {activeConfig.label}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeCount > 0 ? (
              <span
                className={cn(
                  "rounded px-1.5 text-[10px] font-semibold tabular-nums leading-[18px]",
                  triggerTone.count,
                )}
              >
                {activeCount}
              </span>
            ) : null}
            {selectOpen ? (
              <ChevronUp className="size-3.5 shrink-0 text-[var(--color-ink-muted)]" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="size-3.5 shrink-0 text-[var(--color-ink-muted)]" strokeWidth={2.5} />
            )}
          </div>
        </button>

        {selectOpen ? (
          <div
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-md)]"
            role="listbox"
            aria-label="Categoria da inbox"
          >
            {visibleKeys.map((key) => {
              const config = TAB_CONFIG[key];
              const Icon = config.icon;
              const isActive = activeTab === key;
              const count = tabCounts[key] ?? 0;
              return (
                <React.Fragment key={key}>
                  {config.dividerBefore ? <div className="mx-2 my-0.5 h-px bg-border" /> : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onTabChange(key);
                      setSelectOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left transition-colors lumen-transition",
                      inboxTabRowSurface(config.tone, isActive),
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className={cn("size-3.5 shrink-0", inboxTabRowIconClass(config.tone, isActive))} />
                      <span className={cn("truncate text-[11px]", inboxTabRowLabelClass(config.tone, isActive))}>
                        {config.label}
                      </span>
                    </div>
                    {count > 0 ? (
                      <span
                        className={cn(
                          "rounded px-1.5 text-[10px] font-semibold tabular-nums leading-[18px]",
                          inboxTabRowCountClass(config.tone, isActive),
                        )}
                      >
                        {count}
                      </span>
                    ) : null}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
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
      iconClass: isFailed ? "text-rose-500" : "text-primary",
      label,
    };
  }

  // Bracketed markers ([imagem], [áudio], etc.)
  if (/^\[(imagem|image|sticker)\]$/i.test(raw) || mt === "image" || mt === "sticker") {
    return { icon: ImageIcon, iconClass: "text-pink-500", label: "Imagem" };
  }
  if (mt === "whatsapp_call_recording") {
    return { icon: Phone, iconClass: "text-primary", label: "Gravação de chamada" };
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

  if (mt === "location" || /\[(localização|location)\]/i.test(raw)) {
    return { icon: MessageSquare, iconClass: "text-emerald-600", label: "Localização" };
  }
  if (mt === "contacts" || /\[(contato|contacts)\]/i.test(raw)) {
    return { icon: UserRound, iconClass: "text-sky-600", label: "Cartão de contato" };
  }
  if (mt === "reaction") {
    return { icon: MessageCircle, iconClass: "text-rose-500", label: "Reação" };
  }
  if (mt === "interactive" || mt === "button" || mt === "list") {
    return { icon: ListChecks, iconClass: "text-violet-600", label: mt === "list" ? "Lista" : "Botões" };
  }
  if (mt === "order" || mt === "product") {
    return { icon: FileText, iconClass: "text-amber-700", label: "Pedido / catálogo" };
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
  tab,
  searchQuery,
  selectedId,
  onSelect,
  filters = {},
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  currentUserId,
  onTabChange,
  tabCounts,
  allowedTabKeys,
}: {
  tab: InboxTab;
  /** Texto de busca já debounced (sincronizado com o aviso no header). */
  searchQuery: string;
  selectedId: string | null;
  onSelect: (row: ConversationListRow) => void;
  filters?: InboxFilters;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  currentUserId?: string | null;
  onTabChange: (tab: InboxTab) => void;
  tabCounts: Record<InboxTab, number>;
  allowedTabKeys?: readonly InboxTab[];
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inbox-conversations", tab, filters, searchQuery],
    queryFn: () => fetchConversations(tab, filters, searchQuery),
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

  /** Lista já filtrada no servidor (aba ou busca global). */
  const filtered = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <InboxCategorySelect
          activeTab={tab}
          onTabChange={onTabChange}
          tabCounts={tabCounts}
          allowedTabKeys={allowedTabKeys}
        />
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-slate-50 px-3 py-2.5">
              <Skeleton className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3 rounded" />
                <Skeleton className="h-3 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <InboxCategorySelect
          activeTab={tab}
          onTabChange={onTabChange}
          tabCounts={tabCounts}
          allowedTabKeys={allowedTabKeys}
        />
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
          <p className="text-[13px] text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar."}
          </p>
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <InboxCategorySelect
          activeTab={tab}
          onTabChange={onTabChange}
          tabCounts={tabCounts}
          allowedTabKeys={allowedTabKeys}
        />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <MessageSquare className="size-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Nenhum resultado na busca (todas as filas)" : "Nenhuma conversa nesta aba"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <InboxCategorySelect
        activeTab={tab}
        onTabChange={onTabChange}
        tabCounts={tabCounts}
        allowedTabKeys={allowedTabKeys}
      />
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
  const timeSource = row.lastMessageAt ?? row.updatedAt;
  const time = timeSource ? shortTime(timeSource) : "";
  const timer = getSessionTimer(row.lastInboundAt);

  const tags = row.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const extraTagCount = tags.length - visibleTags.length;
  const hasMetaRow = visibleTags.length > 0 || extraTagCount > 0;

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
        "group relative flex w-full cursor-pointer gap-2 border-b border-slate-50 px-3 py-2.5 transition-colors duration-150 hover:bg-[#F8FAFC]",
        active && "border-l-2 border-l-blue-600 bg-blue-50",
        !active && unread && "bg-blue-50/30 hover:bg-blue-50/50",
        !active && !unread && "bg-white",
      )}
      onClick={() => !selectionMode && onSelect(row)}
      aria-label={unread ? `${row.contact.name || "Conversa"} — ${row.unreadCount} mensagens não lidas` : undefined}
    >
      {selectionMode && (
        <button
          type="button"
          className="mt-2 shrink-0 text-muted-foreground transition-colors hover:text-accent"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(row.id);
          }}
        >
          {checked ? <CheckSquare className="size-4 text-accent" /> : <Square className="size-4" />}
        </button>
      )}

      <ChatAvatar
        user={{ id: row.contact.id, name: row.contact.name, imageUrl: row.contact.avatarUrl }}
        phone={row.contact.phone ?? undefined}
        unreadCount={selectionMode ? 0 : row.unreadCount}
        channel={row.channel as ChatAvatarChannel}
        size={28}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold text-slate-900">
            {row.contact.name || row.contact.phone || "Sem nome"}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Timer de sessão — ícone + tempo ao lado da hora */}
            {timer?.label === "Expirada" ? (
              <TooltipHost label="Sessão de 24h encerrada" side="top">
                <Clock className="size-3 text-red-400 shrink-0" strokeWidth={2.5} />
              </TooltipHost>
            ) : timer ? (
              <TooltipHost label="Tempo restante de sessão WhatsApp" side="top">
                <span className="inline-flex items-center gap-0.5">
                  <Clock
                    className={cn(
                      "size-3 shrink-0",
                      timer.color === "var(--color-destructive)" && "text-red-400",
                      timer.color === "var(--color-warning)" && "text-amber-400",
                      timer.color === "var(--color-status-online)" && "text-emerald-400",
                    )}
                    strokeWidth={2.5}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      timer.color === "var(--color-destructive)" && "text-red-400",
                      timer.color === "var(--color-warning)" && "text-amber-500",
                      timer.color === "var(--color-status-online)" && "text-emerald-500",
                    )}
                  >
                    {timer.label}
                  </span>
                </span>
              </TooltipHost>
            ) : null}
            {time ? (
              <span
                className={cn(
                  "shrink-0 text-[10px] tabular-nums text-slate-400",
                  unread && "font-semibold text-blue-600",
                )}
              >
                {time}
              </span>
            ) : null}
            {unread ? (
              <TooltipHost
                label={`${row.unreadCount} nova${row.unreadCount === 1 ? "" : "s"} mensage${row.unreadCount === 1 ? "m" : "ns"}`}
                side="left"
              >
                <span
                  className="inline-flex min-w-[16px] items-center justify-center rounded-[4px] bg-primary px-1 py-0.5 text-[9px] font-bold leading-none text-primary-foreground shadow-[var(--shadow-sm)] tabular-nums"
                  aria-label={`${row.unreadCount} mensagens não lidas`}
                >
                  {row.unreadCount! > 99 ? "99+" : row.unreadCount}
                </span>
              </TooltipHost>
            ) : null}
          </div>
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          {row.lastMessageDirection === "out" && (
            <CheckCheck size={15} className={cn("shrink-0", active ? "text-blue-600" : "text-slate-300")} />
          )}
          {(() => {
            const { icon: PreviewIcon, iconClass, label } = describePreview(row.lastMessagePreview);
            return (
              <>
                {PreviewIcon ? <PreviewIcon size={14} className={cn("shrink-0", iconClass)} /> : null}
                <p
                  className={cn(
                    "min-w-0 flex-1 truncate text-[12px] text-slate-400",
                    unread && "font-medium text-slate-700",
                  )}
                >
                  {label}
                </p>
              </>
            );
          })()}
        </div>

        {hasMetaRow ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <TooltipHost key={tag.id ?? tag.name} label={tag.name} side="top">
                <span className={dt.pill.sm} style={tagPillStyle(tag.name, tag.color)}>
                  {tag.name}
                </span>
              </TooltipHost>
            ))}
            {extraTagCount > 0 ? (
              <span className="text-[10px] text-slate-400">+{extraTagCount}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5">
        {row.assignedTo ? (
          <TooltipHost label={`Responsável: ${row.assignedTo.name}`} side="left">
            <ChatAvatar
              user={{
                id: row.assignedTo.id,
                name: row.assignedTo.name,
                imageUrl: row.assignedTo.avatarUrl ?? null,
              }}
              size={20}
              channel={null}
              hideCartoon
            />
          </TooltipHost>
        ) : canSelfAssign && onSelfAssign ? (
          <TooltipHost label="Atribuir para mim" side="left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelfAssign(row.id);
              }}
              disabled={assigningId === row.id}
              aria-label="Atribuir para mim"
              className={cn(
                "inline-flex items-center gap-1 rounded-[4px] border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary transition-all duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-60",
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
            <div className="flex size-6 items-center justify-center rounded-full border border-dashed border-border bg-white text-slate-300">
              <UserRound size={12} />
            </div>
          </TooltipHost>
        )}
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
