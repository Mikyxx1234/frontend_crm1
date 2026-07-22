"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import {
  IconAntenna,
  IconArrowsExchange,
  IconCheckbox,
  IconChevronDown,
  IconDotsVertical,
  IconDownload,
  IconMenu2,
  IconPencil,
  IconPlus,
  IconSettings,
  IconTrophy,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { KanbanColumn } from "@/components/crm/kanban-column";
import { DealCard } from "@/components/crm/deal-card";
import { ScrollMap } from "@/components/crm/scroll-map";
import { ScrollMapVertical } from "@/components/crm/scroll-map-vertical";
import { DealDetailPanel, type DealDetail } from "@/components/crm/deal-detail-panel";
import { DealProductsSection, DealQuotasSection } from "@/components/pipeline/deal-detail/sidebar";
import { CallHistoryList } from "@/features/softphone/components/call-history-list";
import { ActivitiesPanel } from "@/components/pipeline/deal-workspace/panels/activities";
import { DealCallButton } from "@/features/softphone/components/deal-call-button";
import { ContactEditDialog } from "@/components/crm/contact-edit-dialog";
import { FieldConfigPanel } from "@/components/crm/fields/field-config-panel";
import { Chip } from "@/components/crm/chip";
import { AvatarGlass } from "@/components/crm/avatar-glass";

import {
  toKanbanColumns,
  type KanbanColumnView,
} from "@/features/pipeline-v2/adapters";
import {
  ExportPanel,
  ImportPanel,
  useImportExportBump,
} from "@/features/pipeline-v2/import-export";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { avatarInitials } from "@/features/inbox-v2/adapters";
import { useContactSidebar } from "@/features/inbox-v2/hooks";
import {
  useBoard,
  useBoardFiltered,
  useDealDetail,
  useMoveDeal,
  usePipelines,
  useTeamUsers,
  type MoveVars,
} from "@/features/pipeline-v2/hooks";
import { dealDetailKey } from "@/features/pipeline-v2/hooks/use-deal-detail";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateDeal } from "@/features/pipeline-v2/api";
import { createContact } from "@/features/directory-v2/api";
import { personNameFromDealTitle, sanitizeContactName } from "@/lib/display-name";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { RequirePermission } from "@/components/auth/require-permission";
import { BulkActionsBar } from "@/components/pipeline/bulk-actions-bar";
import type { BulkScopeContext } from "@/components/pipeline/bulk-edit-fields-dialog";
import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { apiUrl } from "@/lib/api";
import type {
  BoardDealDto,
  BoardSortParam,
  BoardStageDto,
  StatusFilter,
} from "@/features/pipeline-v2/api";
import {
  AddDealDialog,
  AssigneePopover,
  DealActionsMenu,
  DealNotesTab,
  DealTimelineTab,
  InlineEditText,
  MoveToStageMenu,
  PipelineSwitcher,
  StagePicker,
  TagsPopover,
  WinButton,
  useDealChatBinding,
} from "@/features/pipeline-v2/extras";
import { PipelineChannelsModal } from "@/features/pipeline-v2/extras/pipeline-channels-modal";
import { computePopoverPosition } from "@/features/pipeline-v2/extras/use-portal-popover";
import { ContactTagsPopover } from "@/features/inbox-v2/extras/contact-tags-popover";
import { PipelineSearchFilterBar } from "@/components/pipeline/kanban-filters/v2/search-filter-bar";
import { FilterChips } from "@/components/pipeline/kanban-filters/filter-chips";
import { fetchFilterOptions } from "@/components/pipeline/kanban-filters/api";
import { useKanbanFilters } from "@/components/pipeline/kanban-filters/use-kanban-filters";
import {
  isEmptyFilters,
  hasServerSideFilters,
  type AdvancedDealFilters,
} from "@/components/pipeline/kanban-filters/types";

const PIPELINE_SEARCH_LS = "kanban-pipeline-search:v1";
const PIPELINE_SORT_LS = "kanban-pipeline-sort:v1";

type SortKey =
  | "default"
  | "interaction_newest"
  | "interaction_oldest"
  | "name_az"
  | "name_za"
  | "created_newest"
  | "created_oldest";

/**
 * Modelo Kommo: ganho/perdido são ESTÁGIOS fixos no fim do funil (não
 * mais um filtro por aba). O board sempre carrega com status "ALL" —
 * deals fechados vivem nas colunas Ganho/Perdido e os abertos nas demais
 * (Deal.status é sincronizado pelo backend ao mover entre colunas).
 */
const BOARD_STATUS: StatusFilter = "ALL";

/**
 * Props opcionais — usadas para reaproveitar o Kanban dentro do
 * segmento `/v2/*` (injeta o NavRailV2 com hrefs novos). Sem nada
 * passado, mantém o `<NavRail />` legado.
 */
interface KanbanV2ClientPageProps {
  navRail?: React.ReactNode;
  /**
   * Quando informado, o toggle de visão (Pipeline/Lista) do header
   * navega para esta rota ao selecionar "Lista". Usado pelo segmento
   * `/v2/pipeline` (-> `/v2/pipeline/list`). Sem isso, o toggle de
   * lista fica inerte (legado `(v2)/pipeline/kanban-v2`).
   */
  listHref?: string;
}

