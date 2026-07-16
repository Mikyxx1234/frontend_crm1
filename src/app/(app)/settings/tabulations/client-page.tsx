"use client";

import { useMemo, useState } from "react";
import {
  IconChevronDown as ChevronDown,
  IconChevronRight as ChevronRight,
  IconEdit as Edit3,
  IconLayoutList as LayoutList,
  IconPlus as Plus,
  IconTrash as Trash2,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiUrl } from "@/lib/api";
import { useDepartments } from "@/features/conversations-settings/hooks/use-departments";

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

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Tabulações"
      description="Motivos hierárquicos escolhidos ao encerrar conversas"
      icon={<LayoutList size={22} />}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Departamento
          </label>
          <SelectNative
            value={effectiveDeptId ?? ""}
            onChange={(e) => setDepartmentId(e.target.value || null)}
            disabled={departments.length === 0}
          >
            {departments.length === 0 ? (
              <option value="">Nenhum departamento cadastrado</option>
            ) : null}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name}
              </option>
            ))}
          </SelectNative>

          {effectiveDeptId ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Exigir tabulação ao encerrar
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  Quando ativado, o agente escolhe uma folha antes de resolver a conversa deste departamento.
                </div>
              </div>
              <Switch
                checked={requireOnClose}
                onCheckedChange={(v) => toggleRequire.mutate(!!v)}
                disabled={toggleRequire.isPending}
              />
            </div>
          ) : null}
        </div>

        {effectiveDeptId ? (
          <TreeEditor
            tree={treeQuery.data?.tree ?? []}
            loading={treeQuery.isLoading}
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

function TreeEditor(props: {
  tree: TabulationNode[];
  loading: boolean;
  onCreate: (parentId: string | null, name: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [newRootName, setNewRootName] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Árvore de tabulações</div>
          <div className="text-xs text-[var(--text-muted)]">
            Categorias (nós internos) organizam; agentes selecionam uma folha.
          </div>
        </div>
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newRootName.trim();
          if (!name) return;
          props.onCreate(null, name);
          setNewRootName("");
        }}
      >
        <Input
          placeholder="Nova categoria raiz…"
          value={newRootName}
          onChange={(e) => setNewRootName(e.target.value)}
        />
        <Button type="submit" size="sm">
          <Plus size={16} className="mr-1" /> Adicionar
        </Button>
      </form>

      {props.loading ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">Carregando…</div>
      ) : props.tree.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--text-muted)]">
          Nenhuma tabulação ainda. Crie a primeira categoria acima.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {props.tree.map((n) => (
            <TreeItem
              key={n.id}
              node={n}
              depth={0}
              onCreate={props.onCreate}
              onRename={props.onRename}
              onToggleActive={props.onToggleActive}
              onDelete={props.onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeItem(props: {
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
  const [editName, setEditName] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;
  const indent = useMemo(() => ({ paddingLeft: `${depth * 18}px` }), [depth]);

  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--glass-bg)]"
        style={indent}
      >
        <button
          type="button"
          className="text-[var(--text-muted)]"
          onClick={() => setOpen((s) => !s)}
          aria-label={open ? "Recolher" : "Expandir"}
        >
          {hasChildren ? (
            open ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span className="inline-block h-4 w-4" />
          )}
        </button>

        {editing ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = editName.trim();
              if (!v) return;
              props.onRename(node.id, v);
              setEditing(false);
            }}
          >
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Button type="submit" size="sm">Salvar</Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setEditName(node.name);
              }}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <>
            <span
              className={`flex-1 truncate text-sm ${
                node.active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] line-through"
              }`}
            >
              {node.name}
              {isLeaf ? (
                <span className="ml-2 rounded-full bg-[var(--glass-bg)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  folha
                </span>
              ) : null}
            </span>
            <Switch
              checked={node.active}
              onCheckedChange={(v) => props.onToggleActive(node.id, !!v)}
              aria-label="Ativa"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAddingChild((s) => !s)}
              title="Adicionar filho"
            >
              <Plus size={14} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              title="Renomear"
            >
              <Edit3 size={14} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Remover "${node.name}" e todos os subitens?`)) {
                  props.onDelete(node.id);
                }
              }}
              title="Remover"
            >
              <Trash2 size={14} />
            </Button>
          </>
        )}
      </div>

      {addingChild ? (
        <form
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: `${(depth + 1) * 18}px` }}
          onSubmit={(e) => {
            e.preventDefault();
            const v = childName.trim();
            if (!v) return;
            props.onCreate(node.id, v);
            setChildName("");
            setAddingChild(false);
          }}
        >
          <Input
            autoFocus
            placeholder="Nome do subitem…"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
          />
          <Button type="submit" size="sm">Adicionar</Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setAddingChild(false);
              setChildName("");
            }}
          >
            Cancelar
          </Button>
        </form>
      ) : null}

      {open && hasChildren ? (
        <ul className="flex flex-col gap-1">
          {node.children.map((c) => (
            <TreeItem
              key={c.id}
              node={c}
              depth={depth + 1}
              onCreate={props.onCreate}
              onRename={props.onRename}
              onToggleActive={props.onToggleActive}
              onDelete={props.onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
