"use client";

import { apiUrl } from "@/lib/api";
/**
 * Painel lateral do Copilot de Automações.
 *
 * Duas abas:
 *   - Auditar: roda `/api/automations/[id]/audit?includeCrossConflicts=true`
 *     e mostra issues agrupadas por severidade.
 *   - Assistente: chat com `/api/automations/ai-assistant`. Patches
 *     propostos pelo copilot viram cards de diff aprováveis.
 *
 * Aplicar/descartar patches é client-side: muta o array `steps` via
 * `onStepsChange`. O operador ainda precisa clicar "Salvar" na top
 * bar pra persistir.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronRight,
  Info,
  Loader2,
  PanelRightClose,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AuditIssue, AuditSeverity } from "@/lib/automation-auditor";
import { applyCopilotPatch } from "@/lib/automation-copilot-patch";
import {
  stepTypeLabel,
  triggerTypeLabel,
  type AutomationStep,
} from "@/lib/automation-workflow";
import { cn } from "@/lib/utils";
import type { CopilotPatch } from "@/lib/copilot-client-types";

type AuditResponse = {
  automationId: string;
  automationName: string;
  triggerType: string;
  stepsCount: number;
  issues: AuditIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  crossConflicts: Array<{
    automationIds: string[];
    automationNames: string[];
    triggerType: string;
    sharedActionCategory: string;
    suggestedSeverity: AuditSeverity;
    reason: string;
  }>;
};

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /// Patches associados a ESSA mensagem (o assistant pode emitir N).
  patches?: Array<CopilotPatch & { applied?: boolean; dismissed?: boolean }>;
};

export type CopilotPanelProps = {
  automationId: string;
  automationName: string;
  description?: string;
  triggerType: string;
  triggerConfig?: unknown;
  active: boolean;
  steps: AutomationStep[];
  onStepsChange: (next: AutomationStep[]) => void;
  onClose: () => void;
};

const SEVERITY_ICON: Record<AuditSeverity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_CLASS: Record<AuditSeverity, string> = {
  error:
    "border-rose-200 bg-rose-50/70 text-rose-700",
  warning:
    "border-amber-200 bg-amber-50/70 text-amber-800",
  info: "border-sky-200 bg-sky-50/70 text-sky-700",
};

function newMsgId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function CopilotPanel(props: CopilotPanelProps) {
  const {
    automationId,
    automationName,
    description,
    triggerType,
    triggerConfig,
    active,
    steps,
    onStepsChange,
    onClose,
  } = props;

  const [tab, setTab] = useState<"audit" | "chat">("audit");

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l border-slate-200/60 bg-white/90 backdrop-blur-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-linear-to-r from-[#eef4ff]/40 to-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-brand-blue to-[#6f8cf5] text-white shadow-blue-glow">
            <Sparkles className="size-3.5" strokeWidth={2.6} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-black tracking-tight text-slate-900">
              Copilot de Automações
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Auditoria & Sugestões
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="flex size-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <PanelRightClose className="size-4" strokeWidth={2.4} />
        </button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "audit" | "chat")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 px-3 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="audit" className="flex-1">
              Auditar
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-1">
              Assistente
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="audit" className="mt-0 flex min-h-0 flex-1 flex-col px-3 pb-3">
          <AuditTab automationId={automationId} steps={steps} />
        </TabsContent>

        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col px-3 pb-3">
          <ChatTab
            automationId={automationId}
            automationName={automationName}
            description={description}
            triggerType={triggerType}
            triggerConfig={triggerConfig}
            active={active}
            steps={steps}
            onApplyPatch={(patch) => {
              const next = applyCopilotPatch(steps, patch);
              onStepsChange(next);
            }}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

// ── Audit Tab ───────────────────────────────────────────────────────

function AuditTab({
  automationId,
  steps,
}: {
  automationId: string;
  steps: AutomationStep[];
}) {
  const query = useQuery({
    queryKey: ["automation-audit", automationId],
    enabled: Boolean(automationId),
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${automationId}/audit?includeCrossConflicts=true`),
      );
      if (!res.ok) throw new Error("Falha ao auditar");
      return (await res.json()) as AuditResponse;
    },
  });

  const stepTypeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of steps) m.set(s.id, s.type);
    return m;
  }, [steps]);

  if (query.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="p-4 text-[12px] text-rose-600">
        {(query.error as Error).message ?? "Erro ao auditar."}
      </div>
    );
  }

  const report = query.data;
  if (!report) return null;

  const { issues, crossConflicts, errorCount, warningCount, infoCount } = report;
  const hasNothing = issues.length === 0 && crossConflicts.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Resumo */}
      <div className="flex shrink-0 items-center gap-2 px-1 py-2">
        <ResumePill tone="error" count={errorCount} label="erros" />
        <ResumePill tone="warning" count={warningCount} label="avisos" />
        <ResumePill tone="info" count={infoCount} label="infos" />
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="text-[11px] font-bold tracking-tight text-brand-blue hover:underline disabled:opacity-50"
        >
          {query.isFetching ? "Auditando…" : "Re-auditar"}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {hasNothing && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center">
            <Check className="size-6 text-emerald-500" strokeWidth={2.4} />
            <div className="text-[12px] font-bold text-emerald-800">
              Nenhum problema encontrado.
            </div>
            <div className="text-[11px] text-emerald-700/70">
              O grafo desta automação parece consistente.
            </div>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Problemas na automação
            </h4>
            {issues.map((iss, i) => {
              const stepLabel = iss.stepId
                ? stepTypeLabel(stepTypeById.get(iss.stepId) ?? "") ||
                  `Step ${iss.stepId.slice(0, 6)}`
                : null;
              return (
                <IssueCard
                  key={`${iss.code}-${i}`}
                  severity={iss.severity}
                  title={iss.message}
                  hint={iss.hint}
                  badge={stepLabel ? `Passo: ${stepLabel}` : null}
                  code={iss.code}
                />
              );
            })}
          </div>
        )}

        {crossConflicts.length > 0 && (
          <div className="space-y-2">
            <h4 className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Conflitos com outras automações
            </h4>
            {crossConflicts.map((c, i) => {
              const otherName =
                c.automationNames.find(
                  (_, idx) => c.automationIds[idx] !== automationId,
                ) ?? "outra automação";
              return (
                <IssueCard
                  key={`cross-${i}`}
                  severity={c.suggestedSeverity}
                  title={`Conflito potencial com "${otherName}"`}
                  hint={c.reason}
                  badge={`Gatilho: ${triggerTypeLabel(c.triggerType)}`}
                  code={c.sharedActionCategory}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumePill({
  tone,
  count,
  label,
}: {
  tone: AuditSeverity;
  count: number;
  label: string;
}) {
  const bg =
    count === 0
      ? "bg-slate-50 text-slate-400 ring-slate-200"
      : tone === "error"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-sky-50 text-sky-700 ring-sky-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ring-1",
        bg,
      )}
    >
      {count} {label}
    </span>
  );
}

function IssueCard({
  severity,
  title,
  hint,
  badge,
  code,
}: {
  severity: AuditSeverity;
  title: string;
  hint?: string;
  badge?: string | null;
  code: string;
}) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <div
      className={cn(
        "rounded-xl border p-3 shadow-sm",
        SEVERITY_CLASS[severity],
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-black leading-tight">{title}</div>
          {hint && (
            <div className="mt-1 text-[11px] font-medium leading-relaxed opacity-80">
              {hint}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            {badge && (
              <span className="inline-flex items-center rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-white/70">
                {badge}
              </span>
            )}
            <span className="text-[9px] font-mono opacity-50">{code}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat Tab ────────────────────────────────────────────────────────

function ChatTab({
  automationId,
  automationName,
  description,
  triggerType,
  triggerConfig,
  active,
  steps,
  onApplyPatch,
}: {
  automationId: string;
  automationName: string;
  description?: string;
  triggerType: string;
  triggerConfig?: unknown;
  active: boolean;
  steps: AutomationStep[];
  onApplyPatch: (patch: CopilotPatch) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const newUser: ChatMsg = { id: newMsgId(), role: "user", content: text };
      setMessages((prev) => [...prev, newUser]);

      const historyForApi = [...messages, newUser].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(apiUrl("/api/automations/ai-assistant"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAutomation: {
            id: automationId,
            name: automationName,
            description,
            triggerType,
            triggerConfig,
            active,
            steps,
          },
          messages: historyForApi,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? `Erro ${res.status}`);
      }
      return (await res.json()) as {
        text: string;
        patches: CopilotPatch[];
      };
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: newMsgId(),
          role: "assistant",
          content: data.text,
          patches: data.patches.map((p) => ({ ...p })),
        },
      ]);
    },
    onError: (e: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: newMsgId(),
          role: "assistant",
          content: `❌ ${e.message}`,
        },
      ]);
    },
  });

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft("");
    send.mutate(text);
  }, [draft, send]);

  const applyPatch = useCallback(
    (msgId: string, patchIdx: number) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg?.patches?.[patchIdx]) return;
      const patch = msg.patches[patchIdx];
      if (patch.applied || patch.dismissed) return;
      onApplyPatch(patch);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || !m.patches) return m;
          const patches = m.patches.map((p, i) =>
            i === patchIdx ? { ...p, applied: true } : p,
          );
          return { ...m, patches };
        }),
      );
    },
    [messages, onApplyPatch],
  );

  const dismissPatch = useCallback(
    (msgId: string, patchIdx: number) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || !m.patches) return m;
          const patches = m.patches.map((p, i) =>
            i === patchIdx ? { ...p, dismissed: true } : p,
          );
          return { ...m, patches };
        }),
      );
    },
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-slate-50/60 p-3"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="size-5 text-brand-blue" strokeWidth={2.2} />
            <div className="text-[12px] font-bold text-slate-700">
              Como posso ajudar com esta automação?
            </div>
            <div className="max-w-[280px] text-[11px] leading-relaxed text-slate-500">
              Peça análise de conflitos, sugestão de próximo passo ou explicação
              de algum comportamento. Patches propostos aparecem como cards de
              diff que você aprova ou descarta.
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatBubble
            key={m.id}
            msg={m}
            onApplyPatch={(i) => applyPatch(m.id, i)}
            onDismissPatch={(i) => dismissPatch(m.id, i)}
          />
        ))}
        {send.isPending && (
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2.4} />
            Copilot pensando…
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ex.: essa automação está conflitando com alguma outra?"
          rows={2}
          className="min-h-0 resize-none border-0 text-[12px] focus-visible:ring-0"
        />
        <Button
          type="button"
          size="sm"
          disabled={!draft.trim() || send.isPending}
          onClick={handleSend}
          className="h-8 gap-1"
        >
          <Send className="size-3.5" strokeWidth={2.4} />
          Enviar
        </Button>
      </div>
    </div>
  );
}

