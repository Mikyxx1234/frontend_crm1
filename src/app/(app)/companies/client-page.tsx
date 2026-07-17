"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import {
  IconBuilding,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconPencil,
  IconPhone,
  IconMail,
  IconTable,
  IconLayoutList,
  IconMenu2,
  IconSettings,
  IconCheck,
  IconColumns,
  IconRotateClockwise,
  IconBuildingCommunity,
  IconMailOff,
  IconPhoneOff,
  IconSearch,
  IconAdjustmentsHorizontal,
  IconArrowsSort,
  IconCalendarEvent,
  IconMapPin,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { pagePrimaryButtonClass, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { BadgeGlass } from "@/components/crm/badge-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { KpiCard, type KpiTone } from "@/components/crm/kpi-card";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay, normalizePhone } from "@/lib/phone";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import {
  dateRangeFromPreset,
  detectPreset,
  type DatePresetKey,
} from "@/components/pipeline/kanban-filters/date-presets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSheet } from "@/components/ui/form-sheet";

import {
  useCompanies,
  useCompanyFacets,
  useCompanyStats,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from "@/features/directory-v2/hooks";
import type {
  CompanyFacetsDto,
  CompanyListItemDto,
  CompanySegment,
  CompanySortField,
  CompanyStatsDto,
} from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;
type ViewMode = "cards" | "tabela";

const SEGMENTS: {
  id: CompanySegment;
  label: string;
  tone: KpiTone;
  icon: React.ReactNode;
  value: (s: CompanyStatsDto | undefined) => number | undefined;
}[] = [
  {
    id: "todos",
    label: "Todas",
    tone: "brand",
    icon: <IconBuilding size={20} stroke={2.2} />,
    value: (s) => s?.total,
  },
  {
    id: "com-contatos",
    label: "Com contatos",
    tone: "violet",
    icon: <IconBuildingCommunity size={20} stroke={2.2} />,
    value: (s) => s?.withContacts,
  },
  {
    id: "sem-email",
    label: "Sem e-mail",
    tone: "warning",
    icon: <IconMailOff size={20} stroke={2.2} />,
    value: (s) => s?.withoutEmail,
  },
  {
    id: "sem-telefone",
    label: "Sem telefone",
    tone: "neutral",
    icon: <IconPhoneOff size={20} stroke={2.2} />,
    value: (s) => s?.withoutPhone,
  },
];

interface ColumnDef {
  key: string;
  label: string;
  width: string;
  cell: (c: CompanyListItemDto) => React.ReactNode;
}

function txtCell(v: React.ReactNode) {
  return <span className="block truncate font-display text-[13px] text-[var(--text-secondary)]">{v}</span>;
}

const NATIVE_COLUMNS: ColumnDef[] = [
  { key: "phone", label: "Telefone", width: "w-[160px]", cell: (c) => txtCell(c.phone ? formatPhoneDisplay(c.phone) : "—") },
  { key: "domain", label: "E-mail", width: "w-[180px]", cell: (c) => txtCell(c.domain ?? "—") },
  { key: "size", label: "CNPJ", width: "w-[150px]", cell: (c) => txtCell(c.size ?? "—") },
  { key: "industry", label: "Setor", width: "w-[140px]", cell: (c) => txtCell(c.industry ?? "—") },
  { key: "cep", label: "CEP", width: "w-[110px]", cell: (c) => txtCell(c.cep ?? "—") },
  { key: "city", label: "Cidade", width: "w-[140px]", cell: (c) => txtCell(c.city ?? "—") },
  { key: "state", label: "Estado", width: "w-[90px]", cell: (c) => txtCell(c.state ?? "—") },
  { key: "address", label: "Endereço", width: "w-[200px]", cell: (c) => txtCell(c.address ?? "—") },
  {
    key: "contacts",
    label: "Contatos",
    width: "w-[100px]",
    cell: (c) => <BadgeGlass variant="enterprise">{c._count.contacts}</BadgeGlass>,
  },
  { key: "createdAt", label: "Criado em", width: "w-[130px]", cell: (c) => txtCell(fmtDateBR(c.createdAt)) },
];

const DEFAULT_COLUMN_KEYS = ["phone", "domain", "city", "state", "contacts", "createdAt"];
const COLUMNS_STORAGE_KEY = "v2:companies:columns:v1";

// ── Filtro (padrão Contatos) ─────────────────────────────────────────────────

/** Presets de ordenação (campo:direção) — aba Ordenar do painel de filtros. */
const SORT_OPTIONS = [
  { value: "name:asc", label: "Nome (A–Z)" },
  { value: "name:desc", label: "Nome (Z–A)" },
  { value: "createdAt:desc", label: "Mais recentes" },
  { value: "createdAt:asc", label: "Mais antigas" },
  { value: "updatedAt:desc", label: "Modificadas recentemente" },
] as const;

type FilterPanelTab = "ordenar" | "periodo" | "local";

const FILTER_TABS: { id: FilterPanelTab; label: string; icon: React.ReactNode }[] = [
  { id: "ordenar", label: "Ordenar", icon: <IconArrowsSort size={14} stroke={2.2} /> },
  { id: "periodo", label: "Período", icon: <IconCalendarEvent size={14} stroke={2.2} /> },
  { id: "local", label: "Local", icon: <IconMapPin size={14} stroke={2.2} /> },
];

const CREATED_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "last_7", label: "Últimos 7 dias" },
  { key: "last_30", label: "Últimos 30 dias" },
  { key: "this_month", label: "Este mês" },
];

