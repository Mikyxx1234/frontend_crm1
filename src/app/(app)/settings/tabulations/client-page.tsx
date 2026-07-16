"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconCircleDot,
  IconEdit,
  IconFolder,
  IconFolderOpen,
  IconLayoutList,
  IconListTree,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { GlassCard } from "@/components/crm/glass-card";
import { InputGlass } from "@/components/crm/input-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { useDepartments, type Department } from "@/features/conversations-settings/hooks/use-departments";
import { DeptGlyph } from "@/features/conversations-settings/department-icons";

import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

type TabulationNode = {
  id: string;
  parentId: string | null;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
  children: TabulationNode[];
};

type TabulationsResponse = {
  departmentId: string;
  requireTabulationOnClose: boolean;
  tree: TabulationNode[];
};

function tabulationsQueryKey(departmentId: string | null) {
  return ["settings", "tabulations", departmentId ?? ""] as const;
}

async function fetchTabulations(departmentId: string): Promise<TabulationsResponse> {
  const res = await fetch(
    apiUrl(`/api/settings/tabulations?departmentId=${encodeURIComponent(departmentId)}`),
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("Erro ao carregar tabulações");
  return res.json();
}

function countLeaves(nodes: TabulationNode[]): number {
  let total = 0;
  for (const n of nodes) {
    if (n.children.length === 0) total += 1;
    else total += countLeaves(n.children);
  }
  return total;
}

export default function TabulationsClientPage() {
  const qc = useQueryClient();
  const departmentsQuery = useDepartments();
  const departments = departmentsQuery.data ?? [];

  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const effectiveDeptId = departmentId ?? departments[0]?.id ?? null;

  const treeQuery = useQuery({
    queryKey: tabulationsQueryKey(effectiveDeptId),
    queryFn: () => fetchTabulations(effectiveDeptId!),
    enabled: !!effectiveDeptId,
    staleTime: 15_000,
  });

  const requireOnClose = treeQuery.data?.requireTabulationOnClose ?? false;
  const leaves = useMemo(() => countLeaves(treeQuery.data?.tree ?? []), [treeQuery.data?.tree]);

  const toggleRequire = useMutation({
    mutationFn: async (next: boolean) => {
      if (!effectiveDeptId) throw new Error("Sem departamento");
      const res = await fetch(apiUrl(`/api/settings/departments/${effectiveDeptId}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireTabulationOnClose: next }),
      });
      if (!res.ok) throw new Error("Falha ao alternar exigência");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabulationsQueryKey(effectiveDeptId) });
    },
  });

  const createNode = useMutation({
    mutationFn: async (input: { parentId: string | null; name: string }) => {
      if (!effectiveDeptId) throw new Error("Sem departamento");
      const res = await fetch(apiUrl("/api/settings/tabulations"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: effectiveDeptId,
          parentId: input.parentId,
          name: input.name,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao criar");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabulationsQueryKey(effectiveDeptId) });
    },
  });

  const updateNode = useMutation({
    mutationFn: async (input: { id: string; name?: string; active?: boolean }) => {
      const res = await fetch(apiUrl(`/api/settings/tabulations/${input.id}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: input.name, active: input.active }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao atualizar");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabulationsQueryKey(effectiveDeptId) });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/settings/tabulations/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao remover");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tabulationsQueryKey(effectiveDeptId) });
    },
  });

  const selectedDept = departments.find((d) => d.id === effectiveDeptId) ?? null;

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Tabulações"
      description="Motivos hierárquicos escolhidos ao encerrar conversas"
      icon={<IconLayoutList size={22} />}
    >
      <div className="flex w-full min-w-0 flex-col gap-4 px-1 pb-8">
        {/* ── Departamento + exigência ─────────────────────────────── */}
        <GlassCard variant="panel" className="min-w-0 overflow-visible p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start">
            <div>
              <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Departamento
              </p>
              <DeptSelect
                departments={departments}
                selected={selectedDept}
                onSelect={(id) => setDepartmentId(id)}
              />
              {departments.length === 0 ? (
                <p className="mt-2 font-body text-[12px] text-[var(--text-muted)]">
                  Nenhum departamento ainda.{" "}
                  <Link
                    href="/settings/departments"
                    className="font-semibold text-[var(--brand-primary)] underline-offset-2 hover:underline"
                  >
                    Cadastrar em Equipe &amp; Operação › Departamentos
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            {effectiveDeptId ? (
              <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-3">
                <div className="min-w-0">
                  <div className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                    Exigir tabulação ao encerrar
                  </div>
                  <div className="mt-0.5 font-body text-[12px] text-[var(--text-muted)]">
                    Quando ativado, o agente escolhe uma folha antes de resolver a conversa deste
                    departamento.
                  </div>
                </div>
                <SwitchGlass
                  checked={requireOnClose}
                  onChange={(v) => toggleRequire.mutate(v)}
                  disabled={toggleRequire.isPending}
                  size="list"
                  aria-label="Exigir tabulação ao encerrar"
                />
              </div>
            ) : null}
          </div>
        </GlassCard>

        {/* ── Árvore de tabulações ─────────────────────────────────── */}
        {effectiveDeptId ? (
          <TreeEditor
            tree={treeQuery.data?.tree ?? []}
            loading={treeQuery.isLoading}
            leaves={leaves}
            onCreate={(parentId, name) => createNode.mutate({ parentId, name })}
            onRename={(id, name) => updateNode.mutate({ id, name })}
            onToggleActive={(id, active) => updateNode.mutate({ id, active })}
            onDelete={(id) => deleteNode.mutate(id)}
          />
        ) : null}
      </div>
    </SettingsV2Shell>
  );
}

