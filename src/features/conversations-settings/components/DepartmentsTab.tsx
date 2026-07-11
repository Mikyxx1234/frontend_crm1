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

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const ICON_REGISTRY: Record<string, IconComponent> = {
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

function DeptIcon({
  name,
  size = 16,
  color,
  className,
}: {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const Comp = ICON_REGISTRY[name] ?? IconBuilding;
  return <Comp size={size} strokeWidth={1.75} className={className} style={color ? { color } : undefined} />;
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateDepartmentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(DEPT_COLORS[0]);
  const [iconName, setIconName] = React.useState(DEPT_ICONS[0].name);
  const createMutation = useCreateDepartment();

  function reset() {
    setName("");
    setColor(DEPT_COLORS[0]);
    setIconName(DEPT_ICONS[0].name);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim(), color, icon: iconName },
      {
        onSuccess: () => {
          toast.success("Departamento criado");
          reset();
          onClose();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent size="sm" bodyClassName="p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] shadow-sm"
            style={{ backgroundColor: color + "22" }}
          >
            <DeptIcon name={iconName} size={20} color={color} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Novo departamento
            </h3>
            {name.trim() && (
              <p className="truncate font-body text-[12px] text-[var(--text-muted)]">
                {name.trim()}
              </p>
            )}
          </div>
          <DialogClose />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5 px-5 py-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Nome
              </label>
              <InputGlass
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Suporte, Vendas, Financeiro…"
                autoFocus
              />
            </div>

            {/* Icon picker */}
            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Ícone
              </label>
              <div className="grid grid-cols-11 gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2">
                {DEPT_ICONS.map(({ name: ic, label }) => (
                  <button
                    key={ic}
                    type="button"
                    title={label}
                    onClick={() => setIconName(ic)}
                    className={cn(
                      "group relative flex h-8 w-full items-center justify-center rounded-[var(--radius-sm)] transition-all",
                      iconName === ic
                        ? "bg-[var(--brand-primary)]/12 ring-1 ring-[var(--brand-primary)]/40"
                        : "hover:bg-[var(--glass-bg-strong)]",
                    )}
                  >
                    <DeptIcon
                      name={ic}
                      size={17}
                      color={iconName === ic ? color : undefined}
                      className={iconName === ic ? undefined : "text-[var(--text-muted)]"}
                    />
                  </button>
                ))}
              </div>
              {/* Label of selected icon */}
              <p className="mt-1.5 text-center font-body text-[11px] text-[var(--text-muted)]">
                {DEPT_ICONS.find((i) => i.name === iconName)?.label}
              </p>
            </div>

            {/* Color picker */}
            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Cor
              </label>
              <div className="flex flex-wrap gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
                {DEPT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "relative size-6 rounded-full transition-all hover:scale-110",
                      color === c && "scale-110 ring-2 ring-offset-2",
                    )}
                    style={{
                      backgroundColor: c,
                      ...(color === c ? { ringColor: c } : {}),
                    }}
                    aria-label={c}
                  >
                    {color === c && (
                      <IconCheck
                        size={12}
                        strokeWidth={3}
                        className="absolute inset-0 m-auto text-white"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--glass-border-subtle)] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ backgroundColor: color + "22" }}
              >
                <DeptIcon name={iconName} size={14} color={color} />
              </div>
              <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                {name.trim() || "Nome do departamento"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { reset(); onClose(); }}
                className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
              >
                Cancelar
              </button>
              <ButtonGlass
                type="submit"
                variant="primary"
                disabled={!name.trim() || createMutation.isPending}
              >
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

function DeleteConfirmModal({
  dept,
  onConfirm,
  onCancel,
  isPending,
  errorMsg,
}: {
  dept: Department | null;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  errorMsg?: string;
}) {
  return (
    <Dialog open={!!dept} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <IconTrash size={18} className="text-red-500" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Excluir departamento
            </h3>
            <p className="mt-1 font-body text-[13px] text-[var(--text-muted)]">
              Tem certeza que deseja excluir{" "}
              <strong className="font-semibold text-[var(--text-primary)]">{dept?.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        {errorMsg && (
          <div className="rounded-[var(--radius-md)] border border-red-100 bg-red-50 px-3 py-2.5 font-body text-[12.5px] text-red-600">
            {errorMsg}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-red-500 px-4 py-1.5 font-display text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Excluindo…" : "Excluir"}
          </button>
        </div>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();

  const [search, setSearch] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | undefined>();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selected.size === filtered.length
        ? new Set()
        : new Set(filtered.map((d) => d.id)),
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Departamento excluído");
        setDeleteTarget(null);
        setDeleteError(undefined);
      },
      onError: (err: unknown) => {
        setDeleteError((err as Error).message);
      },
    });
  }

  function formatDate(iso: string) {
    try {
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1">
          <InputGlass
            withSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar departamento…"
            className="max-w-xs"
          />
        </div>

        {selected.size > 0 && (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-1.5 font-display text-[12.5px] font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <IconTrash size={13} />
            Excluir selecionados ({selected.size})
          </button>
        )}

        <ButtonGlass
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(true)}
          className="shrink-0 gap-1.5"
        >
          <IconPlus size={14} />
          Criar
        </ButtonGlass>
      </div>

      {/* ── Table card ── */}
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)]">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_auto_6rem_3rem] items-center gap-2 border-b border-[var(--glass-border-subtle)] px-4 py-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleAll}
            className="size-4 rounded accent-[var(--brand-primary)]"
          />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Nome
          </span>
          <span className="hidden font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:block">
            Ícone
          </span>
          <span className="hidden font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:block">
            Criado em
          </span>
          <span />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-4 w-4 animate-pulse rounded bg-[var(--glass-bg-strong)]" />
                <div className="h-7 w-7 animate-pulse rounded-[var(--radius-sm)] bg-[var(--glass-bg-strong)]" />
                <div className="h-4 w-32 animate-pulse rounded bg-[var(--glass-bg-strong)]" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
              <IconBuilding size={22} className="text-[var(--text-muted)] opacity-50" />
            </div>
            <p className="font-display text-[13px] font-semibold text-[var(--text-muted)]">
              {search ? "Nenhum departamento encontrado" : "Nenhum departamento cadastrado"}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="font-display text-[12.5px] text-[var(--brand-primary)] hover:underline"
              >
                Criar primeiro departamento
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            {filtered.map((dept) => (
              <div
                key={dept.id}
                className={cn(
                  "group grid grid-cols-[2rem_1fr_auto_6rem_3rem] items-center gap-2 px-4 py-3 transition-colors hover:bg-[var(--glass-bg-overlay)]",
                  selected.has(dept.id) && "bg-[var(--brand-primary)]/5",
                )}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.has(dept.id)}
                  onChange={() => toggleSelect(dept.id)}
                  className="size-4 rounded accent-[var(--brand-primary)]"
                />

                {/* Name + color dot */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  <span className="truncate font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                    {dept.name}
                  </span>
                </div>

                {/* Icon badge */}
                <div
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] sm:flex"
                  style={{ backgroundColor: dept.color + "18" }}
                >
                  <DeptIcon name={dept.icon} size={15} color={dept.color} />
                </div>

                {/* Date */}
                <span className="hidden font-body text-[12px] tabular-nums text-[var(--text-muted)] sm:block">
                  {formatDate(dept.createdAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(undefined);
                      setDeleteTarget(dept);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-all hover:bg-red-50 hover:text-red-500"
                    aria-label="Excluir"
                  >
                    <IconTrash size={13} />
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-all hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                    aria-label="Editar"
                  >
                    <IconPencil size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-[var(--glass-border-subtle)] px-4 py-2.5">
            <span className="font-body text-[12px] text-[var(--text-muted)]">
              {filtered.length} departamento{filtered.length !== 1 ? "s" : ""}
              {selected.size > 0 && ` · ${selected.size} selecionado${selected.size !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

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
