"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  ChevronRight,
  ExternalLink,
  Flag,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  Send,
  Tag,
  Trash2,
  Trophy,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react";
import NextLink from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

type AutomationRow = {
  id: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  active: boolean;
  stepCount: number;
};

type ActionDraft = { type: string; value: string };

const TRIGGER_LABELS: Record<string, string> = {
  stage_changed: "Card movido",
  agent_changed: "Agente alterado",
  message_received: "Msg recebida",
  message_sent: "Msg enviada",
  deal_created: "Negócio criado",
  deal_won: "Negócio ganho",
  deal_lost: "Negócio perdido",
  tag_added: "Tag adicionada",
  lifecycle_changed: "Ciclo alterado",
  lead_score_reached: "Score atingido",
  contact_created: "Contato criado",
  conversation_created: "Conversa criada",
};

const ACTION_TYPES = [
  { value: "move_stage", label: "Mover para estágio" },
  { value: "send_message", label: "Enviar mensagem" },
  { value: "assign_owner", label: "Atribuir agente" },
  { value: "add_tag", label: "Adicionar tag" },
  { value: "change_lifecycle", label: "Alterar ciclo de vida" },
  { value: "send_email", label: "Enviar e-mail" },
  { value: "create_activity", label: "Criar atividade" },
  { value: "webhook", label: "Webhook" },
];

const TRIGGER_ICON: Record<string, React.ReactNode> = {
  stage_changed: <ChevronRight className="size-3.5" />,
  deal_created: <Flag className="size-3.5" />,
  deal_won: <Trophy className="size-3.5" />,
  deal_lost: <XCircle className="size-3.5" />,
  message_received: <MessageSquare className="size-3.5" />,
  message_sent: <Send className="size-3.5" />,
  agent_changed: <UserCheck className="size-3.5" />,
  tag_added: <Tag className="size-3.5" />,
};

const ACTION_PLACEHOLDERS: Record<string, string | undefined> = {
  move_stage: undefined,
  send_message: "Texto da mensagem…",
  assign_owner: "ID ou e-mail do agente…",
  add_tag: "Nome da tag…",
  change_lifecycle: undefined,
  send_email: "assunto | corpo…",
  create_activity: "Título da atividade…",
  webhook: "https://seu-endpoint.com/webhook",
};

const STAGE_TRIGGERS = ["stage_changed", "message_received", "message_sent", "agent_changed", "tag_added"] as const;

// ── Column card for an automation ──

function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onOpenEditor,
}: {
  automation: AutomationRow;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenEditor: () => void;
}) {
  return (
    <div className={cn(
      "group relative rounded-lg border bg-white p-2.5 shadow-sm transition-all hover:shadow-md",
      automation.active ? "border-indigo-200/80" : "border-border opacity-60",
    )}>
      <div className="flex items-start gap-2">
        <div className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
          automation.active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-[var(--color-ink-muted)]",
        )}>
          <Bot className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-slate-800">
            {automation.name}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              {TRIGGER_LABELS[automation.triggerType] ?? automation.triggerType}
            </Badge>
            <span className="text-[10px] text-[var(--color-ink-muted)]">
              {automation.stepCount} ação{automation.stepCount !== 1 ? "ões" : ""}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <TooltipHost label={automation.active ? "Desativar" : "Ativar"} side="top">
          <button type="button" onClick={onToggle} className="rounded p-1 hover:bg-slate-100" aria-label={automation.active ? "Desativar" : "Ativar"}>
            <Power className={cn("size-3", automation.active ? "text-emerald-500" : "text-[var(--color-ink-muted)]")} />
          </button>
        </TooltipHost>
        <TooltipHost label="Editar gatilho" side="top">
          <button type="button" onClick={onEdit} className="rounded p-1 hover:bg-slate-100" aria-label="Editar gatilho">
            <Pencil className="size-3 text-slate-500" />
          </button>
        </TooltipHost>
        <TooltipHost label="Abrir editor de fluxo" side="top">
          <NextLink href={`/automations/${automation.id}`} className="rounded p-1 hover:bg-slate-100" aria-label="Abrir editor de fluxo">
            <ExternalLink className="size-3 text-indigo-500" />
          </NextLink>
        </TooltipHost>
        <TooltipHost label="Excluir" side="top">
          <button type="button" onClick={onDelete} className="rounded p-1 hover:bg-red-50" aria-label="Excluir">
            <Trash2 className="size-3 text-red-400" />
          </button>
        </TooltipHost>
      </div>
    </div>
  );
}