/* ─── Seletor de departamento (dropdown glass com ícone real) ─────── */

function DeptSelect({
  departments,
  selected,
  onSelect,
}: {
  departments: Department[];
  selected: Department | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", fn);
    return () => document.removeEventListener("pointerdown", fn);
  }, [open]);

  const disabled = departments.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--brand-primary)]/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {selected ? (
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: (selected.color ?? "#6366f1") + "1f" }}
          >
            <DeptGlyph icon={selected.icon} size={16} color={selected.color ?? undefined} />
          </span>
        ) : null}
        <span className="flex-1 truncate font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
          {selected?.name ?? "Nenhum departamento cadastrado"}
        </span>
        <IconChevronDown
          size={16}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && departments.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-[280px] w-full overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] py-1 shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
          {departments.map((d) => {
            const isSel = d.id === selected?.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onSelect(d.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                  isSel
                    ? "bg-[var(--brand-primary)]/8"
                    : "hover:bg-[var(--glass-bg-overlay)]",
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: (d.color ?? "#6366f1") + "1f" }}
                >
                  <DeptGlyph icon={d.icon} size={16} color={d.color ?? undefined} />
                </span>
                <span
                  className={cn(
                    "flex-1 truncate font-display text-[13px] font-semibold",
                    isSel ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]",
                  )}
                >
                  {d.name}
                </span>
                {isSel && <IconCheck size={15} className="shrink-0 text-[var(--brand-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Editor da árvore ────────────────────────────────────────────── */

function TreeEditor(props: {
  tree: TabulationNode[];
  loading: boolean;
  leaves: number;
  onCreate: (parentId: string | null, name: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [newRootName, setNewRootName] = useState("");

  const submitRoot = () => {
    const name = newRootName.trim();
    if (!name) return;
    props.onCreate(null, name);
    setNewRootName("");
  };

  return (
    <GlassCard variant="panel" className="min-w-0 p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
          <IconListTree size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
            Árvore de tabulações
          </h2>
          <p className="font-body text-[12px] text-[var(--text-muted)]">
            Categorias (nós internos) organizam; agentes selecionam uma folha.
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--glass-bg-base)] px-2.5 py-1 font-display text-[11.5px] font-semibold text-[var(--text-secondary)]">
          <IconSparkles size={14} className="text-[var(--brand-primary)]" />
          {props.leaves} {props.leaves === 1 ? "folha" : "folhas"}
        </span>
      </div>

      {/* Nova categoria raiz */}
      <div className="mb-4 flex items-center gap-2">
        <InputGlass
          placeholder="Nova categoria raiz…"
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") {
              e.preventDefault();
              submitRoot();
            }
          }}
        />
        <ButtonGlass
          type="button"
          variant="primary"
          onClick={submitRoot}
          disabled={!newRootName.trim()}
          className="shrink-0"
        >
          <IconPlus size={16} /> Adicionar
        </ButtonGlass>
      </div>

      {props.loading ? (
        <div className="py-10 text-center font-body text-[13px] text-[var(--text-muted)]">
          Carregando…
        </div>
      ) : props.tree.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] py-10 text-center font-body text-[13px] text-[var(--text-muted)]">
          Nenhuma tabulação ainda. Crie a primeira categoria acima.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {props.tree.map((n) => (
            <TreeCard
              key={n.id}
              node={n}
              depth={0}
              onCreate={props.onCreate}
              onRename={props.onRename}
              onToggleActive={props.onToggleActive}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ─── Card de nó (estilo v0 + DS v2) ──────────────────────────────── */

function TreeCard(props: {
  node: TabulationNode;
  depth: number;
  onCreate: (parentId: string | null, name: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { node, depth } = props;
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [adding, setAdding] = useState(false);
  const [childName, setChildName] = useState("");

  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;

  const commitRename = () => {
    const t = draft.trim();
    if (t && t !== node.name) props.onRename(node.id, t);
    setEditing(false);
  };
  const commitAdd = () => {
    const t = childName.trim();
    if (t) {
      props.onCreate(node.id, t);
      setOpen(true);
    }
    setChildName("");
    setAdding(false);
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border bg-[var(--glass-bg-overlay)] transition-colors",
        node.active ? "border-[var(--glass-border)]" : "border-dashed border-[var(--glass-border)] opacity-75",
      )}
    >
      <div className="group flex items-center gap-3 p-2.5">
        {/* Ícone tile */}
        <button
          type="button"
          onClick={() => hasChildren && setOpen((v) => !v)}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-colors",
            isLeaf
              ? "bg-[var(--glass-bg-base)] text-[var(--text-secondary)]"
              : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/15",
          )}
          aria-label={hasChildren ? (open ? "Recolher" : "Expandir") : undefined}
        >
          {isLeaf ? (
            <IconCircleDot size={19} />
          ) : open ? (
            <IconFolderOpen size={19} />
          ) : (
            <IconFolder size={19} />
          )}
        </button>

        {/* Nome + subtítulo OU edição */}
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <InputGlass
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                }
                if (e.key === "Escape") {
                  setDraft(node.name);
                  setEditing(false);
                }
              }}
            />
            <button
              type="button"
              onClick={commitRename}
              aria-label="Salvar"
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-base)]"
            >
              <IconCheck size={17} />
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(node.name);
                setEditing(false);
              }}
              aria-label="Cancelar"
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-base)]"
            >
              <IconX size={17} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => hasChildren && setOpen((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "truncate font-display text-[13.5px] font-semibold",
                  node.active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] line-through",
                )}
              >
                {node.name}
              </span>
              <span className="font-body text-[11px] text-[var(--text-muted)]">
                {isLeaf
                  ? "Selecionável pelo agente"
                  : `${node.children.length} ${node.children.length === 1 ? "subitem" : "subitens"}`}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider",
                isLeaf
                  ? "bg-[var(--glass-bg-base)] text-[var(--text-secondary)]"
                  : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
              )}
            >
              {isLeaf ? "Folha" : "Categoria"}
            </span>
            {hasChildren && (
              <IconChevronDown
                size={16}
                className={cn(
                  "shrink-0 text-[var(--text-muted)] transition-transform",
                  open && "rotate-180",
                )}
              />
            )}
          </button>
        )}

        {/* Ações */}
        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <SwitchGlass
              checked={node.active}
              onChange={(v) => props.onToggleActive(node.id, v)}
              size="sm"
              aria-label={node.active ? "Desativar" : "Ativar"}
            />
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setAdding(true)}
                aria-label="Adicionar subcategoria"
                className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-base)] hover:text-[var(--brand-primary)]"
              >
                <IconPlus size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(node.name);
                  setEditing(true);
                }}
                aria-label="Renomear"
                className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-base)] hover:text-[var(--text-primary)]"
              >
                <IconEdit size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remover "${node.name}" e todos os subitens?`)) {
                    props.onDelete(node.id);
                  }
                }}
                aria-label="Excluir"
                className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
              >
                <IconTrash size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form de adicionar filho */}
      {adding && (
        <div className="flex items-center gap-2 px-2.5 pb-2.5 pl-[62px]">
          <InputGlass
            autoFocus
            value={childName}
            placeholder="Nome da subcategoria…"
            onChange={(e) => setChildName(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                commitAdd();
              }
              if (e.key === "Escape") {
                setChildName("");
                setAdding(false);
              }
            }}
          />
          <ButtonGlass type="button" variant="primary" onClick={commitAdd} className="shrink-0">
            <IconCheck size={16} /> Adicionar
          </ButtonGlass>
          <button
            type="button"
            onClick={() => {
              setChildName("");
              setAdding(false);
            }}
            aria-label="Cancelar"
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-base)]"
          >
            <IconX size={17} />
          </button>
        </div>
      )}

      {/* Filhos */}
      {hasChildren && open && (
        <div className="ml-5 space-y-2.5 border-l border-[var(--glass-border)] py-1 pb-2.5 pl-4 pr-2.5">
          {node.children.map((child) => (
            <TreeCard
              key={child.id}
              node={child}
              depth={depth + 1}
              onCreate={props.onCreate}
              onRename={props.onRename}
              onToggleActive={props.onToggleActive}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
