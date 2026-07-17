"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PageFilterBar, PagePrimaryButton, PageSearchBar, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { ListColumnLabel, SortableHeader, listTableHeadRowClass, type SortDir } from "@/components/crm/sortable-header";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { Chip } from "@/components/crm/chip";
import { InputGlass } from "@/components/crm/input-glass";
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
  useContacts,
  useContactStats,
  useContactTags,
  useContactFieldDefs,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  useCompanies,
} from "@/features/directory-v2/hooks";
import type { ContactFieldDefDto, ContactListItemDto, ContactStatsDto } from "@/features/directory-v2/api";

const DEFAULT_PER_PAGE = 25;
type ViewMode = "cards" | "tabela";
type Segment = "todos" | "clientes" | "leads" | "sem-resp";

/** Segmentos dos stat cards (acionáveis) → filtros reais da API. */
const SEGMENTS: {
  id: Segment;
  label: string;
  value: (s: ContactStatsDto | undefined) => number | undefined;
}[] = [
  { id: "todos", label: "Todos", value: (s) => s?.total },
  { id: "clientes", label: "Clientes", value: (s) => s?.byStage?.CUSTOMER },
  { id: "leads", label: "Leads", value: (s) => s?.byStage?.LEAD },
  { id: "sem-resp", label: "Sem responsável", value: (s) => s?.unassigned },
];

type SortField = "name" | "createdAt" | "updatedAt" | "leadScore" | "lifecycleStage";

/** Presets de ordenação (campo:direção) para o dropdown "Ordenar". */
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Mais recentes" },
  { value: "createdAt:asc", label: "Mais antigos" },
  { value: "name:asc", label: "Nome (A–Z)" },
  { value: "name:desc", label: "Nome (Z–A)" },
  { value: "leadScore:desc", label: "Maior lead score" },
];

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

const LIFECYCLE_LABELS: Record<string, string> = {
  LEAD: "Lead",
  MQL: "MQL",
  SQL: "SQL",
  OPPORTUNITY: "Oportunidade",
  CUSTOMER: "Cliente",
  EVANGELIST: "Evangelista",
  OTHER: "Outro",
};

function stageLabel(v: string | null): string {
  if (!v) return "—";
  return LIFECYCLE_LABELS[v] ?? v;
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
  { key: "phone", label: "Telefone", width: "w-[150px]", cell: (c) => txtCell(c.phone ?? "—") },
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
  { key: "lifecycleStage", label: "Estágio", width: "w-[130px]", sortField: "lifecycleStage", cell: (c) => txtCell(stageLabel(c.lifecycleStage)) },
  { key: "leadScore", label: "Lead score", width: "w-[110px]", sortField: "leadScore", cell: (c) => txtCell(c.leadScore ?? "—") },
  { key: "source", label: "Fonte", width: "w-[150px]", cell: (c) => txtCell(c.source ?? "—") },
  { key: "assignedTo", label: "Responsável", width: "w-[170px]", cell: (c) => txtCell(c.assignedTo?.name ?? "—") },
  { key: "createdAt", label: "Criado em", width: "w-[130px]", sortField: "createdAt", cell: (c) => txtCell(fmtDateBR(c.createdAt)) },
  { key: "updatedAt", label: "Modificado em", width: "w-[130px]", sortField: "updatedAt", cell: (c) => txtCell(fmtDateBR(c.updatedAt)) },
];

const DEFAULT_COLUMN_KEYS = ["phone", "company", "tags", "createdAt"];
const COLUMNS_STORAGE_KEY = "v2:contacts:columns";

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