// ── Funnel column ──

function FunnelColumn({
  title,
  color,
  icon,
  automations,
  onAddRule,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  color: string;
  icon?: React.ReactNode;
  automations: AutomationRow[];
  onAddRule: () => void;
  onToggle: (id: string) => void;
  onEdit: (a: AutomationRow) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="flex w-52 shrink-0 flex-col rounded-xl border border-border/80 bg-[var(--color-bg-subtle)]/60 shadow-sm border-t-[3px]"
      style={{ borderTopColor: color }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {icon ? (
          <div className="flex size-6 items-center justify-center rounded-md text-white" style={{ backgroundColor: color }}>
            {icon}
          </div>
        ) : (
          <div className="size-3 rounded-full" style={{ backgroundColor: color }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-foreground">{title}</p>
          <p className="text-[10px] text-[var(--color-ink-muted)]">
            {automations.length} automação{automations.length !== 1 ? "ões" : ""}
          </p>
        </div>
      </div>

      <Separator className="mx-2 w-auto" />

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-2 py-2" style={{ maxHeight: 320 }}>
        {automations.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <Zap className="size-6 text-slate-200" />
          </div>
        ) : (
          automations.map((a) => (
            <AutomationCard
              key={a.id}
              automation={a}
              onToggle={() => onToggle(a.id)}
              onEdit={() => onEdit(a)}
              onDelete={() => onDelete(a.id)}
              onOpenEditor={() => {}}
            />
          ))
        )}
      </div>

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={onAddRule}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300/80 py-2 text-[11px] font-medium text-[var(--color-ink-muted)] transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600"
        >
          <Plus className="size-3" />
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ── Quick Rule Form (create new) ──

function QuickRuleForm({
  pipelineId,
  stages,
  defaultTrigger,
  defaultToStageId,
  initial,
  onSubmit,
  onCancel,
}: {
  pipelineId: string;
  stages: StageRow[];
  defaultTrigger: string;
  defaultToStageId?: string;
  initial: AutomationRow | null;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const initCfg = (initial?.triggerConfig ?? {}) as Record<string, unknown>;
  const [name, setName] = React.useState(initial?.name ?? "");
  const [trigger, setTrigger] = React.useState(initial?.triggerType ?? defaultTrigger);
  const [toStageId, setToStageId] = React.useState(defaultToStageId ?? (initCfg.toStageId as string) ?? "");
  const [fromStageId, setFromStageId] = React.useState((initCfg.fromStageId as string) ?? "");
  const [channel, setChannel] = React.useState((initCfg.channel as string) ?? "");
  const [actions, setActions] = React.useState<ActionDraft[]>([{ type: "send_message", value: "" }]);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    fetch(apiUrl(`/api/automations/${initial.id}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.steps?.length) return;
        const loaded: ActionDraft[] = data.steps.map((s: { type: string; config: Record<string, unknown> }) => {
          const cfg = s.config ?? {};
          switch (s.type) {
            case "send_whatsapp_message": return { type: "send_message", value: String(cfg.content ?? "") };
            case "move_stage": return { type: "move_stage", value: String(cfg.stageId ?? "") };
            case "assign_owner": return { type: "assign_owner", value: String(cfg.userId ?? "") };
            case "add_tag": return { type: "add_tag", value: String(cfg.tagName ?? "") };
            case "update_field":
              return cfg.field === "lifecycleStage"
                ? { type: "change_lifecycle", value: String(cfg.value ?? "") }
                : { type: "send_message", value: "" };
            case "send_email": return { type: "send_email", value: [cfg.subject, cfg.body].filter(Boolean).join(" | ") };
            case "create_activity": return { type: "create_activity", value: String(cfg.title ?? "") };
            case "webhook": return { type: "webhook", value: String(cfg.url ?? "") };
            default: return { type: "send_message", value: "" };
          }
        });
        setActions(loaded.length > 0 ? loaded : [{ type: "send_message", value: "" }]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [initial]);

  const addAction = () => setActions((p) => [...p, { type: "send_message", value: "" }]);
  const updateAction = (idx: number, patch: Partial<ActionDraft>) =>
    setActions((p) => p.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const removeAction = (idx: number) => setActions((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validActions = actions.filter((a) => a.value.trim());
    if (validActions.length === 0) {
      setError("Adicione ao menos uma ação com valor.");
      return;
    }

    setIsPending(true);
    setError("");

    const triggerConfig: Record<string, unknown> = { pipelineId };
    if (defaultToStageId) triggerConfig.stageId = defaultToStageId;
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
        case "move_stage": return { type: "move_stage", config: { stageId: v } };
        case "change_lifecycle": return { type: "update_field", config: { entity: "contact", field: "lifecycleStage", value: v } };
        case "send_message": return { type: "send_whatsapp_message", config: { content: v } };
        case "assign_owner": return { type: "assign_owner", config: { userId: v } };
        case "add_tag": return { type: "add_tag", config: { tagName: v } };
        case "send_email": {
          const [subject, ...rest] = v.split("|").map((s) => s.trim());
          return { type: "send_email", config: { subject: subject || v, body: rest.join("|") } };
        }
        case "create_activity": return { type: "create_activity", config: { type: "TASK", title: v } };
        case "webhook": return { type: "webhook", config: { url: v, method: "POST" } };
        default: return { type: a.type, config: { value: v } };
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
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsPending(false);
    }
  };

  const isFixedTrigger = defaultTrigger === "deal_created" || defaultTrigger === "deal_won" || defaultTrigger === "deal_lost";
  const availableTriggers = isFixedTrigger ? [defaultTrigger] : STAGE_TRIGGERS;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-1.5">
        <Label className="text-xs">Nome da regra</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Notificar time" required className="h-8 text-sm" />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">Gatilho</Label>
        <SelectNative value={trigger} onChange={(e) => setTrigger(e.target.value)} className="h-8 text-sm" disabled={availableTriggers.length === 1}>
          {availableTriggers.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t] ?? t}</option>)}
        </SelectNative>
      </div>

      {trigger === "stage_changed" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px]">De</Label>
            <SelectNative value={fromStageId} onChange={(e) => setFromStageId(e.target.value)} className="h-7 text-xs">
              <option value="">Qualquer</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectNative>
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px]">Para</Label>
            <SelectNative value={toStageId} onChange={(e) => setToStageId(e.target.value)} className="h-7 text-xs">
              <option value="">Qualquer</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectNative>
          </div>
        </div>
      )}

      {(trigger === "message_received" || trigger === "message_sent") && (
        <div className="grid gap-1">
          <Label className="text-[10px]">Canal</Label>
          <SelectNative value={channel} onChange={(e) => setChannel(e.target.value)} className="h-7 text-xs">
            <option value="">Todos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="email">E-mail</option>
          </SelectNative>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Ações ({actions.length})</Label>
          <Button type="button" variant="outline" size="sm" className="h-6 gap-1 text-[10px]" onClick={addAction}>
            <Plus className="size-2.5" /> Ação
          </Button>
        </div>
        {actions.map((action, idx) => (
          <div key={idx} className="rounded-md border border-border bg-white p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white">{idx + 1}</span>
              <SelectNative value={action.type} onChange={(e) => updateAction(idx, { type: e.target.value })} className="h-7 flex-1 text-xs">
                {ACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectNative>
              <button type="button" onClick={() => removeAction(idx)} className="p-0.5 text-[var(--color-ink-muted)] hover:text-red-500">
                <Trash2 className="size-3" />
              </button>
            </div>
            {action.type === "move_stage" ? (
              <SelectNative value={action.value} onChange={(e) => updateAction(idx, { value: e.target.value })} className="h-7 text-xs">
                <option value="">Selecione…</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectNative>
            ) : action.type === "change_lifecycle" ? (
              <SelectNative value={action.value} onChange={(e) => updateAction(idx, { value: e.target.value })} className="h-7 text-xs">
                <option value="">Selecione…</option>
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
                className="w-full resize-none rounded border border-border bg-white px-2 py-1 text-xs outline-none placeholder:text-[var(--color-ink-muted)] focus-visible:ring-1 focus-visible:ring-indigo-400"
              />
            ) : (
              <Input
                value={action.value}
                onChange={(e) => updateAction(idx, { value: e.target.value })}
                placeholder={ACTION_PLACEHOLDERS[action.type] ?? "Valor…"}
                className="h-7 text-xs"
              />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={isPending || !name.trim() || actions.length === 0} className="gap-1.5">
          {isPending && <Loader2 className="size-3 animate-spin" />}
          {initial ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Link existing automation form ──

function LinkExistingForm({
  pipelineId,
  stages,
  targetTrigger,
  targetStageId,
  currentAutomationIds,
  onSubmit,
  onCancel,
}: {
  pipelineId: string;
  stages: StageRow[];
  targetTrigger: string;
  targetStageId?: string;
  currentAutomationIds: Set<string>;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);

  const { data: allAutomations = [] } = useQuery({
    queryKey: ["automations-linkable"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/automations?perPage=200"));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []) as AutomationRow[];
    },
  });

  const linkable = allAutomations.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const linkAutomation = async (automation: AutomationRow) => {
    setIsPending(true);
    try {
      const existingConfig = automation.triggerConfig ?? {};
      const newConfig: Record<string, unknown> = {
        ...existingConfig,
        pipelineId,
      };

      if (targetStageId) {
        newConfig.stageId = targetStageId;
      }
      if (targetTrigger === "stage_changed" && targetStageId) {
        newConfig.toStageId = targetStageId;
      }

      const res = await fetch(apiUrl(`/api/automations/${automation.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggerType: targetTrigger,
          triggerConfig: newConfig,
        }),
      });
      if (!res.ok) throw new Error("Erro ao vincular");
      onSubmit();
    } catch {
      // silently fail
    } finally {
      setIsPending(false);
    }
  };

  const stageName = targetStageId ? stages.find((s) => s.id === targetStageId)?.name : null;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
        <p className="text-[11px] text-indigo-700">
          Vincular automação existente ao gatilho{" "}
          <strong>{TRIGGER_LABELS[targetTrigger] ?? targetTrigger}</strong>
          {stageName && <> na etapa <strong>{stageName}</strong></>}.
          O gatilho da automação será atualizado.
        </p>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar automação por nome…"
        className="h-8 text-sm"
      />

      <div className="max-h-60 space-y-1 overflow-y-auto">
        {linkable.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--color-ink-muted)]">Nenhuma automação disponível.</p>
        ) : (
          linkable.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={isPending}
              onClick={() => linkAutomation(a)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
            >
              <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", a.active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-[var(--color-ink-muted)]")}>
                <Bot className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{a.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{TRIGGER_LABELS[a.triggerType] ?? a.triggerType}</span>
                  <span>·</span>
                  <span>{a.stepCount} ação{a.stepCount !== 1 ? "ões" : ""}</span>
                  <span className={cn("size-1.5 rounded-full", a.active ? "bg-emerald-500" : "bg-slate-300")} />
                </div>
              </div>
              <Link2 className="size-3.5 shrink-0 text-[var(--color-ink-muted)]" />
            </button>
          ))
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
      </DialogFooter>
    </div>
  );
}

