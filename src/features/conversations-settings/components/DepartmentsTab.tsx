"use client";

import * as React from "react";
import {
  IconBuilding,
  IconHeadset,
  IconPhone,
  IconBriefcase,
  IconCurrencyDollar,
  IconUsers,
  IconDeviceLaptop,
  IconSpeakerphone,
  IconTruck,
  IconScale,
  IconShoppingCart,
  IconLifebuoy,
  IconClipboardList,
  IconStar,
  IconSettings,
  IconChartBar,
  IconMail,
  IconMessageCircle,
  IconTool,
  IconSchool,
  IconGlobe,
  IconHome,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconChevronRight,
  IconTable,
  IconLayoutGrid,
  IconLayoutList,
  IconSearch,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { InputGlass } from "@/components/crm/input-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  type Department,
} from "../hooks/use-departments";

// ─── Icon registry ────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

const ICON_REGISTRY: Record<string, IconComponent> = {
  IconBuilding, IconHeadset, IconPhone, IconBriefcase, IconCurrencyDollar,
  IconUsers, IconDeviceLaptop, IconSpeakerphone, IconTruck, IconScale,
  IconShoppingCart, IconLifebuoy, IconClipboardList, IconStar, IconSettings,
  IconChartBar, IconMail, IconMessageCircle, IconTool, IconSchool,
  IconGlobe, IconHome,
};

const DEPT_ICONS: { name: string; label: string }[] = [
  { name: "IconHeadset",        label: "Atendimento" },
  { name: "IconPhone",          label: "SAC" },
  { name: "IconBriefcase",      label: "Comercial" },
  { name: "IconCurrencyDollar", label: "Financeiro" },
  { name: "IconUsers",          label: "RH" },
  { name: "IconDeviceLaptop",   label: "TI" },
  { name: "IconSpeakerphone",   label: "Marketing" },
  { name: "IconTruck",          label: "Logística" },
  { name: "IconScale",          label: "Jurídico" },
  { name: "IconShoppingCart",   label: "Compras" },
  { name: "IconLifebuoy",       label: "Suporte" },
  { name: "IconClipboardList",  label: "Projetos" },
  { name: "IconStar",           label: "Qualidade" },
  { name: "IconSettings",       label: "Operações" },
  { name: "IconBuilding",       label: "Geral" },
  { name: "IconChartBar",       label: "Análise" },
  { name: "IconMail",           label: "E-mail" },
  { name: "IconMessageCircle",  label: "Chat" },
  { name: "IconTool",           label: "Manutenção" },
  { name: "IconSchool",         label: "Treinamento" },
  { name: "IconGlobe",          label: "Internacional" },
  { name: "IconHome",           label: "Administrativo" },
];

