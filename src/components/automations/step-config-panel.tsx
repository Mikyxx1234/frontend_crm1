"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationStep } from "@/lib/automation-workflow";
import { stepTypeLabel, summarizeStepConfig } from "@/lib/automation-workflow";
import {
  newBranchId,
  normalizeConditionConfig,
  type ConditionBranch,
  type ConditionConfig,
  type ConditionOp,
  type ConditionRule,
} from "@/lib/automation-condition";

type PipelineStage = { id: string; name: string };
type Pipeline = { id: string; name: string; stages: PipelineStage[] };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: AutomationStep | null;
  onSave: (step: AutomationStep) => void;
  allSteps?: AutomationStep[];
};

const CONDITION_OPS = [
  { value: "equals", worker: "eq" as const, label: "Igual a" },
  { value: "not_equals", worker: "ne" as const, label: "Diferente de" },
  { value: "greater_than", worker: "gt" as const, label: "Maior que" },
  { value: "less_than", worker: "lt" as const, label: "Menor que" },
  { value: "contains", worker: "includes" as const, label: "Contém" },
] as const;

function workerToUiOp(op: string): string {
  const m = CONDITION_OPS.find((o) => o.worker === op);
  return m?.value ?? "equals";
}

function uiOpToWorker(ui: string): string {
  const m = CONDITION_OPS.find((o) => o.value === ui);
  return m?.worker ?? "eq";
}

function delayToUi(config: Record<string, unknown>): { duration: string; unit: string } {
  const ms = Number(config.ms ?? config.milliseconds ?? 0);
  if (ms >= 86_400_000 && ms % 86_400_000 === 0) {
    return { duration: String(ms / 86_400_000), unit: "days" };
  }
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) {
    return { duration: String(ms / 3_600_000), unit: "hours" };
  }
  if (ms >= 60_000 && ms % 60_000 === 0) {
    return { duration: String(ms / 60_000), unit: "minutes" };
  }
  return { duration: ms ? String(ms / 60_000) : "1", unit: "minutes" };
}

function uiDelayToMs(duration: number, unit: string): number {
  switch (unit) {
    case "hours":
      return Math.max(0, duration * 3_600_000);
    case "days":
      return Math.max(0, duration * 86_400_000);
    default:
      return Math.max(0, duration * 60_000);
  }
}