export default function KanbanV2ClientPage({
  navRail,
  listHref,
}: KanbanV2ClientPageProps = {}) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  // Deep-link: o negócio aberto é refletido na URL (?deal=<id>). Usamos
  // a History API direto (em vez de router.push) para NÃO disparar um
  // refetch do server component a cada abrir/fechar. O estado React é a
  // fonte de renderização; a URL apenas espelha (e habilita compartilhar
  // o link + voltar/avançar do navegador via popstate).
  // setActiveDeal(id, num?) — id = CUID interno, num = número sequencial para a URL.
  // A URL exibe o número legível (?deal=102); internamente usamos sempre o CUID.
  const setActiveDeal = useCallback((id: string | null, num?: number | null) => {
    setActiveDealId(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (id) {
      const urlVal = num != null ? String(num) : id;
      if (url.searchParams.get("deal") === urlVal) return;
      url.searchParams.set("deal", urlVal);
      window.history.pushState(window.history.state, "", url.toString());
    } else {
      if (!url.searchParams.has("deal")) return;
      url.searchParams.delete("deal");
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, []);

  // Inicializa a partir da URL no mount.
  // Aceita tanto número sequencial (?deal=102) quanto CUID (legado).
  // O backend /api/deals/[id] já faz lookup por ambos.
  useEffect(() => {
    const d = new URL(window.location.href).searchParams.get("deal");
    if (d) setActiveDealId(d);
  }, []);

  // Voltar/avançar do navegador atualiza o negócio aberto.
  useEffect(() => {
    function onPop() {
      setActiveDealId(new URL(window.location.href).searchParams.get("deal"));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [addStage, setAddStage] = useState<{ id: string; name: string } | null>(
    null,
  );
  const { filters, setFilters, patch: patchFilters, clear: clearFilters } = useKanbanFilters();
  const [search, setSearch] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem(PIPELINE_SEARCH_LS) ?? "";
    } catch {
      return "";
    }
  });
  const [filterOptions, setFilterOptions] = useState<import("@/components/pipeline/kanban-filters/types").FilterOptionsResponse | null>(null);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const kebabBtnRef = useRef<HTMLButtonElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const boardWrapperRef = useRef<HTMLDivElement>(null);

  // Kebab menu e modal de import/export
  const [kebabOpen, setKebabOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState<"import" | "export" | null>(null);
  const [channelsModalOpen, setChannelsModalOpen] = useState(false);
  const bump = useImportExportBump();

  // Ordenação dos cards dentro de cada etapa. Os sorts `created_*` e
  // `interaction_*` são delegados ao backend (ver `boardSort` abaixo),
  // porque ordenar só os deals já carregados (default 100/coluna)
  // deixava cards "presos" em páginas posteriores quando a coluna tem
  // >100 registros. Os sorts `name_*` continuam client-side (o backend
  // ainda não expõe esses campos como sort) — limitação conhecida e
  // documentada no AGENT.md.
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "default";
    try {
      const raw = localStorage.getItem(PIPELINE_SORT_LS);
      if (
        raw === "default" ||
        raw === "interaction_newest" ||
        raw === "interaction_oldest" ||
        raw === "name_az" ||
        raw === "name_za" ||
        raw === "created_newest" ||
        raw === "created_oldest"
      ) {
        return raw;
      }
    } catch {
      /* noop */
    }
    return "default";
  });

  useEffect(() => {
    try {
      localStorage.setItem(PIPELINE_SEARCH_LS, search);
    } catch {
      /* noop */
    }
  }, [search]);

  useEffect(() => {
    try {
      localStorage.setItem(PIPELINE_SORT_LS, sortKey);
    } catch {
      /* noop */
    }
  }, [sortKey]);

  const status = BOARD_STATUS;
  const { data: pipelines } = usePipelines(isAuthenticated);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  // Persistência do último funil selecionado (operador da DNAWork: ao trocar
  // pra "TESTE funil2" e dar F5, voltava pro padrão). Ordem de prioridade
  // ao abrir a página: (1) último salvo em localStorage se ainda existir nos
  // pipelines da org, (2) pipeline `isDefault`, (3) primeiro da lista.
  // `localStorage` em vez de cookie pra ficar por aba/usuário sem custo de
  // servidor; chave inclui ":v1" pra invalidação futura.
  const PIPELINE_STORAGE_KEY = "crm:pipeline:last-selected:v1";

  useEffect(() => {
    if (pipelineId || !pipelines?.length) return;
    let saved: string | null = null;
    try {
      saved = typeof window !== "undefined" ? localStorage.getItem(PIPELINE_STORAGE_KEY) : null;
    } catch {
      saved = null;
    }
    if (saved && pipelines.some((p) => p.id === saved)) {
      setPipelineId(saved);
      return;
    }
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    setPipelineId(def.id);
  }, [pipelines, pipelineId]);

  // Sincroniza qualquer mudança de pipelineId pro localStorage. Mantém em sync
  // mesmo se a troca vier de outro caminho (ex.: deep link futuro).
  useEffect(() => {
    if (!pipelineId) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(PIPELINE_STORAGE_KEY, pipelineId);
      }
    } catch {
      /* localStorage indisponível (modo privado, quota cheia) — ignorar */
    }
  }, [pipelineId]);

  const boardSort = useMemo<BoardSortParam | undefined>(() => {
    if (sortKey === "created_newest") return { field: "createdAt", direction: "desc" };
    if (sortKey === "created_oldest") return { field: "createdAt", direction: "asc" };
    if (sortKey === "interaction_newest") return { field: "lastInteraction", direction: "desc" };
    if (sortKey === "interaction_oldest") return { field: "lastInteraction", direction: "asc" };
    return undefined;
  }, [sortKey]);

  // ── Filtros server-side (varre todo o pipeline, não só os 100 carregados) ──
  // O GET /board pagina 100 deals/coluna e ignora filtros avançados (origem,
  // tags, datas, etc.). Quando há qualquer critério ativo, trocamos pelo
  // POST /board com `filters` — mesma engine do backend usada na edição em massa.
  const rawSearch = (filters.search ?? search).trim();
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(rawSearch), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const mergedFilters = useMemo(() => {
    const f: AdvancedDealFilters = { ...filters };
    if (debouncedSearch.length >= 2) f.search = debouncedSearch;
    return f;
  }, [filters, debouncedSearch]);

  const hasServerBoard = hasServerSideFilters(mergedFilters);

  const boardNormal = useBoard({
    pipelineId,
    status,
    sort: boardSort,
    enabled: isAuthenticated && !hasServerBoard,
  });
  const boardFiltered = useBoardFiltered({
    pipelineId,
    status,
    filters: mergedFilters,
    sort: boardSort,
    enabled: isAuthenticated && hasServerBoard,
  });
  const board = hasServerBoard ? boardFiltered.data ?? [] : boardNormal.data ?? [];

  const moveDeal = useMoveDeal(pipelineId, status);

  // ── Tabulação de motivo da perda ─────────────────────────────────
  // Só pede motivo se a etapa Perdido do funil estiver com tabulação
  // Ativa (pipelines.lossReasonRequired). Cancelar = não move.
  const [pendingLostMove, setPendingLostMove] = useState<MoveVars | null>(null);

  // Chave dedicada — o LossReasonDialog usa ["pipeline-loss-reasons", pipelineId]
  // com refetchOnMount:"always" e shape distinto ({ reasons, required, allowOther }).
  // Compartilhar a mesma key aqui poluia o cache e fazia lossReasonRequired virar
  // undefined depois da primeira abertura do modal, resultando em POST /move sem
  // lostReason no segundo mover-para-Perdido → 400.
  const lossMetaQuery = useQuery({
    queryKey: ["pipeline-loss-meta", pipelineId],
    queryFn: async () => {
      const res = await fetch(
        apiUrl(`/api/pipelines/${pipelineId}/loss-reasons`),
      );
      if (!res.ok) return { lossReasonRequired: false };
      return res.json() as Promise<{ lossReasonRequired?: boolean }>;
    },
    enabled: !!pipelineId,
    staleTime: 30_000,
  });
  const lossReasonsActive = Boolean(lossMetaQuery.data?.lossReasonRequired);

  const requestMove = useCallback(
    (vars: MoveVars) => {
      const target = board.find((s) => s.id === vars.toStageId);
      // Cross-pipeline: quando o estágio destino não pertence ao board
      // atual, não temos como saber isLost/lossReasonRequired sem uma
      // requisição extra. Deixamos o backend validar (LOST_REASON_REQUIRED
      // → toast de erro) e o operador tenta novamente pelo funil destino.
      if (
        target?.isLost &&
        vars.fromStageId !== vars.toStageId &&
        lossReasonsActive
      ) {
        setPendingLostMove(vars);
        return;
      }
      moveDeal.mutate(vars);
    },
    [board, moveDeal, lossReasonsActive],
  );

  // ── Seleção em massa (resgatada da versão antiga) ────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /**
   * Modo seleção global: quando ativo (via kebab "Selecionar"), todos os
   * cards exibem o checkbox e o conteúdo desloca para a direita. Sair do
   * modo limpa a seleção atual.
   */
  const [selectionMode, setSelectionMode] = useState(false);
  const { data: teamUsers = [] } = useTeamUsers(isAuthenticated);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  /**
   * Toggle "selecionar todos desta etapa". Se TODOS os IDs passados já
   * estão selecionados, remove. Senão, adiciona todos. Usado pelo botão
   * de checkbox no header de cada KanbanColumn (resgatado da versão antiga).
   */
  const toggleSelectMany = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }, []);

  // Limpa a seleção ao trocar de pipeline — os IDs não fazem
  // sentido entre boards diferentes.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pipelineId]);

  // Recarrega as options de filtro toda vez que o painel é aberto.
  // Antes buscava só uma vez (guard `filterOptions !== null`), o que
  // cacheava listas vazias da org — ex.: motivos de perda criados depois
  // da primeira abertura nunca apareciam sem dar reload na página.
  // Mantém as opções anteriores em caso de erro (não pisca pra vazio).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setFilterOptionsLoading(true);
    fetchFilterOptions()
      .then((opts) => { if (!cancelled) setFilterOptions(opts); })
      .catch(() => { /* mantém opções já carregadas */ })
      .finally(() => { if (!cancelled) setFilterOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Aplica filtros client-side ANTES de virar colunas.
  const filteredBoard = useMemo(() => {
    // Board vindo do POST /board já foi filtrado no servidor (origem, busca,
    // tags, datas, etc.). Filtros só-cliente (ex.: faixa de valor) ainda
    // passam pelo bloco abaixo.
    if (hasServerBoard) {
      const vMin = filters.valueFrom != null ? Number(filters.valueFrom) : null;
      const vMax = filters.valueTo != null ? Number(filters.valueTo) : null;
      const hasValue = vMin !== null || vMax !== null;
      if (!hasValue) return board;
      return board.map((stage) => {
        const deals = stage.deals.filter((d) => {
          const val = Number(d.value) || 0;
          if (vMin !== null && val < vMin) return false;
          if (vMax !== null && val > vMax) return false;
          return true;
        });
        return { ...stage, deals, totalCount: deals.length };
      });
    }

    const queries = [filters.search, search]
          .map((v) => (v ?? "").trim().toLowerCase())
          .filter((v) => v.length > 0);
    const hasSearch = queries.length > 0;
    const hasOwner = (filters.ownerIds?.length ?? 0) > 0;
    const hasTag = (filters.tagIds?.length ?? 0) > 0;
    const hasStage = (filters.stageIds?.length ?? 0) > 0;
    const lostReasonSet = (filters.lostReasons?.length ?? 0) > 0
      ? new Set(filters.lostReasons)
      : null;
    const hasLostReason = lostReasonSet !== null;
    const vMin = filters.valueFrom != null ? Number(filters.valueFrom) : null;
    const vMax = filters.valueTo != null ? Number(filters.valueTo) : null;
    const hasValue = vMin !== null || vMax !== null;

    const noFilters =
      !hasSearch && !hasOwner && !hasTag && !hasStage && !hasValue && !hasLostReason && isEmptyFilters(filters);
    // Quando há QUALQUER filtro client-side ativo o `totalCount` que veio
    // do backend (não filtrado) precisa ser sobrescrito pelo número real
    // de deals visíveis — caso contrário o badge da coluna fica preso no
    // total original e parece que o filtro/busca não funcionou.
    const overrideCount = !noFilters;

    const filtered = noFilters
      ? board
      : board
          .filter((stage) => !hasStage || (filters.stageIds ?? []).includes(stage.id))
          .map((stage) => {
            const deals = stage.deals.filter((d) => {
              if (hasOwner && (!d.owner?.id || !(filters.ownerIds ?? []).includes(d.owner.id))) return false;
              if (hasTag) {
                const ids = (d.tags ?? []).map((t) => t.id);
                if (!(filters.tagIds ?? []).some((id) => ids.includes(id))) return false;
              }
              if (hasSearch) {
                const hay = [d.title, d.contact?.name, d.contact?.email, d.contact?.phone]
                  .filter(Boolean).join(" ").toLowerCase();
                if (!queries.every((q) => hay.includes(q))) return false;
              }
              if (hasValue) {
                const val = Number(d.value) || 0;
                if (vMin !== null && val < vMin) return false;
                if (vMax !== null && val > vMax) return false;
              }
              if (lostReasonSet && !(d.lostReason && lostReasonSet.has(d.lostReason))) {
                return false;
              }
              return true;
            });
            return {
              ...stage,
              deals,
              totalCount: overrideCount ? deals.length : stage.totalCount,
            };
          });

    // Ordenação dos cards dentro de cada coluna.
    //
    // `default` / `created_*` / `interaction_*` → não fazem nada aqui:
    //   - `default` mantém a ordem `position asc` que veio do backend.
    //   - `created_newest` / `created_oldest` JÁ vêm ordenados do
    //     servidor (param `sort=createdAt&direction=...` em `useBoard`).
    //   - `interaction_newest` / `interaction_oldest` JÁ vêm ordenados
    //     do servidor (param `sort=lastInteraction&direction=...`),
    //     cobrindo todos os deals da coluna e não só os 100 carregados.
    //
    // `name_*` continua client-side porque o backend ainda não expõe
    // esse campo como sort do board. Limitação conhecida: ordena só os
    // deals carregados na coluna.
    if (
      sortKey === "default" ||
      sortKey === "created_newest" ||
      sortKey === "created_oldest" ||
      sortKey === "interaction_newest" ||
      sortKey === "interaction_oldest"
    ) {
      return filtered;
    }
    return filtered.map((stage) => {
      const deals = [...stage.deals];
      if (sortKey === "name_az") {
        deals.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "", "pt-BR"));
      } else if (sortKey === "name_za") {
        deals.sort((a, b) => (b.title ?? "").localeCompare(a.title ?? "", "pt-BR"));
      }
      return { ...stage, deals };
    });
  }, [board, filters, search, sortKey, hasServerBoard]);

  // Filtrar stages por stageGrants do usuário (Permissions v2).
  // stageGrants vazio = todas as fases visíveis (sem restrição).
  const { data: myPerms } = useMyPermissions();
  const stageGrantsFiltered = useMemo(() => {
    const stageGrants = myPerms?.stageGrants ?? [];
    if (stageGrants.length === 0) return filteredBoard;
    return filteredBoard.filter((s) => stageGrants.includes(s.id));
  }, [filteredBoard, myPerms?.stageGrants]);

  const columns: KanbanColumnView[] = useMemo(
    () => toKanbanColumns(stageGrantsFiltered),
    [stageGrantsFiltered],
  );

  // Contexto para "selecionar todos que batem no filtro" na edição em massa.
  // Permite editar além dos ~100 cards carregados por coluna: o servidor
  // resolve os IDs a partir do mesmo filtro/visibilidade do board.
  const scopeContext = useMemo<BulkScopeContext | undefined>(() => {
    if (!pipelineId) return undefined;
    const boardForScope = stageGrantsFiltered;
    const pipelineTotal = boardForScope.reduce(
      (acc, s) => acc + (s.totalCount ?? s.deals.length),
      0,
    );
    // Habilita o escopo "etapa" só quando TODA a seleção está numa única etapa.
    let stage: { id: string; name: string; total: number } | null = null;
    if (selectedIds.size > 0) {
      const stagesWithSel = boardForScope.filter((s) =>
        s.deals.some((d) => selectedIds.has(d.id)),
      );
      if (stagesWithSel.length === 1) {
        const s = stagesWithSel[0];
        stage = { id: s.id, name: s.name, total: s.totalCount ?? s.deals.length };
      }
    }
    const scopeFilters = { ...filters, ...(rawSearch ? { search: rawSearch } : {}) };
    return { pipelineId, status, filters: scopeFilters, pipelineTotal, stage };
  }, [pipelineId, stageGrantsFiltered, selectedIds, filters, rawSearch, status]);

  // Lookup ownerId / tags reais por dealId. O `Deal` (v0) que chega no
  // renderDeal só tem `owner.name`, não o `ownerId` nem `tagIds`. Esse
  // map evita ter que estender o tipo Deal só para isso. Usa o board
  // ORIGINAL pra nao perder lookup de cards filtrados (caso slot
  // precise consultar mesmo escondido).
  const dealById = useMemo(() => {
    const map = new Map<string, BoardDealDto>();
    for (const stage of board) {
      for (const d of stage.deals) map.set(d.id, d);
    }
    return map;
  }, [board]);

  const { data: dealDetail } = useDealDetail(activeDealId);
  const queryClient = useQueryClient();

  // Quando dealDetail carrega via lookup por número sequencial (?deal=102),
  // troca activeDealId para o CUID real (mutations usam CUID).
  useEffect(() => {
    if (
      dealDetail?.id &&
      activeDealId &&
      /^\d+$/.test(activeDealId) &&
      dealDetail.id !== activeDealId
    ) {
      setActiveDealId(dealDetail.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealDetail?.id]);

  // Encontra o stage corrente do deal aberto pra alimentar o header de pills.
  const activeDealStage = useMemo(() => {
    if (!activeDealId) return undefined;
    return board.find((s) => s.deals.some((d) => d.id === activeDealId));
  }, [activeDealId, board]);
  const activeDealStageName = activeDealStage?.name;
  const activeDealStageId = activeDealStage?.id ?? null;

  // Seed otimista a partir do card do board — o painel abre no layout final
  // com nome/telefone/etapa já preenchidos, sem esperar GET /deals/:id.
  const boardDealSeed = useMemo(() => {
    if (!activeDealId) return null;
    return dealById.get(activeDealId) ?? null;
  }, [activeDealId, dealById]);

  // Campos personalizados: mesma fonte do contact-aside (inboxLeadPanelFields + dealInboxPanelFields).
  // Prefer contactId do detail; no loading usa o do card do board.
  const dealContactId =
    dealDetail?.contact?.id ?? boardDealSeed?.contact?.id ?? null;
  const { data: dealContact } = useContactSidebar(dealContactId);

  const dealDetailVm: DealDetail | null = useMemo(() => {
    if (dealDetail) {
      // Contato = pessoa; título do deal ("Negócio …") nunca vira nome de contato.
      const contactName =
        sanitizeContactName(dealDetail.contact?.name) ||
        personNameFromDealTitle(dealDetail.title) ||
        "Sem nome";
      const ownerName = dealDetail.owner?.name?.trim() || "Sem responsavel";
      return {
        id: dealDetail.id,
        number: (dealDetail as { number?: number }).number ?? null,
        contactId: dealDetail.contact?.id ?? null,
        contactNumber: (dealDetail.contact as { number?: number } | null)?.number ?? null,
        name: contactName,
        initials: avatarInitials(contactName),
        avatarColor: avatarColorSlugFromName(contactName),
        phone: dealDetail.contact?.phone ?? undefined,
        email: dealDetail.contact?.email ?? null,
        whatsappUsername:
          (dealDetail.contact as { whatsappUsername?: string | null } | null)?.whatsappUsername ?? null,
        contactSource:
          (dealDetail.contact as { source?: string | null } | null)?.source ?? null,
        value: dealDetail.value ?? null,
        online: undefined,
        stage: activeDealStageName,
        pipelineName:
          (dealDetail as { stage?: { pipeline?: { name?: string } } }).stage?.pipeline?.name ?? null,
        owner: {
          initials: avatarInitials(ownerName),
          name: ownerName,
          avatarColor: avatarColorSlugFromName(ownerName),
        },
        status: (dealDetail as { status?: "OPEN" | "WON" | "LOST" }).status ?? null,
        lostReason:
          (dealDetail as { lostReason?: string | null }).lostReason ?? null,
      };
    }

    // Enquanto a API não responde: monta VM parcial do card do kanban.
    if (!boardDealSeed) return null;
    const contactName =
      sanitizeContactName(boardDealSeed.contact?.name) ||
      personNameFromDealTitle(boardDealSeed.title) ||
      "Sem nome";
    const ownerName = boardDealSeed.owner?.name?.trim() || "Sem responsavel";
    return {
      id: boardDealSeed.id,
      number: boardDealSeed.number ?? null,
      contactId: boardDealSeed.contact?.id ?? null,
      contactNumber: boardDealSeed.contact?.number ?? null,
      name: contactName,
      initials: avatarInitials(contactName),
      avatarColor: avatarColorSlugFromName(contactName),
      phone: boardDealSeed.contact?.phone ?? undefined,
      email: boardDealSeed.contact?.email ?? null,
      whatsappUsername: null,
      contactSource: null,
      value: boardDealSeed.value ?? null,
      online: undefined,
      stage: activeDealStageName,
      pipelineName: pipelines?.find((p) => p.id === pipelineId)?.name ?? null,
      owner: {
        initials: avatarInitials(ownerName),
        name: ownerName,
        avatarColor: avatarColorSlugFromName(ownerName),
      },
      status: (boardDealSeed.status as "OPEN" | "WON" | "LOST" | undefined) ?? null,
      lostReason: boardDealSeed.lostReason ?? null,
    };
  }, [dealDetail, boardDealSeed, activeDealStageName, pipelines, pipelineId]);

  // Negócio SEM contato vinculado: cria um contato com o telefone/email
  // digitado e vincula ao deal (o painel chama isso via customSave do
  // editor inline). Lança o erro de volta pro editor não fechar em falha.
  const handleCreateContactForField = useCallback(
    async (field: "phone" | "email", value: string) => {
      if (!activeDealId) return;
      const v = value.trim();
      if (!v) return;
      try {
        // Nunca gravar "Negócio …" como nome do contato — só o nome da pessoa.
        const name =
          personNameFromDealTitle(dealDetail?.title) ||
          (field === "email" ? "Novo contato" : v);
        const contact = await createContact({
          name,
          ...(field === "phone" ? { phone: v } : { email: v }),
        });
        await updateDeal(activeDealId, { contactId: contact.id });
        queryClient.invalidateQueries({ queryKey: dealDetailKey(activeDealId) });
        queryClient.invalidateQueries({ queryKey: ["pipeline-board"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["contact-sidebar", contact.id] });
        toast.success("Contato criado e vinculado ao negócio.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao criar contato.");
        throw e;
      }
    },
    [activeDealId, dealDetail?.title, queryClient],
  );

  // ── Conversa real ligada ao deal ────────────────────────────────
  // Pega a conversa mais recente do contato (o backend ja ordena por
  // updatedAt desc em getDealById). Quando o deal nao tem contato
  // vinculado ou nao ha conversa, o binding retorna nodes de "vazio".
  const dealConversation =
    (dealDetail?.contact as
      | { conversations?: { id: string; status?: string | null; closedAt?: string | null }[] }
      | null
      | undefined
    )?.conversations?.[0] ?? null;
  const dealConversationId = dealConversation?.id ?? null;
  const dealContactName =
    sanitizeContactName(dealDetail?.contact?.name) ||
    personNameFromDealTitle(dealDetail?.title) ||
    "Contato";
  const { messagesNode, composerNode, sessionAlertNode, templateModal, pinnedNote, pinnedMessageSlot, connection: dealConnection } =
    useDealChatBinding({
      conversationId: dealConversationId,
      contactName: dealContactName,
      contactId: dealContactId,
      dealId: activeDealId,
      isResolved: dealConversation?.status === "RESOLVED",
      closedAt: dealConversation?.closedAt ?? null,
      // sessionExpired derivado dentro do hook a partir do session retornado
      // por useMessages (backend = source of truth) com fallback heurístico
      // em lastInboundAt. Não passar override manual aqui.
    });

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    requestMove({
      dealId: draggableId,
      fromStageId: source.droppableId,
      toStageId: destination.droppableId,
      toIndex: destination.index,
    });
  }

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 p-4" style={{ gridTemplateRows: "1fr" }}>
      {navRail ?? <NavRailV2 />}
      <div
        ref={boardWrapperRef}
        className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-clip"
      >
        <PipelineHeader
          tabsOverride={<></>}
          activeView="kanban"
          onViewChange={(view) => {
            if (view === "list" && listHref) router.push(listHref);
          }}
          titleAccessory={
            <PipelineSwitcher
              variant="icon"
              selectedId={pipelineId}
              onChange={(id) => setPipelineId(id)}
            />
          }
          searchSlot={
            <PipelineSearchFilterBar
              search={search}
              onSearch={setSearch}
              filters={filters}
              onApplyFilters={setFilters}
              onClearFilters={clearFilters}
              options={filterOptions}
              optionsLoading={filterOptionsLoading}
              sortKey={sortKey}
              onSortKeyChange={(k) => setSortKey(k)}
            />
          }
          menuSlot={
            <TooltipGlass label="Ordenar, importar e exportar" side="bottom">
              <button
                ref={kebabBtnRef}
                type="button"
                data-pipeline-kebab-trigger=""
                onClick={() => setKebabOpen((v) => !v)}
                aria-label="Ações do pipeline"
                aria-expanded={kebabOpen}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-[filter,box-shadow] hover:brightness-105",
                  kebabOpen && "ring-2 ring-[var(--brand-primary)]/35 brightness-95",
                )}
              >
                <IconMenu2 size={18} stroke={2.2} />
              </button>
            </TooltipGlass>
          }
        />
        {/*
         * PipelineKebabMenu vive FORA do PageHeader porque este renderiza
         * `actions` em dois blocos (desktop `lg:flex` + mobile `lg:hidden`) —
         * colocá-lo dentro do menuSlot duplicaria o portal do menu.
         */}
        <PipelineKebabMenu
          open={kebabOpen}
          anchorRef={kebabBtnRef}
          onNewDeal={
            columns.length > 0
              ? () => {
                  setAddStage({ id: columns[0].stageId, name: columns[0].title });
                  setKebabOpen(false);
                }
              : undefined
          }
          onImport={() => { setImportExportOpen("import"); setKebabOpen(false); }}
          onExport={() => { setImportExportOpen("export"); setKebabOpen(false); }}
          onChannels={() => { setChannelsModalOpen(true); setKebabOpen(false); }}
          onSettings={() => { router.push("/settings/pipeline"); setKebabOpen(false); }}
          selectionMode={selectionMode}
          onToggleSelectionMode={() => {
            setSelectionMode((v) => {
              const next = !v;
              if (!next) setSelectedIds(new Set());
              return next;
            });
            setKebabOpen(false);
          }}
          onClose={() => setKebabOpen(false)}
        />

        {!isEmptyFilters(filters) && (
          <div className="flex flex-wrap items-center gap-2 px-0.5">
            <span className="font-display text-[11px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
              Filtros ativos
            </span>
            <FilterChips
              filters={filters}
              options={filterOptions}
              onPatch={patchFilters}
            />
            <button
              type="button"
              onClick={clearFilters}
              className="font-display text-[11px] font-semibold text-[var(--text-muted)] underline-offset-2 hover:text-[var(--brand-primary)] hover:underline"
            >
              Limpar todos
            </button>
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={boardRef}
            className="kanban-board-hscroll flex min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-auto overflow-y-hidden"
          >
            {columns.map((col) => (
              <DroppableColumn
                key={col.stageId}
                column={col}
                onDealClick={(id) => {
                  const raw = dealById.get(id);
                  setActiveDeal(id, raw?.number ?? null);
                }}
                dealById={dealById}
                pipelineId={pipelineId}
                statusFilter={status}
                stages={board}
                addStage={addStage}
                selectedIds={selectedIds}
                selectionMode={selectionMode}
                onToggleSelect={toggleSelect}
                onToggleSelectAllInColumn={toggleSelectMany}
                onRequestMove={requestMove}
                onAddDeal={() =>
                  setAddStage({ id: col.stageId, name: col.title })
                }
                onCloseAddDeal={() => setAddStage(null)}
              />
            ))}
            {columns.length === 0 ? (
              <EmptyBoard isAuthenticated={isAuthenticated} />
            ) : null}
          </div>
          {/* ScrollMap horizontal: só desktop — no mobile a barra inferior atrapalha. */}
          <ScrollMap
            boardRef={boardRef}
            columnCount={columns.length}
            className="max-md:hidden"
          />
          <ScrollMapVertical boardRef={boardRef} columnCount={columns.length} />
          </div>{/* fim relative wrapper */}
        </DragDropContext>
      </div>

      {importExportOpen && (
        <ImportExportModal
          activeTab={importExportOpen}
          onClose={() => setImportExportOpen(null)}
          bump={bump}
        />
      )}

      {channelsModalOpen && pipelineId && (
        <PipelineChannelsModal
          pipelineId={pipelineId}
          pipelineName={pipelines?.find((p) => p.id === pipelineId)?.name}
          open={channelsModalOpen}
          onClose={() => setChannelsModalOpen(false)}
        />
      )}

      <DealDetailPanel
        isOpen={!!activeDealId}
        onClose={() => setActiveDeal(null)}
        deal={dealDetailVm ?? undefined}
        stageRibbonSlot={
          activeDealId && activeDealStageId ? (
            <div className="flex items-center gap-1">
              {board.map((s, idx) => {
                const currentIdx = board.findIndex(
                  (b) => b.id === activeDealStageId,
                );
                const done = idx < currentIdx;
                const active = s.id === activeDealStageId;
                return (
                  <span
                    key={s.id}
                    className="flex-1 truncate rounded-full border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.06em]"
                    style={
                      active
                        ? {
                            background: "var(--brand-primary)",
                            color: "#fff",
                            borderColor: "var(--brand-primary-dark)",
                            boxShadow: "0 4px 12px rgba(91,111,245,0.35)",
                          }
                        : done
                          ? {
                              background: "var(--color-success-bg)",
                              color: "var(--color-success-text)",
                              borderColor: "rgba(16,185,129,0.25)",
                            }
                          : {
                              background: "var(--glass-bg)",
                              color: "var(--text-muted)",
                              borderColor: "var(--glass-border)",
                            }
                    }
                  >
                    {s.name}
                  </span>
                );
              })}
            </div>
          ) : undefined
        }
        stageDropdownSlot={
          activeDealId && activeDealStageId ? (
            <StagePicker
              dealId={activeDealId}
              currentStageId={activeDealStageId}
              pipelineId={pipelineId}
              statusFilter={status}
              onRequestMove={requestMove}
            >
              {({ onSelectStage, isPending }) => (
                <StageDropdown
                  stages={board}
                  currentStageId={activeDealStageId}
                  currentPipelineId={pipelineId}
                  isPending={isPending}
                  onSelect={onSelectStage}
                />
              )}
            </StagePicker>
          ) : undefined
        }
        funnelSegments={board.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color ?? "var(--brand-primary)",
          position: s.position,
        }))}
        winButtonSlot={
          activeDealId ? (
            <WinButton
              dealId={activeDealId}
              currentStatus={dealDetail?.status ?? "OPEN"}
              pipelineId={pipelineId}
              statusFilter={status}
              trigger={
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
                  style={{
                    background:
                      dealDetail?.status === "WON"
                        ? "var(--text-muted)"
                        : "var(--color-success)",
                    boxShadow: "0 4px 14px rgba(16,185,129,0.30)",
                  }}
                >
                  <IconTrophy size={14} />
                  {dealDetail?.status === "WON" ? "Reabrir" : "Ganhar"}
                </span>
              }
            />
          ) : undefined
        }
        contactEditSlot={
          activeDealId && dealContactId ? (
            <ContactEditDialog
              contactId={dealContactId}
              initial={{
                name: dealDetail?.contact?.name ?? "",
                email: dealDetail?.contact?.email ?? null,
                phone: dealDetail?.contact?.phone ?? null,
              }}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: dealDetailKey(activeDealId) });
                queryClient.invalidateQueries({ queryKey: ["pipeline-board"], exact: false });
              }}
            />
          ) : undefined
        }
        deleteSlot={undefined}
        callButtonSlot={
          activeDealId && dealDetailVm ? (
            <DealCallButton
              dealId={activeDealId}
              phone={dealDetailVm.phone ?? null}
              contactId={dealDetailVm.contactId ?? undefined}
            />
          ) : null
        }
        moreActionsSlot={
          activeDealId ? (
            <DealActionsMenu
              dealId={activeDealId}
              currentStatus={dealDetail?.status ?? "OPEN"}
              pipelineId={pipelineId}
              statusFilter={status}
              onDeleted={() => setActiveDeal(null)}
              trigger={
                <TooltipGlass label="Mais opções" side="left">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white hover:border-white/35"
                  >
                    <IconDotsVertical size={14} />
                  </span>
                </TooltipGlass>
              }
            />
          ) : undefined
        }
        ownerSlot={
          activeDealId ? (
            <AssigneePopover
              dealId={activeDealId}
              currentOwnerId={dealDetail?.owner?.id ?? null}
              currentOwnerName={dealDetail?.owner?.name ?? null}
              pipelineId={pipelineId}
              statusFilter={status}
              trigger={
                dealDetail?.owner?.name ? (
                  <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold transition-opacity hover:opacity-75">
                    {dealDetail.owner.name}
                  </span>
                ) : (
                  <span className="inline-flex cursor-pointer items-center rounded-full px-2.5 py-1 font-display text-[11px] font-semibold transition-opacity hover:opacity-75">
                    + Responsável
                  </span>
                )
              }
            />
          ) : undefined
        }
        // sourceSlot removido (DD5): antes tentava persistir Deal.source,
        // mas esse campo nao existe no schema (backend silenciosamente
        // ignorava o PUT). A row "Origem" foi movida pro cabecalho fixo
        // do DealDetailPanel usando Contact.source nativo via
        // InlineNativeEditor.
        customFieldsSlot={(() => {
          // Contact fields: filtrados por showInInboxLeadPanel (inalterado).
          // Deal fields: agora usa dealPanelFields do deal detail (filtrados por
          // showInDealPanel) para separar as configurações de visibilidade do inbox.
          const contactFields = dealContact?.inboxLeadPanelFields ?? [];
          const dealPanelFields = (dealDetail as { dealPanelFields?: import("@/features/pipeline-v2/api/deals").DealPanelField[] } | null)?.dealPanelFields ?? [];
          const seen = new Set<string>();
          type CFEntry = { fieldId: string; label?: string; name?: string; value: string | null; type: string; options?: string[]; highlightRules?: unknown[] | null; highlight?: { severity: string; label: string } | null; _et: "contact" | "deal"; _eid: string };
          const tagged: CFEntry[] = [
            ...contactFields.map((f) => ({ ...f, _et: "contact" as const, _eid: dealContactId ?? "" })),
            ...dealPanelFields.map((f) => ({ ...f, _et: "deal" as const, _eid: activeDealId ?? "" })),
          ];
          return tagged
            .filter((f) => {
              if (seen.has(f.fieldId)) return false;
              seen.add(f.fieldId);
              return true;
            })
            .map((f) => ({
              fieldId: f.fieldId,
              label: f.label || f.name || f.fieldId,
              value: f.value,
              type: f.type,
              options: f.options ?? [],
              entityType: f._et,
              entityId: f._eid,
              highlightRules: f.highlightRules ?? null,
              highlight: f.highlight ?? null,
            }));
        })()}
        messagesSlot={messagesNode}
        composerSlot={composerNode}
        sessionAlertSlot={sessionAlertNode ?? null}
        pinnedMessageSlot={pinnedMessageSlot}
        connection={dealConnection}
        conversationId={dealConversationId}
        isResolved={
          (dealDetail?.contact as { conversations?: { status?: string }[] } | null | undefined)
            ?.conversations?.[0]?.status === "RESOLVED"
        }
        conversationNumber={
          (dealDetail?.contact as { conversations?: { number?: number | null }[] } | null | undefined)
            ?.conversations?.[0]?.number ?? null
        }
        conversationClosedAt={
          (dealDetail?.contact as { conversations?: { closedAt?: string | null }[] } | null | undefined)
            ?.conversations?.[0]?.closedAt ?? null
        }
        tabContentOverride={
          activeDealId
            ? {
                notas: (
                  <DealNotesTab
                    dealId={activeDealId}
                    notes={dealDetail?.notes ?? null}
                    pipelineId={pipelineId}
                    statusFilter={status}
                    pinnedNote={pinnedNote}
                  />
                ),
                timeline: <DealTimelineTab dealId={activeDealId} />,
                atividades: (
                  <div className="flex-1 overflow-auto">
                    <ActivitiesPanel dealId={activeDealId} />
                  </div>
                ),
                chamadas: (
                  <div className="flex-1 overflow-auto p-4">
                    <CallHistoryList
                      embedded
                      contactId={dealContactId ?? undefined}
                    />
                  </div>
                ),
              }
            : undefined
        }
        productsSlot={
          activeDealId ? (
            <div className="flex flex-col gap-3">
              <DealProductsSection dealId={activeDealId} compact />
              <DealQuotasSection dealId={activeDealId} />
            </div>
          ) : null
        }
        onCreateContactForField={handleCreateContactForField}
        tagsSlot={
          activeDealId ? (() => {
            const allTags = dealDetail?.tags ?? [];
            const MAX_VISIBLE = 2;
            const visibleTags = allTags.slice(0, MAX_VISIBLE);
            const hiddenTags = allTags.slice(MAX_VISIBLE);
            return (
              <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
                {visibleTags.map((t) => (
                  // Linha única no grid do hero: chips truncam (max-w) e o
                  // container não quebra — "+N" e "+" ficam sempre visíveis
                  // na mesma linha.
                  <TooltipGlass key={t.id} label={t.name} side="top">
                    {/* Chip claro (color-mix com white) — mesmo padrão do
                        DealTagsTray do inbox, garante contraste legível sobre
                        o hero escuro (--nav-bg). */}
                    <span
                      className="inline-block max-w-[7.5rem] min-w-0 truncate rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${t.color ?? "#5b6ff5"} 18%, white)`,
                        color: `color-mix(in srgb, ${t.color ?? "#5b6ff5"} 75%, black)`,
                        border: `1px solid color-mix(in srgb, ${t.color ?? "#5b6ff5"} 40%, transparent)`,
                      }}
                    >
                      {t.name}
                    </span>
                  </TooltipGlass>
                ))}
                {hiddenTags.length > 0 && (
                  <TooltipGlass
                    label={hiddenTags.map((t) => t.name).join(", ")}
                    side="top"
                  >
                    <span className="inline-flex shrink-0 cursor-default items-center rounded-full border border-white/25 bg-white/15 px-1.5 py-0.5 font-display text-[10.5px] font-bold text-white/85">
                      +{hiddenTags.length}
                    </span>
                  </TooltipGlass>
                )}
                <TagsPopover
                  dealId={activeDealId}
                  currentTags={allTags}
                  pipelineId={pipelineId}
                  statusFilter={status}
                  trigger={
                    <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-white/35 px-2.5 py-0.5 font-display text-[11px] font-semibold text-white/70 transition-colors hover:border-white hover:text-white">
                      <IconPlus size={10} />
                      {allTags.length === 0 ? "Adicionar" : ""}
                    </span>
                  }
                />
              </div>
            );
          })() : undefined
        }
        contactFieldConfigSlot={
          <RequirePermission permission="settings:custom_fields">
            <FieldConfigPanel entities={["contact"]} context="deal_panel_v2" />
          </RequirePermission>
        }
        dealFieldConfigSlot={
          <RequirePermission permission="settings:custom_fields">
            <FieldConfigPanel entities={["deal"]} context="deal_panel_v2" />
          </RequirePermission>
        }
        contactTagsSlot={
          // DD9: tags do contato (Contact.tags) ao lado de Telefone/Email
          // no FieldCard "Dados de Contato". Separado de tagsSlot (Deal.tags
          // — fica no header da sidebar). dealDetail.contact.tags ja vem
          // serializado no detailInclude do backend.
          dealDetailVm?.contactId ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(dealDetail?.contact?.tags ?? []).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[10.5px] font-semibold"
                  style={{
                    background: `${t.color ?? "#5b6ff5"}22`,
                    color: t.color ?? "var(--brand-primary)",
                    border: `1px solid ${t.color ?? "#5b6ff5"}44`,
                  }}
                >
                  {t.name}
                </span>
              ))}
              <ContactTagsPopover
                contactId={dealDetailVm.contactId}
                currentTags={dealDetail?.contact?.tags ?? []}
                triggerVariant="icon"
              />
            </div>
          ) : null
        }
      />

      <AddDealDialog
        open={!!addStage}
        onOpenChange={(o) => {
          if (!o) setAddStage(null);
        }}
        stages={board.map((s) => ({ id: s.id, name: s.name }))}
        defaultStageId={addStage?.id ?? null}
        pipelineId={pipelineId}
        statusFilter={status}
      />

      {/* Tabulação do motivo da perda — abre sempre que um deal vai
          para o estágio Perdido (drag, menu do card ou drawer). */}
      <LossReasonDialog
        open={!!pendingLostMove}
        onOpenChange={(o) => {
          if (!o) setPendingLostMove(null);
        }}
        pipelineId={pipelineId}
        // NÃO usar `moveDeal.isPending` aqui: é a mesma mutation usada na
        // reabertura do lead, então um move anterior ainda em voo deixava o
        // "Confirmar perda" desabilitado mesmo com o motivo já selecionado.
        // O diálogo fecha no onConfirm, então não há risco de duplo submit.
        title="Mover para Perdido"
        description="Informe o motivo da perda para concluir a movimentação."
        onConfirm={(reason) => {
          if (!pendingLostMove) return;
          moveDeal.mutate({ ...pendingLostMove, lostReason: reason });
          setPendingLostMove(null);
        }}
      />

      {pipelineId ? (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          selectedIds={selectedIds}
          onClear={clearSelection}
          pipelineId={pipelineId}
          stages={board.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color ?? undefined,
            isLost: s.isLost,
          }))}
          users={teamUsers.map((u) => ({ id: u.id, name: u.name }))}
          scopeContext={scopeContext}
        />
      ) : null}

      {templateModal}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// StageDropdown — dropdown glass para troca de fase na sidebar.
