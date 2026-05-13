"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";import {
  ArrowLeft,
  GitBranch,
  Hand,
  Loader2,
  Plus,
  Power,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type DistributionMode = "ROUND_ROBIN" | "RULE_BASED" | "MANUAL";

type DistributionRuleRow = {
  id: string;
  name: string;
  mode: DistributionMode;
  pipelineId: string | null;
  isActive: boolean;
  pipeline: { id: string; name: string } | null;
  members: { user: { id: string; name: string; email: string } }[];
};

type UserRow = { id: string; name: string; email: string };
type PipelineRow = { id: string; name: string };

const MODE_PT: Record<DistributionMode, string> = {
  ROUND_ROBIN: "Round-robin",
  RULE_BASED: "Baseado em regras",
  MANUAL: "Manual",
};

const MODE_ICON: Record<DistributionMode, React.ComponentType<{ className?: string }>> = {
  ROUND_ROBIN: Shuffle,
  RULE_BASED: GitBranch,
  MANUAL: Hand,
};

async function parseJsonError(res: Response, fallback: string): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  throw new Error(typeof data.message === "string" ? data.message : fallback);
}

async function fetchRules(): Promise<DistributionRuleRow[]> {
  const res = await fetch(apiUrl("/api/distribution"));
  if (!res.ok) await parseJsonError(res, "Erro ao carregar regras.");
  return res.json();
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) await parseJsonError(res, "Erro ao carregar usuários.");
  return res.json();
}

async function fetchPipelines(): Promise<PipelineRow[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  if (!res.ok) await parseJsonError(res, "Erro ao carregar pipelines.");
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data.map((p) => {
    const r = p as { id?: string; name?: string };
    return { id: String(r.id ?? ""), name: String(r.name ?? "") };
  });
}

export default function DistributionSettingsPage() {
  const qc = useQueryClient();
  const invalidateRules = () => void qc.invalidateQueries({ queryKey: ["distribution-rules"] });
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newMode, setNewMode] = React.useState<DistributionMode>("ROUND_ROBIN");
  const [newPipelineId, setNewPipelineId] = React.useState("");
  const [selectedMembers, setSelectedMembers] = React.useState<Set<string>>(new Set());

  const { data: rules = [], isLoading: rulesLoading, isError: rulesError, error: rulesErr } =
    useQuery({ queryKey: ["distribution-rules"], queryFn: fetchRules });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
  });
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines-list"],
    queryFn: fetchPipelines,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/distribution"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          mode: newMode,
          pipelineId: newPipelineId || null,
          memberUserIds: [...selectedMembers],
        }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao criar regra.");
      return res.json();
    },
    onSuccess: () => {
      invalidateRules();
      setCreateOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(apiUrl(`/api/distribution/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao atualizar regra.");
      return res.json();
    },
    onSuccess: invalidateRules,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/distribution/${id}`), { method: "DELETE" });
      if (!res.ok) await parseJsonError(res, "Erro ao excluir regra.");
    },
    onSuccess: invalidateRules,
  });

  function openCreate() {
    setNewName("");
    setNewMode("ROUND_ROBIN");
    setNewPipelineId("");
    setSelectedMembers(new Set());
    setCreateOpen(true);
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const dialogLoading = usersLoading || pipelinesLoading;
  const canSubmitCreate = newName.trim().length > 0 && !createMutation.isPending;

  return (
    <div className="w-full space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <PageHeader
        title="Distribuição de Leads"
        description="Defina como novos leads são atribuídos à equipe por pipeline ou de forma global."
        icon={<Shuffle />}
        actions={
          <Button type="button" className="gap-2 shadow-sm" onClick={openCreate}>
            <Plus className="size-4" />
            Nova regra
          </Button>
        }
      />

      {rulesError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {rulesErr instanceof Error ? rulesErr.message : "Erro ao carregar regras."}
        </p>
      ) : null}

      {rulesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 py-16 text-center">
          <Users className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma regra de distribuição.</p>
          <Button type="button" variant="outline" className="mt-4 gap-2" onClick={openCreate}>
            <Plus className="size-4" />
            Criar primeira regra
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => {
            const ModeIc = MODE_ICON[rule.mode];
            return (
            <div
              key={rule.id}
              className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-start"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <ModeIc className="size-4 shrink-0 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{rule.name}</span>
                    <Badge variant={rule.isActive ? "secondary" : "outline"} className="text-xs">
                      {rule.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal">
                      {MODE_PT[rule.mode]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rule.pipeline
                      ? `Pipeline: ${rule.pipeline.name}`
                      : "Todos os pipelines"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    {rule.members.length === 0
                      ? "Nenhum membro"
                      : `${rule.members.length} membro(s): ${rule.members.map((m) => m.user.name).join(", ")}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1 self-end sm:self-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  title={rule.isActive ? "Desativar" : "Ativar"}
                  disabled={toggleMutation.isPending}
                  onClick={() =>
                    toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })
                  }
                >
                  <Power
                    className={
                      rule.isActive ? "size-4 text-emerald-600" : "size-4 text-muted-foreground"
                    }
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-destructive/70 hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(rule.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="md">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Nova regra de distribuição</DialogTitle>
            <DialogDescription>
              Escolha o modo, opcionalmente limite a um pipeline e selecione os membros da equipe.
            </DialogDescription>
          </DialogHeader>

          {dialogLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmitCreate) createMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="dist-name">Nome</Label>
                <Input
                  id="dist-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Equipe comercial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dist-mode">Modo</Label>
                <SelectNative
                  id="dist-mode"
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as DistributionMode)}
                >
                  <option value="ROUND_ROBIN">Round-robin</option>
                  <option value="RULE_BASED">Baseado em regras</option>
                  <option value="MANUAL">Manual</option>
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dist-pipeline">Pipeline (opcional)</Label>
                <SelectNative
                  id="dist-pipeline"
                  value={newPipelineId}
                  onChange={(e) => setNewPipelineId(e.target.value)}
                >
                  <option value="">Todos os pipelines</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label>Membros da equipe</Label>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border/80 p-3">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum usuário disponível.</p>
                  ) : (
                    users.map((u) => (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={selectedMembers.has(u.id)}
                          onChange={() => toggleMember(u.id)}
                        />
                        <span className="min-w-0">
                          <span className="font-medium">{u.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {u.email}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              {createMutation.isError ? (
                <p className="text-sm text-destructive">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "Erro ao criar."}
                </p>
              ) : null}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!canSubmitCreate} className="gap-2">
                  {createMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Criar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
