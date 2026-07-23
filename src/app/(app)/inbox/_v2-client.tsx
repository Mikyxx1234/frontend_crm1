"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useBulkOperation, isBulkOperationFinished } from "@/hooks/use-bulk-operation";
import { RequirePermission } from "@/components/auth/require-permission";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconBell,
  IconBellOff,
  IconBriefcase,
  IconChevronDown,
  IconCircleCheck,
  IconMessageCircle,
  IconRotateClockwise,
  IconSquareCheck,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { ButtonGlass } from "@/components/crm/button-glass";

import { NavRail } from "@/components/crm/nav-rail";
import { ConversationColumn } from "@/components/crm/conversation-column";
import { ChatArea } from "@/components/crm/chat-area";
import type { Message as BubbleMessage } from "@/components/crm/message-bubble";
import { usePinDurationDialog } from "@/components/crm/pin-duration-dialog";
import { FavoritesPanel } from "@/components/crm/favorites-panel";
import { ContactAside } from "@/components/crm/contact-aside";
import { FieldConfigPanel } from "@/components/crm/fields/field-config-panel";
import { PageHeader } from "@/components/crm/page-header";
import { PageSearchBar } from "@/components/crm/page-toolbar";
import {
  ColumnResizer,
  usePersistentWidth,
} from "@/components/crm/column-resizer";
import { useIsDesktop } from "@/hooks/use-media-query";

import {
  isSessionExpired,
  toChatContact,
  toContactAside,
  toConversationCard,
  toMessageBubble,
} from "@/features/inbox-v2/adapters";
import {
  useBulkConversationAction,
  useConversationFeatures,
  useConversations,
  useContactSidebar,
  useInboxRealtime,
  useFavoriteMessage,
  useMarkConversationRead,
  useMessages,
  usePinMessage,
  useUnpinMessage,
  useReactMessage,
  useSelectedOutboundChannel,
  useSendMessage,
  useTabCounts,
  useWhatsappChannels,
  useInboxSoundMuted,
  CONVERSATION_REOPENED_EVENT,
} from "@/features/inbox-v2/hooks";
import {
  AssigneePopover,
  Composer,
  ConversationActionsMenu,
  ConversationTimelineTab,
  InboxFilterButton,
  TagsPopover,
  TemplatePickerList,
  whatsappTemplateToPending,
  type PendingTemplate,
} from "@/features/inbox-v2/extras";
import type { ConversationListRow, InboxFilters, InboxTab } from "@/features/inbox-v2/api";
import { hasInboxServerFilters } from "@/features/inbox-v2/api/types";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  useBoard,
  useDealDetail,
} from "@/features/pipeline-v2/hooks";
import { StagePicker } from "@/features/pipeline-v2/extras/stage-picker";
import { MoveToStageMenu } from "@/features/pipeline-v2/extras/move-to-stage-menu";
import { DealTagsPopover } from "@/features/pipeline-v2/extras/deal-tags-popover";
import { ContactTagsPopover } from "@/features/inbox-v2/extras/contact-tags-popover";
import { CallHistoryList } from "@/features/softphone/components/call-history-list";
import { DealCallButton } from "@/features/softphone/components/deal-call-button";
import { ActivitiesPanel } from "@/components/pipeline/deal-workspace/panels/activities";
import { DealNotesTab } from "@/features/pipeline-v2/extras";
import type { BoardStageDto } from "@/features/pipeline-v2/api";

// ── DealTagsTray — chips das tags do negócio + botão para adicionar/remover.
// Mostra ate 2 tags mais recentes; excedente vira `+N` com tooltip listando o resto.
function DealTagsTray({
  dealId,
  currentTags,
}: {
  dealId: string;
  currentTags: { id: string; name: string; color: string | null }[];
}) {
  const MAX_VISIBLE = 2;
  const visible = currentTags.slice(0, MAX_VISIBLE);
  const overflow = currentTags.slice(MAX_VISIBLE);

  function chip(t: { id: string; name: string; color: string | null }) {
    const color = t.color ?? "#5b6ff5";
    return (
      <span
        key={t.id}
        className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold whitespace-nowrap"
        style={{
          background: `color-mix(in srgb, ${color} 18%, white)`,
          color: `color-mix(in srgb, ${color} 75%, black)`,
          border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        }}
        title={t.name}
      >
        {t.name}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(chip)}
      {overflow.length > 0 && (
        <TooltipGlass label={overflow.map((t) => t.name).join(", ")}>
          <span className="inline-flex h-5 items-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2 text-[11px] font-semibold text-[var(--text-muted)]">
            +{overflow.length}
          </span>
        </TooltipGlass>
      )}
      <DealTagsPopover dealId={dealId} currentTags={currentTags} />
    </div>
  );
}

// ── ContactTagsTray — mesmo padrao de DealTagsTray, so troca o popover ──
function ContactTagsTray({
  contactId,
  currentTags,
}: {
  contactId: string;
  currentTags: { id: string; name: string; color: string | null }[];
}) {
  const MAX_VISIBLE = 2;
  const visible = currentTags.slice(0, MAX_VISIBLE);
  const overflow = currentTags.slice(MAX_VISIBLE);

  function chip(t: { id: string; name: string; color: string | null }) {
    const color = t.color ?? "#5b6ff5";
    return (
      <span
        key={t.id}
        className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold whitespace-nowrap"
        style={{
          background: `color-mix(in srgb, ${color} 18%, white)`,
          color: `color-mix(in srgb, ${color} 75%, black)`,
          border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        }}
        title={t.name}
      >
        {t.name}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(chip)}
      {overflow.length > 0 && (
        <TooltipGlass label={overflow.map((t) => t.name).join(", ")}>
          <span className="inline-flex h-5 items-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2 text-[11px] font-semibold text-[var(--text-muted)]">
            +{overflow.length}
          </span>
        </TooltipGlass>
      )}
      <ContactTagsPopover contactId={contactId} currentTags={currentTags} triggerVariant="icon" />
    </div>
  );
}

const DEFAULT_FILTERS: InboxFilters = {};
const INBOX_FILTERS_STORAGE_KEY = "inbox-v2:filters";

function readStoredInboxFilters(): InboxFilters {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  try {
    const raw = window.localStorage.getItem(INBOX_FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_FILTERS;
    }
    return parsed as InboxFilters;
  } catch {
    return DEFAULT_FILTERS;
  }
}