// Reusa o estilo de PipelineSwitcher / AssigneePopover.
// ─────────────────────────────────────────────────────────────────

function StageDropdown({
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
      const menu = document.getElementById("pipeline-stage-dropdown-menu");
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Portal + fixed: evita clip por overflow-hidden do painel; ancora a
  // direita do trigger quando o menu vazaria da viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const b = triggerRef.current.getBoundingClientRect();
    const longest = stages.reduce((n, s) => Math.max(n, s.name.length), 0);
    // Largura suficiente para nomes longos (+ espaco p/ badge "Atual")
    const menuWidth = Math.min(
      Math.max(240, longest * 9 + 72),
      Math.min(340, window.innerWidth - 16),
    );
    const wouldOverflow = b.left + menuWidth > window.innerWidth - 8;
    const left = wouldOverflow ? Math.max(8, b.right - menuWidth) : b.left;
    setPos({ top: b.bottom + 6, left, width: menuWidth });
  }, [open, stages]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[min(100%,14rem)] items-center gap-1.5 font-display text-[15px] font-bold text-[var(--text-primary)] transition-opacity hover:opacity-70 disabled:cursor-wait disabled:opacity-50"
      >
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ background: current?.color ?? "var(--brand-primary)" }}
        />
        <span className="truncate">{current?.name ?? "Selecionar fase"}</span>
        <IconChevronDown
          size={14}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          // Opaco real (bg-white / dark solid) — mesmo criterio do inbox:
          // evita translucidez sobre o kanban (DD2 - jun/26).
          <div
            id="pipeline-stage-dropdown-menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
            className="z-(--z-popover) overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white py-1 shadow-[0_8px_24px_rgba(15,20,40,0.14)] v2-dark:bg-[#1a1f2e] v2-dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
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
        )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