const FILTER_INPUT_CLASS =
  "h-9 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-body text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-primary)]";

const DATE_TRIGGER_CLASS =
  "h-9 rounded-full border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] px-3 shadow-none";

type CompanyFilterDraft = {
  sortBy: CompanySortField;
  sortOrder: "asc" | "desc";
  createdFrom: string;
  createdTo: string;
  state: string;
  city: string;
  industry: string;
};

function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

function colWidthCss(width: string): string {
  const m = width.match(/w-\[(\d+)px\]/);
  return m ? `${m[1]}px` : "140px";
}

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

const VIEW_ITEMS = [
  { value: "cards", label: <span className="flex items-center gap-1.5"><IconLayoutList size={14} />Cards</span> },
  { value: "tabela", label: <span className="flex items-center gap-1.5"><IconTable size={14} />Tabela</span> },
] as const;

export default function V2CompaniesClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [segment, setSegment] = useState<CompanySegment>("todos");
  const [sortBy, setSortBy] = useState<CompanySortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [createOpen, setCreateOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyListItemDto | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteMut = useDeleteCompany();

  const [activeColumnKeys, setActiveColumnKeys] = useState<string[]>(DEFAULT_COLUMN_KEYS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((k) => typeof k === "string")) {
          setActiveColumnKeys(parsed);
        }
      }
    } catch {
      /* localStorage indisponível */
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
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setSelected(new Set()); }, [debounced, page, segment]);
  useEffect(() => {
    setPage(1);
  }, [segment, sortBy, sortOrder, createdFrom, createdTo, filterState, filterCity, filterIndustry]);

  const activeFilterCount =
    (createdFrom || createdTo ? 1 : 0) +
    (filterState ? 1 : 0) +
    (filterCity ? 1 : 0) +
    (filterIndustry ? 1 : 0);

  function clearPanelFilters() {
    setCreatedFrom("");
    setCreatedTo("");
    setFilterState("");
    setFilterCity("");
    setFilterIndustry("");
  }

  const activeColumns = useMemo(
    () =>
      activeColumnKeys
        .map((k) => NATIVE_COLUMNS.find((c) => c.key === k))
        .filter((c): c is ColumnDef => Boolean(c)),
    [activeColumnKeys],
  );

  function toggleColumn(key: string) {
    setActiveColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const statsQuery = useCompanyStats(isAuthenticated);
  const facetsQuery = useCompanyFacets(isAuthenticated);
  const query = useCompanies({
    search: debounced || undefined,
    page,
    perPage,
    segment,
    sortBy,
    sortOrder,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    state: filterState || undefined,
    city: filterCity || undefined,
    industry: filterIndustry || undefined,
    enabled: isAuthenticated,
  });
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
    let ok = 0; let fail = 0;
    for (const id of ids) {
      try { await deleteMut.mutateAsync(id); ok += 1; } catch { fail += 1; }
    }
    setConfirmOpen(false);
    setSelected(new Set());
    if (fail === 0) toast.success(ok === 1 ? "Empresa excluída." : `${ok} empresas excluídas.`);
    else if (ok === 0) toast.error("Não foi possível excluir as empresas selecionadas.");
    else toast.error(`${ok} excluída(s), ${fail} falharam.`);
  }

  const isLoading = query.isLoading && items.length === 0;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconBuilding size={22} stroke={2.2} />}
          title="Empresas"
          center={
            <div className="flex w-full justify-start">
              <SearchFilterBar
                search={search}
                onSearch={setSearch}
                facets={facetsQuery.data}
                sortBy={sortBy}
                sortOrder={sortOrder}
                createdFrom={createdFrom}
                createdTo={createdTo}
                stateFilter={filterState}
                cityFilter={filterCity}
                industryFilter={filterIndustry}
                activeCount={activeFilterCount}
                onClear={clearPanelFilters}
                onApply={(next) => {
                  setSortBy(next.sortBy);
                  setSortOrder(next.sortOrder);
                  setCreatedFrom(next.createdFrom);
                  setCreatedTo(next.createdTo);
                  setFilterState(next.state);
                  setFilterCity(next.city);
                  setFilterIndustry(next.industry);
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
                onColumns={() => setColumnsOpen(true)}
              />
            </div>
          }
        />

        <section
          className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4"
          aria-label="Indicadores de empresas"
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

        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
            <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {selected.size} selecionada{selected.size > 1 ? "s" : ""}
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

        {isLoading ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : query.error ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
            {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
            <EmptyState
              icon={<IconBuilding size={28} />}
              title="Nenhuma empresa encontrada"
              description={
                debounced
                  ? `Sem resultados para "${debounced}".`
                  : segment !== "todos"
                    ? "Nenhuma empresa para o segmento selecionado."
                    : "Use o menu de ações para cadastrar a primeira empresa."
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
            onEdit={setEditing}
          />
        )}

        <PaginationGlass
          total={total}
          entityLabel="empresas"
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

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCompanyDialog company={editing} onClose={() => setEditing(null)} />
      <ColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        nativeColumns={NATIVE_COLUMNS}
        activeKeys={activeColumnKeys}
        onToggle={toggleColumn}
        onReset={() => setActiveColumnKeys(DEFAULT_COLUMN_KEYS)}
      />
      <ConfirmDeleteDialog
        open={confirmOpen}
        count={selected.size}
        pending={deleteMut.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ── Busca + painel de filtros segmentado (padrão Contatos) ───────────────────

function SearchFilterBar({
  search, onSearch, facets,
  sortBy, sortOrder, createdFrom, createdTo,
  stateFilter, cityFilter, industryFilter,
  activeCount, onClear, onApply,
}: {
  search: string;
  onSearch: (v: string) => void;
  facets: CompanyFacetsDto | undefined;
  sortBy: CompanySortField;
  sortOrder: "asc" | "desc";
  createdFrom: string;
  createdTo: string;
  stateFilter: string;
  cityFilter: string;
  industryFilter: string;
  activeCount: number;
  onClear: () => void;
  onApply: (next: CompanyFilterDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterPanelTab>("ordenar");
  const [draft, setDraft] = useState<CompanyFilterDraft>({
    sortBy, sortOrder, createdFrom, createdTo,
    state: stateFilter, city: cityFilter, industry: industryFilter,
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraft({
      sortBy, sortOrder, createdFrom, createdTo,
      state: stateFilter, city: cityFilter, industry: industryFilter,
    });
  }, [open, sortBy, sortOrder, createdFrom, createdTo, stateFilter, cityFilter, industryFilter]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const sortKey = `${draft.sortBy}:${draft.sortOrder}`;
  const createdActive = !!(draft.createdFrom || draft.createdTo);
  const periodCount = createdActive ? 1 : 0;
  const localCount = (draft.state ? 1 : 0) + (draft.city ? 1 : 0) + (draft.industry ? 1 : 0);
  const draftActiveCount = periodCount + localCount;

  const createdPreset = detectPreset({
    from: draft.createdFrom || null,
    to: draft.createdTo || null,
  });

  function applyCreatedPreset(key: DatePresetKey) {
    const range = dateRangeFromPreset(key);
    if (!range) return;
    setDraft((prev) => ({ ...prev, createdFrom: range.from ?? "", createdTo: range.to ?? "" }));
  }

  function handleClear() {
    setDraft((prev) => ({
      ...prev,
      createdFrom: "", createdTo: "", state: "", city: "", industry: "",
    }));
    onClear();
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  const tabBadge = (id: FilterPanelTab) => {
    if (id === "periodo") return periodCount;
    if (id === "local") return localCount;
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
        aria-label="Buscar e filtrar empresas"
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
            <div role="tablist" aria-label="Seções do filtro" className="flex items-center gap-0.5 rounded-full bg-[var(--glass-bg-strong)] p-1">
              {FILTER_TABS.map((t) => {
                const active = tab === t.id;
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
                    <FilterCountBadge count={tabBadge(t.id)} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className={cn("px-4 pb-3", tab === "periodo" ? "overflow-visible" : "min-h-0 flex-1 overflow-y-auto")}>
            {tab === "ordenar" && (
              <div className="flex flex-col gap-2" role="listbox" aria-label="Ordenar por">
                <p className="mb-0.5 font-display text-[12px] font-semibold text-[var(--text-muted)]">Ordenar resultados por</p>
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
                        setDraft((prev) => ({ ...prev, sortBy: f as CompanySortField, sortOrder: o as "asc" | "desc" }));
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left font-display text-[13px] font-semibold transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--text-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-[var(--brand-primary)]" : "border-[var(--glass-border)]")}>
                        {selected && <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />}
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
                  <p className="mb-2 font-display text-[11px] font-semibold text-[var(--text-muted)]">Atalhos rápidos (data de criação)</p>
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

                <div className={cn("rounded-[16px] border p-3", createdActive ? "border-[var(--brand-primary)]/35 bg-[var(--color-primary-soft)]" : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]")}>
                  <div className="mb-2.5 flex items-center gap-1.5">
                    <IconCalendarEvent size={14} className={createdActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"} />
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Criação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DatePicker value={draft.createdFrom || null} onChange={(v) => setDraft((p) => ({ ...p, createdFrom: v }))} placeholder="dd/mm/aaaa" className="min-w-0 flex-1" triggerClassName={DATE_TRIGGER_CLASS} />
                    <span className="shrink-0 font-body text-[12px] text-[var(--text-muted)]">até</span>
                    <DatePicker value={draft.createdTo || null} onChange={(v) => setDraft((p) => ({ ...p, createdTo: v }))} placeholder="dd/mm/aaaa" className="min-w-0 flex-1" triggerClassName={DATE_TRIGGER_CLASS} />
                  </div>
                </div>
              </div>
            )}

            {tab === "local" && (
              <div className="flex flex-col gap-3">
                <FilterSelectField
                  label="Estado"
                  value={draft.state}
                  options={facets?.states ?? []}
                  placeholder="Todos os estados"
                  onChange={(v) => setDraft((p) => ({ ...p, state: v }))}
                />
                <FilterSelectField
                  label="Cidade"
                  value={draft.city}
                  options={facets?.cities ?? []}
                  placeholder="Todas as cidades"
                  onChange={(v) => setDraft((p) => ({ ...p, city: v }))}
                />
                <FilterSelectField
                  label="Setor"
                  value={draft.industry}
                  options={facets?.industries ?? []}
                  placeholder="Todos os setores"
                  onChange={(v) => setDraft((p) => ({ ...p, industry: v }))}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--glass-border-subtle)] px-4 py-3">
            <button type="button" onClick={handleApply} className={`${pagePrimaryButtonClass} h-10 w-full justify-center text-[14px]`}>
              {draftActiveCount > 0 ? `Aplicar (${draftActiveCount})` : "Aplicar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelectField({
  label, value, options, placeholder, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(FILTER_INPUT_CLASS, "appearance-none pr-8", value ? "border-[var(--brand-primary)]/50" : "")}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <IconMapPin size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
      </div>
    </label>
  );
}

// ── Menu de ações (hambúrguer — espelha Contatos) ────────────────────────────

function ActionsMenu({
  onAdd, onColumns,
}: {
  onAdd: () => void;
  onColumns: () => void;
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
    { icon: <IconPlus size={16} />, label: "Adicionar empresa", onClick: onAdd },
    { icon: <IconSettings size={16} />, label: "Configurações da lista", onClick: onColumns, divider: true },
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

// ── Configurações da lista ───────────────────────────────────────────────────

function ColumnsDialog({
  open, onOpenChange, nativeColumns, activeKeys, onToggle, onReset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nativeColumns: ColumnDef[];
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
            Escolha as colunas exibidas na visão Cards e Tabela. Suas escolhas ficam salvas neste navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Colunas</span>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
            >
              <IconRotateClockwise size={12} /> Restaurar padrão
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">{nativeColumns.map(renderChip)}</div>
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

// ── Tabela ───────────────────────────────────────────────────────────────────

function TabelaView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne, columns, onEdit,
}: {
  items: CompanyListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  columns: ColumnDef[];
  onEdit: (c: CompanyListItemDto) => void;
}) {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex w-max min-w-full flex-col">
          <div className={listTableHeadRowClass("sticky top-0 z-[1] flex w-max min-w-full items-center gap-3 px-3 py-2")}>
            <span className="w-9 shrink-0">
              <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todas" />
            </span>
            <div className="w-[240px] shrink-0">
              <ListColumnLabel className="whitespace-nowrap">Empresa</ListColumnLabel>
            </div>
            {columns.map((col) => (
              <div key={col.key} className={`${col.width} shrink-0`}>
                <ListColumnLabel className="whitespace-nowrap">{col.label}</ListColumnLabel>
              </div>
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
              <div className="flex w-[240px] shrink-0 items-center gap-2.5">
                <ChatAvatar
                  user={{ id: c.id, name: c.name }}
                  channel={null}
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
                  <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.domain ?? "—"}</div>
                </div>
              </div>
              {columns.map((col) => (
                <div key={col.key} className={`${col.width} min-w-0 shrink-0`}>
                  {col.cell(c)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cards (linhas horizontais — padrão Contatos) ─────────────────────────────

function CardsView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne, columns, onEdit,
}: {
  items: CompanyListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  columns: ColumnDef[];
  onEdit: (c: CompanyListItemDto) => void;
}) {
  const gridTemplate = [
    "32px",
    "minmax(220px,2.4fr)",
    ...columns.map((c) => `minmax(${colWidthCss(c.width)},1fr)`),
    "112px",
  ].join(" ");

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain pb-1 [-webkit-overflow-scrolling:touch]">
    <div className="flex w-max min-w-full flex-col gap-2">
      <div
        className={listTableHeadRowClass("grid gap-3 border border-transparent px-4 py-2")}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span>
          <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todas" />
        </span>
        <ListColumnLabel>Empresa</ListColumnLabel>
        {columns.map((col) => (
          <ListColumnLabel key={col.key}>{col.label}</ListColumnLabel>
        ))}
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
                user={{ id: c.id, name: c.name }}
                channel={null}
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
                <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.domain ?? "—"}</div>
              </div>
            </div>

            {columns.map((col) => (
              <div key={col.key} className="min-w-0">
                {col.cell(c)}
              </div>
            ))}

            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <a href={c.phone ? `tel:${normalizePhone(c.phone) ?? c.phone}` : undefined} aria-label="Ligar" aria-disabled={!c.phone} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]">
                <IconPhone size={16} />
              </a>
              <a href={c.domain ? `mailto:${c.domain}` : undefined} aria-label="Enviar e-mail" aria-disabled={!c.domain} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]">
                <IconMail size={16} />
              </a>
              <button
                type="button"
                onClick={() => onEdit(c)}
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
    </div>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

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
            <DialogTitle className="text-base">{`Excluir ${count === 1 ? "empresa" : `${count} empresas`}?`}</DialogTitle>
          </div>
          <DialogDescription className="text-[13px] leading-relaxed">
            Esta ação não pode ser desfeita. Os contatos vinculados são preservados (ficam sem empresa).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={onCancel} disabled={pending} className="border-transparent bg-transparent shadow-none text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]">Cancelar</ButtonGlass>
          <ButtonGlass variant="danger" size="sm" type="button" onClick={onConfirm} disabled={pending}>
            <IconTrash size={14} /> {pending ? "Excluindo..." : "Excluir"}
          </ButtonGlass>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCompanyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [address, setAddress] = useState("");
  const createMut = useCreateCompany();

  useEffect(() => {
    if (!open) { setName(""); setCnpj(""); setPhone(""); setEmail(""); setCep(""); setCity(""); setUf(""); setAddress(""); createMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate({
      name: n,
      size: cnpj.trim() || null,
      phone: normalizePhone(phone) ?? (phone.trim() || null),
      domain: email.trim() || null,
      cep: cep.trim() || null,
      city: city.trim() || null,
      state: uf.trim() || null,
      address: address.trim() || null,
    }, {
      onSuccess: () => { toast.success("Empresa criada."); onOpenChange(false); },
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nova empresa"
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={() => onOpenChange(false)}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="new-company-form" disabled={!name.trim() || createMut.isPending}>{createMut.isPending ? "Criando..." : "Criar"}</ButtonGlass>
        </>
      }
    >
      <form id="new-company-form" onSubmit={handleSubmit} className="flex flex-col">
        <FieldInput label="Nome da Empresa *" type="text" required autoFocus value={name} onChange={setName} placeholder="Razão social ou nome fantasia" />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="CNPJ" type="text" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0000-00" />
          <FieldInput label="Telefone" type="tel" value={phone} onChange={setPhone} placeholder="(11) 3333-4444" />
        </div>
        <FieldInput label="E-mail" type="email" value={email} onChange={setEmail} placeholder="contato@empresa.com" />
        <div className="grid grid-cols-[1fr_1.4fr_0.7fr] gap-3">
          <FieldInput label="CEP" type="text" value={cep} onChange={setCep} placeholder="00000-000" />
          <FieldInput label="Cidade" type="text" value={city} onChange={setCity} placeholder="São Paulo" />
          <FieldInput label="Estado" type="text" value={uf} onChange={setUf} placeholder="UF" />
        </div>
        <FieldInput label="Endereço da Empresa" type="text" value={address} onChange={setAddress} placeholder="Rua, número, bairro" />
        {createMut.isError && (
          <p className="text-[12px] text-[var(--color-danger-text)]">{createMut.error instanceof Error ? createMut.error.message : "Erro ao criar empresa."}</p>
        )}
      </form>
    </FormSheet>
  );
}

function EditCompanyDialog({ company, onClose }: { company: CompanyListItemDto | null; onClose: () => void }) {
  const open = company !== null;
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [address, setAddress] = useState("");
  const updateMut = useUpdateCompany();

  useEffect(() => {
    if (company) {
      setName(company.name);
      setCnpj(company.size ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.domain ?? "");
      setCep(company.cep ?? "");
      setCity(company.city ?? "");
      setUf(company.state ?? "");
      setAddress(company.address ?? "");
      updateMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !company) return;
    updateMut.mutate({
      id: company.id,
      body: {
        name: n,
        size: cnpj.trim() || null,
        phone: normalizePhone(phone) ?? (phone.trim() || null),
        domain: email.trim() || null,
        cep: cep.trim() || null,
        city: city.trim() || null,
        state: uf.trim() || null,
        address: address.trim() || null,
      },
    }, {
      onSuccess: () => { toast.success("Empresa atualizada."); onClose(); },
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Editar empresa"
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={onClose}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="edit-company-form" disabled={!name.trim() || updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</ButtonGlass>
        </>
      }
    >
      <form id="edit-company-form" onSubmit={handleSubmit} className="flex flex-col">
        <FieldInput label="Nome da Empresa *" type="text" required autoFocus value={name} onChange={setName} placeholder="Razão social ou nome fantasia" />
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="CNPJ" type="text" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0000-00" />
          <FieldInput label="Telefone" type="tel" value={phone} onChange={setPhone} placeholder="(11) 3333-4444" />
        </div>
        <FieldInput label="E-mail" type="email" value={email} onChange={setEmail} placeholder="contato@empresa.com" />
        <div className="grid grid-cols-[1fr_1.4fr_0.7fr] gap-3">
          <FieldInput label="CEP" type="text" value={cep} onChange={setCep} placeholder="00000-000" />
          <FieldInput label="Cidade" type="text" value={city} onChange={setCity} placeholder="São Paulo" />
          <FieldInput label="Estado" type="text" value={uf} onChange={setUf} placeholder="UF" />
        </div>
        <FieldInput label="Endereço da Empresa" type="text" value={address} onChange={setAddress} placeholder="Rua, número, bairro" />
        {updateMut.isError && (
          <p className="text-[12px] text-[var(--color-danger-text)]">{updateMut.error instanceof Error ? updateMut.error.message : "Erro ao atualizar empresa."}</p>
        )}
      </form>
    </FormSheet>
  );
}

function FieldInput({ label, type, value, onChange, placeholder, required, autoFocus }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; autoFocus?: boolean;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <InputGlass type={type} required={required} autoFocus={autoFocus} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
