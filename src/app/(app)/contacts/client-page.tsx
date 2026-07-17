"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconPencil,
  IconBuilding,
  IconSearch,
  IconCheck,
  IconX,
  IconPhone,
  IconMail,
  IconTable,
  IconLayoutList,
  IconColumns,
  IconRotateClockwise,
  IconAdjustmentsHorizontal,
  IconMenu2,
  IconDownload,
  IconFileImport,
  IconSettings,
  IconUsersGroup,
  IconArrowMerge,
  IconLoader2,
  IconArrowsSort,
  IconCalendarEvent,
  IconTag,
  IconSparkles,
  IconTrophy,
  IconUserPlus,
  IconUserOff,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { pagePrimaryButtonClass, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { ListColumnLabel, SortableHeader, listTableHeadRowClass, type SortDir } from "@/components/crm/sortable-header";
import {
  ColumnResizer,
  parseWidthClass,
  ResizableColumnHead,
  useColumnWidths,
} from "@/components/crm/column-resizer";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { Chip } from "@/components/crm/chip";
import { InputGlass } from "@/components/crm/input-glass";
import { KpiCard, type KpiTone } from "@/components/crm/kpi-card";
import { ListHScroll } from "@/components/crm/list-hscroll";
import { DatePicker } from "@/components/ui/date-picker";
import {
  dateRangeFromPreset,
  detectPreset,
  type DatePresetKey,
} from "@/components/pipeline/kanban-filters/date-presets";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import { ImportPanel, downloadFromApi } from "@/features/pipeline-v2/import-export";
import { apiUrl } from "@/lib/api";

import {
  useContacts,
  useContactStats,
  useContactTags,
  useContactFieldDefs,
  useContactDuplicates,
  useMergeContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  useCompanies,
} from "@/features/directory-v2/hooks";
import {
  addContactTag,
  removeContactTag,
  type ContactFieldDefDto,
  type ContactListItemDto,
  type ContactStatsDto,
  type DuplicateContactSnap,
  type DuplicateGroup,
  type TagWithCountDto,
} from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;
type ViewMode = "cards" | "tabela";
type Segment = "todos" | "clientes" | "leads" | "sem-resp";

/** Segmentos dos KPI cards (acionáveis) → filtros reais da API.
 *  Clientes = leads com negócios ganhos (lifecycle CUSTOMER). */
const SEGMENTS: {
  id: Segment;
  label: string;
  tone: KpiTone;
  icon: React.ReactNode;
  value: (s: ContactStatsDto | undefined) => number | undefined;
}[] = [
  {
    id: "todos",
    label: "Todos",
    tone: "brand",
    icon: <IconUsers size={20} stroke={2.2} />,
    value: (s) => s?.total,
  },
  {
    id: "clientes",
    label: "Clientes",
    tone: "success",
    icon: <IconTrophy size={20} stroke={2.2} />,
    value: (s) => s?.byStage?.CUSTOMER,
  },
  {
    id: "leads",
    label: "Leads",
    tone: "violet",
    icon: <IconUserPlus size={20} stroke={2.2} />,
    value: (s) => s?.byStage?.LEAD,
  },
  {
    id: "sem-resp",
    label: "Sem responsável",
    tone: "neutral",
    icon: <IconUserOff size={20} stroke={2.2} />,
    value: (s) => s?.unassigned,
  },
];

type SortField = "name" | "createdAt" | "updatedAt" | "leadScore" | "lifecycleStage";

/** Presets de ordenação (campo:direção) — aba Ordenar do painel de filtros. */
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Mais recentes" },
  { value: "createdAt:asc", label: "Mais antigos" },
  { value: "name:asc", label: "Nome (A–Z)" },
  { value: "name:desc", label: "Nome (Z–A)" },
  { value: "updatedAt:desc", label: "Modificados recentemente" },
] as const;

type FilterPanelTab = "ordenar" | "periodo" | "tags";

const FILTER_TABS: { id: FilterPanelTab; label: string; icon: React.ReactNode }[] = [
  { id: "ordenar", label: "Ordenar", icon: <IconArrowsSort size={14} stroke={2.2} /> },
  { id: "periodo", label: "Período", icon: <IconCalendarEvent size={14} stroke={2.2} /> },
  { id: "tags", label: "Tags", icon: <IconTag size={14} stroke={2.2} /> },
];

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

// ── Configurador de colunas (estilo Kommo) ───────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  width: string;
  sortField?: SortField;
  cell: (c: ContactListItemDto) => React.ReactNode;
}

/** Célula de texto padrão (truncada) das colunas da Tabela. */
function txtCell(v: React.ReactNode) {
  return <span className="block truncate font-display text-[13px] text-[var(--text-secondary)]">{v}</span>;
}

/** Colunas nativas opcionais (a coluna Nome/E-mail é fixa e não entra aqui). */
const NATIVE_COLUMNS: ColumnDef[] = [
  { key: "phone", label: "Telefone", width: "w-[160px]", cell: (c) => txtCell(c.phone ? formatPhoneDisplay(c.phone) : "—") },
  { key: "company", label: "Empresa", width: "w-[180px]", cell: (c) => txtCell(c.company?.name ?? "—") },
  {
    key: "tags",
    label: "Tags",
    width: "w-[220px]",
    cell: (c) => (
      <div className="flex flex-wrap gap-1">
        {(c.tags ?? []).slice(0, 3).map((t) => (
          <Chip key={t.id} variant="ghost" color={t.color ?? undefined}>{t.name}</Chip>
        ))}
        {(c.tags?.length ?? 0) > 3 && (
          <span className="font-display text-[11px] text-[var(--text-muted)]">+{(c.tags?.length ?? 0) - 3}</span>
        )}
      </div>
    ),
  },
  { key: "assignedTo", label: "Responsável", width: "w-[170px]", cell: (c) => txtCell(c.assignedTo?.name ?? "—") },
  { key: "createdAt", label: "Criado em", width: "w-[130px]", sortField: "createdAt", cell: (c) => txtCell(fmtDateBR(c.createdAt)) },
  { key: "updatedAt", label: "Modificado em", width: "w-[130px]", sortField: "updatedAt", cell: (c) => txtCell(fmtDateBR(c.updatedAt)) },
];