// ────────────────���────────────────────────────────────────────────
// Coluna drop-friendly: re-renderiza a KanbanColumn original com
// uma área Droppable em cima dos cards.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// CardMoveMenu — botão "Mover" no rodapé do card que abre um menu de
// fases (alternativa ao drag-and-drop, útil no mobile/touch). Reusa o
// StagePicker (useMoveDeal) para a mutação com update otimista.
// ─────────────────────────────────────────────────────────────────
function CardMoveMenu({
  dealId,
  currentStageId,
  pipelineId,
  statusFilter,
  stages,
  onRequestMove,
}: {
  dealId: string;
  currentStageId: string;
  pipelineId: string | null;
  statusFilter: StatusFilter;
  stages: BoardStageDto[];
  onRequestMove?: (vars: {
    dealId: string;
    fromStageId: string;
    toStageId: string;
    toPipelineId?: string | null;
  }) => void;
}) {
  return (
    <StagePicker
      dealId={dealId}
      currentStageId={currentStageId}
      pipelineId={pipelineId}
      statusFilter={statusFilter}
      onRequestMove={onRequestMove}
    >
      {({ onSelectStage, isPending }) => (
        <CardMoveDropdown
          stages={stages}
          currentStageId={currentStageId}
          currentPipelineId={pipelineId}
          isPending={isPending}
          onSelect={onSelectStage}
        />
      )}
    </StagePicker>
  );
}