const DEPT_COLORS = [
  "#6366f1", "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0891b2",
  "#6b7280", "#334155",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DeptIcon({ name, size = 16, color, className }: { name: string; size?: number; color?: string; className?: string }) {
  const Comp = ICON_REGISTRY[name] ?? IconBuilding;
  return <Comp size={size} strokeWidth={1.75} className={className} style={color ? { color } : undefined} />;
}

function DeptIconBadge({ dept, size = 36 }: { dept: Department; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[var(--radius-md)]"
      style={{
        width: size, height: size,
        backgroundColor: dept.color + "18",
      }}
    >
      <DeptIcon name={dept.icon ?? "IconBuilding"} size={size * 0.45} color={dept.color} />
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
  } catch { return iso; }
}

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = "tabela" | "cards" | "compacta";

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateDepartmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(DEPT_COLORS[0]);
  const [iconName, setIconName] = React.useState(DEPT_ICONS[0].name);
  const createMutation = useCreateDepartment();

  function reset() { setName(""); setColor(DEPT_COLORS[0]); setIconName(DEPT_ICONS[0].name); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), color, icon: iconName }, {
      onSuccess: () => { toast.success("Departamento criado"); reset(); onClose(); },
      onError: (err: Error) => toast.error(err.message),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent size="sm" bodyClassName="p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]" style={{ backgroundColor: color + "22" }}>
            <DeptIcon name={iconName} size={20} color={color} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">Novo departamento</h3>
            {name.trim() && <p className="truncate font-body text-[12px] text-[var(--text-muted)]">{name.trim()}</p>}
          </div>
          <DialogClose />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5 px-5 py-5">
            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Nome</label>
              <InputGlass value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Suporte, Vendas, Financeiro…" autoFocus />
            </div>

            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Ícone</label>
              <div className="grid grid-cols-11 gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2">
                {DEPT_ICONS.map(({ name: ic, label }) => (
                  <button key={ic} type="button" title={label} onClick={() => setIconName(ic)}
                    className={cn("flex h-8 w-full items-center justify-center rounded-[var(--radius-sm)] transition-all",
                      iconName === ic ? "bg-[var(--brand-primary)]/12 ring-1 ring-[var(--brand-primary)]/40" : "hover:bg-[var(--glass-bg-strong)]")}>
                    <DeptIcon name={ic} size={17} color={iconName === ic ? color : undefined}
                      className={iconName === ic ? undefined : "text-[var(--text-muted)]"} />
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-center font-body text-[11px] text-[var(--text-muted)]">
                {DEPT_ICONS.find((i) => i.name === iconName)?.label}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Cor</label>
              <div className="flex flex-wrap gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
                {DEPT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={cn("relative size-6 rounded-full transition-all hover:scale-110", color === c && "scale-110 ring-2 ring-offset-2")}
                    style={{ backgroundColor: c, ...(color === c ? { ringColor: c } : {}) }}
                    aria-label={c}>
                    {color === c && <IconCheck size={12} strokeWidth={3} className="absolute inset-0 m-auto text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--glass-border-subtle)] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]" style={{ backgroundColor: color + "22" }}>
                <DeptIcon name={iconName} size={14} color={color} />
              </div>
              <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">{name.trim() || "Nome do departamento"}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { reset(); onClose(); }}
                className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
                Cancelar
              </button>
              <ButtonGlass type="submit" variant="primary" disabled={!name.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Criando…" : "Criar"}
              </ButtonGlass>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ dept, onConfirm, onCancel, isPending, errorMsg }: {
  dept: Department | null; onConfirm: () => void; onCancel: () => void; isPending: boolean; errorMsg?: string;
}) {
  return (
    <Dialog open={!!dept} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <IconTrash size={18} className="text-red-500" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">Excluir departamento</h3>
            <p className="mt-1 font-body text-[13px] text-[var(--text-muted)]">
              Tem certeza que deseja excluir <strong className="font-semibold text-[var(--text-primary)]">{dept?.name}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        {errorMsg && <div className="rounded-[var(--radius-md)] border border-red-100 bg-red-50 px-3 py-2.5 font-body text-[12.5px] text-red-600">{errorMsg}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending}
            className="rounded-[var(--radius-md)] bg-red-500 px-4 py-1.5 font-display text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {isPending ? "Excluindo…" : "Excluir"}
          </button>
        </div>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}

// ─── Row views ────────────────────────────────────────────────────────────────

function CompactaRow({ dept, onDelete }: { dept: Department; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-4 py-3 transition-shadow hover:shadow-sm">
      <DeptIconBadge dept={dept} size={40} />

      <div className="min-w-0 flex-1">
        <p className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">{dept.name}</p>
        <p className="font-body text-[12px] text-[var(--text-muted)]">Criado em {formatDate(dept.createdAt)}</p>
      </div>

      <span className="shrink-0 rounded-full bg-[var(--color-success)]/12 px-2.5 py-0.5 font-display text-[11.5px] font-semibold text-[var(--color-success)]">
        Ativo
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
          <IconTrash size={13} />
        </button>
        <button type="button"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)] transition-colors">
          <IconPencil size={13} />
        </button>
      </div>

      <IconChevronRight size={16} className="shrink-0 text-[var(--text-muted)] opacity-40" />
    </div>
  );
}

function TabelaRow({ dept, onDelete, selected, onToggle }: { dept: Department; onDelete: () => void; selected: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      "group grid grid-cols-[2rem_2.5rem_1fr_6rem_5.5rem_3.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--glass-bg-overlay)]",
      selected && "bg-[var(--brand-primary)]/5",
    )}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 rounded accent-[var(--brand-primary)]" />
      <DeptIconBadge dept={dept} size={32} />
      <div>
        <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">{dept.name}</p>
      </div>
      <span className="hidden font-body text-[12px] tabular-nums text-[var(--text-muted)] sm:block">{formatDate(dept.createdAt)}</span>
      <span className="hidden rounded-full bg-[var(--color-success)]/12 px-2 py-0.5 text-center font-display text-[11px] font-semibold text-[var(--color-success)] sm:block">
        Ativo
      </span>
      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}

function CardView({ dept, onDelete }: { dept: Department; onDelete: () => void }) {
  return (
    <div className="group relative flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-5 text-center transition-shadow hover:shadow-md">
      <DeptIconBadge dept={dept} size={52} />
      <div>
        <p className="font-display text-[14px] font-bold text-[var(--text-primary)]">{dept.name}</p>
        <p className="mt-0.5 font-body text-[11.5px] text-[var(--text-muted)]">{formatDate(dept.createdAt)}</p>
      </div>
      <span className="rounded-full bg-[var(--color-success)]/12 px-3 py-0.5 font-display text-[11px] font-semibold text-[var(--color-success)]">
        Ativo
      </span>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
          <IconTrash size={13} />
        </button>
        <button type="button"
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)] transition-colors">
          <IconPencil size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();

  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("compacta");
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | undefined>();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? departments.filter((d) => d.name.toLowerCase().includes(q)) : departments;
  }, [departments, search]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((d) => d.id)));
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Departamento excluído"); setDeleteTarget(null); setDeleteError(undefined); },
      onError: (err: unknown) => setDeleteError((err as Error).message),
    });
  }

  const VIEW_MODES: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    { id: "tabela",   icon: <IconTable size={14} />,      label: "Tabela" },
    { id: "cards",    icon: <IconLayoutGrid size={14} />,  label: "Cards" },
    { id: "compacta", icon: <IconLayoutList size={14} />,  label: "Compacta" },
  ];

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar departamento…"
            className="h-9 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] pl-8 pr-3 font-body text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-primary)] transition-colors"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-1">
            {VIEW_MODES.map(({ id, icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[12px] font-semibold transition-all",
                  viewMode === id
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Create button */}
          <ButtonGlass variant="primary" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 rounded-[var(--radius-lg)]">
            <IconPlus size={14} />
            Criar
          </ButtonGlass>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-lg)] border border-red-100 bg-red-50 px-4 py-2.5">
          <span className="flex-1 font-display text-[13px] text-red-600">
            {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button type="button" className="flex items-center gap-1.5 font-display text-[12.5px] font-semibold text-red-600 hover:underline">
            <IconTrash size={13} /> Excluir selecionados
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
            <IconBuilding size={24} className="text-[var(--text-muted)] opacity-50" />
          </div>
          <div>
            <p className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
              {search ? "Nenhum departamento encontrado" : "Nenhum departamento cadastrado"}
            </p>
            <p className="mt-1 font-body text-[12.5px] text-[var(--text-muted)]">
              {search ? "Tente um termo diferente." : "Crie o primeiro departamento para começar."}
            </p>
          </div>
          {!search && (
            <ButtonGlass variant="primary" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 mt-1">
              <IconPlus size={13} /> Criar departamento
            </ButtonGlass>
          )}
        </div>
      ) : viewMode === "compacta" ? (
        /* ── Compacta ── */
        <div className="flex flex-col gap-2">
          {filtered.map((dept) => (
            <CompactaRow
              key={dept.id}
              dept={dept}
              onDelete={() => { setDeleteError(undefined); setDeleteTarget(dept); }}
            />
          ))}
        </div>
      ) : viewMode === "cards" ? (
        /* ── Cards ── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((dept) => (
            <CardView
              key={dept.id}
              dept={dept}
              onDelete={() => { setDeleteError(undefined); setDeleteTarget(dept); }}
            />
          ))}
        </div>
      ) : (
        /* ── Tabela ── */
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)]">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_2.5rem_1fr_6rem_5.5rem_3.5rem] items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-2.5">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              className="size-4 rounded accent-[var(--brand-primary)]"
            />
            <span />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Nome</span>
            <span className="hidden font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:block">Criado em</span>
            <span className="hidden font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:block">Status</span>
            <span />
          </div>

          <div className="divide-y divide-[var(--glass-border-subtle)]">
            {filtered.map((dept) => (
              <TabelaRow
                key={dept.id}
                dept={dept}
                selected={selected.has(dept.id)}
                onToggle={() => toggleSelect(dept.id)}
                onDelete={() => { setDeleteError(undefined); setDeleteTarget(dept); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer count ── */}
      {!isLoading && filtered.length > 0 && (
        <p className="mt-3 font-body text-[12px] text-[var(--text-muted)]">
          {filtered.length} departamento{filtered.length !== 1 ? "s" : ""}
          {selected.size > 0 && ` · ${selected.size} selecionado${selected.size !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* ── Modals ── */}
      <CreateDepartmentModal open={showCreate} onClose={() => setShowCreate(false)} />
      <DeleteConfirmModal
        dept={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(undefined); }}
        isPending={deleteMutation.isPending}
        errorMsg={deleteError}
      />
    </>
  );
}