export function StepConfigPanel({ open, onOpenChange, step, onSave, allSteps = [] }: Props) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  const pipelinesQuery = useQuery({
    queryKey: ["pipelines-for-steps"],
    enabled: open && (step?.type === "move_stage" || step?.type === "create_deal"),
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [] as Pipeline[];
      return (await res.json()) as Pipeline[];
    },
  });

  useEffect(() => {
    if (!step) return;
    if (step.type === "delay") {
      const ui = delayToUi(step.config);
      setDraft({ duration: ui.duration, unit: ui.unit });
      return;
    }
    if (step.type === "condition") {
      const cfg = normalizeConditionConfig(step.config);
      // Garante ao menos 1 branch com 1 rule (pra UI poder editar logo).
      const branches: ConditionBranch[] =
        cfg.branches.length > 0
          ? cfg.branches.map((b) => ({
              ...b,
              rules: b.rules.length > 0 ? b.rules : [{ field: "", op: "eq", value: "" }],
            }))
          : [
              {
                id: newBranchId(),
                rules: [{ field: "", op: "eq", value: "" }],
              },
            ];
      setDraft({
        branches: branches as unknown as Record<string, unknown>[],
        elseStepId: cfg.elseStepId ?? "",
      });
      return;
    }
    setDraft({ ...step.config });
  }, [step]);

  const title = useMemo(() => {
    if (!step) return "Passo";
    return stepTypeLabel(step.type);
  }, [step]);

  if (!step) return null;

  const save = () => {
    const orig = (step.config ?? {}) as Record<string, unknown>;
    const preserved: Record<string, unknown> = {};
    if (orig.nextStepId !== undefined) preserved.nextStepId = orig.nextStepId;
    if (orig.__rfPos !== undefined) preserved.__rfPos = orig.__rfPos;
    if (orig.__hasExplicitEdges !== undefined) preserved.__hasExplicitEdges = orig.__hasExplicitEdges;

    let config = { ...draft };
    if (step.type === "condition") {
      // Valida antes de filtrar: queremos avisar o usuário se ele
      // deixou algo incompleto em vez de silenciosamente descartar.
      const rawBranches = Array.isArray(config.branches)
        ? (config.branches as ConditionBranch[])
        : [];
      const opsWithoutValue = new Set<ConditionOp>(["empty", "not_empty"]);
      for (let bIdx = 0; bIdx < rawBranches.length; bIdx++) {
        const b = rawBranches[bIdx];
        const rules = Array.isArray(b.rules) ? b.rules : [];
        const hasAny = rules.some((r) => r.field?.trim());
        if (!hasAny) {
          toast.error(
            `Condição ${bIdx + 1}: selecione ao menos um campo para avaliar.`,
          );
          return;
        }
        for (let rIdx = 0; rIdx < rules.length; rIdx++) {
          const r = rules[rIdx];
          const hasField = !!r.field?.trim();
          if (!hasField) continue; // regra vazia é descartada abaixo
          if (opsWithoutValue.has(r.op)) continue;
          const valStr =
            r.value === null || r.value === undefined ? "" : String(r.value);
          if (!valStr.trim()) {
            toast.error(
              `Condição ${bIdx + 1}, regra ${rIdx + 1}: informe um valor para comparar com "${r.field}".`,
            );
            return;
          }
        }
      }

      const branches: ConditionBranch[] = rawBranches
        .map((b) => ({
          id: b.id || newBranchId(),
          label: b.label?.trim() || undefined,
          rules: (b.rules ?? []).filter((r) => r.field?.trim()),
          nextStepId: b.nextStepId || undefined,
        }))
        .filter((b) => b.rules.length > 0);

      if (branches.length === 0) {
        toast.error("Adicione pelo menos uma condição válida antes de salvar.");
        return;
      }

      const elseStepId =
        typeof config.elseStepId === "string" && config.elseStepId
          ? config.elseStepId
          : undefined;
      const newCfg: ConditionConfig = { branches, elseStepId };
      // O step `condition` não usa mais `nextStepId` raiz — cada
      // branch tem seu próprio. Descartamos do preserved pra evitar
      // inconsistência com o novo modelo.
      delete preserved.nextStepId;
      config = newCfg as unknown as Record<string, unknown>;
    }
    if (step.type === "delay") {
      const duration = Number(config.duration ?? 1) || 1;
      const unit = String(config.unit ?? "minutes");
      config = { ms: uiDelayToMs(duration, unit) };
    }
    if (step.type === "question") {
      config = {
        message: config.message ?? "",
        buttons: Array.isArray(config.buttons) ? config.buttons : [],
        saveToVariable: config.saveToVariable ?? "",
        timeoutMs: Number(config.timeoutMs ?? 86_400_000),
        timeoutAction: config.timeoutAction ?? "continue",
        timeoutGotoStepId: config.timeoutGotoStepId ?? "",
        elseGotoStepId: config.elseGotoStepId ?? "",
      };
    }
    if (step.type === "send_whatsapp_interactive") {
      config = {
        body: config.body ?? "",
        header: config.header ?? "",
        footer: config.footer ?? "",
        buttons: Array.isArray(config.buttons) ? config.buttons : [],
        elseGotoStepId: config.elseGotoStepId ?? "",
        saveToVariable: config.saveToVariable ?? "",
      };
    }
    if (step.type === "set_variable") {
      config = {
        variableName: config.variableName ?? "",
        value: config.value ?? "",
      };
    }
    if (step.type === "goto") {
      config = { targetStepId: config.targetStepId ?? "" };
    }
    if (step.type === "wait_for_reply") {
      config = {
        timeoutMs: Number(config.timeoutMs ?? 60_000),
        receivedGotoStepId: config.receivedGotoStepId ?? "",
        timeoutGotoStepId: config.timeoutGotoStepId ?? "",
      };
    }
    if (step.type === "transfer_automation") {
      config = {
        targetAutomationId: config.targetAutomationId ?? "",
        targetAutomationName: config.targetAutomationName ?? "",
      };
    }
    if (step.type === "stop_automation") {
      config = {};
    }
    if (step.type === "finish") {
      config = { action: "stop" };
    }
    if (step.type === "create_deal") {
      config = {
        stageId: config.stageId ?? "",
        title: config.title ?? "Novo negócio",
        value: Number(config.value ?? 0),
      };
    }
    if (step.type === "finish_conversation") {
      config = {};
    }
    if (step.type === "business_hours") {
      config = {
        schedule: Array.isArray(config.schedule) ? config.schedule : [],
        timezone: config.timezone ?? "America/Sao_Paulo",
        elseStepId: config.elseStepId ?? "",
      };
    }
    if (step.type === "ask_ai_agent") {
      config = {
        agentId: String(config.agentId ?? ""),
        agentLabel: String(config.agentLabel ?? ""),
        promptTemplate: String(config.promptTemplate ?? ""),
        saveToVariable: String(config.saveToVariable ?? "ai_response"),
      };
    }
    if (step.type === "transfer_to_ai_agent") {
      const agentUserId = String(config.agentUserId ?? "");
      if (!agentUserId) {
        toast.error("Selecione o agente IA que vai assumir a conversa.");
        return;
      }
      config = {
        agentUserId,
        agentLabel: String(config.agentLabel ?? ""),
        target: String(config.target ?? "deal") === "contact" ? "contact" : "deal",
      };
    }
    if (step.type === "assign_owner") {
      const userId = String(config.userId ?? "");
      if (!userId) {
        toast.error("Selecione um responsável.");
        return;
      }
      config = {
        userId,
        userLabel: String(config.userLabel ?? ""),
        userType: String(config.userType ?? "HUMAN") === "AI" ? "AI" : "HUMAN",
        target: String(config.target ?? "deal") === "contact" ? "contact" : "deal",
      };
    }
    onSave({ ...step, config: { ...config, ...preserved } });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Ajuste os parâmetros deste passo do fluxo.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {step.type === "send_email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sc-to">Para (campo / e-mail)</Label>
                <Input
                  id="sc-to"
                  value={String(draft.to ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                  placeholder="contact.email ou endereço"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-sub">Assunto</Label>
                <Input
                  id="sc-sub"
                  value={String(draft.subject ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-body">Corpo</Label>
                <Textarea
                  id="sc-body"
                  rows={4}
                  value={String(draft.body ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                />
              </div>
            </>
          )}

          {step.type === "move_stage" && (() => {
            const pipelines = pipelinesQuery.data ?? [];
            const allStages = pipelines.flatMap((p) =>
              p.stages.map((s) => ({ ...s, pipelineName: p.name }))
            );
            return (
              <div className="space-y-2">
                <Label htmlFor="sc-stage">Mover para estágio</Label>
                {pipelinesQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando estágios…</p>
                ) : allStages.length === 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Nenhum estágio encontrado.</p>
                    <Input
                      id="sc-stage"
                      value={String(draft.stageId ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, stageId: e.target.value }))}
                      placeholder="ID do estágio"
                    />
                  </>
                ) : (
                  <SelectNative
                    id="sc-stage"
                    value={String(draft.stageId ?? "")}
                    onChange={(e) => {
                      const sid = e.target.value;
                      const stage = allStages.find((s) => s.id === sid);
                      setDraft((d) => ({
                        ...d,
                        stageId: sid,
                        stageName: stage ? stage.name : "",
                      }));
                    }}
                  >
                    <option value="">Selecione…</option>
                    {pipelines.map((p) => (
                      <optgroup key={p.id} label={p.name}>
                        {p.stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </SelectNative>
                )}
              </div>
            );
          })()}

          {step.type === "assign_owner" && (
            <AssignOwnerStepConfig draft={draft} setDraft={setDraft} />
          )}

          {step.type === "transfer_to_ai_agent" && (
            <TransferToAIAgentStepConfig draft={draft} setDraft={setDraft} />
          )}

          {(step.type === "add_tag" || step.type === "remove_tag") && (
            <div className="space-y-2">
              <Label htmlFor="sc-tag">Nome da tag</Label>
              <Input
                id="sc-tag"
                value={String(draft.tagName ?? "")}
                onChange={(e) => setDraft((d) => ({ ...d, tagName: e.target.value }))}
              />
            </div>
          )}

          {step.type === "update_field" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sc-field">Campo</Label>
                <Input
                  id="sc-field"
                  value={String(draft.field ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, field: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-val">Valor</Label>
                <Input
                  id="sc-val"
                  value={String(draft.value ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                />
              </div>
            </>
          )}

          {step.type === "create_activity" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sc-act-type">Tipo</Label>
                <SelectNative
                  id="sc-act-type"
                  value={String(draft.type ?? "TASK")}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                >
                  <option value="CALL">Ligação</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="MEETING">Reunião</option>
                  <option value="TASK">Tarefa</option>
                  <option value="NOTE">Nota</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="OTHER">Outro</option>
                </SelectNative>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-act-title">Título</Label>
                <Input
                  id="sc-act-title"
                  value={String(draft.title ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-act-desc">Descrição</Label>
                <Textarea
                  id="sc-act-desc"
                  rows={3}
                  value={String(draft.description ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </div>
            </>
          )}

          {step.type === "send_whatsapp_message" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sc-cw-msg">Conteúdo da mensagem</Label>
                <Textarea
                  id="sc-cw-msg"
                  rows={4}
                  value={String(draft.content ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                  placeholder="Ex.: Olá, tudo bem?"
                />
                <p className="text-[11px] text-muted-foreground">
                  O destinatário é resolvido automaticamente pelo telefone do contato.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-cw-fb">Template fallback (sessão expirada)</Label>
                <Input
                  id="sc-cw-fb"
                  value={String(draft.fallbackTemplateName ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, fallbackTemplateName: e.target.value }))}
                  placeholder="Nome do template (opcional)"
                />
                <p className="text-[11px] text-muted-foreground">
                  Se a sessão de 24h expirou, envia este template em vez da mensagem de texto.
                </p>
              </div>
            </>
          )}

          {step.type === "send_whatsapp_template" && (
            <TemplateStepConfig draft={draft} setDraft={setDraft} />
          )}

          {step.type === "send_whatsapp_media" && (
            <MediaStepConfig draft={draft} setDraft={setDraft} />
          )}

          {step.type === "send_whatsapp_interactive" && (() => {
            const buttons = Array.isArray(draft.buttons)
              ? (draft.buttons as { id?: string; title?: string; gotoStepId?: string }[])
              : [];
            const otherSteps = allSteps.filter((s) => s.id !== step.id);
            return (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sc-int-body">Texto da mensagem</Label>
                  <Textarea
                    id="sc-int-body"
                    rows={3}
                    value={String(draft.body ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    placeholder="Escolha uma das opções abaixo:"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-int-header">Cabeçalho (opcional)</Label>
                  <Input
                    id="sc-int-header"
                    value={String(draft.header ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, header: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Botões (máx. 3) — cada um leva a um passo diferente</Label>
                  <div className="flex flex-col gap-3">
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="rounded-md border border-border p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={btn.title ?? ""}
                            onChange={(e) => {
                              const next = [...buttons];
                              next[idx] = { ...next[idx], title: e.target.value, id: next[idx].id || `btn_${idx}` };
                              setDraft((d) => ({ ...d, buttons: next }));
                            }}
                            placeholder={`Texto do botão ${idx + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => {
                              const next = buttons.filter((_, i) => i !== idx);
                              setDraft((d) => ({ ...d, buttons: next }));
                            }}
                          >
                            <span className="text-lg text-destructive">×</span>
                          </Button>
                        </div>
                        <SelectNative
                          value={btn.gotoStepId ?? ""}
                          onChange={(e) => {
                            const next = [...buttons];
                            next[idx] = { ...next[idx], gotoStepId: e.target.value };
                            setDraft((d) => ({ ...d, buttons: next }));
                          }}
                        >
                          <option value="">→ Próximo passo (linear)</option>
                          {otherSteps.map((s) => (
                            <option key={s.id} value={s.id}>
                              → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                            </option>
                          ))}
                        </SelectNative>
                      </div>
                    ))}
                  </div>
                  {buttons.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDraft((d) => ({
                        ...d,
                        buttons: [...buttons, { id: `btn_${buttons.length}`, title: "", gotoStepId: "" }],
                      }))}
                    >
                      + Adicionar botão
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Se a resposta não bater com nenhum botão</Label>
                  <SelectNative
                    value={String(draft.elseGotoStepId ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, elseGotoStepId: e.target.value }))}
                  >
                    <option value="">→ Próximo passo (linear)</option>
                    {otherSteps.map((s) => (
                      <option key={s.id} value={s.id}>
                        → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-int-var">Salvar resposta em variável</Label>
                  <Input
                    id="sc-int-var"
                    value={String(draft.saveToVariable ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, saveToVariable: e.target.value }))}
                    placeholder="Ex.: opcao_escolhida"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-int-footer">Rodapé (opcional)</Label>
                  <Input
                    id="sc-int-footer"
                    value={String(draft.footer ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, footer: e.target.value }))}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O bot pausa e aguarda o cliente clicar em um botão. Cada botão pode levar a um passo diferente.
                </p>
              </>
            );
          })()}

          {step.type === "webhook" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sc-wh-url">URL</Label>
                <Input
                  id="sc-wh-url"
                  value={String(draft.url ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-wh-method">Método</Label>
                <SelectNative
                  id="sc-wh-method"
                  value={String(draft.method ?? "POST")}
                  onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </SelectNative>
              </div>
            </>
          )}

          {step.type === "delay" && (() => {
            const ui = delayToUi(step.config);
            const duration = String(draft.duration ?? ui.duration);
            const unit = String(draft.unit ?? ui.unit);
            return (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sc-delay-n">Duração</Label>
                  <Input
                    id="sc-delay-n"
                    type="number"
                    min={0}
                    value={duration}
                    onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-delay-u">Unidade</Label>
                  <SelectNative
                    id="sc-delay-u"
                    value={unit}
                    onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  >
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Dias</option>
                  </SelectNative>
                </div>
              </>
            );
          })()}

          {step.type === "condition" && (
            <ConditionStepConfig
              draft={draft}
              setDraft={setDraft}
              allSteps={allSteps}
              currentStepId={step.id}
            />
          )}

          {step.type === "update_lead_score" && (
            <p className="text-sm text-muted-foreground">Recalcular Lead Score do contato no contexto.</p>
          )}

          {step.type === "wait_for_reply" && (() => {
            const otherSteps = allSteps.filter((s) => s.id !== step.id);
            const timeoutMs = Number(draft.timeoutMs ?? 60000);
            const hours = Math.floor(timeoutMs / 3_600_000);
            const minutes = Math.floor((timeoutMs % 3_600_000) / 60_000);
            const seconds = Math.floor((timeoutMs % 60_000) / 1000);
            return (
              <>
                <p className="text-sm font-medium text-foreground">
                  O fluxo pausa e aguarda o cliente responder.
                </p>
                <div className="space-y-2">
                  <Label>Cronômetro (tempo limite)</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-0.5">
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        className="w-16 text-center"
                        value={hours}
                        onChange={(e) => {
                          const h = Math.max(0, Number(e.target.value) || 0);
                          setDraft((d) => ({ ...d, timeoutMs: h * 3_600_000 + minutes * 60_000 + seconds * 1000 }));
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">horas</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        className="w-16 text-center"
                        value={minutes}
                        onChange={(e) => {
                          const m = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                          setDraft((d) => ({ ...d, timeoutMs: hours * 3_600_000 + m * 60_000 + seconds * 1000 }));
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">min</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        className="w-16 text-center"
                        value={seconds}
                        onChange={(e) => {
                          const s = Math.max(0, Math.min(59, Number(e.target.value) || 0));
                          setDraft((d) => ({ ...d, timeoutMs: hours * 3_600_000 + minutes * 60_000 + s * 1000 }));
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">seg</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Até a mensagem recebida → ir para</Label>
                  <SelectNative
                    value={String(draft.receivedGotoStepId ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, receivedGotoStepId: e.target.value }))}
                  >
                    <option value="">Próximo passo (linear)</option>
                    {otherSteps.map((s) => (
                      <option key={s.id} value={s.id}>
                        → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                      </option>
                    ))}
                  </SelectNative>
                </div>

                <div className="space-y-2">
                  <Label>Sem resposta (timeout) → ir para</Label>
                  <SelectNative
                    value={String(draft.timeoutGotoStepId ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, timeoutGotoStepId: e.target.value }))}
                  >
                    <option value="">Próximo passo (linear)</option>
                    {otherSteps.map((s) => (
                      <option key={s.id} value={s.id}>
                        → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </>
            );
          })()}

          {step.type === "question" && (() => {
            const buttons = Array.isArray(draft.buttons) ? (draft.buttons as { text: string; gotoStepId: string }[]) : [];
            const otherSteps = allSteps.filter((s) => s.id !== step.id);
            return (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sc-q-msg">Mensagem enviada ao lead</Label>
                  <Textarea
                    id="sc-q-msg"
                    rows={3}
                    value={String(draft.message ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                    placeholder="Ex.: Qual o seu nome completo?"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use variáveis: {"{{nome}}"}, {"{{telefone}}"}, {"{{campo_x}}"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Botões de resposta — cada um leva a um passo</Label>
                  <div className="flex flex-col gap-3">
                    {buttons.map((btn, idx) => (
                      <div key={idx} className="rounded-md border border-border p-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={btn.text}
                            onChange={(e) => {
                              const next = [...buttons];
                              next[idx] = { ...next[idx], text: e.target.value };
                              setDraft((d) => ({ ...d, buttons: next }));
                            }}
                            placeholder={`Texto do botão ${idx + 1}`}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => {
                              const next = buttons.filter((_, i) => i !== idx);
                              setDraft((d) => ({ ...d, buttons: next }));
                            }}
                          >
                            <span className="text-lg text-destructive">×</span>
                          </Button>
                        </div>
                        <SelectNative
                          value={btn.gotoStepId ?? ""}
                          onChange={(e) => {
                            const next = [...buttons];
                            next[idx] = { ...next[idx], gotoStepId: e.target.value };
                            setDraft((d) => ({ ...d, buttons: next }));
                          }}
                        >
                          <option value="">→ Próximo passo (linear)</option>
                          {otherSteps.map((s) => (
                            <option key={s.id} value={s.id}>
                              → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                            </option>
                          ))}
                        </SelectNative>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft((d) => ({
                      ...d,
                      buttons: [...buttons, { text: "", gotoStepId: "" }],
                    }))}
                  >
                    + Adicionar botão
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sc-q-var">Salvar resposta em variável</Label>
                  <Input
                    id="sc-q-var"
                    value={String(draft.saveToVariable ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, saveToVariable: e.target.value }))}
                    placeholder="Ex.: resposta_nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Se a resposta não bater com nenhum botão</Label>
                  <SelectNative
                    value={String(draft.elseGotoStepId ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, elseGotoStepId: e.target.value }))}
                  >
                    <option value="">→ Próximo passo (linear)</option>
                    {otherSteps.map((s) => (
                      <option key={s.id} value={s.id}>
                        → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-q-timeout">Timeout (horas)</Label>
                  <Input
                    id="sc-q-timeout"
                    type="number"
                    min={1}
                    value={String(Math.round(Number(draft.timeoutMs ?? 86_400_000) / 3_600_000))}
                    onChange={(e) => setDraft((d) => ({ ...d, timeoutMs: Number(e.target.value) * 3_600_000 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-q-tact">Ação ao expirar</Label>
                  <SelectNative
                    id="sc-q-tact"
                    value={String(draft.timeoutAction ?? "continue")}
                    onChange={(e) => setDraft((d) => ({ ...d, timeoutAction: e.target.value }))}
                  >
                    <option value="continue">Continuar fluxo</option>
                    <option value="stop">Parar fluxo</option>
                    <option value="retry">Reenviar pergunta</option>
                    <option value="goto">Ir para step</option>
                  </SelectNative>
                </div>
                {String(draft.timeoutAction) === "goto" && (
                  <div className="space-y-2">
                    <Label htmlFor="sc-q-tgt">Ir para (no timeout)</Label>
                    <SelectNative
                      id="sc-q-tgt"
                      value={String(draft.timeoutGotoStepId ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, timeoutGotoStepId: e.target.value }))}
                    >
                      <option value="">Selecione…</option>
                      {otherSteps.map((s) => (
                        <option key={s.id} value={s.id}>
                          {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                        </option>
                      ))}
                    </SelectNative>
                  </div>
                )}
              </>
            );
          })()}

          {step.type === "set_variable" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sc-sv-name">Nome da variável</Label>
                <Input
                  id="sc-sv-name"
                  value={String(draft.variableName ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, variableName: e.target.value }))}
                  placeholder="Ex.: cidade_lead"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-sv-val">Valor</Label>
                <Input
                  id="sc-sv-val"
                  value={String(draft.value ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                  placeholder="Texto fixo ou {{variavel}}"
                />
              </div>
            </>
          )}

          {step.type === "finish" && (
            <p className="text-sm text-muted-foreground">
              Este passo encerra o fluxo da automação. O contexto será marcado como COMPLETED.
            </p>
          )}

          {step.type === "goto" && (() => {
            const otherSteps = allSteps.filter((s) => s.id !== step.id);
            return (
              <div className="space-y-2">
                <Label htmlFor="sc-gt-target">Ir para qual passo?</Label>
                <SelectNative
                  id="sc-gt-target"
                  value={String(draft.targetStepId ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, targetStepId: e.target.value }))}
                >
                  <option value="">Selecione…</option>
                  {otherSteps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                    </option>
                  ))}
                </SelectNative>
                <p className="text-[11px] text-muted-foreground">
                  Permite criar loops e desvios no fluxo.
                </p>
              </div>
            );
          })()}

          {step.type === "transfer_automation" && (
            <TransferAutomationConfig
              draft={draft}
              setDraft={setDraft}
              currentAutomationId={step.id}
            />
          )}

          {step.type === "create_deal" && (() => {
            const pipelines = pipelinesQuery.data ?? [];
            const allStages = pipelines.flatMap((p) =>
              p.stages.map((s) => ({ ...s, pipelineName: p.name }))
            );
            return (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sc-cd-title">Título do negócio</Label>
                  <Input
                    id="sc-cd-title"
                    value={String(draft.title ?? "Novo negócio")}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-cd-stage">Estágio</Label>
                  {allStages.length === 0 ? (
                    <Input
                      id="sc-cd-stage"
                      value={String(draft.stageId ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, stageId: e.target.value }))}
                      placeholder="ID do estágio"
                    />
                  ) : (
                    <SelectNative
                      id="sc-cd-stage"
                      value={String(draft.stageId ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, stageId: e.target.value }))}
                    >
                      <option value="">Selecione…</option>
                      {pipelines.map((p) => (
                        <optgroup key={p.id} label={p.name}>
                          {p.stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </SelectNative>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-cd-value">Valor (R$)</Label>
                  <Input
                    id="sc-cd-value"
                    type="number"
                    min={0}
                    value={String(draft.value ?? 0)}
                    onChange={(e) => setDraft((d) => ({ ...d, value: Number(e.target.value) }))}
                  />
                </div>
              </>
            );
          })()}

          {step.type === "finish_conversation" && (
            <p className="text-sm text-muted-foreground">
              Encerra todas as conversas abertas do contato, marcando-as como resolvidas.
            </p>
          )}

          {step.type === "business_hours" && (() => {
            const schedule = Array.isArray(draft.schedule)
              ? (draft.schedule as { days: number[]; from: string; to: string }[])
              : [];
            const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
            const otherSteps = allSteps.filter((s) => s.id !== step.id);
            return (
              <>
                <div className="space-y-2">
                  <Label>Horários de funcionamento</Label>
                  {schedule.map((slot, idx) => (
                    <div key={idx} className="rounded-md border border-border p-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {DAY_LABELS.map((d, dayIdx) => {
                          const active = slot.days?.includes(dayIdx);
                          return (
                            <button
                              key={dayIdx}
                              type="button"
                              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                active
                                  ? "bg-primary text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                              onClick={() => {
                                const next = [...schedule];
                                const days = active
                                  ? slot.days.filter((x) => x !== dayIdx)
                                  : [...(slot.days ?? []), dayIdx].sort();
                                next[idx] = { ...next[idx], days };
                                setDraft((d) => ({ ...d, schedule: next }));
                              }}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          className="w-28"
                          value={slot.from ?? "09:00"}
                          onChange={(e) => {
                            const next = [...schedule];
                            next[idx] = { ...next[idx], from: e.target.value };
                            setDraft((d) => ({ ...d, schedule: next }));
                          }}
                        />
                        <span className="text-xs text-muted-foreground">até</span>
                        <Input
                          type="time"
                          className="w-28"
                          value={slot.to ?? "18:00"}
                          onChange={(e) => {
                            const next = [...schedule];
                            next[idx] = { ...next[idx], to: e.target.value };
                            setDraft((d) => ({ ...d, schedule: next }));
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                          onClick={() => {
                            const next = schedule.filter((_, i) => i !== idx);
                            setDraft((d) => ({ ...d, schedule: next }));
                          }}
                        >
                          <span className="text-destructive">×</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft((d) => ({
                      ...d,
                      schedule: [...schedule, { days: [1, 2, 3, 4, 5], from: "09:00", to: "18:00" }],
                    }))}
                  >
                    + Adicionar faixa horária
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc-bh-tz">Fuso horário</Label>
                  <Input
                    id="sc-bh-tz"
                    value={String(draft.timezone ?? "America/Sao_Paulo")}
                    onChange={(e) => setDraft((d) => ({ ...d, timezone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fora do horário → ir para</Label>
                  <SelectNative
                    value={String(draft.elseStepId ?? "")}
                    onChange={(e) => setDraft((d) => ({ ...d, elseStepId: e.target.value }))}
                  >
                    <option value="">Encerrar fluxo</option>
                    {otherSteps.map((s) => (
                      <option key={s.id} value={s.id}>
                        → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </>
            );
          })()}

          {step.type === "ask_ai_agent" && (
            <AskAIAgentStepConfig draft={draft} setDraft={setDraft} />
          )}

          {step.type === "stop_automation" && (
            <p className="text-sm text-muted-foreground">
              Encerra a automação atual imediatamente. Nenhum passo posterior será executado e o contexto do contato será finalizado.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={save}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CONDITION_OP_OPTIONS: { value: ConditionOp; label: string }[] = [
  { value: "eq", label: "Igual a" },
  { value: "ne", label: "Diferente de" },
  { value: "includes", label: "Contém" },
  { value: "starts_with", label: "Começa com" },
  { value: "ends_with", label: "Termina com" },
  { value: "gt", label: "Maior que" },
  { value: "gte", label: "Maior ou igual" },
  { value: "lt", label: "Menor que" },
  { value: "lte", label: "Menor ou igual" },
  { value: "empty", label: "Está vazio" },
  { value: "not_empty", label: "Não está vazio" },
];

// Catálogo de campos disponíveis para avaliação em condições, alinhado com
// `evalRoot` no `automation-executor.ts` (contact / deal / data / event /
// variables). Se o executor ganhar novos campos, atualize aqui.
type FieldOption = { value: string; label: string; hint?: string };
type FieldGroup = { label: string; options: FieldOption[] };

const CONDITION_FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Contato",
    options: [
      { value: "contact.name", label: "Nome" },
      { value: "contact.email", label: "Email" },
      { value: "contact.phone", label: "Telefone" },
      { value: "contact.leadScore", label: "Lead score", hint: "numérico" },
      { value: "contact.lifecycleStage", label: "Etapa do ciclo" },
      { value: "contact.source", label: "Origem" },
      { value: "contact.whatsappJid", label: "WhatsApp JID" },
      { value: "contact.companyId", label: "ID da empresa" },
      { value: "contact.assignedToId", label: "ID do responsável" },
    ],
  },
  {
    label: "Negócio (Deal)",
    options: [
      { value: "deal.title", label: "Título" },
      { value: "deal.value", label: "Valor", hint: "numérico" },
      { value: "deal.status", label: "Status", hint: "OPEN / WON / LOST" },
      // Preferimos comparar por NOME (a UI tem os nomes mapeados); os
      // campos por ID ficam como "avançado" mais abaixo pra quem
      // precisa.
      { value: "deal.stageName", label: "Etapa (nome)" },
      { value: "deal.pipelineName", label: "Pipeline (nome)" },
      { value: "deal.lostReason", label: "Motivo da perda" },
    ],
  },
  {
    label: "Conversa",
    options: [
      { value: "conversation.status", label: "Status da conversa" },
      {
        value: "conversation.isClosed",
        label: "Conversa fechada?",
        hint: "sim / não",
      },
      { value: "conversation.channel", label: "Canal", hint: "whatsapp, email…" },
      {
        value: "conversation.hasError",
        label: "Tem erro de envio?",
        hint: "sim / não",
      },
      {
        value: "conversation.hasAgentReply",
        label: "Agente já respondeu?",
        hint: "sim / não",
      },
      {
        value: "conversation.unreadCount",
        label: "Mensagens não lidas",
        hint: "numérico",
      },
    ],
  },
  {
    label: "Mensagem / Evento",
    options: [
      { value: "data.content", label: "Conteúdo da mensagem" },
      { value: "data.text", label: "Texto" },
      { value: "data.direction", label: "Direção", hint: "in / out" },
      { value: "data.messageType", label: "Tipo da mensagem" },
      { value: "event.type", label: "Tipo do evento" },
      { value: "event.channel", label: "Canal" },
    ],
  },
  {
    label: "Avançado (por ID)",
    options: [
      { value: "deal.stageId", label: "ID da etapa" },
      { value: "deal.pipelineId", label: "ID do pipeline" },
    ],
  },
];

/**
 * Extrai variáveis declaradas em steps `set_variable` que ocorrem ANTES do
 * step de condição atual (apenas essas são garantidamente atribuídas no
 * runtime). Não olha ramificações, só a ordem linear em `allSteps` — é uma
 * aproximação útil; se o usuário precisar de algo fora disso, o campo
 * "Personalizado" permite digitar `variables.<qualquer coisa>`.
 */
function collectDeclaredVariables(
  allSteps: AutomationStep[],
  currentStepId: string,
): FieldOption[] {
  const out: FieldOption[] = [];
  const seen = new Set<string>();
  for (const s of allSteps) {
    if (s.id === currentStepId) break;
    if (s.type !== "set_variable") continue;
    const cfg = (s.config ?? {}) as Record<string, unknown>;
    const raw =
      (typeof cfg.variableName === "string" && cfg.variableName) ||
      (typeof cfg.name === "string" && cfg.name) ||
      "";
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ value: `variables.${name}`, label: name });
  }
  return out;
}

/**
 * Seletor de campo para condições. Apresenta os campos conhecidos em
 * optgroups (contact/deal/message/variáveis) e fallback para entrada livre
 * via modo "Personalizado" — assim o usuário comum não precisa memorizar
 * paths, mas o poder de digitar qualquer path continua disponível.
 */
function ConditionFieldPicker({
  value,
  onChange,
  declaredVariables,
}: {
  value: string;
  onChange: (next: string) => void;
  declaredVariables: FieldOption[];
}) {
  const CUSTOM = "__custom__";
  const knownValues = useMemo(() => {
    const set = new Set<string>();
    for (const g of CONDITION_FIELD_GROUPS) {
      for (const o of g.options) set.add(o.value);
    }
    for (const o of declaredVariables) set.add(o.value);
    return set;
  }, [declaredVariables]);

  // Valor que não está na lista (e não vazio) → entra no modo customizado,
  // preservando o que o usuário tinha digitado antes.
  const isCustom = value.length > 0 && !knownValues.has(value);
  const [customMode, setCustomMode] = useState<boolean>(isCustom);

  useEffect(() => {
    if (isCustom) setCustomMode(true);
  }, [isCustom]);

  if (customMode) {
    return (
      <div className="flex gap-1">
        <Input
          placeholder="ex.: contact.customFields.cidade"
          className="h-9 flex-1 text-[12px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-[11px] text-muted-foreground"
          onClick={() => {
            setCustomMode(false);
            onChange("");
          }}
          title="Voltar para a lista de campos"
        >
          ← Lista
        </Button>
      </div>
    );
  }

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === CUSTOM) {
          setCustomMode(true);
          onChange("");
          return;
        }
        onChange(v);
      }}
    >
      <option value="">Selecione um campo…</option>
      {CONDITION_FIELD_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.hint ? ` (${opt.hint})` : ""}
            </option>
          ))}
        </optgroup>
      ))}
      {declaredVariables.length > 0 && (
        <optgroup label="Variáveis do fluxo">
          {declaredVariables.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      )}
      <option value={CUSTOM}>✏ Personalizado…</option>
    </SelectNative>
  );
}

/**
 * Picker de valor para condições: quando o campo avaliado é um ID
 * conhecido (stage, pipeline, company, user, enums) mostramos um
 * select específico, buscando a lista no backend. Caso contrário,
 * cai num `<Input>` de texto livre — mesmo comportamento antigo.
 *
 * Mantemos o valor salvo como o ID bruto (ou o enum string) pra que
 * o `evalRoot` do executor continue comparando contra o mesmo path
 * que ele lê em runtime (contact.companyId é o ID, não o nome).
 */
function ConditionValueInput({
  field,
  value,
  onChange,
}: {
  field: string;
  value: unknown;
  onChange: (next: string) => void;
}) {
  const str = value === null || value === undefined ? "" : String(value);

  if (field === "deal.stageId") {
    return <StagePickerValue value={str} onChange={onChange} />;
  }
  if (field === "deal.pipelineId") {
    return <PipelinePickerValue value={str} onChange={onChange} />;
  }
  // Versões "por nome": salvamos o NOME (string) no rule.value para
  // sobreviver à recriação de estágio/pipeline. O executor compara
  // contra `deal.stageName` / `deal.pipelineName` populados em runtime.
  if (field === "deal.stageName") {
    return <StageNamePickerValue value={str} onChange={onChange} />;
  }
  if (field === "deal.pipelineName") {
    return <PipelineNamePickerValue value={str} onChange={onChange} />;
  }
  if (field === "contact.companyId") {
    return <CompanyPickerValue value={str} onChange={onChange} />;
  }
  if (field === "contact.assignedToId") {
    return <OwnerPickerValue value={str} onChange={onChange} />;
  }
  if (field === "conversation.status") {
    return (
      <SelectNative
        className="h-9 text-[12px]"
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        <option value="OPEN">Em aberto (OPEN)</option>
        <option value="RESOLVED">Fechada / Resolvida (RESOLVED)</option>
        <option value="PENDING">Pendente (PENDING)</option>
        <option value="SNOOZED">Adiada (SNOOZED)</option>
      </SelectNative>
    );
  }
  if (
    field === "conversation.isClosed" ||
    field === "conversation.hasError" ||
    field === "conversation.hasAgentReply"
  ) {
    return (
      <SelectNative
        className="h-9 text-[12px]"
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </SelectNative>
    );
  }
  if (field === "conversation.channel") {
    return (
      <SelectNative
        className="h-9 text-[12px]"
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="email">E-mail</option>
        <option value="telegram">Telegram</option>
        <option value="instagram">Instagram</option>
        <option value="webchat">Web chat</option>
      </SelectNative>
    );
  }
  if (field === "deal.status") {
    return (
      <SelectNative
        className="h-9 text-[12px]"
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        <option value="OPEN">Aberto (OPEN)</option>
        <option value="WON">Ganho (WON)</option>
        <option value="LOST">Perdido (LOST)</option>
      </SelectNative>
    );
  }
  if (field === "contact.lifecycleStage") {
    return (
      <SelectNative
        className="h-9 text-[12px]"
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione…</option>
        <option value="SUBSCRIBER">Assinante</option>
        <option value="LEAD">Lead</option>
        <option value="MQL">MQL</option>
        <option value="SQL">SQL</option>
        <option value="OPPORTUNITY">Oportunidade</option>
        <option value="CUSTOMER">Cliente</option>
        <option value="EVANGELIST">Evangelista</option>
        <option value="OTHER">Outro</option>
      </SelectNative>
    );
  }

  return (
    <Input
      placeholder="valor"
      className="h-9 text-[12px]"
      value={str}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function StagePickerValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines-for-condition"],
    queryFn: async (): Promise<Pipeline[]> => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      return (await res.json()) as Pipeline[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
        Carregando estágios…
      </div>
    );
  }

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione um estágio…</option>
      {pipelines.map((p) => (
        <optgroup key={p.id} label={p.name}>
          {p.stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </SelectNative>
  );
}

function PipelinePickerValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines-for-condition"],
    queryFn: async (): Promise<Pipeline[]> => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      return (await res.json()) as Pipeline[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
        Carregando pipelines…
      </div>
    );
  }

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione um pipeline…</option>
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </SelectNative>
  );
}

/**
 * Picker de estágio que salva o NOME do estágio (não o ID). Mostra os
 * pipelines como optgroups para dar contexto (um nome como "Negociação"
 * pode existir em múltiplos pipelines) — mas o valor salvo é só o nome,
 * que é o que o executor compara contra `deal.stageName`.
 *
 * Também aceita valor de texto livre (caso o estágio não exista mais ou
 * o operador queira comparar contra um valor "virtual") via fallback
 * de Input.
 */
function StageNamePickerValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines-for-condition"],
    queryFn: async (): Promise<Pipeline[]> => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      return (await res.json()) as Pipeline[];
    },
    staleTime: 60_000,
  });

  const allNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of pipelines) for (const s of p.stages) set.add(s.name);
    return set;
  }, [pipelines]);

  const isCustom = value.length > 0 && !allNames.has(value);

  if (isLoading) {
    return (
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
        Carregando estágios…
      </div>
    );
  }

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione uma etapa…</option>
      {pipelines.map((p) => (
        <optgroup key={p.id} label={p.name}>
          {p.stages.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
      {isCustom && (
        <option value={value}>
          {value} (valor personalizado)
        </option>
      )}
    </SelectNative>
  );
}

/** Picker de pipeline por NOME (espelha `StageNamePickerValue`). */
function PipelineNamePickerValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines-for-condition"],
    queryFn: async (): Promise<Pipeline[]> => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      return (await res.json()) as Pipeline[];
    },
    staleTime: 60_000,
  });

  const allNames = useMemo(
    () => new Set(pipelines.map((p) => p.name)),
    [pipelines],
  );
  const isCustom = value.length > 0 && !allNames.has(value);

  if (isLoading) {
    return (
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
        Carregando pipelines…
      </div>
    );
  }

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione um pipeline…</option>
      {pipelines.map((p) => (
        <option key={p.id} value={p.name}>
          {p.name}
        </option>
      ))}
      {isCustom && (
        <option value={value}>
          {value} (valor personalizado)
        </option>
      )}
    </SelectNative>
  );
}

type CompanyOption = { id: string; name: string };

function CompanyPickerValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies-for-condition"],
    queryFn: async (): Promise<CompanyOption[]> => {
      const res = await fetch(apiUrl("/api/companies?perPage=100"));
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json)
        ? json
        : Array.isArray(json.items)
          ? json.items
          : Array.isArray(json.data)
            ? json.data
            : [];
      return items.map((c: Record<string, unknown>) => ({
        id: String(c.id ?? ""),
        name: String(c.name ?? ""),
      }));
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
        Carregando empresas…
      </div>
    );
  }

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione uma empresa…</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </SelectNative>
  );
}

function OwnerPickerValue({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: humans = [], isLoading: loadingHumans } = useQuery({
    queryKey: ["automation-users-human"],
    queryFn: async (): Promise<HumanUserOption[]> => {
      const res = await fetch(apiUrl("/api/users"));
      if (!res.ok) return [];
      return (await res.json()) as HumanUserOption[];
    },
    staleTime: 120_000,
  });

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["automation-ai-agents-with-user"],
    queryFn: async (): Promise<AIAgentOption[]> => {
      const res = await fetch(apiUrl("/api/ai-agents"));
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{
        id: string;
        userId: string;
        name: string;
        archetype: string;
        active: boolean;
        autonomyMode: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        archetype: r.archetype,
        active: r.active,
        autonomyMode: r.autonomyMode,
      }));
    },
    staleTime: 120_000,
  });

  if (loadingHumans || loadingAgents) {
    return (
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
        Carregando…
      </div>
    );
  }

  const activeAgents = agents.filter((a) => a.active);

  return (
    <SelectNative
      className="h-9 text-[12px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione…</option>
      {humans.length > 0 && (
        <optgroup label="Humanos">
          {humans.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </optgroup>
      )}
      {activeAgents.length > 0 && (
        <optgroup label="Agentes IA">
          {activeAgents.map((a) => (
            <option key={a.userId} value={a.userId}>
              🤖 {a.name}
            </option>
          ))}
        </optgroup>
      )}
    </SelectNative>
  );
}

function ConditionStepConfig({
  draft,
  setDraft,
  allSteps,
  currentStepId,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
  allSteps: AutomationStep[];
  currentStepId: string;
}) {
  const branches = Array.isArray(draft.branches)
    ? (draft.branches as ConditionBranch[])
    : [];
  const otherSteps = allSteps.filter((s) => s.id !== currentStepId);
  const declaredVariables = useMemo(
    () => collectDeclaredVariables(allSteps, currentStepId),
    [allSteps, currentStepId],
  );

  const updateBranches = (next: ConditionBranch[]) => {
    setDraft((d) => ({ ...d, branches: next as unknown as Record<string, unknown>[] }));
  };

  const updateBranch = (idx: number, patch: Partial<ConditionBranch>) => {
    const next = branches.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    updateBranches(next);
  };

  const updateRule = (bIdx: number, rIdx: number, patch: Partial<ConditionRule>) => {
    const next = branches.map((b, i) => {
      if (i !== bIdx) return b;
      const rules = b.rules.map((r, j) => (j === rIdx ? { ...r, ...patch } : r));
      return { ...b, rules };
    });
    updateBranches(next);
  };

  const addRule = (bIdx: number) => {
    const next = branches.map((b, i) =>
      i === bIdx ? { ...b, rules: [...b.rules, { field: "", op: "eq" as ConditionOp, value: "" }] } : b
    );
    updateBranches(next);
  };

  const removeRule = (bIdx: number, rIdx: number) => {
    const next = branches.map((b, i) => {
      if (i !== bIdx) return b;
      return { ...b, rules: b.rules.filter((_, j) => j !== rIdx) };
    });
    updateBranches(next);
  };

  const addBranch = () => {
    updateBranches([
      ...branches,
      {
        id: newBranchId(),
        rules: [{ field: "", op: "eq", value: "" }],
      },
    ]);
  };

  const removeBranch = (idx: number) => {
    updateBranches(branches.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 p-3">
        <p className="text-[12px] font-semibold text-slate-800">
          Condições em cascata
        </p>
        <p className="text-[11px] leading-relaxed text-slate-500">
          O fluxo avalia cada condição na ordem. A primeira que baterem todas as
          regras (E) dispara seu caminho. Se nenhuma baterem, segue o caminho{" "}
          <span className="font-semibold">Nenhuma das condições</span>.
        </p>
      </div>

      {branches.map((branch, bIdx) => (
        <div
          key={branch.id}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-cyan-50 text-[11px] font-black text-cyan-600 ring-1 ring-cyan-100">
                {bIdx + 1}
              </span>
              <Input
                className="h-7 w-48 text-[12px]"
                placeholder="Rótulo (opcional)"
                value={branch.label ?? ""}
                onChange={(e) => updateBranch(bIdx, { label: e.target.value })}
              />
            </div>
            {branches.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:bg-rose-50"
                onClick={() => removeBranch(bIdx)}
              >
                Remover
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {branch.rules.map((rule, rIdx) => (
              <div
                key={rIdx}
                className="grid grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_auto] items-start gap-2"
              >
                <ConditionFieldPicker
                  value={rule.field}
                  onChange={(next) => updateRule(bIdx, rIdx, { field: next })}
                  declaredVariables={declaredVariables}
                />
                <SelectNative
                  className="h-9 text-[12px]"
                  value={rule.op}
                  onChange={(e) =>
                    updateRule(bIdx, rIdx, { op: e.target.value as ConditionOp })
                  }
                >
                  {CONDITION_OP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectNative>
                {rule.op === "empty" || rule.op === "not_empty" ? (
                  <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[11px] italic text-slate-400">
                    (sem valor)
                  </div>
                ) : (
                  <ConditionValueInput
                    field={rule.field}
                    value={rule.value}
                    onChange={(next) => updateRule(bIdx, rIdx, { value: next })}
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={branch.rules.length <= 1}
                  onClick={() => removeRule(bIdx, rIdx)}
                  aria-label="Remover regra"
                >
                  <span className="text-destructive">×</span>
                </Button>
                {rIdx < branch.rules.length - 1 && (
                  <span className="col-span-4 -my-1 text-center text-[10px] font-black tracking-widest text-slate-400">
                    E
                  </span>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => addRule(bIdx)}
            >
              + Adicionar regra (E)
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Quando esta condição baterem → ir para</Label>
            <SelectNative
              className="h-9 text-[12px]"
              value={branch.nextStepId ?? ""}
              onChange={(e) =>
                updateBranch(bIdx, { nextStepId: e.target.value || undefined })
              }
            >
              <option value="">Encerrar fluxo</option>
              {otherSteps.map((s) => (
                <option key={s.id} value={s.id}>
                  → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addBranch}
      >
        + Adicionar próxima condição (OU)
      </Button>

      <div className="space-y-1.5 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
        <Label className="text-[11px] text-rose-700">
          Nenhuma das condições → ir para
        </Label>
        <SelectNative
          className="h-9 text-[12px]"
          value={String(draft.elseStepId ?? "")}
          onChange={(e) => setDraft((d) => ({ ...d, elseStepId: e.target.value }))}
        >
          <option value="">Encerrar fluxo</option>
          {otherSteps.map((s) => (
            <option key={s.id} value={s.id}>
              → {stepTypeLabel(s.type)}: {summarizeStepConfig(s.type, s.config).slice(0, 40)}
            </option>
          ))}
        </SelectNative>
      </div>
    </>
  );
}

type AIAgentOption = {
  id: string;
  userId: string;
  name: string;
  archetype: string;
  active: boolean;
  autonomyMode: string;
};

type HumanUserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ARCHETYPE_LABEL: Record<string, string> = {
  SDR: "SDR",
  ATENDIMENTO: "Atendimento",
  VENDEDOR: "Vendedor",
  SUPORTE: "Suporte",
};

function AssignOwnerStepConfig({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const { data: humans = [], isLoading: loadingHumans } = useQuery({
    queryKey: ["automation-users-human"],
    queryFn: async (): Promise<HumanUserOption[]> => {
      const res = await fetch(apiUrl("/api/users"));
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{
        id: string;
        name: string;
        email: string;
        role: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
      }));
    },
    staleTime: 120_000,
  });

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ["automation-ai-agents-with-user"],
    queryFn: async (): Promise<AIAgentOption[]> => {
      const res = await fetch(apiUrl("/api/ai-agents"));
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{
        id: string;
        userId: string;
        name: string;
        archetype: string;
        active: boolean;
        autonomyMode: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        archetype: r.archetype,
        active: r.active,
        autonomyMode: r.autonomyMode,
      }));
    },
    staleTime: 120_000,
  });

  const selectedId = String(draft.userId ?? "");
  const selectedType = String(draft.userType ?? "HUMAN");
  const target = String(draft.target ?? "deal");

  const isLoading = loadingHumans || loadingAgents;
  const activeAgents = agents.filter((a) => a.active);

  const handleChange = (value: string) => {
    if (!value) {
      setDraft((d) => ({ ...d, userId: "", userLabel: "", userType: "HUMAN" }));
      return;
    }
    const human = humans.find((h) => h.id === value);
    if (human) {
      setDraft((d) => ({
        ...d,
        userId: human.id,
        userLabel: human.name,
        userType: "HUMAN",
      }));
      return;
    }
    const agent = activeAgents.find((a) => a.userId === value);
    if (agent) {
      setDraft((d) => ({
        ...d,
        userId: agent.userId,
        userLabel: agent.name,
        userType: "AI",
      }));
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sc-owner">Responsável</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando usuários…</p>
        ) : (
          <SelectNative
            id="sc-owner"
            value={selectedId}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">Selecione…</option>
            {humans.length > 0 && (
              <optgroup label="Humanos">
                {humans.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </optgroup>
            )}
            {activeAgents.length > 0 && (
              <optgroup label="Agentes IA (handoff automático)">
                {activeAgents.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    🤖 {a.name} · {ARCHETYPE_LABEL[a.archetype] ?? a.archetype} ·{" "}
                    {a.autonomyMode === "AUTONOMOUS" ? "autônomo" : "rascunho"}
                  </option>
                ))}
              </optgroup>
            )}
          </SelectNative>
        )}
      </div>

      <div className="space-y-2">
        <Label>Aplicar em</Label>
        <SelectNative
          value={target}
          onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
        >
          <option value="deal">Negócio (deal) — herda no contato e nas conversas</option>
          <option value="contact">Contato — propaga pras conversas abertas</option>
        </SelectNative>
      </div>

      {selectedType === "AI" && selectedId && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-[12px] leading-relaxed text-violet-900">
          <p className="mb-1 font-semibold">
            🤖 Handoff pra agente IA
          </p>
          <p className="text-[11px]">
            A partir deste passo, o agente assume a conversa automaticamente.
            Toda mensagem que o cliente mandar vai ser respondida pelo agente,
            conforme o modo configurado:
          </p>
          <ul className="mt-1.5 space-y-0.5 text-[11px]">
            <li>
              • <b>Autônomo</b>: responde direto no WhatsApp.
            </li>
            <li>
              • <b>Rascunho</b>: gera a resposta como nota privada pro operador
              humano aprovar no inbox.
            </li>
          </ul>
          <p className="mt-1.5 text-[11px]">
            Pra devolver pro humano, o próprio agente pode usar a ferramenta
            de handoff interna, ou crie outro passo `Atribuir responsável`
            apontando pra um humano.
          </p>
        </div>
      )}
    </>
  );
}

function TransferToAIAgentStepConfig({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["automation-ai-agents-with-user"],
    queryFn: async (): Promise<AIAgentOption[]> => {
      const res = await fetch(apiUrl("/api/ai-agents"));
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{
        id: string;
        userId: string;
        name: string;
        archetype: string;
        active: boolean;
        autonomyMode: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        archetype: r.archetype,
        active: r.active,
        autonomyMode: r.autonomyMode,
      }));
    },
    staleTime: 120_000,
  });

  const selectedId = String(draft.agentUserId ?? "");
  const target = String(draft.target ?? "deal");
  const activeAgents = agents.filter((a) => a.active);
  const selected = activeAgents.find((a) => a.userId === selectedId);

  return (
    <>
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-[11px] leading-relaxed text-violet-900">
        <p className="mb-1 font-semibold">Como funciona</p>
        <p>
          Este passo atribui a conversa a um <b>agente de IA</b>. A partir
          deste ponto, o agente assume o atendimento — cada nova mensagem do
          cliente é respondida pelo agente (ou rascunhada pra operador humano
          aprovar, se o modo for DRAFT). Para devolver pro humano, o próprio
          agente pode executar um handoff via tool, ou adicione outro passo
          `Atribuir responsável` apontando pra um humano.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sc-ai-transfer">Agente IA</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando agentes…</p>
        ) : activeAgents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum agente IA ativo. Crie um em{" "}
            <a href="/ai-agents" className="underline">
              Agentes IA
            </a>
            .
          </p>
        ) : (
          <SelectNative
            id="sc-ai-transfer"
            value={selectedId}
            onChange={(e) => {
              const a = activeAgents.find((x) => x.userId === e.target.value);
              setDraft((d) => ({
                ...d,
                agentUserId: e.target.value,
                agentLabel: a?.name ?? "",
              }));
            }}
          >
            <option value="">Selecione um agente…</option>
            {activeAgents.map((a) => (
              <option key={a.userId} value={a.userId}>
                🤖 {a.name} · {ARCHETYPE_LABEL[a.archetype] ?? a.archetype} ·{" "}
                {a.autonomyMode === "AUTONOMOUS" ? "autônomo" : "rascunho"}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {selected && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-2 text-[11px] text-foreground/80">
          <p>
            Modo de autonomia:{" "}
            <b>
              {selected.autonomyMode === "AUTONOMOUS"
                ? "Autônomo (responde direto)"
                : "Rascunho (humano aprova antes)"}
            </b>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Aplicar em</Label>
        <SelectNative
          value={target}
          onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
        >
          <option value="deal">Negócio (deal) — herda no contato e nas conversas</option>
          <option value="contact">Contato — propaga pras conversas abertas</option>
        </SelectNative>
      </div>
    </>
  );
}

function AskAIAgentStepConfig({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["automation-ai-agents-with-user"],
    queryFn: async (): Promise<AIAgentOption[]> => {
      const res = await fetch(apiUrl("/api/ai-agents"));
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<{
        id: string;
        userId: string;
        name: string;
        archetype: string;
        active: boolean;
        autonomyMode: string;
      }>;
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        archetype: r.archetype,
        active: r.active,
        autonomyMode: r.autonomyMode,
      }));
    },
    staleTime: 120_000,
  });

  const selectedId = String(draft.agentId ?? "");
  const activeAgents = agents.filter((a) => a.active);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sc-ai-agent">Agente de IA</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando agentes…</p>
        ) : activeAgents.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum agente ativo. Crie um em{" "}
            <a href="/ai-agents" className="underline">
              Agentes IA
            </a>
            .
          </p>
        ) : (
          <SelectNative
            id="sc-ai-agent"
            value={selectedId}
            onChange={(e) => {
              const a = activeAgents.find((x) => x.id === e.target.value);
              setDraft((d) => ({
                ...d,
                agentId: e.target.value,
                agentLabel: a?.name ?? "",
              }));
            }}
          >
            <option value="">Selecione um agente…</option>
            {activeAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.archetype}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sc-ai-prompt">Pergunta para o agente</Label>
        <Textarea
          id="sc-ai-prompt"
          rows={4}
          placeholder="Ex.: Resuma em 1 parágrafo o interesse do lead {{contact.name}} com base no histórico."
          value={String(draft.promptTemplate ?? "")}
          onChange={(e) => setDraft((d) => ({ ...d, promptTemplate: e.target.value }))}
        />
        <p className="text-[11px] text-muted-foreground">
          Use <code className="font-mono text-[10px]">{"{{variavel}}"}</code> para interpolar dados do fluxo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sc-ai-var">Salvar resposta em variável</Label>
        <Input
          id="sc-ai-var"
          placeholder="ai_response"
          value={String(draft.saveToVariable ?? "ai_response")}
          onChange={(e) => setDraft((d) => ({ ...d, saveToVariable: e.target.value }))}
        />
        <p className="text-[11px] text-muted-foreground">
          A resposta fica disponível como{" "}
          <code className="font-mono text-[10px]">
            {"{{"}
            {String(draft.saveToVariable ?? "ai_response")}
            {"}}"}
          </code>{" "}
          nos próximos passos.
        </p>
      </div>
    </>
  );
}

type TemplateOption = {
  metaTemplateId: string;
  metaTemplateName: string;
  label: string;
  language: string;
  category: string | null;
  bodyPreview: string;
};

const CAT_LABEL: Record<string, string> = {
  UTILITY: "Utilidade",
  MARKETING: "Marketing",
  AUTHENTICATION: "Autenticação",
};

function TemplateStepConfig({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["automation-whatsapp-templates"],
    queryFn: async (): Promise<TemplateOption[]> => {
      const res = await fetch(apiUrl("/api/whatsapp-template-configs/agent-enabled"));
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 120_000,
  });

  const selectedName = String(draft.templateName ?? "");
  const selected = templates.find((t) => t.metaTemplateName === selectedName);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sc-tpl-select">Template</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando templates…</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum template liberado. Libere em Configurações → Templates WhatsApp.
          </p>
        ) : (
          <SelectNative
            id="sc-tpl-select"
            value={selectedName}
            onChange={(e) => {
              const tpl = templates.find((t) => t.metaTemplateName === e.target.value);
              setDraft((d) => ({
                ...d,
                templateName: e.target.value,
                templateLabel: tpl?.label ?? "",
                languageCode: tpl?.language ?? d.languageCode ?? "pt_BR",
                templateCategory: tpl?.category ?? "",
              }));
            }}
          >
            <option value="">Selecione um template…</option>
            {templates.map((t) => (
              <option key={t.metaTemplateId} value={t.metaTemplateName}>
                {t.label || t.metaTemplateName}
                {t.category ? ` (${CAT_LABEL[t.category] ?? t.category})` : ""}
              </option>
            ))}
          </SelectNative>
        )}
      </div>

      {selected && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {selected.label || selected.metaTemplateName}
            </span>
            {selected.label && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {selected.metaTemplateName}
              </span>
            )}
          </div>
          {selected.category && (
            <p className="text-[10px] text-muted-foreground">
              Categoria: {CAT_LABEL[selected.category] ?? selected.category} · Idioma: {selected.language}
            </p>
          )}
          {selected.bodyPreview && (
            <p className="whitespace-pre-wrap text-xs text-foreground/80">
              {selected.bodyPreview}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="sc-tpl-lang">Idioma</Label>
        <Input
          id="sc-tpl-lang"
          value={String(draft.languageCode ?? "pt_BR")}
          onChange={(e) => setDraft((d) => ({ ...d, languageCode: e.target.value }))}
          placeholder="pt_BR"
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        O destinatário é resolvido automaticamente pelo telefone do contato.
      </p>
    </>
  );
}

const MEDIA_ACCEPT: Record<string, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  video: "video/mp4,video/webm",
  audio: "audio/ogg,audio/mpeg,audio/mp4,audio/mp3",
  document: "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
};

function MediaStepConfig({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaType = String(draft.mediaType ?? "image");
  const mediaUrl = String(draft.mediaUrl ?? "");
  const hasFile = mediaUrl.startsWith("/uploads/");
  const uploadedFileName = String(draft.uploadedFileName ?? "");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.warning("Arquivo excede o limite de 16 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiUrl("/api/uploads/automation-media"), {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Erro ao enviar arquivo.");
        return;
      }
      setDraft((d) => ({
        ...d,
        mediaUrl: data.url,
        uploadedFileName: data.fileName,
        filename: d.filename || data.fileName,
      }));
    } catch {
      toast.error("Erro de rede ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sc-media-type">Tipo de mídia</Label>
        <SelectNative
          id="sc-media-type"
          value={mediaType}
          onChange={(e) => setDraft((d) => ({ ...d, mediaType: e.target.value }))}
        >
          <option value="image">Imagem</option>
          <option value="video">Vídeo</option>
          <option value="audio">Áudio</option>
          <option value="document">Documento</option>
        </SelectNative>
      </div>

      <div className="space-y-2">
        <Label>Arquivo</Label>

        <input
          ref={fileInputRef}
          type="file"
          accept={MEDIA_ACCEPT[mediaType] ?? "*/*"}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enviando…
              </>
            ) : (
              <>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Carregar arquivo do computador
              </>
            )}
          </Button>

          {hasFile && uploadedFileName && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
              <svg className="size-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span className="flex-1 truncate text-xs font-medium text-emerald-800">
                {uploadedFileName}
              </span>
              <button
                type="button"
                className="text-xs text-emerald-600 underline hover:text-emerald-800"
                onClick={() => {
                  setDraft((d) => ({ ...d, mediaUrl: "", uploadedFileName: "" }));
                }}
              >
                Remover
              </button>
            </div>
          )}

          {mediaType === "image" && hasFile && mediaUrl && (
            <div className="overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl}
                alt="Preview"
                className="max-h-[160px] w-full object-contain bg-muted/30"
              />
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 border-t border-border/60" />
          <p className="relative mx-auto w-fit bg-white px-2 text-[10px] text-muted-foreground">
            ou cole uma URL
          </p>
        </div>

        <Input
          value={hasFile ? "" : mediaUrl}
          onChange={(e) => setDraft((d) => ({ ...d, mediaUrl: e.target.value, uploadedFileName: "" }))}
          placeholder="https://exemplo.com/arquivo.jpg"
          disabled={hasFile}
        />
      </div>

      {mediaType !== "audio" && (
        <div className="space-y-2">
          <Label htmlFor="sc-media-caption">Legenda</Label>
          <Input
            id="sc-media-caption"
            value={String(draft.caption ?? "")}
            onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
            placeholder="Texto opcional"
          />
        </div>
      )}

      {mediaType === "document" && (
        <div className="space-y-2">
          <Label htmlFor="sc-media-fname">Nome do arquivo</Label>
          <Input
            id="sc-media-fname"
            value={String(draft.filename ?? "")}
            onChange={(e) => setDraft((d) => ({ ...d, filename: e.target.value }))}
            placeholder="tutorial.pdf"
          />
        </div>
      )}
    </>
  );
}

type AutomationListItem = {
  id: string;
  name: string;
  active: boolean;
  triggerType: string;
};

function TransferAutomationConfig({
  draft,
  setDraft,
  currentAutomationId,
}: {
  draft: Record<string, unknown>;
  setDraft: Dispatch<SetStateAction<Record<string, unknown>>>;
  currentAutomationId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["automation-list-for-transfer"],
    queryFn: async (): Promise<AutomationListItem[]> => {
      const res = await fetch(apiUrl("/api/automations?perPage=100"));
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
      return items.map((a: Record<string, unknown>) => ({
        id: String(a.id ?? ""),
        name: String(a.name ?? ""),
        active: Boolean(a.active),
        triggerType: String(a.triggerType ?? ""),
      }));
    },
    staleTime: 60_000,
  });

  const automations = (data ?? []).filter((a) => a.id !== currentAutomationId);
  const selectedId = String(draft.targetAutomationId ?? "");

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sc-transfer-target">Automação destino</Label>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando automações…</p>
        ) : automations.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma outra automação encontrada.</p>
        ) : (
          <SelectNative
            id="sc-transfer-target"
            value={selectedId}
            onChange={(e) => {
              const a = automations.find((x) => x.id === e.target.value);
              setDraft((d) => ({
                ...d,
                targetAutomationId: e.target.value,
                targetAutomationName: a?.name ?? "",
              }));
            }}
          >
            <option value="">Selecione uma automação…</option>
            {automations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {!a.active ? "(inativa)" : ""}
              </option>
            ))}
          </SelectNative>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        A automação atual será encerrada e o fluxo da automação selecionada será iniciado com o mesmo contato e contexto.
      </p>
    </>
  );
}