function CardMoveDropdown({
  stages,
  currentStageId,
  currentPipelineId,
  isPending,
  onSelect,
}: {
  stages: BoardStageDto[];
  currentStageId: string;
  currentPipelineId: string | null;
  isPending: boolean;
  onSelect: (stageId: string, toPipelineId?: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora — verifica tanto o botão quanto o menu no portal
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !btnRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleOpen() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    // Posiciona acima do botão, alinhado à direita
    setCoords({ top: rect.top + window.scrollY, left: rect.right + window.scrollX });
    setOpen((v) => !v);
  }

  const menu = open && coords && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: coords.top,
            left: coords.left,
            zIndex: "var(--z-popover)",
            transform: "translate(-100%, -100%)",
            marginBottom: "6px",
          }}
          className="max-h-[320px] min-w-[220px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--dropdown-solid-bg)] py-1 shadow-[0_8px_24px_rgba(15,20,40,0.18)]"
        >
          <MoveToStageMenu
            stages={stages}
            currentStageId={currentStageId}
            currentPipelineId={currentPipelineId}
            isPending={isPending}
            header={
              <div className="px-3 py-1.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Mover para
              </div>
            }
            onSelect={(stageId, toPipeId) => {
              onSelect(stageId, toPipeId);
              setOpen(false);
            }}
          />
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <TooltipGlass label="Mover de fase" side="top">
        <button
          ref={btnRef}
          type="button"
          disabled={isPending}
          aria-label="Mover de fase"
          onClick={handleOpen}
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] disabled:cursor-wait disabled:opacity-50"
        >
          <IconArrowsExchange size={15} />
        </button>
      </TooltipGlass>
      {menu}
    </>
  );
}

