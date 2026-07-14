"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowsLeftRight as ArrowRightLeft, IconRobot as Bot, IconCalendar as Calendar, IconCircleCheck as CheckCircle2, IconClock as Clock, IconFileText as FileText, IconFlame as Flame, IconLoader2 as Loader2, IconPhone as Phone, IconPlus as Plus, IconSend as Send, IconSparkles as Sparkles, IconTarget as Target, IconBolt as Zap } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SelectNative } from "@/components/ui/select";

type Props = {
  conversationId: string;
  contactId: string;
  contactPhone?: string | null;
  lastInboundAt?: string | null;
  onSendTemplate: () => void;
  onCreateDeal: () => void;
  onAddTask: () => void;
};

type StageOption = { id: string; name: string; color: string; position: number };
type ActivityItem = { id: string; type: string; title: string; createdAt: string; completed: boolean };

const TYPE_ICON: Record<string, React.ElementType> = {
  CALL: Phone, EMAIL: Send, MEETING: Target, TASK: CheckCircle2, NOTE: FileText, WHATSAPP: Send, OTHER: Clock,
};
const TYPE_LABEL: Record<string, string> = {
  CALL: "Ligação", EMAIL: "E-mail", MEETING: "Reunião", TASK: "Tarefa", NOTE: "Nota", WHATSAPP: "WhatsApp", OTHER: "Outro",
};

function getAISuggestions(lastInboundAt?: string | null): { icon: React.ElementType; text: string; urgency: "high" | "medium" | "low" }[] {
  const suggestions: { icon: React.ElementType; text: string; urgency: "high" | "medium" | "low" }[] = [];
  if (!lastInboundAt) {
    suggestions.push({ icon: Send, text: "Enviar primeiro contato", urgency: "medium" });
    return suggestions;
  }
  const hours = (Date.now() - new Date(lastInboundAt).getTime()) / 3_600_000;
  if (hours < 1) {
    suggestions.push({ icon: Flame, text: "Engajamento alto — agir agora!", urgency: "high" });
    suggestions.push({ icon: FileText, text: "Enviar proposta comercial", urgency: "high" });
  } else if (hours < 24) {
    suggestions.push({ icon: Zap, text: "Enviar follow-up", urgency: "medium" });
    suggestions.push({ icon: Phone, text: "Agendar ligação", urgency: "medium" });
  } else if (hours < 72) {
    suggestions.push({ icon: Send, text: "Reengajar com template", urgency: "medium" });
  } else {
    suggestions.push({ icon: Bot, text: "Reativar — sem resposta há dias", urgency: "low" });
  }
  return suggestions;
}

const URGENCY_STYLE = {
  high: "border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]",
  medium: "border-[var(--color-warning)]/40 bg-[var(--color-warn-bg)] text-[var(--color-warning)]",
  low: "border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] text-[var(--text-muted)]",
};