function writeStoredInboxFilters(filters: InboxFilters) {
  try {
    const empty =
      !hasInboxServerFilters(filters) &&
      !filters.sortBy &&
      !filters.sortOrder &&
      !filters.windowState;
    if (empty) {
      window.localStorage.removeItem(INBOX_FILTERS_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(INBOX_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* localStorage indisponível */
  }
}

// Ordem das tabs alinhada ao legado (`conversation-list.tsx`
// TAB_ORDER). "Automação" lista conversas cujo contato tem automação
// RUNNING (fila de automação). "erro" volta depois se houver demanda.
const TABS: ReadonlyArray<{ id: InboxTab; label: string }> = [
  { id: "todos", label: "Todas" },
  { id: "esperando", label: "Aguardando" },
  { id: "entrada", label: "Entrada" },
  { id: "respondidas", label: "Respondidas" },
  { id: "automacao", label: "Automação" },
  { id: "finalizados", label: "Resolvidas" },
];

// Tab selecionada persiste em localStorage — sobrevive F5/navegação.
// Default "esperando" (Aguardando): ao abrir sem escolha salva, evita cair
// em "Todas". Se o usuário escolher "Todas" (ou outra), a escolha é mantida.
const INBOX_TAB_STORAGE_KEY = "inbox-v2:tab";
const DEFAULT_INBOX_TAB: InboxTab = "esperando";

function readStoredInboxTab(): InboxTab {
  if (typeof window === "undefined") return DEFAULT_INBOX_TAB;
  try {
    const raw = window.localStorage.getItem(INBOX_TAB_STORAGE_KEY);
    if (raw && TABS.some((t) => t.id === raw)) return raw as InboxTab;
    return DEFAULT_INBOX_TAB;
  } catch {
    return DEFAULT_INBOX_TAB;
  }
}

function writeStoredInboxTab(tab: InboxTab) {
  try {
    window.localStorage.setItem(INBOX_TAB_STORAGE_KEY, tab);
  } catch {
    /* localStorage indisponível */
  }
}

/**
 * Props opcionais — usadas para reaproveitar o chat dentro de um shell
 * diferente (ex.: segmento real `/v2/inbox` que injeta o `<NavRailV2 />`
 * com hrefs novos). Sem nada passado, o componente mantém o comportamento
 * legado: renderiza o `<NavRail />` antigo internamente.
 */
interface InboxV2ClientPageProps {
  /** Override do trilho de navegação (1ª coluna). */
  navRail?: React.ReactNode;
  /**
   * Metadados do cabeçalho de página opcional, renderizado ACIMA das
   * colunas (estilo "Caixa de entrada" do DS de referência). Quando
   * presente, a busca e o filtro sobem para este header (busca à
   * direita, filtro ao centro) e somem da coluna de conversas. Quando
   * ausente, mantém o layout legado de linha única (busca/filtro na
   * própria coluna) — usado por `(v2)/inbox-v2`.
   */
  pageHeader?: {
    icon: React.ReactNode;
    title: string;
  };
}

export default function InboxV2ClientPage({
  navRail,
  pageHeader,
}: InboxV2ClientPageProps = {}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const isDesktop = useIsDesktop();

  // ── Largura das colunas (persistidas) ─────────────────────────
  const [convWidth, setConvWidth] = usePersistentWidth(
    "inbox-v2:conv-width",
    320,
  );
  const [asideWidth, setAsideWidth] = usePersistentWidth(
    "inbox-v2:aside-width",
    340,
  );

  // ── Estado de UI local ─────────────────────────────────────────
  // Default "esperando" (Aguardando). A escolha do usuário é salva em
  // localStorage e restaurada no F5 (lê no effect, SSR-safe).
  const [tab, setTab] = useState<InboxTab>(DEFAULT_INBOX_TAB);
  const [tabHydrated, setTabHydrated] = useState(false);
  useEffect(() => {
    setTab(readStoredInboxTab());
    setTabHydrated(true);
  }, []);
  useEffect(() => {
    if (!tabHydrated) return;
    writeStoredInboxTab(tab);
  }, [tab, tabHydrated]);
  // Filtros do painel persistem em localStorage — sobrevive navegação
  // para outras páginas do CRM e refresh. Lê no effect (SSR-safe).
  const [filters, setFilters] = useState<InboxFilters>(DEFAULT_FILTERS);
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  useEffect(() => {
    setFilters(readStoredInboxFilters());
    setFiltersHydrated(true);
  }, []);
  useEffect(() => {
    if (!filtersHydrated) return;
    writeStoredInboxFilters(filters);
  }, [filters, filtersHydrated]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  // Template escolhido no modal (sessão expirada) → abre o painel no Composer.
  const [externalTemplate, setExternalTemplate] = useState<PendingTemplate | null>(null);
  const [asideCollapsed, setAsideCollapsed] = useState(false);
  const [mobilePaneTab, setMobilePaneTab] = useState<"chat" | "negocio">("chat");

  // ── Seleção múltipla + ações em massa (encerrar/reabrir) ────────
  // Modo explícito (como o legado): entrar em "seleção" desativa o clique
  // de abrir conversa nos cards (só o checkbox alterna), evitando abrir a
  // conversa errada por engano ao marcar várias.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // "Selecionar todas do filtro" — encerra TODAS as conversas do filtro atual
  // (todas as páginas, não só as carregadas). O backend resolve os ids pelo
  // mesmo `where` da lista e processa no leads-worker.
  const [selectAllFilter, setSelectAllFilter] = useState(false);
  const { confirm: confirmDialog, dialog: confirmDialogNode } = useConfirm();
  // Encerramento em massa roda no leads-worker (async). Guardamos o id da
  // BulkOperation pra pollar progresso e dar feedback ao terminar.
  const [bulkOpId, setBulkOpId] = useState<string | null>(null);

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setSelectAllFilter(false);
  }

  function toggleSelectOne(id: string) {
    // Qualquer toggle manual sai do modo "todas do filtro".
    setSelectAllFilter(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Trocar de aba muda o conjunto de conversas visíveis — limpa a seleção
  // pra não arrastar ids que já não aparecem na lista atual.
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAllFilter(false);
  }, [tab]);

  // Ao abrir uma nova conversa no mobile, volta sempre para o painel Chat.
  useEffect(() => {
    setMobilePaneTab("chat");
  }, [activeId]);

  // Debounce do search (300ms). Evita refetch a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Dados ───────────────────────────────────────────────────────
  // Ordem e janela são CLIENT-SIDE — não vão ao servidor (evita refetch
  // ao mudar ordenação e a limitação do `sortBy` do backend).
  const { sortBy, sortOrder, windowState, ...serverFilters } = filters;

  const {
    data: listData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations({
    tab,
    filters: serverFilters,
    search: debouncedSearch,
    enabled: isAuthenticated,
  });
  const rawRows = (listData?.items ?? []).filter(Boolean);

  // Ordena (default: última atividade primeiro) e filtra a janela de 24h.
  // Usa `lastMessageAt` (com fallback p/ `lastInboundAt`) para casar a ordem
  // com o `time` exibido no card — que também usa `lastMessageAt ?? lastInboundAt`
  // (ver `toConversationCard` em adapters.ts). Sem isso, mensagens outbound
  // recentes "puxam" o tempo no card mas não a posição na lista, parecendo
  // desordenado pro operador.
  // `lastMessageAt` só é tocado por NOVAS mensagens (in ou out), nunca por
  // leitura — então a posição continua estável ao marcar como lida (motivo
  // original pra evitar `updatedAt`).
  const rows = useMemo(() => {
    let list = rawRows;
    if (windowState === "open") {
      // "Aberta" = conversa não resolvida (OPEN/PENDING/SNOOZED).
      list = list.filter((r) => r.status !== "RESOLVED");
    } else if (windowState === "closed") {
      // "Fechada" = conversa resolvida.
      list = list.filter((r) => r.status === "RESOLVED");
    }
    const by = sortBy ?? "lastInboundAt";
    const sign = (sortOrder ?? "desc") === "asc" ? 1 : -1;
    const ts = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
    const lastActivityTs = (r: typeof rawRows[number]) =>
      ts(r.lastMessageAt ?? r.lastInboundAt);
    return [...list].sort((a, b) => {
      if (by === "unreadCount") {
        const d = (b.unreadCount ?? 0) - (a.unreadCount ?? 0);
        return d !== 0 ? d : lastActivityTs(b) - lastActivityTs(a);
      }
      return sign * (lastActivityTs(a) - lastActivityTs(b));
    });
  }, [rawRows, windowState, sortBy, sortOrder]);

  const { data: tabCounts } = useTabCounts(isAuthenticated);

  // ── Sticky activeRow ────────────────────────────────────────────
  // A `rows` reflete o filtro da aba atual (ex.: "entrada"). Se o
  // agente envia uma mensagem outbound, a conversa pode deixar de
  // pertencer ao filtro (move pra "respondidas") e sumir de `rows`.
  // Sem snapshot, `rows.find` devolve undefined e a janela do chat
  // fecha sozinha. Mantemos a ultima row vista enquanto o user nao
  // trocar de conversa explicitamente.
  const [stickyRow, setStickyRow] = useState<ConversationListRow | null>(null);

  useEffect(() => {
    if (!activeId) {
      setStickyRow(null);
      return;
    }
    const found = rows.find((r) => r.id === activeId);
    if (found) setStickyRow(found);
    // Se nao encontrou (saiu do filtro da aba), preserva o snapshot
    // anterior — NAO sobrescreve com null.
  }, [activeId, rows]);

  const activeRow = stickyRow;
  const activeContactId = activeRow?.contact?.id ?? null;

  const { data: messagesData } = useMessages(activeId);
  const messages = messagesData?.messages ?? [];
  const sessionInfo = messagesData?.session;

  const { data: contactDetail } = useContactSidebar(activeContactId);

  // ── Realtime ────────────────────────────────────────────────────
  useInboxRealtime({ activeConversationId: activeId, enabled: isAuthenticated });

  // Envio (texto/anexo/áudio) numa conversa encerrada reabre como NOVO
  // ticket — os botões de anexo disparam este evento global (estão fundos
  // demais na árvore pra prop-drilling). Troca o chat ativo pro id novo.
  useEffect(() => {
    function onReopened(e: Event) {
      const newId = (e as CustomEvent<{ newId: string }>).detail?.newId;
      if (newId) setActiveId(newId);
    }
    window.addEventListener(CONVERSATION_REOPENED_EVENT, onReopened);
    return () => window.removeEventListener(CONVERSATION_REOPENED_EVENT, onReopened);
  }, []);

  // ── Mutations ───────────────────────────────────────────────────
  const sendMessage = useSendMessage(activeId);
  const reactMessage = useReactMessage(activeId);
  const pinMessage = usePinMessage(activeId);
  const unpinMessage = useUnpinMessage(activeId);
  const favoriteMessageMutation = useFavoriteMessage(activeId);
  const markRead = useMarkConversationRead();
  const bulkAction = useBulkConversationAction();
  const { requestDuration: requestPinDuration, dialog: pinDurationDialog } = usePinDurationDialog();
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  // Handler de reação disparado pelo menu contextual de cada bubble.
  // WhatsApp: apertar o mesmo emoji novamente remove; escolher outro
  // substitui. Repassamos `""` pra remoção (backend interpreta como
  // toggle-off + envia reaction vazia à Meta pra limpar no cliente).
  function handleReactMessage(msg: { id: string }, emoji: string | null) {
    if (!activeId) return;
    reactMessage.mutate(
      { messageId: msg.id, emoji: emoji ?? "" },
      {
        onError: (err) => toast.error(err.message || "Falha ao reagir"),
      },
    );
  }

  // Fixar: toggle — clicar numa mensagem já fixada desafixa direto (igual
  // WhatsApp). Fixar uma NOVA abre o picker de duração (24h/7d/30d) antes
  // de confirmar. Várias podem ficar fixadas ao mesmo tempo (máx. 3).
  async function handlePinMessage(msg: { id: string; isPinnedMessage?: boolean }) {
    if (!activeId) return;
    if (msg.isPinnedMessage) {
      unpinMessage.mutate(
        { messageId: msg.id },
        {
          onSuccess: () => toast.success("Mensagem desafixada"),
          onError: (err) => toast.error(err.message || "Falha ao desafixar"),
        },
      );
      return;
    }
    const durationHours = await requestPinDuration();
    if (durationHours == null) return;
    pinMessage.mutate(
      { messageId: msg.id, durationHours },
      {
        onSuccess: () => toast.success("Mensagem fixada"),
        onError: (err) => toast.error(err.message || "Falha ao fixar"),
      },
    );
  }

  function handleUnpinMessage(messageId: string) {
    if (!activeId) return;
    unpinMessage.mutate(
      { messageId },
      { onError: (err) => toast.error(err.message || "Falha ao desafixar") },
    );
  }

  // Favoritar: marcador pessoal — sem `favorite` explícito, o backend
  // alterna o estado atual (evita round-trip extra pra saber o estado
  // prévio, que o front já tem local via `msg.isFavorited`).
  function handleFavoriteMessage(msg: { id: string; isFavorited?: boolean }) {
    favoriteMessageMutation.mutate(
      { messageId: msg.id, favorite: !msg.isFavorited },
      {
        onSuccess: (res) =>
          toast.success(res.favorited ? "Mensagem favoritada" : "Removida dos favoritos"),
        onError: (err) => toast.error(err.message || "Falha ao favoritar"),
      },
    );
  }

  // Reply (estilo WhatsApp): guarda a msg selecionada e o Composer mostra
  // a barra de preview. senderName é derivado (backend não retorna direto).
  const [replyTo, setReplyTo] = useState<{
    id: string;
    preview: string;
    senderName?: string | null;
  } | null>(null);

  function handleReplyMessage(message: BubbleMessage) {
    const preview = (message.content ?? "").slice(0, 120);
    const senderName =
      message.type === "incoming"
        ? contactName
        : message.senderName ?? "Você";
    setReplyTo({ id: message.id, preview, senderName });
  }
  const { features: convFeatures } = useConversationFeatures();

  async function handleBulkAction(action: "resolve" | "reopen") {
    const ids = [...selectedIds];
    // "Todas do filtro" só se aplica a Encerrar (reabrir em massa é bloqueado).
    const useAllInFilter = selectAllFilter && action === "resolve";
    if (!useAllInFilter && ids.length === 0) return;

    const filterTotal = listData?.total ?? ids.length;

    if (useAllInFilter) {
      const ok = await confirmDialog({
        title: `Encerrar ${filterTotal.toLocaleString("pt-BR")} conversa${filterTotal > 1 ? "s" : ""}?`,
        description:
          "Todas as conversas do filtro atual (todas as páginas) serão encerradas em segundo plano pelo worker. Esta ação não pode ser desfeita em massa.",
        confirmLabel: "Encerrar todas",
        destructive: true,
      });
      if (!ok) return;
    }

    const count = useAllInFilter ? filterTotal : ids.length;
    bulkAction.mutate(
      useAllInFilter
        ? {
            ids: [],
            action,
            allInFilter: true,
            tab,
            search: debouncedSearch,
            filters: serverFilters as Record<string, unknown>,
          }
        : { ids, action },
      {
        onSuccess: (result) => {
          // Encerrar roda no worker (async): guarda o operationId pra pollar
          // e mostra feedback de "em segundo plano". O toast final (sucesso/
          // parcial/falha) vem do efeito de polling abaixo.
          if (result?.operationId) {
            setBulkOpId(result.operationId);
            const total = result.total ?? count;
            toast.info(
              `Encerrando ${total} conversa${total > 1 ? "s" : ""} em segundo plano…`,
            );
            exitSelectionMode();
            return;
          }
          // Sem operationId → nada a processar (já encerradas / exigem tabulação).
          if (action === "resolve") {
            toast.info("Nenhuma conversa para encerrar.");
          } else {
            toast.success(
              `${count} conversa${count > 1 ? "s" : ""} reaberta${count > 1 ? "s" : ""}`,
            );
          }
          exitSelectionMode();
        },
      },
    );
  }

  // ── Polling do encerramento em massa (leads-worker) ─────────────
  const qc = useQueryClient();
  const bulkOp = useBulkOperation(bulkOpId);
  const bulkOpStatus = bulkOp.data?.status;
  useEffect(() => {
    if (!bulkOpId || !isBulkOperationFinished(bulkOpStatus)) return;
    const d = bulkOp.data;
    if (d) {
      if (bulkOpStatus === "COMPLETED") {
        toast.success(`${d.succeeded} conversa${d.succeeded > 1 ? "s" : ""} encerrada${d.succeeded > 1 ? "s" : ""}`);
      } else if (bulkOpStatus === "PARTIAL") {
        toast.warning(`${d.succeeded} encerrada(s), ${d.failed} falharam`);
      } else if (bulkOpStatus === "FAILED") {
        toast.error("Falha ao encerrar as conversas em massa.");
      }
    }
    qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
    qc.invalidateQueries({ queryKey: ["conversations", "tab-counts"] });
    setBulkOpId(null);
  }, [bulkOpId, bulkOpStatus, bulkOp.data, qc]);

  // Seletor de canal: lista de WhatsApps CONNECTED da org + estado
  // persistido por conversa. Quando a org tem 1 só canal, o widget não
  // aparece e o backend usa o canal "atual" da conversa (legacy).
  const { data: whatsappChannels } = useWhatsappChannels(isAuthenticated);
  const conversationChannelId = messagesData?.channel?.id ?? null;
  const { selectedChannelId, setSelectedChannelId } = useSelectedOutboundChannel(
    {
      conversationId: activeId,
      conversationChannelId,
      availableChannels: whatsappChannels,
    },
  );

  function handleSelect(id: string) {
    setActiveId(id);
    markRead.mutate(id);
    setReplyTo(null);
  }

  function handleSend(value: string) {
    if (!activeId) return;
    sendMessage.mutate(
      {
        content: value,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
        // Só envia override quando o canal escolhido difere do canal
        // atual da conversa — caminho rápido no backend (sem round-trip
        // extra de validação) e nenhum efeito visível pro agente que
        // não trocou de canal.
        ...(selectedChannelId && selectedChannelId !== conversationChannelId
          ? { channelId: selectedChannelId }
          : {}),
      },
      {
        onSuccess: (data) => {
          setDraft("");
          setReplyTo(null);
          // Conversa estava encerrada e o envio reabriu como NOVO ticket:
          // troca o chat ativo para o id novo (regra "reabrir = novo id").
          if (data.reopenedConversationId) {
            setActiveId(data.reopenedConversationId);
          }
        },
        onError: (err) => toast.error(err.message || "Falha ao enviar"),
      },
    );
  }

  function handleSendNote(value: string) {
    if (!activeId) return;
    sendMessage.mutate(
      { content: value, asNote: true },
      {
        onSuccess: () => setDraft(""),
        onError: (err) => toast.error(err.message || "Falha ao salvar nota"),
      },
    );
  }

  // ── Adapters → tipos do v0 ─────────────────────────────────────
  const conversationCards = useMemo(
    () =>
      rows
        .filter(Boolean)
        .map((r) => toConversationCard(r, { active: r.id === activeId })),
    [rows, activeId],
  );
  const contactName = activeRow?.contact?.name ?? "";
  const pinnedMessageIds = useMemo(
    () => messagesData?.pinnedMessageIds ?? [],
    [messagesData?.pinnedMessageIds],
  );
  const pinnedIdSet = useMemo(() => new Set(pinnedMessageIds), [pinnedMessageIds]);
  const messageBubbles = useMemo(
    () =>
      messages.map((m) => {
        const bubble = toMessageBubble(m, contactName);
        return pinnedIdSet.has(m.id) ? { ...bubble, isPinnedMessage: true } : bubble;
      }),
    [messages, contactName, pinnedIdSet],
  );
  // Previews do banner "fixadas" (várias, estilo WhatsApp) — derivados do
  // próprio array já carregado, na ordem em que o backend os retorna.
  const pinnedMessagesPreview = useMemo(() => {
    return pinnedMessageIds
      .map((pid) => messageBubbles.find((m) => m.id === pid))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => ({ id: m.id, content: m.content, senderName: m.senderName ?? null }));
  }, [pinnedMessageIds, messageBubbles]);
  const chatContact = activeRow ? toChatContact(activeRow) : null;
  // Backend é source of truth quando disponível (`session.active`).
  // Fallback heurístico: se o backend não enviou `session`, calculamos a
  // janela de 24h via `isSessionExpired(lastInboundAt)`. Garante que o
  // alerta volte a aparecer mesmo em cenários onde o payload do messages
  // não inclui o objeto `session` (ex.: cache stale, payload reduzido,
  // backends mais antigos). Só decide depois que `messagesData` chegou
  // para evitar falso-positivo durante o loading inicial.
  const sessionActiveFromBackend = sessionInfo?.active;
  const sessionExpired = activeRow && messagesData
    ? sessionActiveFromBackend !== undefined
      ? !sessionActiveFromBackend
      : isSessionExpired(sessionInfo?.lastInboundAt ?? activeRow.lastInboundAt)
    : false;
  // Bloco C (25/jun/26): backend pode setar `canReply:false` quando o
  // usuário não tem `channel.send`. Default true preserva compat com
  // backend antigo (que não envia o campo).
  const canReply = messagesData?.canReply ?? true;
  const composerDisabled = !canReply || sessionExpired;
  const composerPlaceholder = !canReply
    ? "Você não tem permissão para enviar mensagens neste canal."
    : undefined;
  const contactAsideView = activeRow
    ? toContactAside(contactDetail, activeRow, messagesData?.channel ?? null)
    : null;

  // ── Stage pills no header do chat — placeholder até integrar com pipeline real
  // (Fase 9 conecta no /api/pipelines/:id/board e usa deriveStagePills).
  const stagePillsView = useMemo<
    { label: string; status: "done" | "active" | "pending" }[]
  >(() => [], []);

  const navRailNode = navRail ?? <NavRail />;

  // Com header de página, busca no centro do header e filtro nas actions.
  const searchInHeader = !!pageHeader;

  const useFilteredTabCount =
    hasInboxServerFilters(filters) || debouncedSearch.trim().length > 0;

  // Aviso sonoro por mensagem recebida — o botão só (des)liga a preferência
  // (persistida no localStorage). O ping em si toca no useInboxRealtime.
  const [soundMuted, setSoundMuted] = useInboxSoundMuted();
  const soundToggleNode = (
    <TooltipGlass
      label={soundMuted ? "Ativar aviso sonoro" : "Silenciar aviso sonoro"}
      side="bottom"
    >
      <button
        type="button"
        onClick={() => setSoundMuted(!soundMuted)}
        aria-pressed={!soundMuted}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors",
          soundMuted
            ? "border-[var(--color-warn)]/40 bg-[var(--color-warn-bg)] text-[var(--color-warn)] hover:text-[var(--color-warn)]"
            : "border-[var(--brand-primary)]/40 bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
        )}
      >
        {soundMuted ? <IconBellOff size={17} stroke={2} /> : <IconBell size={17} stroke={2} />}
      </button>
    </TooltipGlass>
  );

  // Botão que entra/sai do modo de seleção — vive ao lado do filtro, na
  // mesma linha do dropdown de status.
  const selectionToggleNode = (
    <TooltipGlass label={selectionMode ? "Sair da seleção" : "Selecionar conversas"} side="bottom">
      <button
        type="button"
        onClick={() => (selectionMode ? exitSelectionMode() : setSelectionMode(true))}
        aria-pressed={selectionMode}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors",
          selectionMode
            ? "border-[var(--brand-primary)]/40 bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:text-[var(--brand-primary)]",
        )}
      >
        {selectionMode ? <IconX size={17} stroke={2} /> : <IconSquareCheck size={17} stroke={2} />}
      </button>
    </TooltipGlass>
  );

  // Ações da barra de seleção — Encerrar/Reabrir (protegidas por permissão,
  // mesma regra do menu de ações de uma conversa) + Cancelar (sempre visível).
  const bulkActionsNode = (
    <div className="flex shrink-0 items-center gap-1.5">
      {selectedIds.size > 0 && (
        <RequirePermission permission="conversation:close">
          <ButtonGlass
            type="button"
            variant="glass"
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => handleBulkAction("resolve")}
          >
            <IconCircleCheck size={14} />
            <span className="ml-1.5">Encerrar</span>
          </ButtonGlass>
          <ButtonGlass
            type="button"
            variant="glass"
            size="sm"
            disabled={bulkAction.isPending}
            onClick={() => handleBulkAction("reopen")}
          >
            <IconRotateClockwise size={14} />
            <span className="ml-1.5">Reabrir</span>
          </ButtonGlass>
        </RequirePermission>
      )}
      <ButtonGlass type="button" variant="glass" size="sm" onClick={exitSelectionMode}>
        Cancelar
      </ButtonGlass>
    </div>
  );

  const conversationColumnNode = (
    <ConversationColumn
      conversations={conversationCards}
      activeConversationId={activeId ?? undefined}
      onSelectConversation={handleSelect}
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      hideSearch={searchInHeader}
      // Filtro sempre na ColumnConversa (ao lado do dropdown
      // "Todas/Aguardando/Entrada/..."). Quando `pageHeader` está ativo, a
      // busca sobe pro topo mas o filtro **fica** aqui — antes ele migrava
      // pro canto direito superior junto da busca, distante do controle
      // mais relacionado a ele (tabs de status).
      filterSlot={
        <>
          {soundToggleNode}
          {selectionToggleNode}
          <InboxFilterButton value={filters} onChange={setFilters} />
          {confirmDialogNode}
        </>
      }
      selectionMode={selectionMode}
      selectedIds={selectedIds}
      onToggleSelectOne={toggleSelectOne}
      onSelectAllChange={(ids) => {
        setSelectAllFilter(false);
        setSelectedIds(new Set(ids));
      }}
      totalCount={listData?.total}
      selectAllFilter={selectAllFilter}
      onSelectAllFilterChange={(v) => {
        setSelectAllFilter(v);
        // Ao ativar, marca todas as carregadas (mantém o master check ✓).
        if (v) setSelectedIds(new Set(conversationCards.map((c) => c.id)));
      }}
      bulkActionsSlot={bulkActionsNode}
      tabsOverride={TABS.map((t) => ({
        label: t.label,
        count:
          useFilteredTabCount && t.id === tab
            ? listData?.total
            : tabCounts?.[t.id] ?? undefined,
      }))}
      activeTabIndex={TABS.findIndex((t) => t.id === tab)}
      onTabChange={(idx) => {
        const next = TABS[idx]?.id;
        if (next) setTab(next);
      }}
      resizerSlot={
        isDesktop ? (
          <ColumnResizer
            value={convWidth}
            onChange={setConvWidth}
            min={280}
            max={440}
          />
        ) : undefined
      }
      onLoadMore={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      hasMore={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      className="h-full min-h-0"
      renderCardSlots={(c) => ({
        assigneeSlot: (
          <RequirePermission
            permission="conversation:reassign_others"
            fallback={
              <AssigneePopover
                conversationId={c.id}
                currentAssigneeName={c.assignee}
                currentAssigneeId={c.assigneeId ?? null}
                currentAssigneeImageUrl={c.assigneeAvatarUrl ?? null}
                disabled
              />
            }
          >
            <AssigneePopover
              conversationId={c.id}
              currentAssigneeName={c.assignee}
              currentAssigneeId={c.assigneeId ?? null}
              currentAssigneeImageUrl={c.assigneeAvatarUrl ?? null}
            />
          </RequirePermission>
        ),
      })}
    />
  );

  // Tags da conversa ativa — até 2 chips + "+N" para o restante.
  const activeTags = activeRow?.tags ?? [];
  const MAX_ASIDE_TAGS = 2;

  // Node de tags: chips visuais + popover de gerenciamento
  const tagsNode = (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeTags.slice(0, MAX_ASIDE_TAGS).map((t) => {
        const hex = t.color ?? null;
        const clean = (hex ?? "").replace("#", "");
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        const valid = hex && ![r, g, b].some(Number.isNaN);
        const bg = valid ? `rgba(${r},${g},${b},0.14)` : "var(--color-enterprise-bg)";
        const fg = valid
          ? `rgb(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 30)})`
          : "var(--brand-primary)";
        const border = valid ? `rgba(${r},${g},${b},0.30)` : "rgba(91,111,245,0.25)";
        return (
          <TooltipGlass key={t.id} label={t.name} side="top">
            <span
              className="inline-flex shrink-0 items-center rounded-full border px-2 py-px font-display text-[10.5px] font-semibold whitespace-nowrap"
              style={{ background: bg, color: fg, borderColor: border }}
            >
              {t.name}
            </span>
          </TooltipGlass>
        );
      })}
      {activeTags.length > MAX_ASIDE_TAGS && (
        <TooltipGlass label={activeTags.slice(MAX_ASIDE_TAGS).map((t) => t.name).join(", ")} side="top">
          <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-px font-display text-[10.5px] font-bold text-[var(--text-secondary)]">
            +{activeTags.length - MAX_ASIDE_TAGS}
          </span>
        </TooltipGlass>
      )}
      <TagsPopover
        conversationId={activeId}
        currentTags={activeTags}
      />
    </div>
  );

  // ── Funil real do primeiro deal do contato ──────────────────────
  const firstDeal = contactAsideView?.deals?.[0] ?? null;
  const firstDealId = firstDeal?.id ?? null;
  const { data: firstDealDetail } = useDealDetail(firstDealId);
  // O detail do deal (/api/deals/:id) devolve pipeline e stage ANINHADOS
  // em `deal.stage.pipeline.id` / `deal.stage.id` — não no topo. Ler o
  // caminho errado deixava pipelineId nulo, o board nunca carregava e a
  // aside mostrava "Sem estágio" sem dropdown de troca de fase.
  const dealStage = (
    firstDealDetail as
      | { stage?: { id?: string; pipeline?: { id?: string; name?: string } } }
      | undefined
  )?.stage;
  const firstDealPipelineId = dealStage?.pipeline?.id ?? firstDeal?.pipelineId ?? null;
  const firstDealPipelineName = dealStage?.pipeline?.name ?? null;
  const { data: boardStages } = useBoard({
    pipelineId: firstDealPipelineId,
    enabled: !!firstDealPipelineId,
  });

  // Monta funnelSegments e stageDropdownSlot para o primeiro deal.
  // Os demais deals ficam com fallback (sem barra + stageName estático).
  const firstDealFunnelSegments = boardStages?.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? "var(--brand-primary)",
    position: s.position,
  }));
  const firstDealStageId = dealStage?.id ?? firstDeal?.stageId ?? null;
  const firstDealStageName =
    boardStages?.find((s) => s.id === firstDealStageId)?.name ??
    firstDeal?.stageName ??
    null;

  // Injeta funnelSegments + stageDropdownSlot + assigneeSlot apenas no primeiro deal.
  const dealsWithSlots = (contactAsideView?.deals ?? []).map((d, idx) => {
    if (idx !== 0 || !boardStages?.length) return d;
    return {
      ...d,
      stageId: firstDealStageId ?? d.stageId,
      stageName: firstDealStageName ?? d.stageName,
      pipelineName: firstDealPipelineName ?? d.pipelineName,
      funnelSegments: firstDealFunnelSegments,
      stageDropdownSlot: firstDealId && firstDealStageId ? (
        <StagePicker
          dealId={firstDealId}
          currentStageId={firstDealStageId}
          pipelineId={firstDealPipelineId}
        >
          {({ onSelectStage, isPending }) => (
            <InboxStageDropdown
              stages={boardStages}
              currentStageId={firstDealStageId}
              currentPipelineId={firstDealPipelineId}
              isPending={isPending}
              onSelect={onSelectStage}
            />
          )}
        </StagePicker>
      ) : undefined,
      // Responsável da conversa — injetado aqui para aparecer abaixo
      // das informações do deal, não no header flutuante do aside.
      assigneeSlot: activeRow ? (
        <RequirePermission
          permission="conversation:reassign"
          fallback={
            <AssigneePopover
              conversationId={activeId}
              currentAssigneeName={activeRow.assignedTo?.name}
              currentAssigneeId={activeRow.assignedTo?.id ?? null}
              currentAssigneeImageUrl={activeRow.assignedTo?.avatarUrl ?? null}
              disabled
            />
          }
        >
          <AssigneePopover
            conversationId={activeId}
            currentAssigneeName={activeRow.assignedTo?.name}
            currentAssigneeId={activeRow.assignedTo?.id ?? null}
            currentAssigneeImageUrl={activeRow.assignedTo?.avatarUrl ?? null}
          />
        </RequirePermission>
      ) : undefined,
      // Tags do negócio — chips existentes + popover para adicionar/remover.
      dealTagsNode: (
        <DealTagsTray
          dealId={d.id}
          currentTags={(firstDealDetail as { tags?: { id: string; name: string; color: string | null }[] } | undefined)?.tags ?? []}
        />
      ),
    };
  });

  const contactAsideViewWithSlots = contactAsideView
    ? { ...contactAsideView, deals: dealsWithSlots }
    : null;

  // ── Slots das abas do card da conversa ──────────────────────────
  // Notas/Timeline/Tarefas sao escopados ao 1o negocio do contato
  // (mesmo padrao do DealDetailPanel). Sem negocio vinculado, mostra
  // um placeholder amigavel.
  const dealNotes =
    (firstDealDetail as { notes?: string | null } | undefined)?.notes ?? null;
  const notesSlot = firstDealId ? (
    <DealNotesTab
      dealId={firstDealId}
      notes={dealNotes}
      pipelineId={firstDealPipelineId}
    />
  ) : (
    <NoDealTab message="Vincule um negocio a este contato para registrar notas." />
  );
  // Timeline da CONVERSA (nao do deal) — sempre disponivel quando ha
  // conversa ativa, mesmo sem deal vinculado. Ver AGENT.md "ID de
  // conversa + logs + gatilho".
  const timelineSlot = activeId ? (
    <ConversationTimelineTab conversationId={activeId} />
  ) : (
    <NoDealTab message="Selecione uma conversa para ver a timeline." />
  );
  const activitiesSlot = firstDealId ? (
    <div className="flex-1 overflow-auto">
      <ActivitiesPanel dealId={firstDealId} />
    </div>
  ) : (
    <NoDealTab message="Vincule um negocio a este contato para registrar tarefas." />
  );
  // IB8: aba "Chamadas" no topo do inbox, igual ao DealDetailPanel. Lista
  // os logs de telefonia do contato ativo. Usamos `activeContactId` (nao
  // o dealId) porque o historico de chamadas e' por contato.
  const callsSlot = activeContactId ? (
    <div className="flex-1 overflow-auto p-4">
      <CallHistoryList embedded contactId={activeContactId} />
    </div>
  ) : null;

  const chatNode =
    chatContact && activeRow ? (
      <ChatArea
        contact={chatContact}
        messages={messageBubbles}
        stages={stagePillsView}
        showSessionAlert={sessionExpired}
        connection={messagesData?.channel ?? null}
        connections={messagesData?.channels}
        conversationNumber={activeRow?.number ?? null}
        conversationResolved={activeRow?.status === "RESOLVED"}
        conversationClosedAt={activeRow?.closedAt ?? null}
        onUseTemplate={() => setTemplateOpen(true)}
        onReactMessage={handleReactMessage}
        onPinMessage={handlePinMessage}
        onFavoriteMessage={handleFavoriteMessage}
        pinnedMessages={pinnedMessagesPreview}
        onUnpinMessage={handleUnpinMessage}
        onReplyMessage={handleReplyMessage}
        headerActionsSlot={
          <>
            {/* DealCallButton volta pro header do chat, ao lado do chip
                de telefone e do kebab. Antes vivia no ContactAside, mas
                duplicava o chip de "Ligar para <numero>" que ja fica
                no header. Consolidamos a acao aqui pra remover ruido
                visual no aside. */}
            <DealCallButton
              dealId={firstDealId}
              phone={chatContact?.phone || null}
              contactId={activeContactId ?? undefined}
            />
            <ConversationActionsMenu
              conversationId={activeId}
              isResolved={activeRow.status === "RESOLVED"}
              onOpenFavorites={() => setFavoritesOpen(true)}
              onReopenNewConversation={(newId) => setActiveId(newId)}
              departmentId={activeRow.departmentId ?? activeRow.department?.id ?? null}
              requireTabulationOnClose={
                activeRow.department?.requireTabulationOnClose ?? false
              }
            />
          </>
        }
        composerSlot={
          <Composer
            conversationId={activeId}
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            onSendNote={handleSendNote}
            sending={sendMessage.isPending}
            disabled={composerDisabled}
            placeholder={composerPlaceholder}
            isResolved={activeRow.status === "RESOLVED"}
            contactId={activeContactId}
            externalTemplate={externalTemplate}
            onExternalTemplateConsumed={() => setExternalTemplate(null)}
            signatureAllowed={convFeatures.agentSignatureEnabled}
            signatureEditable={convFeatures.agentSignatureEditable}
            availableChannels={whatsappChannels}
            selectedChannelId={selectedChannelId}
            conversationChannelId={conversationChannelId}
            onSelectChannel={setSelectedChannelId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            departmentId={activeRow.departmentId ?? activeRow.department?.id ?? null}
            requireTabulationOnClose={
              activeRow.department?.requireTabulationOnClose ?? false
            }
            onReopenNewConversation={(newId) => setActiveId(newId)}
          />
        }
        notesSlot={notesSlot}
        activitiesSlot={activitiesSlot}
        timelineSlot={timelineSlot}
        callsSlot={callsSlot}
      />
    ) : (
      <EmptyChatArea />
    );

  const asideNode =
    contactAsideViewWithSlots && activeRow ? (
      <ContactAside
        contact={contactAsideViewWithSlots}
        headerActionsNode={undefined}
        tagsNode={tagsNode}
        contactTagsNode={
          // IB7: tags do CONTATO (mesmo padrao das tags de negocio) —
          // mostra 2 mais recentes + `+N` com tooltip pro resto + popover
          // pra adicionar/remover.
          activeContactId ? (
            <ContactTagsTray
              contactId={activeContactId}
              /* Backend (getContactById) devolve tags como TagOnContact[]
                 = { contactId, tagId, tag: { id, name, color } }[]. Já a
                 rota de list (getContacts) achata pra { id, name, color }[].
                 Como ContactTagsTray/Popover esperam o shape achatado,
                 normalizamos aqui — assim as pills ganham cor e label
                 corretos (antes ficavam vazias). */
              currentTags={(contactDetail?.tags ?? []).map((t) =>
                (t as unknown as { tag?: { id: string; name: string; color: string | null } }).tag
                  ?? (t as unknown as { id: string; name: string; color: string | null })
              )}
            />
          ) : null
        }
        collapsed={asideCollapsed}
        onToggleCollapse={() => setAsideCollapsed((v) => !v)}
        contactFieldConfigSlot={
          <RequirePermission permission="settings:custom_fields">
            <FieldConfigPanel entities={["contact"]} context="inbox_lead_v2" />
          </RequirePermission>
        }
        dealFieldConfigSlot={
          <RequirePermission permission="settings:custom_fields">
            <FieldConfigPanel entities={["deal"]} context="inbox_lead_v2" />
          </RequirePermission>
        }
      />
    ) : (
      <EmptyAside />
    );

  const templateModalNode =
    templateOpen && activeId ? (
      <div
        className="fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={() => setTemplateOpen(false)}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <TemplatePickerList
            conversationId={activeId}
            onClose={() => setTemplateOpen(false)}
            onPick={(tpl) => {
              setExternalTemplate(whatsappTemplateToPending(tpl));
              setTemplateOpen(false);
            }}
          />
        </div>
      </div>
    ) : null;

  // Picker de duração do "Fixar" (24h/7d/30d) + painel "Mensagens
  // favoritas" — self-contained, plugados nos 4 pontos de retorno
  // (mobile/desktop × com/sem pageHeader) junto do templateModalNode.
  const extraDialogsNode = (
    <>
      {pinDurationDialog}
      <FavoritesPanel
        open={favoritesOpen}
        onOpenChange={setFavoritesOpen}
        conversationId={activeId}
      />
    </>
  );

  // Layout COM cabeçalho de página (estilo "Caixa de entrada" da
  // referência): NavRail fixo à esquerda; à direita o header no topo e
  // as 3 colunas (lista/chat/contato) numa grade abaixo.
  if (pageHeader) {
    // ── Mobile: layout de painel único (lista → chat/negócio) ──────
    if (!isDesktop) {
      return (
        <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] gap-3 overflow-hidden p-3">
          {navRailNode}
          <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
            <PageHeader
              icon={pageHeader.icon}
              title={pageHeader.title}
              center={
                <PageSearchBar
                  variant="compact"
                  value={searchInput}
                  onChange={setSearchInput}
                  placeholder="Buscar conversa, contato, telefone..."
                  aria-label="Buscar conversas"
                />
              }
              actions={null}
            />
            {!activeId ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                {conversationColumnNode}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Barra compacta: Voltar + segmentado Chat | Negócio */}
                <div className="flex shrink-0 items-center gap-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1.5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
                  >
                    <IconArrowLeft size={16} stroke={2} />
                    Voltar
                  </button>
                  <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setMobilePaneTab("chat")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        mobilePaneTab === "chat"
                          ? "bg-[var(--brand-primary)] text-white shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <IconMessageCircle size={14} stroke={2} />
                      Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePaneTab("negocio")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        mobilePaneTab === "negocio"
                          ? "bg-[var(--brand-primary)] text-white shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <IconBriefcase size={14} stroke={2} />
                      Negócio
                    </button>
                  </div>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {mobilePaneTab === "chat" ? chatNode : asideNode}
                </div>
              </div>
            )}
          </div>
          {templateModalNode}
          {extraDialogsNode}
        </div>
      );
    }

    // ── Desktop: layout original de 3 colunas ─────────────────────
    return (
      <div
        className="v2-screen grid gap-4 p-4"
        style={{ gridTemplateColumns: "var(--nav-rail-w, 72px) minmax(0, 1fr)" }}
      >
        {navRailNode}
        <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
          <PageHeader
            icon={pageHeader.icon}
            title={pageHeader.title}
            center={
              <PageSearchBar
                variant="compact"
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Buscar conversa, contato, telefone..."
                aria-label="Buscar conversas"
              />
            }
            // PageHeader sem botão de filtro: ele agora vive ao lado dos
            // tabs de status na coluna de conversas (ver `filterSlot` acima).
            actions={null}
          />
          <div
            className="grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-200"
            style={{ gridTemplateColumns: `${convWidth}px 1fr ${asideCollapsed ? "0px" : `${asideWidth}px`}` }}
          >
            {conversationColumnNode}
            {chatNode}
            <div className="relative min-h-0 overflow-visible">
              {!asideCollapsed && (
                <ColumnResizer
                  direction="left"
                  value={asideWidth}
                  onChange={setAsideWidth}
                  min={280}
                  max={440}
                />
              )}
              {asideNode}
            </div>
          </div>
        </div>
        {templateModalNode}
        {extraDialogsNode}
      </div>
    );
  }

  // Layout legado (linha única, sem topo) — usado por `(v2)/inbox-v2`.

  // ── Mobile: layout de painel único (lista → chat/negócio) ──────
  if (!isDesktop) {
    return (
      <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] gap-3 overflow-hidden p-3">
        {navRailNode}
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          {!activeId ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              {conversationColumnNode}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Barra compacta: Voltar + segmentado Chat | Negócio */}
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="flex items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1.5 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
                >
                  <IconArrowLeft size={16} stroke={2} />
                  Voltar
                </button>
                <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setMobilePaneTab("chat")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      mobilePaneTab === "chat"
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <IconMessageCircle size={14} stroke={2} />
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePaneTab("negocio")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[12px] font-semibold transition-colors",
                      mobilePaneTab === "negocio"
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    <IconBriefcase size={14} stroke={2} />
                    Negócio
                  </button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {mobilePaneTab === "chat" ? chatNode : asideNode}
              </div>
            </div>
          )}
        </div>
        {templateModalNode}
        {extraDialogsNode}
      </div>
    );
  }

  // ── Desktop: layout original de 4 colunas ─────────────────────
  return (
    <div
      className="v2-screen grid gap-4 p-4"
      style={{
        // Coluna 1 fixa (NavRail), 2 controlada pelo resizer, 3 flexível, 4 redimensionável.
        gridTemplateColumns: `var(--nav-rail-w, 72px) ${convWidth}px 1fr ${asideCollapsed ? "0px" : `${asideWidth}px`}`,
      }}
    >
      {navRailNode}
      {conversationColumnNode}
      {chatNode}
      <div className="relative min-h-0 overflow-visible">
        {!asideCollapsed && (
          <ColumnResizer
            direction="left"
            value={asideWidth}
            onChange={setAsideWidth}
            min={280}
            max={440}
          />
        )}
        {asideNode}
      </div>
      {templateModalNode}
      {extraDialogsNode}
    </div>
  );
}