function DroppableColumn({
  column,
  onDealClick,
  dealById,
  pipelineId,
  statusFilter,
  onAddDeal,
  onCloseAddDeal,
  addStage,
  stages,
  selectedIds,
  selectionMode,
  onToggleSelect,
  onToggleSelectAllInColumn,
  onRequestMove,
}: {
  column: KanbanColumnView;
  onDealClick: (id: string) => void;
  dealById: Map<string, BoardDealDto>;
  pipelineId: string | null;
  statusFilter: StatusFilter;
  onAddDeal?: () => void;
  onCloseAddDeal?: () => void;
  addStage: { id: string; name: string } | null;
  stages: BoardStageDto[];
  selectedIds: Set<string>;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAllInColumn: (ids: string[]) => void;
  onRequestMove?: (vars: {
    dealId: string;
    fromStageId: string;
    toStageId: string;
    toPipelineId?: string | null;
  }) => void;
}) {
  // Estado de seleção em massa restrito aos deals JÁ CARREGADOS desta
  // coluna. Replica o comportamento do kanban antigo.
  const dealIdsInColumn = column.deals.map((d) => d.id);
  const selectedInColumnCount = dealIdsInColumn.reduce(
    (acc, id) => acc + (selectedIds.has(id) ? 1 : 0),
    0,
  );
  const allSelected =
    dealIdsInColumn.length > 0 && selectedInColumnCount === dealIdsInColumn.length;
  const someSelected = selectedInColumnCount > 0;

  const isAddingHere = addStage?.id === column.stageId;

  return (
    <Droppable droppableId={column.stageId}>
      {(provided, snapshot) => (
        <KanbanColumn
          title={column.title}
          color={column.color}
          stageColor={column.stageColor}
          count={column.count}
          total={column.total}
          deals={column.deals}
          onDealClick={onDealClick}
          onAddDeal={onAddDeal}
          addFormSlot={
            isAddingHere ? (
              <AddDealDialog
                open={true}
                onOpenChange={(o) => { if (!o) onCloseAddDeal?.(); }}
                stages={stages.map((s) => ({ id: s.id, name: s.name }))}
                defaultStageId={column.stageId}
                pipelineId={pipelineId}
                statusFilter={statusFilter}
              />
            ) : undefined
          }
          selection={{
            allSelected,
            someSelected,
            selectedCount: selectedInColumnCount,
            totalInColumn: dealIdsInColumn.length,
            onToggleAll: () => onToggleSelectAllInColumn(dealIdsInColumn),
            enabled: selectionMode,
          }}
          dealsContainerRef={provided.innerRef}
          dealsContainerProps={{
            ...provided.droppableProps,
            "aria-label": `Coluna ${column.title}`,
            style: snapshot.isDraggingOver
              ? {
                  background: "rgba(91,111,245,0.05)",
                  borderRadius: "var(--radius-lg)",
                }
              : undefined,
          }}
          placeholderSlot={provided.placeholder}
          renderDeal={(deal, index) => {
            const raw = dealById.get(deal.id);
            return (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(dragProvided, dragSnapshot) => {
                  const node = (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={{
                      ...dragProvided.draggableProps.style,
                      opacity: dragSnapshot.isDragging ? 0.9 : 1,
                    }}
                  >
                    <DealCard
                      deal={deal}
                      onClick={() => onDealClick(deal.id)}
                      isSelected={selectedIds.has(deal.id)}
                      selectionMode={selectionMode}
                      onToggleSelect={() => onToggleSelect(deal.id)}
                      tagsSlot={(() => {
                        const allTags = raw?.tags ?? ([] as NonNullable<BoardDealDto["tags"]>);
                        const MAX_VISIBLE = 2;
                        const visibleTags = allTags.slice(0, MAX_VISIBLE);
                        const hiddenTags = allTags.slice(MAX_VISIBLE);
                        return (
                          <>
                            {visibleTags.map((t) => (
                              // max-w + truncate evita que nomes longos
                              // ("Lead Estagiário Suporte SP" etc.) estourem
                              // a largura do card kanban (300px). Tooltip
                              // mostra o nome completo no hover. Padrão já
                              // usado no inbox v2 (`inbox/_v2-client.tsx`).
                              <TooltipGlass key={t.id} label={t.name} side="top">
                                <span
                                  className="font-display text-[9.5px] font-bold px-2 py-px rounded-full inline-flex items-center tracking-wide whitespace-nowrap"
                                  style={{
                                    background: `${t.color || "#5b6ff5"}33`,
                                    color: t.color || "var(--brand-primary)",
                                    border: `1px solid ${t.color || "#5b6ff5"}66`,
                                  }}
                                >
                                  {t.name}
                                </span>
                              </TooltipGlass>
                            ))}
                            {hiddenTags.length > 0 && (
                              <TooltipGlass
                                label={hiddenTags.map((t) => t.name).join(", ")}
                                side="top"
                              >
                                <span className="inline-flex cursor-default items-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2 py-px font-display text-[9.5px] font-bold text-[var(--text-muted)]">
                                  +{hiddenTags.length}
                                </span>
                              </TooltipGlass>
                            )}
                            <TagsPopover
                              dealId={deal.id}
                              currentTags={raw?.tags ?? []}
                              pipelineId={pipelineId}
                              statusFilter={statusFilter}
                              trigger={
                                <span className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[12px] font-bold leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]">
                                  +
                                </span>
                              }
                            />
                          </>
                        );
                      })()}
                      ownerSlot={
                        <AssigneePopover
                          dealId={deal.id}
                          currentOwnerId={raw?.owner?.id ?? null}
                          currentOwnerName={raw?.owner?.name ?? null}
                          pipelineId={pipelineId}
                          statusFilter={statusFilter}
                          trigger={
                            raw?.owner?.name ? (
                              // Owner: AvatarGlass (pessoa interna) — sem badge de canal.
                              <span
                                className="inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] py-px pl-px pr-2 transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[var(--glass-bg-base)]"
                                title={raw.owner.name}
                              >
                                <AvatarGlass
                                  name={raw.owner.name}
                                  seed={raw.owner.id ?? raw.owner.name}
                                  imageUrl={raw.owner.avatarUrl ?? null}
                                  initials={deal.owner.initials}
                                  size="sm"
                                  className="!h-4 !w-4 !border !text-[8px]"
                                />
                                <span className="min-w-0 truncate font-display text-[10.5px] font-semibold text-[var(--text-secondary)]">
                                  {raw.owner.name}
                                </span>
                              </span>
                            ) : (
                              <Chip
                                variant="ghost"
                                className="cursor-pointer whitespace-nowrap transition-colors hover:text-[var(--brand-primary)]"
                              >
                                +Responsável
                              </Chip>
                            )
                          }
                        />
                      }
                      moveMenuSlot={
                        <CardMoveMenu
                          dealId={deal.id}
                          currentStageId={column.stageId}
                          pipelineId={pipelineId}
                          statusFilter={statusFilter}
                          stages={stages}
                          onRequestMove={onRequestMove}
                        />
                      }
                    />
                  </div>
                  );
                  // Enquanto arrasta, renderizamos o card num portal pro
                  // <body>. Os ancestrais do Kanban usam backdrop-blur/
                  // transform (glass), que criam um containing block novo e
                  // quebram o `position: fixed` que a lib aplica ao item
                  // arrastado — sem o portal, o card "some"/salta pra fora da
                  // tela. Portar pro body (sem ancestral transformado) faz o
                  // ghost seguir o cursor normalmente.
                  return dragSnapshot.isDragging && typeof document !== "undefined"
                    ? createPortal(node, document.body)
                    : node;
                }}
              </Draggable>
            );
          }}
        />
      )}
    </Droppable>
  );
}

