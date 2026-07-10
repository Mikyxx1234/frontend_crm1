"use client";

import * as React from "react";
import { IconBuilding, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { GlassCard } from "@/components/crm/glass-card";
import { InputGlass } from "@/components/crm/input-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import {
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  type Department,
} from "../hooks/use-departments";

// ─── Color presets ──────────────────────────────────────────────────────────────

const DEPT_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0d9488", "#0891b2", "#4f46e5",
  "#6b7280", "#334155",
];

// ─── Create department modal ─────────────────────────────────────────────────────

function CreateDepartmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(DEPT_COLORS[0]);
  const createMutation = useCreateDepartment();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          toast.success("Departamento criado");
          onCreated?.();
          onClose();
        },
        onError: (err: Error) => toast.error(err.message),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassCard variant="panel" className="w-full max-w-sm p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/12">
            <IconBuilding size={18} className="text-[var(--brand-primary)]" />
          </div>
          <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)]">
            Novo departamento
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
          >
            <IconX size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block font-display text-[12px] font-semibold text-[var(--text-secondary)]">
              Nome
            </label>
            <InputGlass
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Suporte, Vendas…"
              autoFocus
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-1.5 block font-display text-[12px] font-semibold text-[var(--text-secondary)]">
              Cor
            </label>
            <div className="flex flex-wrap gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2.5">
              {DEPT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-6 rounded-full transition-all hover:scale-110",
                    color === c && "scale-110 ring-2 ring-offset-1 ring-[var(--glass-border)]",
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            {/* Preview */}
            {name.trim() && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                  {name.trim()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-2 font-display text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
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
        </form>
      </GlassCard>
    </div>
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
  dept: Department;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  errorMsg?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <GlassCard variant="panel" className="relative w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-danger)]/12">
            <IconTrash size={18} className="text-[var(--color-danger)]" />
          </div>
          <h3 className="font-display text-[16px] font-bold text-[var(--text-primary)]">
            Excluir departamento
          </h3>
        </div>
        <p className="mb-4 mt-2 font-body text-sm text-[var(--text-muted)]">
          Tem certeza que deseja excluir{" "}
          <strong className="text-[var(--text-primary)]">{dept.name}</strong>? Esta ação não pode
          ser desfeita.
        </p>
        {errorMsg && (
          <p className="mb-3 rounded-[var(--radius-md)] bg-[var(--color-danger)]/10 px-3 py-2 font-body text-[12.5px] text-[var(--color-danger)]">
            {errorMsg}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-2 font-display text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-[var(--radius-md)] bg-[var(--color-danger)] px-4 py-2 font-display text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <IconX size={16} />
        </button>
      </GlassCard>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  }

  function handleDelete(dept: Department) {
    setDeleteError(undefined);
    setDeleteTarget(dept);
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
        const error = err as Error & { status?: number };
        setDeleteError(error.message);
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

  return (
    <>
      <GlassCard variant="panel" className="overflow-hidden">
        {/* ── Header: search + count + create ── */}
        <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] p-4">
          <div className="flex-1">
            <InputGlass
              withSearch
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar departamento…"
              className="max-w-xs"
            />
          </div>
          <span className="shrink-0 font-display text-[12px] text-[var(--text-muted)]">
            {isLoading
              ? "Carregando…"
              : `${filtered.length} departamento${filtered.length !== 1 ? "s" : ""}`}
          </span>
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

        {/* ── Table ── */}
        {isLoading ? (
          <div className="space-y-px p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <IconBuilding size={32} className="text-[var(--text-muted)] opacity-40" />
            <p className="font-display text-sm font-semibold text-[var(--text-muted)]">
              {search ? "Nenhum departamento encontrado" : "Nenhum departamento cadastrado"}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="font-display text-xs text-[var(--brand-primary)] hover:underline"
              >
                Criar primeiro departamento
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--glass-border-subtle)]">
                <th className="w-10 py-2.5 pl-4 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="size-4 rounded accent-[var(--brand-primary)]"
                  />
                </th>
                <th className="py-2.5 pr-4 text-left font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Nome
                </th>
                <th className="hidden py-2.5 pr-4 text-left font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:table-cell">
                  Criado em
                </th>
                <th className="w-10 py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border-subtle)]">
              {filtered.map((dept) => (
                <tr
                  key={dept.id}
                  className="group transition-colors hover:bg-[var(--glass-bg-overlay)]"
                >
                  <td className="py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(dept.id)}
                      onChange={() => toggleSelect(dept.id)}
                      className="size-4 rounded accent-[var(--brand-primary)]"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                      <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                        {dept.name}
                      </span>
                    </span>
                  </td>
                  <td className="hidden py-3 pr-4 sm:table-cell">
                    <span className="font-body text-[12.5px] text-[var(--text-muted)]">
                      {formatDate(dept.createdAt)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(dept)}
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] group-hover:opacity-100"
                      aria-label="Excluir departamento"
                    >
                      <IconTrash size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {/* ── Modals ── */}
      {showCreate && <CreateDepartmentModal onClose={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          dept={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError(undefined);
          }}
          isPending={deleteMutation.isPending}
          errorMsg={deleteError}
        />
      )}
    </>
  );
}
