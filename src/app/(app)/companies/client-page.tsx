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
  IconUsers,
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
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PageSearchBar, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { EmptyState } from "@/components/crm/empty-state";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { BadgeGlass } from "@/components/crm/badge-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { KpiCard, type KpiTone } from "@/components/crm/kpi-card";
import { cn } from "@/lib/utils";
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
  useCompanyStats,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
} from "@/features/directory-v2/hooks";
import type {
  CompanyListItemDto,
  CompanySegment,
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
  { key: "phone", label: "Telefone", width: "w-[150px]", cell: (c) => txtCell(c.phone ?? "—") },
  { key: "domain", label: "E-mail", width: "w-[180px]", cell: (c) => txtCell(c.domain ?? "—") },
  { key: "size", label: "CNPJ", width: "w-[150px]", cell: (c) => txtCell(c.size ?? "—") },
  { key: "industry", label: "Setor", width: "w-[140px]", cell: (c) => txtCell(c.industry ?? "—") },
  { key: "address", label: "Endereço", width: "w-[200px]", cell: (c) => txtCell(c.address ?? "—") },
  {
    key: "contacts",
    label: "Contatos",
    width: "w-[100px]",
    cell: (c) => <BadgeGlass variant="enterprise">{c._count.contacts}</BadgeGlass>,
  },
  { key: "createdAt", label: "Criado em", width: "w-[130px]", cell: (c) => txtCell(fmtDateBR(c.createdAt)) },
];

const DEFAULT_COLUMN_KEYS = ["phone", "domain", "contacts", "createdAt"];
const COLUMNS_STORAGE_KEY = "v2:companies:columns:v1";

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

export default function V2CompaniesClientPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [view, setView] = useState<ViewMode>("cards");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [segment, setSegment] = useState<CompanySegment>("todos");
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
  useEffect(() => { setPage(1); }, [segment]);

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
  const query = useCompanies({
    search: debounced || undefined,
    page,
    perPage,
    segment,
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
            <div className="flex w-full max-w-md justify-start">
              <PageSearchBar
                variant="compact"
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nome, e-mail..."
                aria-label="Buscar empresas"
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
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
                  {initials(c.name)}
                </span>
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
    <div className="flex flex-col gap-2 overflow-y-auto pb-1">
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-bold text-white" style={{ background: avatarColor(c.id) }}>
                {initials(c.name)}
              </span>
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
              <a href={c.phone ? `tel:${c.phone}` : undefined} aria-label="Ligar" aria-disabled={!c.phone} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]">
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
  const [address, setAddress] = useState("");
  const createMut = useCreateCompany();

  useEffect(() => {
    if (!open) { setName(""); setCnpj(""); setPhone(""); setEmail(""); setAddress(""); createMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate({ name: n, size: cnpj.trim() || null, phone: phone.trim() || null, domain: email.trim() || null, address: address.trim() || null }, {
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
        <FieldInput label="Endereço da Empresa" type="text" value={address} onChange={setAddress} placeholder="Rua, número, bairro, cidade — UF" />
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
  const [address, setAddress] = useState("");
  const updateMut = useUpdateCompany();

  useEffect(() => {
    if (company) { setName(company.name); setCnpj(company.size ?? ""); setPhone(company.phone ?? ""); setEmail(company.domain ?? ""); setAddress(company.address ?? ""); updateMut.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || !company) return;
    updateMut.mutate({ id: company.id, body: { name: n, size: cnpj.trim() || null, phone: phone.trim() || null, domain: email.trim() || null, address: address.trim() || null } }, {
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
        <FieldInput label="Endereço da Empresa" type="text" value={address} onChange={setAddress} placeholder="Rua, número, bairro, cidade — UF" />
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