function EmptyBoard({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="grid w-full place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-12 text-center backdrop-blur-md">
      <div>
        <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
          {isAuthenticated ? "Selecione um pipeline" : "Carregando..."}
        </h2>
        <p className="mt-1 max-w-sm text-[12.5px] text-[var(--text-muted)]">
          Pipeline ativo nao retornou estagios. Verifique a configuracao no painel
          de administracao.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────������────��───────────
// Helper: nome → slug de cor do v0 (av-blue, av-orange, ...).
// O novo DealDetailPanel usa `av-${avatarColor}` direto no className,
// então precisamos retornar um dos slugs definidos em globals-v2.css.
// ──────────────────────────────────��─���────────────────────────────

const AVATAR_SLUGS = [
  "green",
  "blue",
  "orange",
  "purple",
  "pink",
  "coral",
  "teal",
  "mint",
  "gray",
] as const;

function avatarColorSlugFromName(name: string | null | undefined): string {
  const safe = (name ?? "").trim();
  if (!safe) return "gray";
  let sum = 0;
  for (let i = 0; i < safe.length; i += 1) sum += safe.charCodeAt(i);
  return AVATAR_SLUGS[sum % AVATAR_SLUGS.length];
}

// ─── PipelineKebabMenu ─────────────────────────────────────���──────

interface PipelineKebabMenuProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onNewDeal?: () => void;
  onImport: () => void;
  onExport: () => void;
  onChannels: () => void;
  onSettings: () => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onClose: () => void;
}

function PipelineKebabMenu({
  open,
  anchorRef,
  onNewDeal,
  onImport,
  onExport,
  onChannels,
  onSettings,
  selectionMode,
  onToggleSelectionMode,
  onClose,
}: PipelineKebabMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // O `menuSlot` do PageHeader é montado em dois blocos (desktop/mobile),
  // então o ref anexado ao botão pode terminar apontando pra cópia oculta.
  // `resolveAnchor` procura, em tempo real, o botão visível pelo data-attr.
  const resolveAnchor = useCallback((): HTMLElement | null => {
    const nodes = document.querySelectorAll<HTMLElement>(
      "[data-pipeline-kebab-trigger]",
    );
    for (const el of Array.from(nodes)) {
      if (el.offsetParent !== null) return el;
    }
    return anchorRef.current;
  }, [anchorRef]);

  // useLayoutEffect: mede o anchor antes do paint para não piscar em (0,0).
  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    function updateRect() {
      const el = resolveAnchor();
      if (el) setRect(el.getBoundingClientRect());
    }
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open, resolveAnchor]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!document.contains(t)) return;
      const anchor = resolveAnchor();
      if (
        menuRef.current &&
        !menuRef.current.contains(t) &&
        anchor &&
        !anchor.contains(t)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", fn, true);
    return () => document.removeEventListener("mousedown", fn, true);
  }, [open, onClose, resolveAnchor]);

  if (!open || !rect) return null;

  // Altura disponível no viewport — menu rola internamente se passar disso.
  const margin = 8;
  const viewportH =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const spaceBelow = viewportH - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const idealH = 420;
  const preferBelow = spaceBelow >= Math.min(240, idealH) || spaceBelow >= spaceAbove;
  const available = preferBelow ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(160, Math.min(idealH, available));
  const { left } = computePopoverPosition(rect, maxHeight, 208, margin);
  const top = preferBelow
    ? rect.bottom + 4
    : Math.max(margin, rect.top - maxHeight - 4);

  return createPortal(
    <div
      ref={menuRef}
      style={{ top, left, maxHeight }}
      className="scrollbar-thin fixed z-[60] w-52 overflow-y-auto overscroll-contain rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[0_8px_28px_rgba(15,23,42,0.13)] [-webkit-overflow-scrolling:touch] v2-dark:shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
    >
      {onNewDeal && (
        <>
          <button
            type="button"
            onClick={onNewDeal}
            className="flex w-full items-center gap-2.5 px-3 pb-2 pt-3 text-left font-display text-[12.5px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)]/8"
          >
            <IconPlus size={14} stroke={2.6} className="shrink-0" />
            Adicionar negócio
          </button>
          <div className="mx-3 my-1 h-px bg-[var(--glass-border-subtle)]" />
        </>
      )}

      {/* Seção: seleção */}
      <button
        type="button"
        onClick={onToggleSelectionMode}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2 text-left font-display text-[12.5px] font-semibold transition-colors",
          selectionMode
            ? "bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]",
        )}
      >
        <IconCheckbox size={13} className="shrink-0" />
        {selectionMode ? "Sair da seleção" : "Selecionar..."}
      </button>

      <div className="mx-3 my-1.5 h-px bg-[var(--glass-border-subtle)]" />

      {/* Seção: dados */}
      <div className="px-3 pb-1 pt-1">
        <p className="font-display text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Dados
        </p>
      </div>
      <RequirePermission permission="deal:import">
        <button
          type="button"
          onClick={onImport}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]"
        >
          <IconUpload size={13} className="shrink-0" />
          Importar CSV
        </button>
      </RequirePermission>
      <RequirePermission permission="deal:export">
        <button
          type="button"
          onClick={onExport}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]"
        >
          <IconDownload size={13} className="shrink-0" />
          Exportar CSV
        </button>
      </RequirePermission>

      <div className="mx-3 my-1.5 h-px bg-[var(--glass-border-subtle)]" />

      {/* Seção: pipeline */}
      <button
        type="button"
        onClick={onChannels}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]"
      >
        <IconAntenna size={13} className="shrink-0" />
        Canais do funil
      </button>
      <button
        type="button"
        onClick={onSettings}
        className="flex w-full items-center gap-2.5 px-3 py-2 pb-3 text-left font-display text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]"
      >
        <IconSettings size={13} className="shrink-0" />
        Configurar pipeline
      </button>
    </div>,
    document.body,
  );
}