function ChatBubble({
  msg,
  onApplyPatch,
  onDismissPatch,
}: {
  msg: ChatMsg;
  onApplyPatch: (idx: number) => void;
  onDismissPatch: (idx: number) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12px] leading-relaxed shadow-sm",
          isUser
            ? "bg-brand-blue text-white"
            : "bg-white text-slate-800 ring-1 ring-slate-200",
        )}
      >
        {msg.content}
      </div>
      {msg.patches?.map((patch, i) => (
        <PatchDiffCard
          key={i}
          patch={patch}
          onApply={() => onApplyPatch(i)}
          onDismiss={() => onDismissPatch(i)}
        />
      ))}
    </div>
  );
}

// ── Patch Diff Card ─────────────────────────────────────────────────

function PatchDiffCard({
  patch,
  onApply,
  onDismiss,
}: {
  patch: CopilotPatch & { applied?: boolean; dismissed?: boolean };
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "w-full max-w-[92%] rounded-xl border bg-linear-to-br from-white to-[#f8faff] p-3 shadow-sm transition-opacity",
        patch.applied && "opacity-60",
        patch.dismissed && "opacity-40",
      )}
      style={{ borderColor: "#c9d7f5" }}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-blue" strokeWidth={2.4} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-black leading-tight text-slate-900">
            {patch.summary}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
            {patch.reasoning}
          </div>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold tracking-tight text-slate-500 hover:text-slate-800"
          >
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                open && "rotate-90",
              )}
              strokeWidth={2.4}
            />
            {open ? "Ocultar" : "Ver"} {patch.ops.length} alteraç{patch.ops.length === 1 ? "ão" : "ões"}
          </button>

          {open && (
            <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2">
              {patch.ops.map((op, i) => (
                <li key={i} className="font-mono text-[10px] leading-relaxed text-slate-700">
                  {formatOp(op)}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-2">
            {!patch.applied && !patch.dismissed && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={onApply}
                  className="h-7 gap-1 px-3 text-[11px]"
                >
                  <Check className="size-3" strokeWidth={2.6} />
                  Aplicar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onDismiss}
                  className="h-7 gap-1 px-3 text-[11px]"
                >
                  <X className="size-3" strokeWidth={2.6} />
                  Descartar
                </Button>
              </>
            )}
            {patch.applied && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200">
                <Check className="size-3" strokeWidth={2.6} />
                Aplicado — clique Salvar pra persistir
              </span>
            )}
            {patch.dismissed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 ring-1 ring-slate-200">
                Descartado
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatOp(op: CopilotPatch["ops"][number]): string {
  if (op.op === "add_step") {
    const label = stepTypeLabel(op.step.type);
    const after = op.after ? ` após ${op.after.slice(0, 6)}` : "";
    const handle = op.afterHandle ? ` [${op.afterHandle}]` : "";
    return `+ add ${label}${after}${handle}`;
  }
  if (op.op === "update_step_config") {
    const keys = Object.keys(op.config).join(", ");
    return `~ update ${op.stepId.slice(0, 6)} {${keys}}`;
  }
  if (op.op === "remove_step") {
    return `- remove ${op.stepId.slice(0, 6)}`;
  }
  if (op.op === "connect") {
    return `→ connect ${op.fromStepId.slice(0, 6)} [${op.handle}] → ${op.toStepId.slice(0, 6)}`;
  }
  return JSON.stringify(op);
}
