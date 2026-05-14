"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConfirm } from "@/hooks/use-confirm";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  GitBranch,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { FunnelAutomations } from "@/components/pipeline/funnel-automations";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────

type StageRow = {
  id: string;
  name: string;
  position: number;
  color: string;
  winProbability: number;
  rottingDays: number;
  dealCount: number;
  isIncoming?: boolean;
};

type PipelineRow = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: StageRow[];
};

type AutomationRow = {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  active: boolean;
  stepCount: number;
};

// ── Constants ─────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  stage_changed: "Card movido para estágio",
  agent_changed: "Agente alterado",
  message_received: "Mensagem recebida",
  message_sent: "Mensagem enviada",
  deal_created: "Negócio criado",
  deal_won: "Negócio ganho",
  deal_lost: "Negócio perdido",
  tag_added: "Tag adicionada",
  lifecycle_changed: "Fase do ciclo alterada",
  lead_score_reached: "Score atingido",
  contact_created: "Contato criado",
  conversation_created: "Conversa criada",
};

const PIPELINE_TRIGGERS = [
  "stage_changed",
  "agent_changed",
  "message_received",
  "message_sent",
  "deal_created",
  "deal_won",
  "deal_lost",
] as const;

const ACTION_TYPES = [
  { value: "move_stage", label: "Mover para estágio" },
  { value: "send_message", label: "Enviar mensagem" },
  { value: "assign_owner", label: "Atribuir agente" },
  { value: "add_tag", label: "Adicionar tag" },
  { value: "change_lifecycle", label: "Alterar ciclo de vida do contato" },
  { value: "send_email", label: "Enviar e-mail" },
  { value: "create_activity", label: "Criar atividade" },
  { value: "webhook", label: "Webhook" },
];

const STAGE_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6b7280",
];

// ── Fetchers ──────────────────────────────────

async function fetchPipelines(): Promise<PipelineRow[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  if (!res.ok) throw new Error("Erro ao carregar pipelines");
  const data = await res.json();
  return Array.isArray(data) ? data : data.pipelines ?? data.items ?? [];
}

async function fetchAutomations(): Promise<AutomationRow[]> {
  const res = await fetch(apiUrl("/api/automations?perPage=100"));
  if (!res.ok) throw new Error("Erro ao carregar automações");
  const data = await res.json();
  return data.items ?? [];
}

// ── Main Page ─────────────────────────────────