// ─── ImportExportModal ────────────────────────────────────────────

interface ImportExportModalProps {
  activeTab: "import" | "export";
  onClose: () => void;
  bump: () => void;
}

function ImportExportModal({ activeTab, onClose, bump }: ImportExportModalProps) {
  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-black/25 px-4 py-4 backdrop-blur-[2px] sm:px-6 sm:py-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1320px] max-h-[92vh] overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--dropdown-solid-bg)] shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--glass-border)] bg-[var(--dropdown-solid-bg)]/95 px-6 py-5 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--brand-primary)]/10">
              {activeTab === "import"
                ? <IconUpload size={20} className="text-[var(--brand-primary)]" />
                : <IconDownload size={20} className="text-[var(--brand-primary)]" />
              }
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold text-[var(--text-primary)]">
                {activeTab === "import" ? "Importar negócios" : "Exportar dados"}
              </h2>
              <p className="mt-0.5 font-body text-[13px] text-[var(--text-muted)]">
                {activeTab === "import"
                  ? "CSV de negócios — contatos são criados automaticamente quando nome + email/telefone são informados"
                  : "Baixar base em CSV"}
              </p>
            </div>
          </div>
          <TooltipGlass label="Fechar" side="left">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
            >
              <IconX size={17} />
            </button>
          </TooltipGlass>
        </div>

        {/* Conteúdo */}
        <div className="p-6 sm:p-8">
          {activeTab === "import"
            ? <ImportPanel fixedEntity="deals" onDone={() => { bump(); onClose(); }} />
            : <ExportPanel />
          }
        </div>
      </div>
    </div>
  );
}