const AVATAR_COLORS = [
  "var(--brand-primary)",
  "var(--brand-secondary)",
  "var(--color-success)",
  "var(--brand-primary-light)",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
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
  const [tagId, setTagId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [createOpen, setCreateOpen] = useState(false);
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
          setActiveColumnKeys(parsed);
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
  }, [segment, tagId, sortBy, sortOrder]);

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
    tagIds: tagId !== "all" ? [tagId] : undefined,
    sortBy,
    sortOrder,
    enabled: isAuthenticated,
  });

  /** Alterna a ordenação por uma coluna (usado pelos cabeçalhos da Tabela). */
  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  }

  const tagOptions = [
    { value: "all", label: "Todas as tags" },
    ...(tagsQuery.data ?? [])
      .filter((t) => t.contactCount > 0)
      .map((t) => ({ value: t.id, label: `${t.name} (${t.contactCount})` })),
  ];

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
          description="Diretório de contatos vinculados ao CRM"
          center={
            <PageSearchBar
              variant="compact"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, e-mail..."
              aria-label="Buscar contatos"
            />
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
              <PagePrimaryButton type="button" onClick={() => setCreateOpen(true)}>
                <IconPlus size={15} stroke={2.4} /> Novo contato
              </PagePrimaryButton>
            </div>
          }
        />

        {/* Stat cards acionáveis (arquétipo B) — cada número filtra a lista */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {SEGMENTS.map((seg) => {
            const active = segment === seg.id;
            const val = seg.value(statsQuery.data);
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => setSegment(seg.id)}
                aria-pressed={active}
                className={`rounded-[var(--radius-lg)] border px-4 py-3 text-left transition-all ${
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]"
                }`}
              >
                <span className="block font-display text-[21px] font-extrabold leading-none text-[var(--text-primary)]">
                  {val === undefined ? "—" : val.toLocaleString("pt-BR")}
                </span>
                <span className="mt-1 block font-body text-[12px] text-[var(--text-muted)]">{seg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de filtros: tag + ordenação */}
        <PageFilterBar>
          <DropdownGlass
            options={tagOptions}
            value={tagId}
            onValueChange={setTagId}
            menuLabel="Filtrar por tag"
            triggerClassName="min-w-[180px]"
          />
          <DropdownGlass
            options={SORT_OPTIONS}
            value={`${sortBy}:${sortOrder}`}
            onValueChange={(v) => {
              const [f, o] = v.split(":");
              setSortBy(f as SortField);
              setSortOrder(o as "asc" | "desc");
            }}
            menuLabel="Ordenar por"
            triggerClassName="min-w-[170px]"
          />
          {view === "tabela" && (
            <ColumnPicker
              nativeColumns={NATIVE_COLUMNS}
              customColumns={customColumns}
              activeKeys={activeColumnKeys}
              onToggle={toggleColumn}
              onReset={() => setActiveColumnKeys(DEFAULT_COLUMN_KEYS)}
            />
          )}
        </PageFilterBar>

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
                  : segment !== "todos" || tagId !== "all"
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
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={toggleSort}
          />
        ) : (
          <CardsView
            items={items}
            selected={selected}
            allChecked={allChecked}
            someChecked={someChecked}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            onEdit={setEditing}
          />
        )}

        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} contatos — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
          perPage={perPage}
          onPerPageChange={(value) => { setPerPage(value); setPage(1); }}
        />
      </main>

      <CreateContactDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditContactDialog contact={editing} onClose={() => setEditing(null)} />
      <ConfirmDeleteDialog
        open={confirmOpen} count={selected.size} pending={deleteMut.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// ── Configurador de colunas (popover estilo Kommo) ───────────────────────────

function ColumnPicker({
  nativeColumns, customColumns, activeKeys, onToggle, onReset,
}: {
  nativeColumns: ColumnDef[];
  customColumns: ColumnDef[];
  activeKeys: string[];
  onToggle: (key: string) => void;
  onReset: () => void;
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

  const activeSet = new Set(activeKeys);
  const activeCount = nativeColumns.concat(customColumns).filter((c) => activeSet.has(c.key)).length;

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
    <div ref={ref} className="relative">
      <ButtonGlass variant="glass" size="sm" type="button" onClick={() => setOpen((o) => !o)}>
        <IconColumns size={15} /> Colunas
        {activeCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </ButtonGlass>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[340px] rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-3 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-display text-[12px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Colunas disponíveis</span>
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
              <div className="mb-1.5 mt-3 font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Campos personalizados</div>
              <div className="flex flex-wrap gap-1.5">{customColumns.map(renderChip)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tabela (colunas dinâmicas) ───────────────────────────────────────────────

function TabelaView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne,
  columns, sortBy, sortOrder, onSort,
}: {
  items: ContactListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  columns: ColumnDef[];
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  const dirFor = (f: SortField): SortDir => (sortBy === f ? sortOrder : null);
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
      {/* H-scroll único: header + linhas andam juntos */}
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex min-h-0 w-max min-w-full flex-1 flex-col">
          <div className={listTableHeadRowClass("flex items-center gap-3 px-3 py-2")}>
            <span className="w-9 shrink-0">
              <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todos" />
            </span>
            <div className="w-[240px] shrink-0">
              <SortableHeader label="Nome / E-mail" sort={dirFor("name")} onSort={() => onSort("name")} />
            </div>
            {columns.map((col) => (
              <div key={col.key} className={`${col.width} shrink-0`}>
                {col.sortField ? (
                  <SortableHeader label={col.label} sort={dirFor(col.sortField)} onSort={() => onSort(col.sortField as SortField)} />
                ) : (
                  <ListColumnLabel>{col.label}</ListColumnLabel>
                )}
              </div>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {items.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)] ${selected.has(c.id) ? "bg-[var(--color-primary-soft)]" : ""}`}
              >
                <span className="w-9 shrink-0">
                  <CheckboxGlass checked={selected.has(c.id)} onChange={() => onToggleOne(c.id)} aria-label={`Selecionar ${c.name}`} />
                </span>
                <div className="flex w-[240px] shrink-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <Link href={`/contacts/${c.id}`} className="group/name inline-flex max-w-full items-center gap-1.5 font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]">
                      <span className="truncate">{c.name}</span>
                      <IconPencil size={13} className="flex-shrink-0 opacity-0 transition-opacity group-hover/name:opacity-60" />
                    </Link>
                    <div className="truncate font-body text-[12px] text-[var(--text-muted)]">{c.email ?? "—"}</div>
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
    </div>
  );
}

// ── Cards (card-rows do arquétipo B) ─────────────────────────────────────────

function CardsView({
  items, selected, allChecked, someChecked, onToggleAll, onToggleOne, onEdit,
}: {
  items: ContactListItemDto[];
  selected: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (c: ContactListItemDto) => void;
}) {
  return (
    <div className="flex flex-col gap-2 overflow-y-auto pb-1">
      {/* Cabeçalho: selecionar todos (à esquerda) + rótulos de coluna */}
      <div className="flex items-center gap-4 px-4 pb-1 pt-0.5">
        <CheckboxGlass checked={allChecked} indeterminate={!allChecked && someChecked} onChange={onToggleAll} aria-label="Selecionar todos" />
        <span className="w-10 shrink-0" aria-hidden />
        <span className="flex-1 font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contato</span>
        <span className="hidden w-[180px] text-right font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] md:block">Empresa · Criado em</span>
        <span className="w-[100px] text-right font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ações</span>
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
          className={`group flex cursor-pointer items-center gap-4 rounded-[var(--radius-xl)] border px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)] ${
            isSelected
              ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-base)]"
          }`}
        >
          {/* Checkbox de seleção */}
          <span onClick={(e) => e.stopPropagation()}>
            <CheckboxGlass checked={isSelected} onChange={() => onToggleOne(c.id)} aria-label={`Selecionar ${c.name}`} />
          </span>

          {/* Avatar */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
            {initials(c.name)}
          </span>

          {/* Nome + tags inline + prévia (email/telefone) */}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex min-w-0 items-center gap-2">
              <Link href={`/contacts/${c.id}`} onClick={(e) => e.stopPropagation()} className="truncate font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]">
                {c.name}
              </Link>
              {(c.tags ?? []).slice(0, 2).map((t) => (
                <Chip key={t.id} variant="ghost" color={t.color ?? undefined}>{t.name}</Chip>
              ))}
              {(c.tags?.length ?? 0) > 2 && (
                <span className="font-display text-[11px] text-[var(--text-muted)]">+{(c.tags?.length ?? 0) - 2}</span>
              )}
            </div>
            <div className="mt-0.5 truncate font-body text-[12px] text-[var(--text-muted)]">
              {c.email ?? c.phone ?? "—"}
            </div>
          </div>

          {/* Metadados à direita: empresa + criado em */}
          <div className="hidden w-[180px] shrink-0 text-right leading-tight md:block">
            <div className="truncate font-display text-[13px] font-semibold text-[var(--text-secondary)]">{c.company?.name ?? "—"}</div>
            <div className="font-body text-[11px] text-[var(--text-muted)]">Criado em {fmtDateBR(c.createdAt)}</div>
          </div>

          {/* Ações rápidas */}
          <div className="flex w-[100px] shrink-0 items-center justify-end gap-0.5">
            <a
              href={c.phone ? `tel:${c.phone}` : undefined}
              onClick={(e) => e.stopPropagation()}
              aria-label="Ligar"
              aria-disabled={!c.phone}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconPhone size={16} />
            </a>
            <a
              href={c.email ? `mailto:${c.email}` : undefined}
              onClick={(e) => e.stopPropagation()}
              aria-label="Enviar e-mail"
              aria-disabled={!c.email}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconMail size={16} />
            </a>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(c); }}
              aria-label={`Editar ${c.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
            >
              <IconPencil size={16} />
            </button>
          </div>
        </div>
        );
      })}
    </div>
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

function CreateContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const createMut = useCreateContact();

  useEffect(() => {
    if (!open) { setName(""); setEmail(""); setPhone(""); setCompanyId(null); setCompanyName(null); createMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate({ name: n, email: email.trim() || null, phone: phone.trim() || null, companyId }, {
      onSuccess: () => { toast.success("Contato criado."); onOpenChange(false); },
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Novo contato"
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={() => onOpenChange(false)}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="new-contact-form" disabled={!name.trim() || createMut.isPending}>{createMut.isPending ? "Criando..." : "Criar"}</ButtonGlass>
        </>
      }
    >
      <form id="new-contact-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        {createMut.isError && (
          <p className="text-[12px] text-[var(--color-danger-text)]">{createMut.error instanceof Error ? createMut.error.message : "Erro ao criar contato."}</p>
        )}
      </form>
    </FormSheet>
  );
}

function EditContactDialog({ contact, onClose }: { contact: ContactListItemDto | null; onClose: () => void }) {
  const open = contact !== null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const updateMut = useUpdateContact();

  useEffect(() => {
    if (contact) { setName(contact.name); setEmail(contact.email ?? ""); setPhone(contact.phone ?? ""); setCompanyId(contact.company?.id ?? null); setCompanyName(contact.company?.name ?? null); updateMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  if (!contact) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !contact) return;
    updateMut.mutate({ id: contact.id, body: { name: n, email: email.trim() || null, phone: phone.trim() || null, companyId } }, {
      onSuccess: () => { toast.success("Contato atualizado."); onClose(); },
    });
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Editar contato"
      footer={
        <>
          <ButtonGlass variant="glass" size="sm" type="button" onClick={onClose}>Cancelar</ButtonGlass>
          <ButtonGlass variant="primary" size="sm" type="submit" form="edit-contact-form" disabled={!name.trim() || updateMut.isPending}>{updateMut.isPending ? "Salvando..." : "Salvar"}</ButtonGlass>
        </>
      }
    >
      <form id="edit-contact-form" onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        {updateMut.isError && (
          <p className="text-[12px] text-[var(--color-danger-text)]">{updateMut.error instanceof Error ? updateMut.error.message : "Erro ao atualizar contato."}</p>
        )}
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