const DEFAULT_COLUMN_KEYS = ["phone", "company", "tags", "createdAt"];
/** Bump v2: garante Tags no header da lista Cards/Tabela. */
const COLUMNS_STORAGE_KEY = "v2:contacts:columns:v2";
const WIDTHS_STORAGE_KEY = "v2:contacts:col-widths:v1";
const NAME_COL_KEY = "__name__";

const COLUMN_WIDTH_DEFAULTS: Record<string, number> = {
  [NAME_COL_KEY]: 240,
  ...Object.fromEntries(NATIVE_COLUMNS.map((c) => [c.key, parseWidthClass(c.width)])),
};

function customColumnKey(id: string): string {
  return `cf:${id}`;
}

/** Constrói os ColumnDef dos campos customizados a partir das definições. */
function buildCustomColumns(defs: ContactFieldDefDto[]): ColumnDef[] {
  return defs.map((f) => ({
    key: customColumnKey(f.id),
    label: f.label,
    width: "w-[160px]",
    cell: (c) => txtCell(c.customFields?.[f.id] ?? "—"),
  }));
}

/** Estilo de chip com a cor da tag (selecionado = mais forte). */
function tagChipStyle(color: string | null | undefined, selected: boolean): CSSProperties | undefined {
  if (!color) return undefined;
  return selected
    ? {
        color,
        borderColor: color,
        background: `color-mix(in srgb, ${color} 20%, transparent)`,
      }
    : {
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      };
}

const VIEW_ITEMS = [
  { value: "cards", label: <span className="flex items-center gap-1.5"><IconLayoutList size={14} />Cards</span> },
  { value: "tabela", label: <span className="flex items-center gap-1.5"><IconTable size={14} />Tabela</span> },
] as const;