function EmptyChatArea() {
  return (
    <main className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-10 text-center backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="grid size-16 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <h2 className="mt-3 font-display text-base font-bold text-[var(--text-primary)]">
        Selecione uma conversa
      </h2>
      <p className="mt-1 max-w-sm text-[13px] text-[var(--text-muted)]">
        Escolha uma conversa na lista para visualizar mensagens e detalhes do contato.
      </p>
    </main>
  );
}

function NoDealTab({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-[var(--text-muted)]">
      <div className="font-display text-[13px] font-semibold">
        Nenhum negocio vinculado
      </div>
      <p className="max-w-xs text-[12px]">{message}</p>
    </div>
  );
}

function EmptyAside() {
  return (
    <aside
      aria-label="Detalhes do contato"
      className="flex items-center justify-center rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 text-center text-[12px] text-[var(--text-muted)] backdrop-blur-md shadow-[var(--glass-shadow)]"
    >
      Sem contato selecionado.
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────
// InboxStageDropdown — dropdown glass de troca de fase para o DealCard
// do ContactAside (inbox). Mesmo padrão visual do StageDropdown do pipeline.
// ─────────────────────────────────────────────────────────────────
function InboxStageDropdown({
  stages,
  currentStageId,
  currentPipelineId,
  isPending,
  onSelect,
}: {
  stages: BoardStageDto[];
  currentStageId: string | null;
  currentPipelineId: string | null;
  isPending: boolean;
  onSelect: (stageId: string, toPipelineId?: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const current = stages.find((s) => s.id === currentStageId);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      // Fecha ao clicar fora — o menu esta portado no body entao precisa
      // checar tambem se o clique caiu dentro do menu.
      const menu = document.getElementById("inbox-stage-dropdown-menu");
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Calcula posicao do trigger em coord de viewport (position:fixed) para o
  // portal — evita clip pelo overflow do aside e garante que o menu apareca
  // sempre por cima, sem "vazar" para fora quando encosta na borda direita.
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const b = triggerRef.current.getBoundingClientRect();
    const longest = stages.reduce((n, s) => Math.max(n, s.name.length), 0);
    const menuWidth = Math.min(
      Math.max(220, longest * 8 + 48),
      Math.min(320, window.innerWidth - 16),
    );
    const wouldOverflow = b.left + menuWidth > window.innerWidth - 8;
    const left = wouldOverflow ? Math.max(8, b.right - menuWidth) : b.left;
    setPos({ top: b.bottom + 4, left, width: menuWidth });
  }, [open, stages]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[min(100%,11rem)] items-center gap-1 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-opacity hover:text-[var(--text-primary)] hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
      >
        {current?.color && (
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: current.color }}
          />
        )}
        <span className="truncate">{current?.name ?? "Sem estagio"}</span>
        <IconChevronDown
          size={11}
          className={cn("shrink-0 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            id="inbox-stage-dropdown-menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-(--z-popover) overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white py-1 shadow-[0_12px_32px_rgba(15,20,40,0.18)] v2-dark:bg-[#1a1f2e] v2-dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
          >
            <MoveToStageMenu
              stages={stages}
              currentStageId={currentStageId}
              currentPipelineId={currentPipelineId}
              isPending={isPending}
              onSelect={(stageId, toPipeId) => {
                onSelect(stageId, toPipeId);
                setOpen(false);
              }}
            />
          </div>,
          document.body,
        )
      }
    </div>
  );
}
