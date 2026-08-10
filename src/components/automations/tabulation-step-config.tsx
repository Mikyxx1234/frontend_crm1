"use client";

import { useQuery } from "@tanstack/react-query";

import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { Label } from "@/components/ui/label";
import { DeptGlyph } from "@/features/conversations-settings/department-icons";
import { apiUrl } from "@/lib/api";

type TabulationTreeNode = {
  id: string;
  name: string;
  children: TabulationTreeNode[];
};

/**
 * Só folhas viram opção: o backend recusa categoria (`resolveTabulationForStep`
 * exige nó sem filhos) e seguiria sem tabular em silêncio. O rótulo carrega o
 * caminho inteiro, igual ao que aparece no log de tabulações.
 */
function flattenTabulationLeaves(
  nodes: TabulationTreeNode[],
  prefix = "",
): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const path = prefix ? `${prefix} › ${n.name}` : n.name;
    if (n.children.length === 0) out.push({ id: n.id, label: path });
    else out.push(...flattenTabulationLeaves(n.children, path));
  }
  return out;
}

/**
 * Configuração do passo `tabulate_conversation`. Compartilhada entre a edição
 * inline do canvas e o painel lateral — os dois precisam do mesmo par
 * departamento → motivo.
 */
export function TabulationStepConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const departmentId = String(config.departmentId ?? "");
  const tabulationId = String(config.tabulationId ?? "");
  const closeConversation = config.closeConversation !== false;

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ["automation-departments"],
    staleTime: 120_000,
    queryFn: async (): Promise<Array<{ id: string; name: string; icon?: string }>> => {
      const res = await fetch(apiUrl("/api/settings/departments"), {
        credentials: "include",
      });
      if (!res.ok) return [];
      return (await res.json()) as Array<{ id: string; name: string; icon?: string }>;
    },
  });

  const { data: tree = [], isLoading: loadingTree } = useQuery({
    queryKey: ["automation-step-tabulations", departmentId],
    enabled: !!departmentId,
    staleTime: 30_000,
    queryFn: async (): Promise<TabulationTreeNode[]> => {
      const res = await fetch(
        apiUrl(`/api/tabulations?departmentId=${encodeURIComponent(departmentId)}`),
        { credentials: "include" },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { tree?: TabulationTreeNode[] };
      return data.tree ?? [];
    },
  });

  const leaves = flattenTabulationLeaves(tree);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Departamento da tabulação</Label>
        <DropdownGlass
          triggerClassName="w-full"
          placeholder={loadingDepts ? "Carregando…" : "Selecione o departamento…"}
          value={departmentId}
          options={[
            { value: "", label: "Selecione…" },
            ...departments.map((d) => ({
              value: d.id,
              label: d.name,
              icon: <DeptGlyph icon={d.icon} size={16} />,
            })),
          ]}
          onValueChange={(next) =>
            onChange({
              ...config,
              departmentId: next,
              tabulationId: "",
              tabulationLabel: "",
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>Tabulação</Label>
        <DropdownGlass
          triggerClassName="w-full"
          placeholder={
            !departmentId
              ? "Escolha o departamento primeiro"
              : loadingTree
                ? "Carregando…"
                : "Selecione o motivo…"
          }
          value={tabulationId}
          disabled={!departmentId}
          searchable
          options={[
            { value: "", label: "Selecione…" },
            ...leaves.map((l) => ({ value: l.id, label: l.label })),
          ]}
          onValueChange={(id) => {
            const found = leaves.find((l) => l.id === id);
            onChange({
              ...config,
              tabulationId: id,
              tabulationLabel: found?.label ?? "",
            });
          }}
        />
        {departmentId && leaves.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            A lista traz só os motivos finais, com o caminho completo. Os
            níveis acima servem para agrupar e não podem ser gravados.
          </p>
        )}
        {departmentId && !loadingTree && leaves.length === 0 && (
          <p className="text-[11px] text-[var(--color-danger)]">
            Este departamento ainda não tem árvore de tabulação em Configurações
            › Tabulações.
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--brand-primary)]"
          checked={closeConversation}
          onChange={(e) =>
            onChange({ ...config, closeConversation: e.target.checked })
          }
        />
        <span>Encerrar a conversa também</span>
      </label>

      <p className="text-[11px] text-muted-foreground">
        Mantenha marcado para tabular e encerrar na mesma operação. Se
        desmarcar, use um passo &ldquo;Encerrar conversa&rdquo; DEPOIS deste —
        encerrar primeiro limpa o departamento da conversa.
      </p>
    </div>
  );
}