export default function V2ContactsClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [segment, setSegment] = useState<Segment>("todos");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [dupesOpen, setDupesOpen] = useState(false);
  const [editing, setEditing] = useState<ContactListItemDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useDeleteContact();

  // Colunas visíveis da Tabela (persistidas no navegador).
  const [activeColumnKeys, setActiveColumnKeys] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((k) => typeof k === "string")) {
          // Tags sempre presentes no header (pedido de produto).
          const keys = parsed.includes("tags") ? parsed : [...parsed, "tags"];
          setActiveColumnKeys(keys);
        }
      }
    } catch {
      /* localStorage indisponível — mantém o padrão */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(activeColumnKeys));
    } catch {
      /* ignore */
    }
  }, [activeColumnKeys]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSelected(new Set());
  }, [debounced, page]);

  useEffect(() => {
    setPage(1);
  }, [segment, tagIds, sortBy, sortOrder, createdFrom, createdTo, updatedFrom, updatedTo]);

  const stageFilter = segment === "clientes" ? "CUSTOMER" : segment === "leads" ? "LEAD" : undefined;
  const unassignedFilter = segment === "sem-resp";

  const statsQuery = useContactStats(isAuthenticated);
  const tagsQuery = useContactTags(isAuthenticated);
  const fieldDefsQuery = useContactFieldDefs(isAuthenticated);

  const customColumns = useMemo(
    () => buildCustomColumns(fieldDefsQuery.data ?? []),
    [fieldDefsQuery.data],
  );
  // Todas as colunas opcionais disponíveis (nativas + customizadas).
  const allOptionalColumns = useMemo(
    () => [...NATIVE_COLUMNS, ...customColumns],
    [customColumns],
  );
  // Colunas ativas, na ordem escolhida, ignorando chaves que não existem mais.
  const activeColumns = useMemo(
    () =>
      activeColumnKeys
        .map((k) => allOptionalColumns.find((c) => c.key === k))
        .filter((c): c is ColumnDef => Boolean(c)),
    [activeColumnKeys, allOptionalColumns],
  );

  const { getWidth, setWidth } = useColumnWidths(WIDTHS_STORAGE_KEY, COLUMN_WIDTH_DEFAULTS);

  function toggleColumn(key: string) {
    setActiveColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const query = useContacts({
    search: debounced || undefined,
    page,
    perPage,
    lifecycleStage: stageFilter,
    unassigned: unassignedFilter,
    tagIds: tagIds.length > 0 ? tagIds : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    updatedFrom: updatedFrom || undefined,
    updatedTo: updatedTo || undefined,
    sortBy,
    sortOrder,
    enabled: isAuthenticated,
  });

  // Contador de filtros ativos do painel (tags + intervalos de data).
  const activeFilterCount =
    tagIds.length +
    (createdFrom || createdTo ? 1 : 0) +
    (updatedFrom || updatedTo ? 1 : 0);

  function clearPanelFilters() {
    setTagIds([]);
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
  }

  /** Alterna a ordenação por uma coluna (usado pelos cabeçalhos da Tabela). */
  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const allChecked = items.length > 0 && items.every((c) => selected.has(c.id));
  const someChecked = items.some((c) => selected.has(c.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) items.forEach((c) => next.delete(c.id));
      else items.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirmDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await deleteMut.mutateAsync(id);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setConfirmOpen(false);
    setSelected(new Set());
    if (fail === 0) {
      toast.success(ok === 1 ? "Contato excluído." : `${ok} contatos excluídos.`);
    } else if (ok === 0) {
      toast.error("Não foi possível excluir os contatos selecionados.");
    } else {
      toast.error(`${ok} excluído(s), ${fail} falharam.`);
    }
  }

  const isLoading = query.isLoading && items.length === 0;
  const hasError = !!query.error;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconUsers size={22} stroke={2.2} />}
          title="Contatos"
          center={
            <div className="flex w-full justify-start">
              <SearchFilterBar
                search={search}
                onSearch={setSearch}
                tags={tagsQuery.data ?? []}
                tagIds={tagIds}
                createdFrom={createdFrom}
                createdTo={createdTo}
                updatedFrom={updatedFrom}
                updatedTo={updatedTo}
                sortBy={sortBy}
                sortOrder={sortOrder}
                activeCount={activeFilterCount}
                onClear={clearPanelFilters}
                onApply={(next) => {
                  setSortBy(next.sortBy);
                  setSortOrder(next.sortOrder);
                  setTagIds(next.tagIds);
                  setCreatedFrom(next.createdFrom);
                  setCreatedTo(next.createdTo);
                  setUpdatedFrom(next.updatedFrom);
                  setUpdatedTo(next.updatedTo);
                }}
              />
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              <PageSegmentedControl
                items={VIEW_ITEMS}
                value={view}
                onChange={(v) => setView(v as ViewMode)}
                aria-label="Modo de visualização"
                size="compact"
              />
              <ActionsMenu
                onAdd={() => setCreateOpen(true)}
                onExport={() => {
                  void downloadFromApi(apiUrl("/api/contacts/export"), "contatos.csv")
                    .then(() => toast.success("Exportação concluída. Verifique seus downloads."))
                    .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao exportar."));
                }}
                onImport={() => setImportOpen(true)}
                onColumns={() => setColumnsOpen(true)}
                onDupes={() => setDupesOpen(true)}
              />
            </div>
          }
        />

        {/* KPI cards acionáveis — mesmo padrão tipográfico do mini-dash de Automações */}
        <section
          className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4"
          aria-label="Indicadores de contatos"
        >
          {SEGMENTS.map((seg) => {
            const val = seg.value(statsQuery.data);
            return (
              <KpiCard
                key={seg.id}
                label={seg.label}
                value={val === undefined ? "—" : val.toLocaleString("pt-BR")}
                icon={seg.icon}
                tone={seg.tone}
                active={segment === seg.id}
                onClick={() => setSegment(seg.id)}
              />
            );
          })}
        </section>

        {/* Barra de seleção em massa */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
            <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <ButtonGlass
                variant="glass" size="sm" type="button"
                onClick={() => setSelected(new Set())}
                className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
              >
                Limpar
              </ButtonGlass>
              <ButtonGlass variant="danger" size="sm" type="button" onClick={() => setConfirmOpen(true)}>
                <IconTrash size={14} /> Excluir
              </ButtonGlass>
            </div>
          </div>
        )}

        {/* Estados: loading / erro / vazio */}
        {isLoading ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : hasError ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconUsers size={28} />}
              title="Nenhum contato encontrado"
              description={
                debounced
                  ? `Sem resultados para "${debounced}".`
                  : segment !== "todos" || activeFilterCount > 0
                    ? "Nenhum contato para os filtros selecionados."
                    : "Crie contatos no Inbox ou via API."
              }
            />
          </div>
        ) : view === "tabela" ? (
          <TabelaView
            items={items}
            selected={selected}
            allChecked={allChecked}
            someChecked={someChecked}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            columns={activeColumns}
            getWidth={getWidth}
            setWidth={setWidth}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={toggleSort}
            onEdit={setEditing}
          />
        ) : (
          <CardsView
            items={items}
            selected={selected}
            allChecked={allChecked}
            someChecked={someChecked}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            columns={activeColumns}
            getWidth={getWidth}
            setWidth={setWidth}
            onEdit={setEditing}
          />
        )}

        <PaginationGlass
          total={total}
          entityLabel="contatos"
          page={page}
          lastPage={lastPage}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
          perPage={perPage}
          onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        />
      </main>

      <ContactFormSheet
        open={createOpen || editing !== null}
        contact={editing}
        availableTags={tagsQuery.data ?? []}
        onOpenChange={(next) => {
          if (!next) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
      />
      <ImportSheet open={importOpen} onOpenChange={setImportOpen} />
      <DuplicatesSheet open={dupesOpen} onOpenChange={setDupesOpen} />
      <ColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        nativeColumns={NATIVE_COLUMNS}
        customColumns={customColumns}
        activeKeys={activeColumnKeys}
        onToggle={toggleColumn}
        onReset={() => setActiveColumnKeys(DEFAULT_COLUMN_KEYS)}
      />
      <ConfirmDeleteDialog
        open={confirmOpen} count={selected.size} pending={deleteMut.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ── Busca + painel de filtros segmentado (DS v2) ─────────────────────────────

const FILTER_INPUT_CLASS =
  "h-9 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-body text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-primary)]";

const DATE_TRIGGER_CLASS =
  "h-9 rounded-full border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] px-3 shadow-none";

const CREATED_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "last_7", label: "Últimos 7 dias" },
  { key: "last_30", label: "Últimos 30 dias" },
  { key: "this_month", label: "Este mês" },
];

function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

type ContactFilterDraft = {
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  tagIds: string[];
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
};

function SearchFilterBar({
  search, onSearch, tags, tagIds,
  createdFrom, createdTo, updatedFrom, updatedTo,
  sortBy, sortOrder, activeCount, onClear, onApply,
}: {
  search: string;
  onSearch: (v: string) => void;
  tags: TagWithCountDto[];
  tagIds: string[];
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  activeCount: number;
  onClear: () => void;
  onApply: (next: ContactFilterDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterPanelTab>("ordenar");
  const [tagQuery, setTagQuery] = useState("");
  const [draft, setDraft] = useState<ContactFilterDraft>({
    sortBy, sortOrder, tagIds, createdFrom, createdTo, updatedFrom, updatedTo,
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft({ sortBy, sortOrder, tagIds, createdFrom, createdTo, updatedFrom, updatedTo });
    setTagQuery("");
  }, [open, sortBy, sortOrder, tagIds, createdFrom, createdTo, updatedFrom, updatedTo]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const visibleTags = (tags ?? [])
    .filter((t) => t.contactCount > 0)
    .filter((t) => t.name.toLowerCase().includes(tagQuery.trim().toLowerCase()));
  const tagSet = new Set(draft.tagIds);
  const sortKey = `${draft.sortBy}:${draft.sortOrder}`;

  const createdActive = !!(draft.createdFrom || draft.createdTo);
  const updatedActive = !!(draft.updatedFrom || draft.updatedTo);
  const periodCount = (createdActive ? 1 : 0) + (updatedActive ? 1 : 0);
  const tagsCount = draft.tagIds.length;
  const draftActiveCount = tagsCount + periodCount;

  const createdPreset = detectPreset({
    from: draft.createdFrom || null,
    to: draft.createdTo || null,
  });

  function applyCreatedPreset(key: DatePresetKey) {
    const range = dateRangeFromPreset(key);
    if (!range) return;
    setDraft((prev) => ({
      ...prev,
      createdFrom: range.from ?? "",
      createdTo: range.to ?? "",
    }));
  }

  function toggleDraftTag(id: string) {
    setDraft((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((t) => t !== id)
        : [...prev.tagIds, id],
    }));
  }

  function handleClear() {
    setDraft((prev) => ({
      ...prev,
      tagIds: [],
      createdFrom: "",
      createdTo: "",
      updatedFrom: "",
      updatedTo: "",
    }));
    onClear();
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  const tabBadge = (id: FilterPanelTab) => {
    if (id === "periodo") return periodCount;
    if (id === "tags") return tagsCount;
    return 0;
  };

  return (
    <div ref={ref} className="relative w-full">
      <IconSearch size={15} className="absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]" />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar e filtrar..."
        aria-label="Buscar e filtrar contatos"
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtros"
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
          activeCount > 0 || open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
        )}
      >
        <IconAdjustmentsHorizontal size={15} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(100vw-2rem,380px)] flex-col rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-left shadow-[var(--glass-shadow-lg)] backdrop-blur-md",
            tab === "periodo" ? "overflow-visible" : "max-h-[min(78vh,560px)] overflow-hidden",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">Filtros</span>
              <FilterCountBadge count={draftActiveCount || activeCount} />
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={draftActiveCount === 0 && activeCount === 0}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          {/* Segmented tabs */}
          <div className="px-4 pb-3">
            <div
              role="tablist"
              aria-label="Seções do filtro"
              className="flex items-center gap-0.5 rounded-full bg-[var(--glass-bg-strong)] p-1"
            >
              {FILTER_TABS.map((t) => {
                const active = tab === t.id;
                const badge = tabBadge(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-display text-[12px] font-bold transition-all",
                      active
                        ? "bg-[var(--glass-bg-modal,#fff)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    <span className={active ? "text-[var(--brand-primary)]" : undefined}>{t.icon}</span>
                    {t.label}
                    <FilterCountBadge count={badge} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div
            className={cn(
              "px-4 pb-3",
              tab === "periodo" ? "overflow-visible" : "min-h-0 flex-1 overflow-y-auto",
            )}
          >
            {tab === "ordenar" && (
              <div className="flex flex-col gap-2" role="listbox" aria-label="Ordenar por">
                <p className="mb-0.5 font-display text-[12px] font-semibold text-[var(--text-muted)]">
                  Ordenar resultados por
                </p>
                {SORT_OPTIONS.map((opt) => {
                  const selected = sortKey === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        const [f, o] = opt.value.split(":");
                        setDraft((prev) => ({
                          ...prev,
                          sortBy: f as SortField,
                          sortOrder: o as "asc" | "desc",
                        }));
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left font-display text-[13px] font-semibold transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--text-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                          selected
                            ? "border-[var(--brand-primary)]"
                            : "border-[var(--glass-border)]",
                        )}
                      >
                        {selected && (
                          <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                        )}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "periodo" && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-2 font-display text-[11px] font-semibold text-[var(--text-muted)]">
                    Atalhos rápidos (data de criação)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CREATED_PRESETS.map((p) => {
                      const on = createdPreset === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => applyCreatedPreset(p.key)}
                          className={cn(
                            "rounded-full px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                            on
                              ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.3)]"
                              : "border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Criação */}
                <div
                  className={cn(
                    "rounded-[16px] border p-3",
                    createdActive
                      ? "border-[var(--brand-primary)]/35 bg-[var(--color-primary-soft)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]",
                  )}
                >
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <IconSparkles
                      size={14}
                      className={createdActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}
                    />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Criação
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DatePicker
                      value={draft.createdFrom || null}
                      onChange={(v) => setDraft((p) => ({ ...p, createdFrom: v }))}
                      placeholder="dd/mm/aaaa"
                      className="min-w-0 flex-1"
                      triggerClassName={DATE_TRIGGER_CLASS}
                    />
                    <span className="shrink-0 font-body text-[12px] text-[var(--text-muted)]">até</span>
                    <DatePicker
                      value={draft.createdTo || null}
                      onChange={(v) => setDraft((p) => ({ ...p, createdTo: v }))}
                      placeholder="dd/mm/aaaa"
                      className="min-w-0 flex-1"
                      triggerClassName={DATE_TRIGGER_CLASS}
                    />
                  </div>
                </div>

                {/* Modificação */}
                <div
                  className={cn(
                    "rounded-[16px] border p-3",
                    updatedActive
                      ? "border-[var(--brand-primary)]/35 bg-[var(--color-primary-soft)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]",
                  )}
                >
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <IconPencil
                      size={14}
                      className={updatedActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"}
                    />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Modificação
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DatePicker
                      value={draft.updatedFrom || null}
                      onChange={(v) => setDraft((p) => ({ ...p, updatedFrom: v }))}
                      placeholder="dd/mm/aaaa"
                      className="min-w-0 flex-1"
                      triggerClassName={DATE_TRIGGER_CLASS}
                    />
                    <span className="shrink-0 font-body text-[12px] text-[var(--text-muted)]">até</span>
                    <DatePicker
                      value={draft.updatedTo || null}
                      onChange={(v) => setDraft((p) => ({ ...p, updatedTo: v }))}
                      placeholder="dd/mm/aaaa"
                      className="min-w-0 flex-1"
                      triggerClassName={DATE_TRIGGER_CLASS}
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === "tags" && (
              <div>
                <div className="relative mb-2.5">
                  <IconSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={tagQuery}
                    onChange={(e) => setTagQuery(e.target.value)}
                    placeholder="Localizar tags..."
                    className={`${FILTER_INPUT_CLASS} pl-8`}
                  />
                </div>
                <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto">
                  {visibleTags.length === 0 ? (
                    <span className="px-1 py-1 font-body text-[12px] text-[var(--text-muted)]">Nenhuma tag.</span>
                  ) : visibleTags.map((t) => {
                    const on = tagSet.has(t.id);
                    const colored = Boolean(t.color);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleDraftTag(t.id)}
                        aria-pressed={on}
                        style={tagChipStyle(t.color, on)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-display text-[12px] font-semibold transition-colors",
                          !colored &&
                            (on
                              ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                              : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]"),
                        )}
                      >
                        {on ? <IconCheck size={13} stroke={2.6} /> : <IconPlus size={13} stroke={2.4} />}
                        {t.name}
                        <span className={colored ? "opacity-70" : on ? "text-[var(--brand-primary)]/70" : "text-[var(--text-muted)]"}>{t.contactCount}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--glass-border-subtle)] px-4 py-3">
            <button
              type="button"
              onClick={handleApply}
              className={`${pagePrimaryButtonClass} h-10 w-full justify-center text-[14px]`}
            >
              {draftActiveCount > 0 ? `Aplicar (${draftActiveCount})` : "Aplicar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu de ações (hambúrguer estilo Kommo) ──────────────────────────────────

function ActionsMenu({
  onAdd, onExport, onImport, onColumns, onDupes,
}: {
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onColumns: () => void;
  onDupes: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items: { icon: React.ReactNode; label: string; onClick: () => void; divider?: boolean }[] = [
    { icon: <IconPlus size={16} />, label: "Adicionar contato", onClick: onAdd },
    { icon: <IconDownload size={16} />, label: "Exportar", onClick: onExport },
    { icon: <IconFileImport size={16} />, label: "Importar", onClick: onImport },
    { icon: <IconSettings size={16} />, label: "Configurações da lista", onClick: onColumns, divider: true },
    { icon: <IconUsersGroup size={16} />, label: "Localizar duplicadas", onClick: onDupes },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--brand-primary)] hover:bg-[var(--color-primary-soft)]",
        )}
      >
        <IconMenu2 size={18} stroke={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
          {items.map((it) => (
            <div key={it.label}>
              {it.divider && <div className="my-1 h-px bg-[var(--glass-border)]" />}
              <button
                type="button"
                onClick={() => { setOpen(false); it.onClick(); }}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
              >
                <span className="text-[var(--text-muted)]">{it.icon}</span>
                {it.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Localizar duplicadas ─────────────────────────────────────────────────────

function DuplicatesSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data, isLoading, refetch } = useContactDuplicates(open);
  const mergeMut = useMergeContacts();
  const [merging, setMerging] = useState<string | null>(null); // grupo sendo mesclado
  const [done, setDone] = useState<Set<string>>(new Set()); // chaves já resolvidas

  useEffect(() => {
    if (open) { setDone(new Set()); void refetch(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = (data?.groups ?? []).filter((g) => !done.has(`${g.field}:${g.key}`));

  async function handleMerge(group: DuplicateGroup, keepId: string) {
    const sig = `${group.field}:${group.key}`;
    setMerging(sig);
    const removeIds = group.contacts.filter((c) => c.id !== keepId).map((c) => c.id);
    let ok = 0;
    let fail = 0;
    for (const removeId of removeIds) {
      try {
        await mergeMut.mutateAsync({ keepId, removeId });
        ok++;
      } catch {
        fail++;
      }
    }
    setMerging(null);
    if (fail === 0) {
      toast.success(`${ok} contato(s) mesclado(s) com sucesso.`);
      setDone((prev) => new Set(prev).add(sig));
    } else {
      toast.error(`${ok} mesclado(s), ${fail} falha(s). Verifique suas permissões (requer Administrador).`);
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Localizar duplicadas"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Summary */}
        <p className="font-body text-[13px] leading-relaxed text-[var(--text-muted)]">
          Contatos com o mesmo telefone ou e-mail são exibidos abaixo. Escolha qual manter — os outros serão mesclados nele (conversas, negócios e notas são preservados).
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[var(--text-muted)]">
            <IconLoader2 size={20} className="animate-spin" />
            <span className="font-body text-[13px]">Analisando contatos…</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
              <IconCheck size={24} />
            </span>
            <p className="font-display text-[15px] font-bold text-[var(--text-primary)]">Nenhuma duplicata encontrada</p>
            <p className="font-body text-[13px] text-[var(--text-muted)]">Todos os contatos têm telefone e e-mail únicos.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                {groups.length} grupo{groups.length > 1 ? "s" : ""} encontrado{groups.length > 1 ? "s" : ""}
              </span>
              <span className="font-body text-[12px] text-[var(--text-muted)]">Clique em "Manter" para preservar o contato</span>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {groups.map((group) => {
                const sig = `${group.field}:${group.key}`;
                const isMerging = merging === sig;
                return (
                  <div
                    key={sig}
                    className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4"
                  >
                    {/* Header do grupo */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`flex h-6 items-center gap-1 rounded-full border px-2.5 font-display text-[11px] font-bold uppercase tracking-wider ${
                        group.field === "phone"
                          ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"
                          : "border-[var(--color-success)]/30 bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
                      }`}>
                        {group.field === "phone" ? <IconPhone size={11} /> : <IconMail size={11} />}
                        {group.field === "phone" ? "Telefone" : "E-mail"}
                      </span>
                      <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">{group.key}</span>
                      <span className="font-body text-[12px] text-[var(--text-muted)]">· {group.contacts.length} contatos</span>
                    </div>

                    {/* Contatos do grupo */}
                    <div className="flex flex-col gap-2">
                      {group.contacts.map((c) => (
                        <DuplicateContactRow
                          key={c.id}
                          contact={c}
                          disabled={isMerging}
                          onKeep={() => void handleMerge(group, c.id)}
                        />
                      ))}
                    </div>

                    {isMerging && (
                      <div className="mt-2 flex items-center gap-2 pt-1 text-[var(--text-muted)]">
                        <IconLoader2 size={14} className="animate-spin" />
                        <span className="font-body text-[12px]">Mesclando…</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </FormSheet>
  );
}

function DuplicateContactRow({
  contact, disabled, onKeep,
}: {
  contact: DuplicateContactSnap;
  disabled: boolean;
  onKeep: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 py-2.5">
      <ChatAvatar
        user={{ id: contact.id, name: contact.name, imageUrl: contact.avatarUrl ?? null }}
        phone={contact.phone}
        channel={contact.phone ? "whatsapp" : null}
        size={AVATAR_SIZE.sm}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/contacts/${contact.id}`}
            className="truncate font-display text-[13px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
          >
            {contact.name}
          </Link>
          {contact.company && (
            <span className="truncate font-body text-[12px] text-[var(--text-muted)]">
              · {contact.company.name}
            </span>
          )}
        </div>
        <div className="flex gap-3 font-body text-[12px] text-[var(--text-muted)]">
          {contact.email && <span className="truncate">{contact.email}</span>}
          {contact.phone && <span className="truncate">{formatPhoneDisplay(contact.phone)}</span>}
          <span>Criado {fmtDateBR(contact.createdAt)}</span>
          {contact.assignedTo && <span>· {contact.assignedTo.name}</span>}
        </div>
      </div>

      {/* Ação */}
      <ButtonGlass
        variant="primary"
        size="sm"
        type="button"
        disabled={disabled}
        onClick={onKeep}
        className="shrink-0"
      >
        <IconArrowMerge size={14} />
        Manter este
      </ButtonGlass>
    </div>
  );
}

// ── Importação (sheet com ImportPanel) ───────────────────────────────────────

function ImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Importar contatos" size="lg">
      <ImportPanel
        fixedEntity="contacts"
        onDone={() => {
          qc.invalidateQueries({ queryKey: ["v2-contacts"], exact: false });
          qc.invalidateQueries({ queryKey: ["v2-contact-stats"] });
        }}
      />
    </FormSheet>
  );
}

// ── Configurações da lista / colunas (dialog estilo Kommo) ───────────────────

function ColumnsDialog({
  open, onOpenChange, nativeColumns, customColumns, activeKeys, onToggle, onReset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nativeColumns: ColumnDef[];
  customColumns: ColumnDef[];
  activeKeys: string[];
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const activeSet = new Set(activeKeys);

  function renderChip(col: ColumnDef) {
    const on = activeSet.has(col.key);
    return (
      <button
        key={col.key}
        type="button"
        onClick={() => onToggle(col.key)}
        aria-pressed={on}
        className={`flex items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 py-1.5 font-display text-[12px] font-semibold transition-colors ${
          on
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
            : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]"
        }`}
      >
        {on ? <IconCheck size={13} stroke={2.6} /> : <IconPlus size={13} stroke={2.4} />}
        {col.label}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--brand-primary)]">
              <IconColumns size={18} />
            </span>
            <DialogTitle className="text-base">Configurações da lista</DialogTitle>
          </div>
          <DialogDescription className="text-[13px] leading-relaxed">
            Escolha as colunas exibidas na visão em Tabela. Suas escolhas ficam salvas neste navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Colunas nativas</span>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
            >
              <IconRotateClockwise size={12} /> Restaurar padrão
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">{nativeColumns.map(renderChip)}</div>
          {customColumns.length > 0 && (
            <>
              <div className="mt-2 font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Campos personalizados</div>
              <div className="flex flex-wrap gap-1.5">{customColumns.map(renderChip)}</div>
            </>
          )}
        </div>
        <DialogFooter>
          <ButtonGlass variant="primary" size="sm" type="button" onClick={() => onOpenChange(false)}>
            Concluído
          </ButtonGlass>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tabela (colunas dinâmicas) ───────────────────────────────────────────────

function TabelaView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne,
  columns, getWidth, setWidth, sortBy, sortOrder, onSort, onEdit,
}: {
  items: ContactListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  columns: ColumnDef[];
  getWidth: (key: string, fallback?: number) => number;
  setWidth: (key: string, px: number) => void;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onEdit: (c: ContactListItemDto) => void;
}) {
  const dirFor = (f: SortField): SortDir => (sortBy === f ? sortOrder : null);
  const nameW = getWidth(NAME_COL_KEY, 240);
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
      {/* Scroll X+Y com fades + scrollbar evidente (ListHScroll). */}
      <ListHScroll>
        <div className="flex w-max min-w-full flex-col">
          <div
            className={listTableHeadRowClass(
              "sticky top-0 z-[1] flex w-max min-w-full items-center gap-3 px-3 py-2",
            )}
          >
            <span className="w-9 shrink-0">
              <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todos" />
            </span>
            <ResizableColumnHead width={nameW} onResize={(px) => setWidth(NAME_COL_KEY, px)} min={160} max={420}>
              <SortableHeader label="Nome / E-mail" sort={dirFor("name")} onSort={() => onSort("name")} className="whitespace-nowrap" />
            </ResizableColumnHead>
            {columns.map((col) => (
              <ResizableColumnHead
                key={col.key}
                width={getWidth(col.key, parseWidthClass(col.width))}
                onResize={(px) => setWidth(col.key, px)}
              >
                {col.sortField ? (
                  <SortableHeader
                    label={col.label}
                    sort={dirFor(col.sortField)}
                    onSort={() => onSort(col.sortField as SortField)}
                    className="whitespace-nowrap"
                  />
                ) : (
                  <ListColumnLabel className="whitespace-nowrap">{col.label}</ListColumnLabel>
                )}
              </ResizableColumnHead>
            ))}
          </div>
          {items.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onEdit(c)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(c); } }}
              className={`flex w-max min-w-full cursor-pointer items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)] ${selected.has(c.id) ? "bg-[var(--color-primary-soft)]" : ""}`}
            >
              <span className="w-9 shrink-0" onClick={(e) => e.stopPropagation()}>
                <CheckboxGlass checked={selected.has(c.id)} onChange={() => onToggleOne(c.id)} aria-label={`Selecionar ${c.name}`} />
              </span>
              <div className="flex shrink-0 items-center gap-2.5 overflow-hidden" style={{ width: nameW, minWidth: nameW, maxWidth: nameW }}>
                <ChatAvatar
                  user={{ id: c.id, name: c.name, imageUrl: c.avatarUrl ?? null }}
                  phone={c.phone}
                  channel={c.phone ? "whatsapp" : null}
                  size={AVATAR_SIZE.sm}
                />
                <div className="min-w-0 leading-tight">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                    className="group/name inline-flex max-w-full items-center gap-1.5 text-left font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                  >
                    <span className="truncate">{c.name}</span>
                    <IconPencil size={13} className="flex-shrink-0 opacity-0 transition-opacity group-hover/name:opacity-60" />
                  </button>
                  <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.email ?? "—"}</div>
                </div>
              </div>
              {columns.map((col) => {
                const w = getWidth(col.key, parseWidthClass(col.width));
                return (
                  <div key={col.key} className="min-w-0 shrink-0 overflow-hidden" style={{ width: w, minWidth: w, maxWidth: w }}>
                    {col.cell(c)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ListHScroll>
    </div>
  );
}

// ── Cards (colunas dinâmicas do configurador — Tags no header) ───────────────

function CardsView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne, columns, getWidth, setWidth, onEdit,
}: {
  items: ContactListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  columns: ColumnDef[];
  getWidth: (key: string, fallback?: number) => number;
  setWidth: (key: string, px: number) => void;
  onEdit: (c: ContactListItemDto) => void;
}) {
  const nameW = getWidth(NAME_COL_KEY, 240);
  const gridTemplate = [
    "32px",
    `${nameW}px`,
    ...columns.map((c) => `${getWidth(c.key, parseWidthClass(c.width))}px`),
    "112px",
  ].join(" ");

  return (
    <ListHScroll scrollerClassName="pb-1">
    <div className="flex w-max min-w-full flex-col gap-2">
      <div
        className={listTableHeadRowClass("grid gap-3 border border-transparent px-4 py-2")}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span>
          <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todos" />
        </span>
        <div className="relative min-w-0 overflow-hidden pr-1">
          <ListColumnLabel>Contato</ListColumnLabel>
          <ColumnResizer value={nameW} onChange={(px) => setWidth(NAME_COL_KEY, px)} min={160} max={420} />
        </div>
        {columns.map((col) => {
          const w = getWidth(col.key, parseWidthClass(col.width));
          return (
            <div key={col.key} className="relative min-w-0 overflow-hidden pr-1">
              <ListColumnLabel>{col.label}</ListColumnLabel>
              <ColumnResizer value={w} onChange={(px) => setWidth(col.key, px)} min={72} max={480} />
            </div>
          );
        })}
        <ListColumnLabel align="right">Ações</ListColumnLabel>
      </div>
      {items.map((c) => {
        const isSelected = selected.has(c.id);
        return (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => onEdit(c)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEdit(c); } }}
            style={{ gridTemplateColumns: gridTemplate }}
            className={cn(
              "group grid cursor-pointer items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]",
              isSelected
                ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
                : "border-[var(--glass-border)] bg-[var(--glass-bg-base)]",
            )}
          >
            <span onClick={(e) => e.stopPropagation()}>
              <CheckboxGlass checked={isSelected} onChange={() => onToggleOne(c.id)} aria-label={`Selecionar ${c.name}`} />
            </span>

            <div className="flex min-w-0 items-center gap-2.5">
              <ChatAvatar
                user={{ id: c.id, name: c.name, imageUrl: c.avatarUrl ?? null }}
                phone={c.phone}
                channel={c.phone ? "whatsapp" : null}
                size={AVATAR_SIZE.md}
              />
              <div className="min-w-0 leading-tight">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                  className="truncate text-left font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                >
                  {c.name}
                </button>
                <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.email ?? "—"}</div>
              </div>
            </div>

            {columns.map((col) => (
              <div key={col.key} className="min-w-0">
                {col.cell(c)}
              </div>
            ))}

            <div className="flex items-center justify-end gap-1">
              <a href={c.phone ? `tel:${c.phone}` : undefined} onClick={(e) => e.stopPropagation()} aria-label="Ligar" aria-disabled={!c.phone} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]">
                <IconPhone size={16} />
              </a>
              <a href={c.email ? `mailto:${c.email}` : undefined} onClick={(e) => e.stopPropagation()} aria-label="Enviar e-mail" aria-disabled={!c.email} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]">
                <IconMail size={16} />
              </a>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                aria-label={`Editar ${c.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--color-primary-soft)]"
              >
                <IconPencil size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
    </ListHScroll>
  );
}

// ── Dialogs (inalterados) ────────────────────────────────────────────────────

function ConfirmDeleteDialog({ open, count, pending, onCancel, onConfirm }: {
  open: boolean; count: number; pending: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent size="sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] text-[var(--color-destructive)]">
              <IconAlertTriangle size={18} />
            </span>
            <DialogTitle className="text-base">{`Excluir ${count === 1 ? "contato" : `${count} contatos`}?`}</DialogTitle>
          </div>
          <DialogDescription className="text-[13px] leading-relaxed">
            Esta ação não pode ser desfeita. {count === 1 ? "O contato será removido" : "Os contatos serão removidos"} junto com as conversas, mensagens, notas e atividades vinculadas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={onCancel} disabled={pending} className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">
            Cancelar
          </ButtonGlass>
          <ButtonGlass variant="danger" size="sm" type="button" onClick={onConfirm} disabled={pending}>
            <IconTrash size={14} /> {pending ? "Excluindo..." : "Excluir"}
          </ButtonGlass>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactFormSheet({
  open, contact, availableTags, onOpenChange,
}: {
  open: boolean;
  contact: ContactListItemDto | null;
  availableTags: TagWithCountDto[];
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = contact !== null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setName(contact.name);
      setEmail(contact.email ?? "");
      setPhone(contact.phone ?? "");
      setCompanyId(contact.company?.id ?? null);
      setCompanyName(contact.company?.name ?? null);
      setSelectedTagIds((contact.tags ?? []).map((t) => t.id));
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setCompanyId(null);
      setCompanyName(null);
      setSelectedTagIds([]);
    }
    setTagQuery("");
    createMut.reset();
    updateMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id]);

  const visibleTags = availableTags
    .filter((t) => t.name.toLowerCase().includes(tagQuery.trim().toLowerCase()))
    .slice(0, 40);
  const tagSet = new Set(selectedTagIds);
  const pending = saving || createMut.isPending || updateMut.isPending;

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function syncTags(contactId: string, nextIds: string[], prevIds: string[]) {
    const toAdd = nextIds.filter((id) => !prevIds.includes(id));
    const toRemove = prevIds.filter((id) => !nextIds.includes(id));
    await Promise.all([
      ...toAdd.map((tagId) => addContactTag(contactId, tagId)),
      ...toRemove.map((tagId) => removeContactTag(contactId, tagId)),
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || pending) return;
    setSaving(true);
    const body = {
      name: n,
      email: email.trim() || null,
      phone: phone.trim() || null,
      companyId,
    };
    try {
      if (isEdit && contact) {
        await updateMut.mutateAsync({ id: contact.id, body });
        const prevIds = (contact.tags ?? []).map((t) => t.id);
        await syncTags(contact.id, selectedTagIds, prevIds);
        void qc.invalidateQueries({ queryKey: ["v2-contacts"], exact: false });
        toast.success("Contato atualizado.");
      } else {
        const created = await createMut.mutateAsync(body);
        if (selectedTagIds.length > 0) {
          await syncTags(created.id, selectedTagIds, []);
          void qc.invalidateQueries({ queryKey: ["v2-contacts"], exact: false });
        }
        toast.success("Contato criado.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar contato.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar contato" : "Novo contato"}
      busy={pending}
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="contact-form-sheet" disabled={!name.trim() || pending}>
            {pending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </ButtonGlass>
        </>
      }
    >
      <form id="contact-form-sheet" onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Nome *</span>
          <InputGlass type="text" autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria Silva" />
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">E-mail</span>
          <InputGlass type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@empresa.com" />
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Telefone</span>
          <InputGlass type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
        </label>
        <div>
          <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Empresa</span>
          <CompanyPicker valueId={companyId} valueName={companyName} onChange={(id, nm) => { setCompanyId(id); setCompanyName(nm); }} />
        </div>
        <div>
          <span className="mb-1.5 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Tags{selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ""}
          </span>
          <div className="relative mb-2">
            <IconSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder="Localizar tags..."
              className="h-9 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-8 pr-3 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {visibleTags.length === 0 ? (
              <span className="px-1 py-1 font-body text-[12px] text-[var(--text-muted)]">Nenhuma tag.</span>
            ) : visibleTags.map((t) => {
              const on = tagSet.has(t.id);
              const colored = Boolean(t.color);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={on}
                  style={tagChipStyle(t.color, on)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-display text-[12px] font-semibold transition-colors",
                    !colored &&
                      (on
                        ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]"),
                  )}
                >
                  {on ? <IconCheck size={13} stroke={2.6} /> : <IconPlus size={13} stroke={2.4} />}
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </FormSheet>
  );
}

function CompanyPicker({ valueId, valueName, onChange }: {
  valueId: string | null; valueName: string | null;
  onChange: (id: string | null, name: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useCompanies({ search: debounced || undefined, page: 1, perPage: 20, enabled: open });
  const options = data?.items ?? [];

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--input-border,var(--glass-border,rgba(0,0,0,0.08)))] bg-[var(--input-bg,#fff)] px-3 py-2 text-left text-[13px] outline-none focus:border-[var(--brand-primary,#5b6ff5)]">
        <span className="flex min-w-0 items-center gap-2">
          <IconBuilding size={15} className="flex-shrink-0 text-[var(--text-muted,#718096)]" />
          <span className={`truncate ${valueName ? "text-[var(--text-primary,#1a202c)]" : "text-[var(--text-muted,#718096)]"}`}>{valueName ?? "Sem empresa vinculada"}</span>
        </span>
        {valueId && (
          <span role="button" tabIndex={0} aria-label="Remover vínculo de empresa" onClick={(e) => { e.stopPropagation(); onChange(null, null); }} className="flex-shrink-0 rounded-full p-0.5 text-[var(--text-muted,#718096)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] hover:text-[var(--color-danger,#e11d48)]">
            <IconX size={14} />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 max-h-56 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border,rgba(0,0,0,0.08))] bg-[var(--glass-bg-modal,#fff)] shadow-xl">
          <div className="flex items-center gap-2 border-b border-[var(--glass-border,rgba(0,0,0,0.06))] px-2.5 py-2">
            <IconSearch size={14} className="text-[var(--text-muted,#718096)]" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa..." className="w-full bg-transparent text-[13px] text-[var(--text-primary,#1a202c)] outline-none" />
          </div>
          <div className="max-h-44 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted,#718096)]">Carregando...</div>
            ) : options.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted,#718096)]">{debounced ? "Nenhuma empresa encontrada." : "Digite para buscar."}</div>
            ) : options.map((co) => {
              const active = co.id === valueId;
              return (
                <button key={co.id} type="button" onClick={() => { onChange(co.id, co.name); setOpen(false); setQ(""); }} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] text-[var(--text-primary,#1a202c)] hover:bg-[var(--brand-primary,#5b6ff5)]/8">
                  <span className="truncate">{co.name}</span>
                  {active && <IconCheck size={14} className="flex-shrink-0 text-[var(--brand-primary,#5b6ff5)]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