export default function PipelineSettingsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [selectedPipelineId, setSelectedPipelineId] = React.useState("");
  const [createPipelineOpen, setCreatePipelineOpen] = React.useState(false);
  const [newPipelineName, setNewPipelineName] = React.useState("");
  const [editingPipelineName, setEditingPipelineName] = React.useState(false);
  const [pipelineNameDraft, setPipelineNameDraft] = React.useState("");
  const [stageFormOpen, setStageFormOpen] = React.useState(false);
  const [editingStage, setEditingStage] = React.useState<StageRow | null>(null);
  const [ruleFormOpen, setRuleFormOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AutomationRow | null>(null);
  const [activeTab, setActiveTab] = React.useState<"stages" | "funnel">("stages");

  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: fetchPipelines,
  });

  const { data: allAutomations = [] } = useQuery({
    queryKey: ["automations-all"],
    queryFn: fetchAutomations,
  });

  React.useEffect(() => {
    if (!selectedPipelineId && pipelines.length > 0) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      if (def) setSelectedPipelineId(def.id);
    }
  }, [pipelines, selectedPipelineId]);

  const pipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = pipeline?.stages ?? [];

  const pipelineAutomations = allAutomations.filter((a) => {
    const cfg = a.triggerConfig;
    return cfg && typeof cfg === "object" && "pipelineId" in cfg && cfg.pipelineId === selectedPipelineId;
  });

  // Pipeline CRUD mutations
  const createPipelineMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(apiUrl("/api/pipelines"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error("Erro ao criar pipeline");
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setSelectedPipelineId(data.id);
      setCreatePipelineOpen(false);
      setNewPipelineName("");
    },
  });

  const updatePipelineMutation = useMutation({
    mutationFn: async (data: { name?: string; isDefault?: boolean }) => {
      const res = await fetch(apiUrl(`/api/pipelines/${selectedPipelineId}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erro ao atualizar pipeline");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setEditingPipelineName(false);
    },
  });

  const deletePipelineMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/pipelines/${selectedPipelineId}`), { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? "Erro ao excluir"); }
    },
    onSuccess: () => {
      setSelectedPipelineId("");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });

  // Stage mutations
  const createStageMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; winProbability: number; rottingDays: number }) => {
      const res = await fetch(apiUrl(`/api/pipelines/${selectedPipelineId}/stages`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erro ao criar estágio");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pipelines"] }); setStageFormOpen(false); },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string; winProbability?: number; rottingDays?: number }) => {
      const res = await fetch(apiUrl(`/api/pipelines/${selectedPipelineId}/stages/${id}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Erro ao atualizar estágio");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pipelines"] }); setStageFormOpen(false); setEditingStage(null); },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const res = await fetch(apiUrl(`/api/pipelines/${selectedPipelineId}/stages/${stageId}`), { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message ?? "Erro ao excluir"); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pipelines"] }); },
  });

  const reorderMutation = useMutation({
    mutationFn: async (stageIds: string[]) => {
      const res = await fetch(apiUrl(`/api/pipelines/${selectedPipelineId}/stages`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stageIds }) });
      if (!res.ok) throw new Error("Erro ao reordenar");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pipelines"] }); },
  });

  const moveStage = (idx: number, dir: -1 | 1) => {
    const ids = stages.map((s) => s.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    reorderMutation.mutate(ids);
  };

  // Automation mutations
  const toggleAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/automations/${id}/toggle`), { method: "POST" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations-all"] }); },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/automations/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations-all"] }); },
  });

  return (
    <div className="w-full space-y-6">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Configurações
      </Link>

      <PageHeader
        title="Configuração do Pipeline"
        description="Gerencie estágios, propriedades e regras de automação."
        icon={<GitBranch />}
        actions={
          <Button onClick={() => setCreatePipelineOpen(true)} variant="outline" className="gap-2">
            <Plus className="size-4" /> Novo Pipeline
          </Button>
        }
      />

      {/* Pipeline selector */}
      {pipelinesLoading ? (
        <Skeleton className="h-10 w-64" />
      ) : (
        <div className="flex items-center gap-3">
          <SelectNative value={selectedPipelineId} onChange={(e) => setSelectedPipelineId(e.target.value)} className="h-10 w-64 font-medium">
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isDefault ? " (padrão)" : ""}</option>)}
          </SelectNative>

          {pipeline && !editingPipelineName && (
            <div className="flex items-center gap-1.5">
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => { setPipelineNameDraft(pipeline.name); setEditingPipelineName(true); }}>
                <Pencil className="size-3.5" />
              </Button>
              {!pipeline.isDefault && (
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => updatePipelineMutation.mutate({ isDefault: true })}>
                  Definir como padrão
                </Button>
              )}
              <Button
                type="button" variant="ghost" size="icon" className="size-8 text-destructive/70 hover:text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Excluir pipeline",
                    description: "Excluir este pipeline e todos os seus estágios? Esta ação não pode ser desfeita.",
                    confirmLabel: "Excluir",
                    variant: "destructive",
                  });
                  if (ok) deletePipelineMutation.mutate();
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}

          {editingPipelineName && (
            <div className="flex items-center gap-1.5">
              <Input value={pipelineNameDraft} onChange={(e) => setPipelineNameDraft(e.target.value)} className="h-8 w-48 text-sm" />
              <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600" onClick={() => updatePipelineMutation.mutate({ name: pipelineNameDraft.trim() })} disabled={!pipelineNameDraft.trim()}>
                <Check className="size-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setEditingPipelineName(false)}>
                <X className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {pipeline && (
        <>
          {/* ── Tab bar ── */}
          <div className="flex items-center gap-0 border-b border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("stages")}
              className={cn(
                "relative inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition",
                activeTab === "stages"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <GripVertical className="size-3.5" />
              Estágios & Regras
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("funnel")}
              className={cn(
                "relative inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition",
                activeTab === "funnel"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Zap className="size-3.5" />
              Funil de Automações
            </button>
          </div>

          {activeTab === "stages" && (
            <>
              {/* ── Stages ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Estágios</h2>
                  <Button onClick={() => { setEditingStage(null); setStageFormOpen(true); }} size="sm" className="gap-1.5">
                    <Plus className="size-3.5" /> Adicionar Estágio
                  </Button>
                </div>

                {stages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 py-12 text-center">
                    <p className="text-sm text-muted-foreground">Nenhum estágio configurado.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {stages.filter((s) => !s.isIncoming).map((s, idx, filtered) => (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2.5 shadow-sm transition-colors hover:bg-muted/20">
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => moveStage(idx, -1)} disabled={idx === 0 || reorderMutation.isPending} className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-30">
                            <ChevronUp className="size-3" />
                          </button>
                          <button type="button" onClick={() => moveStage(idx, 1)} disabled={idx === filtered.length - 1 || reorderMutation.isPending} className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-30">
                            <ChevronDown className="size-3" />
                          </button>
                        </div>

                        <span className="size-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{s.name}</span>
                            <span className="text-[10px] text-muted-foreground">Pos {s.position}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            <span>Prob: {s.winProbability}%</span>
                            <span>Apodrecimento: {s.rottingDays}d</span>
                            <span>{s.dealCount} negócio{s.dealCount !== 1 ? "s" : ""}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => { setEditingStage(s); setStageFormOpen(true); }}>
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            type="button" variant="ghost" size="icon" className="size-7 text-destructive/70 hover:text-destructive"
                            disabled={s.dealCount > 0 || deleteStageMutation.isPending}
                            title={s.dealCount > 0 ? "Mova os negócios antes de excluir" : "Excluir estágio"}
                            onClick={() => deleteStageMutation.mutate(s.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Automation Rules (list view) ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Regras de Automação</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Automatize ações com base em eventos do pipeline.</p>
                  </div>
                  <Button onClick={() => { setEditingRule(null); setRuleFormOpen(true); }} size="sm" className="gap-1.5">
                    <Plus className="size-3.5" /> Nova Regra
                  </Button>
                </div>

                {pipelineAutomations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 py-10 text-center">
                    <Zap className="mx-auto mb-2 size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Nenhuma regra configurada para este pipeline.</p>
                    <Button onClick={() => { setEditingRule(null); setRuleFormOpen(true); }} variant="outline" className="mt-3 gap-2" size="sm">
                      <Plus className="size-3.5" /> Criar primeira regra
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {pipelineAutomations.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border/80 bg-card px-4 py-3 shadow-sm">
                        <div className={cn("size-2.5 rounded-full shrink-0", a.active ? "bg-emerald-500" : "bg-gray-400")} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{a.name}</span>
                            <Badge variant="outline" className="text-[10px]">{TRIGGER_LABELS[a.triggerType] ?? a.triggerType}</Badge>
                            {a.triggerType === "stage_changed" && !!a.triggerConfig.toStageId && (
                              <Badge variant="secondary" className="text-[10px]">
                                → {stages.find((s) => s.id === (a.triggerConfig.toStageId as string))?.name ?? "?"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{a.stepCount} ação(ões)</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => toggleAutomationMutation.mutate(a.id)} title={a.active ? "Desativar" : "Ativar"}>
                            <Power className={cn("size-3.5", a.active ? "text-emerald-500" : "text-muted-foreground")} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => { setEditingRule(a); setRuleFormOpen(true); }}>
                            <Pencil className="size-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive/70 hover:text-destructive" onClick={() => deleteAutomationMutation.mutate(a.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "funnel" && (
            <FunnelAutomations
              pipelineId={selectedPipelineId}
              stages={stages}
              automations={pipelineAutomations}
            />
          )}
        </>
      )}

      {/* ── Create Pipeline Dialog ── */}
      <Dialog open={createPipelineOpen} onOpenChange={setCreatePipelineOpen}>
        <DialogContent size="md">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Novo Pipeline</DialogTitle>
            <DialogDescription>Será criado com estágios padrão que você pode personalizar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (newPipelineName.trim()) createPipelineMutation.mutate(newPipelineName.trim()); }} className="space-y-4">
            <div className="grid gap-2">
              <Label>Nome do Pipeline</Label>
              <Input value={newPipelineName} onChange={(e) => setNewPipelineName(e.target.value)} placeholder="Ex: Vendas B2B" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreatePipelineOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={!newPipelineName.trim() || createPipelineMutation.isPending} className="gap-2">
                {createPipelineMutation.isPending && <Loader2 className="size-4 animate-spin" />} Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Stage Form Dialog ── */}
      <Dialog open={stageFormOpen} onOpenChange={(v) => { if (!v) { setStageFormOpen(false); setEditingStage(null); } else setStageFormOpen(true); }}>
        <DialogContent size="md">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>{editingStage ? "Editar Estágio" : "Novo Estágio"}</DialogTitle>
          </DialogHeader>
          <StageForm
            initial={editingStage}
            onSubmit={(data) => {
              if (editingStage) {
                updateStageMutation.mutate({ id: editingStage.id, ...data });
              } else {
                createStageMutation.mutate(data);
              }
            }}
            isPending={createStageMutation.isPending || updateStageMutation.isPending}
            onCancel={() => { setStageFormOpen(false); setEditingStage(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Automation Rule Form Dialog ── */}
      <Dialog open={ruleFormOpen} onOpenChange={(v) => { if (!v) { setRuleFormOpen(false); setEditingRule(null); } else setRuleFormOpen(true); }}>
        <DialogContent size="lg">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Automação"}</DialogTitle>
          </DialogHeader>
          <AutomationRuleForm
            initial={editingRule}
            pipelineId={selectedPipelineId}
            stages={stages}
            onSubmit={() => {
              queryClient.invalidateQueries({ queryKey: ["automations-all"] });
              setRuleFormOpen(false);
              setEditingRule(null);
            }}
            onCancel={() => { setRuleFormOpen(false); setEditingRule(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stage Form ────────────────────────────────

function StageForm({
  initial, onSubmit, isPending, onCancel,
}: {
  initial: StageRow | null;
  onSubmit: (data: { name: string; color: string; winProbability: number; rottingDays: number }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [color, setColor] = React.useState(initial?.color ?? "#6366f1");
  const [prob, setProb] = React.useState(String(initial?.winProbability ?? 0));
  const [rotting, setRotting] = React.useState(String(initial?.rottingDays ?? 30));

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; onSubmit({ name: name.trim(), color, winProbability: Math.max(0, Math.min(100, Number(prob) || 0)), rottingDays: Math.max(1, Number(rotting) || 30) }); }} className="space-y-4">
      <div className="grid gap-2">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Qualificação" required />
      </div>
      <div className="grid gap-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {STAGE_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={cn("size-7 rounded-full border-2 transition-all", color === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Probabilidade de ganho (%)</Label>
          <Input type="number" min={0} max={100} value={prob} onChange={(e) => setProb(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Dias para apodrecer</Label>
          <Input type="number" min={1} value={rotting} onChange={(e) => setRotting(e.target.value)} />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || !name.trim()} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Automation Rule Form ──────────────────────

type ActionDraft = { type: string; value: string };

const ACTION_PLACEHOLDERS: Record<string, string | undefined> = {
  move_stage: undefined,
  send_message: "Texto da mensagem a enviar…",
  assign_owner: "ID ou e-mail do agente…",
  add_tag: "Nome da tag…",
  change_lifecycle: undefined,
  send_email: "assunto | corpo do e-mail…",
  create_activity: "Título da atividade…",
  webhook: "https://seu-endpoint.com/webhook",
};

function AutomationRuleForm({
  initial, pipelineId, stages, onSubmit, onCancel,
}: {
  initial: AutomationRow | null;
  pipelineId: string;
  stages: StageRow[];
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const initCfg = (initial?.triggerConfig ?? {}) as Record<string, unknown>;
  const [name, setName] = React.useState(initial?.name ?? "");
  const [trigger, setTrigger] = React.useState(initial?.triggerType ?? "stage_changed");
  const [toStageId, setToStageId] = React.useState((initCfg.toStageId as string) ?? "");
  const [fromStageId, setFromStageId] = React.useState((initCfg.fromStageId as string) ?? "");
  const [channel, setChannel] = React.useState((initCfg.channel as string) ?? "");
  const [actions, setActions] = React.useState<ActionDraft[]>([]);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (initial) {
      setName(initial.name);
      setTrigger(initial.triggerType);
      const cfg = initial.triggerConfig;
      setToStageId((cfg.toStageId as string) ?? "");
      setFromStageId((cfg.fromStageId as string) ?? "");
      setChannel((cfg.channel as string) ?? "");
    }
  }, [initial]);

  const addAction = () => {
    setActions((p) => [...p, { type: "send_message", value: "" }]);
  };

  const updateAction = (idx: number, patch: Partial<ActionDraft>) => {
    setActions((p) => p.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const removeAction = (idx: number) => {
    setActions((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validActions = actions.filter((a) => a.value.trim());
    if (validActions.length === 0) {
      setError("Adicione ao menos uma ação com valor preenchido.");
      return;
    }

    setIsPending(true);
    setError("");

    const triggerConfig: Record<string, unknown> = { pipelineId };
    if (trigger === "stage_changed") {
      if (toStageId) triggerConfig.toStageId = toStageId;
      if (fromStageId) triggerConfig.fromStageId = fromStageId;
    }
    if ((trigger === "message_received" || trigger === "message_sent") && channel) {
      triggerConfig.channel = channel;
    }

    const steps = validActions.map((a) => {
      const v = a.value.trim();
      switch (a.type) {
        case "move_stage":
          return { type: "move_stage", config: { stageId: v } };
        case "change_lifecycle":
          return { type: "update_field", config: { entity: "contact", field: "lifecycleStage", value: v } };
        case "send_message":
          return { type: "send_whatsapp_message", config: { content: v } };
        case "assign_owner":
          return { type: "assign_owner", config: { userId: v } };
        case "add_tag":
          return { type: "add_tag", config: { tagName: v } };
        case "send_email": {
          const [subject, ...rest] = v.split("|").map((s) => s.trim());
          return { type: "send_email", config: { subject: subject || v, body: rest.join("|") } };
        }
        case "create_activity":
          return { type: "create_activity", config: { type: "TASK", title: v } };
        case "webhook":
          return { type: "webhook", config: { url: v, method: "POST" } };
        default:
          return { type: a.type, config: { value: v } };
      }
    });

    try {
      const url = initial ? `/api/automations/${initial.id}` : "/api/automations";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          triggerType: trigger,
          triggerConfig,
          active: initial?.active ?? true,
          steps,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? "Erro ao salvar");
      }
      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar regra.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-1.5">
        <Label>Nome da regra</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Notificar ao mover para Proposta" required />
      </div>

      <div className="grid gap-1.5">
        <Label>Gatilho (quando disparar)</Label>
        <SelectNative value={trigger} onChange={(e) => setTrigger(e.target.value)}>
          {PIPELINE_TRIGGERS.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}
        </SelectNative>
      </div>

      {trigger === "stage_changed" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label className="text-xs">De (opcional)</Label>
            <SelectNative value={fromStageId} onChange={(e) => setFromStageId(e.target.value)} className="h-8 text-sm">
              <option value="">Qualquer estágio</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectNative>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Para (opcional)</Label>
            <SelectNative value={toStageId} onChange={(e) => setToStageId(e.target.value)} className="h-8 text-sm">
              <option value="">Qualquer estágio</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectNative>
          </div>
        </div>
      )}

      {(trigger === "message_received" || trigger === "message_sent") && (
        <div className="grid gap-1">
          <Label className="text-xs">Canal (opcional)</Label>
          <SelectNative value={channel} onChange={(e) => setChannel(e.target.value)} className="h-8 text-sm">
            <option value="">Todos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="email">E-mail</option>
          </SelectNative>
        </div>
      )}

      <Separator />

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ações ({actions.length})</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addAction}>
            <Plus className="size-3" /> Adicionar ação
          </Button>
        </div>

        {actions.length === 0 ? (
          <button
            type="button"
            onClick={addAction}
            className="w-full rounded-lg border-2 border-dashed border-border/80 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-indigo-500/40 hover:text-indigo-600"
          >
            <Plus className="mx-auto mb-1 size-5 opacity-50" />
            Clique para adicionar uma ação
          </button>
        ) : (
          <div className="space-y-2">
            {actions.map((action, idx) => (
              <div key={idx} className="rounded-lg border border-border/80 bg-muted/10 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{idx + 1}</span>
                  <SelectNative
                    value={action.type}
                    onChange={(e) => updateAction(idx, { type: e.target.value })}
                    className="h-8 flex-1 text-sm font-medium"
                  >
                    {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </SelectNative>
                  <button
                    type="button"
                    onClick={() => removeAction(idx)}
                    className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {action.type === "move_stage" ? (
                  <SelectNative
                    value={action.value}
                    onChange={(e) => updateAction(idx, { value: e.target.value })}
                    className="h-8 text-sm"
                  >
                    <option value="">Selecione o estágio…</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </SelectNative>
                ) : action.type === "change_lifecycle" ? (
                  <SelectNative
                    value={action.value}
                    onChange={(e) => updateAction(idx, { value: e.target.value })}
                    className="h-8 text-sm"
                  >
                    <option value="">Selecione o ciclo…</option>
                    <option value="SUBSCRIBER">Assinante</option>
                    <option value="LEAD">Lead</option>
                    <option value="MQL">MQL</option>
                    <option value="SQL">SQL</option>
                    <option value="OPPORTUNITY">Oportunidade</option>
                    <option value="CUSTOMER">Cliente</option>
                    <option value="EVANGELIST">Evangelista</option>
                  </SelectNative>
                ) : action.type === "send_message" ? (
                  <textarea
                    value={action.value}
                    onChange={(e) => updateAction(idx, { value: e.target.value })}
                    placeholder={ACTION_PLACEHOLDERS[action.type]}
                    rows={2}
                    className="w-full resize-none rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-indigo-500/40"
                  />
                ) : (
                  <Input
                    value={action.value}
                    onChange={(e) => updateAction(idx, { value: e.target.value })}
                    placeholder={ACTION_PLACEHOLDERS[action.type] ?? "Valor da configuração…"}
                    className="h-8 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || !name.trim() || actions.length === 0} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Salvar Regra" : "Criar Regra"}
        </Button>
      </DialogFooter>
    </form>
  );
}