// ── Add automation dialog (mode chooser) ──

type DialogMode = "choose" | "create" | "link";

function AddAutomationDialog({
  open,
  onOpenChange,
  pipelineId,
  stages,
  defaultTrigger,
  defaultToStageId,
  editingRule,
  currentAutomationIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipelineId: string;
  stages: StageRow[];
  defaultTrigger: string;
  defaultToStageId?: string;
  editingRule: AutomationRow | null;
  currentAutomationIds: Set<string>;
  onDone: () => void;
}) {
  const [mode, setMode] = React.useState<DialogMode>(editingRule ? "create" : "choose");

  React.useEffect(() => {
    if (open) {
      setMode(editingRule ? "create" : "choose");
    }
  }, [open, editingRule]);

  const close = () => {
    onOpenChange(false);
  };

  const stageName = defaultToStageId ? stages.find((s) => s.id === defaultToStageId)?.name : null;
  const triggerLabel = TRIGGER_LABELS[defaultTrigger] ?? defaultTrigger;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogClose />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4 text-indigo-600" />
            {editingRule
              ? "Editar Automação"
              : mode === "choose"
                ? "Adicionar Automação"
                : mode === "create"
                  ? "Criar Nova Automação"
                  : "Vincular Automação"}
          </DialogTitle>
        </DialogHeader>

        {mode === "choose" && (
          <div className="space-y-3">
            {stageName && (
              <div className="rounded-lg border border-border bg-[var(--color-bg-subtle)] px-3 py-2">
                <p className="text-[11px] text-[var(--color-ink-soft)]">
                  Etapa: <strong className="text-slate-800">{stageName}</strong>
                  {" · "}Gatilho: <strong className="text-slate-800">{triggerLabel}</strong>
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setMode("create")}
                className="flex items-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-4 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <Plus className="size-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Criar nova automação</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Configure gatilho e ações do zero para esta etapa.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("link")}
                className="flex items-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-4 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50/30 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                  <Link2 className="size-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Vincular automação existente</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Conecte uma automação já criada a esta etapa do funil.
                  </p>
                </div>
              </button>

              <NextLink
                href="/automations/new"
                className="flex items-center gap-3 rounded-xl border-2 border-border bg-white px-4 py-4 text-left transition-all hover:border-violet-400 hover:bg-violet-50/30 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                  <ExternalLink className="size-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Abrir editor visual</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Construa um fluxo completo no editor de automações.
                  </p>
                </div>
              </NextLink>
            </div>
          </div>
        )}

        {mode === "create" && (
          <QuickRuleForm
            pipelineId={pipelineId}
            stages={stages}
            defaultTrigger={defaultTrigger}
            defaultToStageId={defaultToStageId}
            initial={editingRule}
            onSubmit={onDone}
            onCancel={() => (editingRule ? close() : setMode("choose"))}
          />
        )}

        {mode === "link" && (
          <LinkExistingForm
            pipelineId={pipelineId}
            stages={stages}
            targetTrigger={defaultTrigger}
            targetStageId={defaultToStageId}
            currentAutomationIds={currentAutomationIds}
            onSubmit={onDone}
            onCancel={() => setMode("choose")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Funnel Automations Component ──

export function FunnelAutomations({
  pipelineId,
  stages,
  automations,
}: {
  pipelineId: string;
  stages: StageRow[];
  automations: AutomationRow[];
}) {
  const queryClient = useQueryClient();
  const [ruleFormOpen, setRuleFormOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AutomationRow | null>(null);
  const [defaultTrigger, setDefaultTrigger] = React.useState("stage_changed");
  const [defaultToStageId, setDefaultToStageId] = React.useState<string | undefined>();

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/automations/${id}/toggle`), { method: "POST" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations-all"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/automations/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations-all"] }),
  });

  const automationsForStage = (stageId: string): AutomationRow[] =>
    automations.filter((a) => {
      const cfg = a.triggerConfig as Record<string, unknown> | null;
      if (!cfg) return false;
      if (cfg.stageId === stageId) return true;
      if (a.triggerType === "stage_changed" && cfg.toStageId === stageId) return true;
      return false;
    });

  const automationsForEvent = (event: string): AutomationRow[] =>
    automations.filter((a) => a.triggerType === event);

  const currentAutomationIds = React.useMemo(
    () => new Set(automations.map((a) => a.id)),
    [automations],
  );

  const openAdd = (trigger: string, toStageId?: string) => {
    setEditingRule(null);
    setDefaultTrigger(trigger);
    setDefaultToStageId(toStageId);
    setRuleFormOpen(true);
  };

  const openEdit = (a: AutomationRow) => {
    setEditingRule(a);
    setDefaultTrigger(a.triggerType);
    setDefaultToStageId((a.triggerConfig?.toStageId as string) ?? undefined);
    setRuleFormOpen(true);
  };

  const orderedStages = stages.filter((s) => !s.isIncoming).sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bot className="size-5 text-indigo-600" />
        <div>
          <h2 className="text-base font-bold text-slate-800">Funil de Automações</h2>
          <p className="text-[11px] text-slate-500">
            Visualize e configure robôs de automação em cada fase do pipeline.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/80 bg-white px-3 py-2 text-[10px] text-slate-500">
        <span className="font-semibold text-foreground">Legenda:</span>
        {Object.entries(TRIGGER_ICON).map(([key, icon]) => (
          <span key={key} className="inline-flex items-center gap-1">
            {icon} {TRIGGER_LABELS[key]}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-3" style={{ minWidth: "fit-content" }}>
          <FunnelColumn
            title="Entrada"
            color="#3b82f6"
            icon={<Flag className="size-3.5" />}
            automations={automationsForEvent("deal_created")}
            onAddRule={() => openAdd("deal_created")}
            onToggle={(id) => toggleMutation.mutate(id)}
            onEdit={openEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />

          <div className="flex items-center">
            <ChevronRight className="size-5 text-slate-300" />
          </div>

          {orderedStages.map((stage, idx) => (
            <React.Fragment key={stage.id}>
              <FunnelColumn
                title={stage.name}
                color={stage.color}
                automations={automationsForStage(stage.id)}
                onAddRule={() => openAdd("stage_changed", stage.id)}
                onToggle={(id) => toggleMutation.mutate(id)}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
              {idx < orderedStages.length - 1 && (
                <div className="flex items-center">
                  <ChevronRight className="size-4 text-slate-200" />
                </div>
              )}
            </React.Fragment>
          ))}

          <div className="flex items-center">
            <ChevronRight className="size-5 text-slate-300" />
          </div>

          <FunnelColumn
            title="Ganho"
            color="#22c55e"
            icon={<Trophy className="size-3.5" />}
            automations={automationsForEvent("deal_won")}
            onAddRule={() => openAdd("deal_won")}
            onToggle={(id) => toggleMutation.mutate(id)}
            onEdit={openEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />

          <FunnelColumn
            title="Perdido"
            color="#ef4444"
            icon={<XCircle className="size-3.5" />}
            automations={automationsForEvent("deal_lost")}
            onAddRule={() => openAdd("deal_lost")}
            onToggle={(id) => toggleMutation.mutate(id)}
            onEdit={openEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        </div>
      </div>

      <div className="flex items-center gap-6 rounded-lg border border-border/80 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100">
            <Bot className="size-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{automations.length}</p>
            <p className="text-[10px] text-slate-500">Automações totais</p>
          </div>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-[var(--color-ink-soft)]">{automations.filter((a) => a.active).length} ativas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-slate-300" />
          <span className="text-xs text-[var(--color-ink-soft)]">{automations.filter((a) => !a.active).length} inativas</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-[11px] text-slate-500">
          {["deal_created", "stage_changed", "deal_won", "deal_lost"].map((t) => (
            <Badge key={t} variant="outline" className="gap-1 text-[10px]">
              {TRIGGER_ICON[t]} {automationsForEvent(t).length}
            </Badge>
          ))}
        </div>
      </div>

      <AddAutomationDialog
        open={ruleFormOpen}
        onOpenChange={(v) => {
          if (!v) { setRuleFormOpen(false); setEditingRule(null); }
          else setRuleFormOpen(true);
        }}
        pipelineId={pipelineId}
        stages={stages}
        defaultTrigger={defaultTrigger}
        defaultToStageId={defaultToStageId}
        editingRule={editingRule}
        currentAutomationIds={currentAutomationIds}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["automations-all"] });
          setRuleFormOpen(false);
          setEditingRule(null);
        }}
      />
    </div>
  );
}