export function QuickActionsPanel({ contactId, contactPhone, lastInboundAt, onSendTemplate, onCreateDeal, onAddTask }: Props) {
  const queryClient = useQueryClient();

  const { data: stages = [] } = useQuery<StageOption[]>({
    queryKey: ["pipeline-stages"],
    queryFn: async () => { const r = await fetch(apiUrl("/api/stages")); if (!r.ok) return []; const d = await r.json(); return Array.isArray(d) ? d : d.stages ?? []; },
    staleTime: 5 * 60_000,
  });

  const { data: activities = [] } = useQuery<ActivityItem[]>({
    queryKey: ["contact-activities", contactId],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/activities?contactId=${contactId}&perPage=5`));
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : d.items ?? d.activities ?? [];
    },
    enabled: !!contactId,
    staleTime: 30_000,
  });

  const moveDealMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const contactRes = await fetch(apiUrl(`/api/contacts/${contactId}`));
      const contactData = await contactRes.json();
      const openDeal = contactData?.deals?.find((d: { status: string }) => d.status === "OPEN");
      if (!openDeal) throw new Error("Nenhum negócio aberto");
      const r = await fetch(apiUrl(`/api/deals/${openDeal.id}/move`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, position: 0 }),
      });
      if (!r.ok) throw new Error("Erro ao mover");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-sidebar", contactId] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const suggestions = getAISuggestions(lastInboundAt);
  const nextActivity = activities.find((a) => !a.completed);

  return (
    <div className="flex w-[240px] shrink-0 flex-col border-l border-[var(--glass-border-subtle)] bg-white">
      <div className="border-b border-[var(--glass-border-subtle)] px-4 py-3">
        <span className="text-[13px] font-semibold text-[var(--brand-primary)]">Ações Rápidas</span>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {/* ═══ AÇÕES DO CONTATO ═══ */}
        <div className="p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Contato</p>
          <div className="grid grid-cols-2 gap-2">
            {contactPhone && (
              <a href={`tel:${contactPhone}`}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--glass-border-subtle)] bg-white p-3 text-center lumen-transition hover:-translate-y-0.5 hover:border-[var(--color-teal)] hover:shadow-md">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-success)]/10">
                  <Phone className="size-4 text-[var(--color-success)]" />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-primary)]">Ligar</span>
              </a>
            )}
            <button type="button" onClick={onSendTemplate}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--glass-border-subtle)] bg-white p-3 text-center lumen-transition hover:-translate-y-0.5 hover:border-[var(--color-teal)] hover:shadow-md">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
                <FileText className="size-4 text-[var(--brand-primary)]" />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)]">Template</span>
            </button>
          </div>
        </div>

        {/* ═══ AÇÕES DO NEGÓCIO ═══ */}
        <div className="border-t border-[var(--glass-border-subtle)] p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Negócio</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onCreateDeal}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--glass-border-subtle)] bg-white p-3 text-center lumen-transition hover:-translate-y-0.5 hover:border-[var(--color-teal)] hover:shadow-md">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-warning)]/10">
                <Target className="size-4 text-[var(--color-warning)]" />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)]">Proposta</span>
            </button>
            <button type="button" onClick={onAddTask}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--glass-border-subtle)] bg-white p-3 text-center lumen-transition hover:-translate-y-0.5 hover:border-[var(--color-teal)] hover:shadow-md">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand-secondary)]/10">
                <Plus className="size-4 text-[var(--brand-secondary)]" />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)]">Tarefa</span>
            </button>
          </div>

          {stages.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <ArrowRightLeft className="size-2.5" /> Alterar etapa
              </p>
              <SelectNative
                onChange={(e) => { if (e.target.value) moveDealMutation.mutate(e.target.value); }}
                disabled={moveDealMutation.isPending}
                className="h-8 w-full rounded-lg border-[var(--glass-border-subtle)] text-[11px]">
                <option value="">Selecionar etapa...</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectNative>
              {moveDealMutation.isPending && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <Loader2 className="size-3 animate-spin" /> Movendo...
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ PRÓXIMA AÇÃO ═══ */}
        <div className="border-t border-[var(--glass-border-subtle)] p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            <Calendar className="mb-0.5 mr-1 inline size-3" /> Próxima ação
          </p>
          {nextActivity ? (
            <div className="rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] p-2.5">
              <p className="text-[12px] font-semibold text-[var(--text-primary)]">{nextActivity.title}</p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                {TYPE_LABEL[nextActivity.type] ?? nextActivity.type} · {formatDistanceToNow(new Date(nextActivity.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[var(--glass-border-subtle)] p-2.5 text-center">
              <p className="text-[11px] text-[var(--text-muted)]">Nenhuma ação pendente</p>
            </div>
          )}
        </div>

        {/* ═══ SUGESTÕES IA ═══ */}
        {suggestions.length > 0 && (
          <div className="border-t border-[var(--glass-border-subtle)] p-4">
            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <Sparkles className="size-3 text-[var(--color-warning)]" /> Sugestões IA
            </p>
            <div className="space-y-1.5">
              {suggestions.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className={cn("flex items-center gap-2 rounded-xl border p-2 lumen-transition hover:scale-[1.02]", URGENCY_STYLE[s.urgency])}>
                    <Icon className="size-3.5 shrink-0" />
                    <span className="text-[11px] font-medium">{s.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ HISTÓRICO ═══ */}
        <div className="border-t border-[var(--glass-border-subtle)] p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            <Clock className="mb-0.5 mr-1 inline size-3" /> Histórico
          </p>
          {activities.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)]">Nenhuma tarefa registrada</p>
          ) : (
            <div className="space-y-0">
              {activities.slice(0, 5).map((a, idx) => {
                const Icon = TYPE_ICON[a.type] ?? Clock;
                const isLast = idx === Math.min(activities.length, 5) - 1;
                return (
                  <div key={a.id} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", a.completed ? "bg-[var(--color-success)]/10" : "bg-[var(--glass-bg-subtle)]")}>
                        <Icon className={cn("size-2.5", a.completed ? "text-[var(--color-success)]" : "text-[var(--text-muted)]")} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-[var(--glass-border-subtle)]" />}
                    </div>
                    <div className="min-w-0 pb-2.5">
                      <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">{a.title}</p>
                      <p className="text-[9px] text-[var(--text-muted)]">
                        {TYPE_LABEL[a.type] ?? a.type} · {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
