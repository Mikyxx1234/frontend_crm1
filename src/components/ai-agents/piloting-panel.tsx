"use client";

import { apiUrl } from "@/lib/api";
/**
 * Painel de "pilotagem" do agente de IA — controles operacionais que
 * moram ACIMA do prompt e não dependem do LLM pra serem respeitados.
 *
 * Agrupa em 6 seções colapsáveis:
 *  1. Saudação inicial
 *  2. Handoff por inatividade (timer + destino)
 *  3. Palavras-chave que forçam transferência
 *  4. Perguntas obrigatórias de qualificação
 *  5. Horário de atendimento
 *  6. Estilo de saída (conversational vs structured)
 *
 * A persistência é controlada pelo componente pai via props; este
 * painel é "controlled" e só dispara `onChange` quando algo muda.
 */

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Bot,
  CalendarClock,
  CheckCheck,
  Clock,
  Eye,
  Handshake,
  Keyboard,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  BusinessHoursConfig,
  BusinessHoursSlot,
  HandoffMode,
  OutputStyle,
  QualificationQuestion,
} from "@/lib/ai-agents/piloting";
import { cn } from "@/lib/utils";

export type PilotingValue = {
  openingMessage: string;
  openingDelayMs: number;
  inactivityTimerMs: number;
  inactivityHandoffMode: HandoffMode;
  inactivityHandoffUserId: string | null;
  inactivityFarewellMessage: string;
  keywordHandoffs: string[];
  qualificationQuestions: QualificationQuestion[];
  businessHours: BusinessHoursConfig;
  outputStyle: OutputStyle;
  simulateTyping: boolean;
  typingPerCharMs: number;
  markMessagesRead: boolean;
};

export function createDefaultPiloting(): PilotingValue {
  return {
    openingMessage: "",
    openingDelayMs: 0,
    inactivityTimerMs: 0,
    inactivityHandoffMode: "KEEP_OWNER",
    inactivityHandoffUserId: null,
    inactivityFarewellMessage: "",
    keywordHandoffs: [],
    qualificationQuestions: [],
    businessHours: {
      enabled: false,
      timezone: "America/Sao_Paulo",
      weekdays: [],
      offHoursMessage: "",
    },
    outputStyle: "conversational",
    simulateTyping: true,
    typingPerCharMs: 25,
    markMessagesRead: true,
  };
}

type Props = {
  value: PilotingValue;
  onChange: (next: PilotingValue) => void;
};

type UserOption = { id: string; name: string; email: string };

async function fetchHumanUsers(): Promise<UserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
    .map((u) => {
      const rec = u as Record<string, unknown>;
      return {
        id: String(rec.id ?? ""),
        name: String(rec.name ?? ""),
        email: String(rec.email ?? ""),
      };
    })
    .filter((u) => u.id && u.name);
}

export function PilotingPanel({ value, onChange }: Props) {
  const patch = React.useCallback(
    (p: Partial<PilotingValue>) => onChange({ ...value, ...p }),
    [value, onChange],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
        <Bot className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="text-[12px] leading-relaxed text-indigo-900 dark:text-indigo-200">
          <div className="font-semibold">Pilotagem do agente</div>
          <div className="mt-0.5 text-indigo-800/80 dark:text-indigo-300/80">
            Controles operacionais que funcionam fora do prompt — saudação,
            timers de inatividade, palavras-chave de handoff, qualificação
            obrigatória e horário de atendimento. Use isso pra garantir
            comportamento previsível mesmo quando o LLM improvisar.
          </div>
        </div>
      </div>

      <OpeningSection value={value} patch={patch} />
      <StyleSection value={value} patch={patch} />
      <HumanBehaviorSection value={value} patch={patch} />
      <InactivitySection value={value} patch={patch} />
      <KeywordSection value={value} patch={patch} />
      <QualificationSection value={value} patch={patch} />
      <BusinessHoursSection value={value} patch={patch} />
    </div>
  );
}

// ── Helpers de UI ─────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border bg-muted/10">
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/30">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {description}
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-3 border-t bg-background/50 p-4">{children}</div>
    </details>
  );
}

// ── Seção 1: Saudação ────────────────────────────────────────

/**
 * Heurística pra detectar quando o usuário escreveu INSTRUÇÕES pro
 * agente no campo de saudação (que é enviado LITERAL pro cliente).
 * Cenário recorrente: admin cola texto tipo "você deve sempre orientar
 * o cliente a..." achando que está configurando o comportamento, mas
 * o cliente recebe essa frase bizarra em segunda pessoa.
 *
 * Retornamos um array de sinais encontrados — zero significa "parece
 * uma saudação legítima".
 */
function detectInstructionLeakSignals(text: string): string[] {
  const normalized = text.toLowerCase();
  const signals: string[] = [];
  const patterns: Array<{ re: RegExp; label: string }> = [
    { re: /\bvoc[êe]\s+deve\b/, label: '"você deve"' },
    { re: /\bsempre\s+(oriente|orientar|informe|informar|pergunte|perguntar)\b/, label: '"sempre oriente/informe/pergunte"' },
    { re: /\bnunca\s+(revele|diga|envie|fale|informe)\b/, label: '"nunca revele/diga"' },
    { re: /\bap[óo]s\s+(passar|coletar|responder|enviar)\b/, label: '"após passar/coletar…"' },
    { re: /\bencerre\s+o\s+atendimento\b/, label: '"encerre o atendimento"' },
    { re: /\bfinalize\s+a\s+conversa\b/, label: '"finalize a conversa"' },
    { re: /\borient(e|ar)\s+o\s+cliente\b/, label: '"oriente o cliente"' },
    { re: /\bas\s+mensagens\s+que\s+(entrar|chegar)/, label: '"as mensagens que entrarão…"' },
    { re: /\bn[úu]mero\s+desativado\b/, label: '"número desativado"' },
  ];
  for (const { re, label } of patterns) {
    if (re.test(normalized) && !signals.includes(label)) {
      signals.push(label);
    }
  }
  return signals;
}

/** Preview simples: troca placeholders por valores de exemplo pro
 *  admin ver como o texto vai chegar no cliente. Não precisa ser
 *  idêntico ao renderTemplate do servidor (tem fallbacks diferentes)
 *  — só precisa dar uma ideia. */
function previewGreeting(raw: string): string {
  if (!raw.trim()) return "";
  return raw
    .replace(/\{\{\s*contact\.firstName\s*\}\}/gi, "Maria")
    .replace(/\{\{\s*contact\.name\s*\}\}/gi, "Maria Silva")
    .replace(/\{\{\s*contactName\s*\}\}/gi, "Maria Silva")
    .replace(/\{\{\s*deal\.title\s*\}\}/gi, "Curso de Gestão")
    .replace(/\{\{\s*dealTitle\s*\}\}/gi, "Curso de Gestão")
    .replace(/\{\{\s*stage\.name\s*\}\}/gi, "Negociação")
    .replace(/\{\{\s*stageName\s*\}\}/gi, "Negociação");
}

function OpeningSection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  const [showPreview, setShowPreview] = React.useState(false);
  const signals = React.useMemo(
    () => detectInstructionLeakSignals(value.openingMessage),
    [value.openingMessage],
  );
  const preview = React.useMemo(
    () => previewGreeting(value.openingMessage),
    [value.openingMessage],
  );

  return (
    <Section
      icon={MessageCircle}
      title="Saudação inicial"
      description="Mensagem enviada UMA vez, na primeira vez que o agente fala com o cliente."
    >
      <div className="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="text-[12px] leading-relaxed">
          Este texto é enviado <strong>palavra por palavra</strong> ao cliente.
          Escreva como se fosse <em>você</em> falando com ele. Para definir{" "}
          <em>comportamento</em> do agente (regras, tom, o que não dizer), use{" "}
          <strong>“Instruções adicionais”</strong> lá em cima do formulário.
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pilot-opening">Texto da saudação</Label>
        <textarea
          id="pilot-opening"
          rows={3}
          value={value.openingMessage}
          onChange={(e) => patch({ openingMessage: e.target.value })}
          placeholder="Ex.: Oi {{contact.firstName}}! Tudo bem? Sou o agente virtual. Como posso te ajudar hoje?"
          className={cn(
            "resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2",
            signals.length > 0
              ? "border-amber-400 focus-visible:ring-amber-500/40"
              : "border-border focus-visible:ring-indigo-500/40",
          )}
        />
        <p className="text-[11px] text-muted-foreground">
          Variáveis: <code>{"{{contact.firstName}}"}</code>,{" "}
          <code>{"{{contact.name}}"}</code>, <code>{"{{deal.title}}"}</code>,{" "}
          <code>{"{{stage.name}}"}</code>. Deixe vazio pra desativar.
        </p>
      </div>

      {signals.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="text-[12px] leading-relaxed">
            Este texto parece uma{" "}
            <strong>instrução para o agente</strong>, não uma fala para o
            cliente (encontramos {signals.join(", ")}). Se deixar assim, o
            cliente vai receber essa frase literalmente no WhatsApp. Mova para{" "}
            <strong>“Instruções adicionais”</strong> e troque aqui por uma
            saudação curta — algo como “Oi {"{{contact.firstName}}"}, aqui é o
            assistente virtual. Como posso ajudar?”.
          </div>
        </div>
      )}

      {value.openingMessage.trim().length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-3.5" />
              Prévia (como o cliente verá)
            </span>
            <span className="text-[11px] text-muted-foreground/70">
              {showPreview ? "Ocultar" : "Mostrar"}
            </span>
          </button>
          {showPreview && (
            <div className="border-t border-border/60 bg-background/50 p-3">
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-[#e7ffdb] px-3 py-2 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap dark:bg-emerald-500/15 dark:text-emerald-100">
                {preview}
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Exemplo com contato fictício "Maria Silva" /
                deal "Curso de Gestão".
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="pilot-opening-delay">
          Delay antes de enviar (segundos)
        </Label>
        <Input
          id="pilot-opening-delay"
          type="number"
          min={0}
          max={10}
          step={1}
          value={Math.round(value.openingDelayMs / 1000)}
          onChange={(e) =>
            patch({
              openingDelayMs: Math.max(0, Number(e.target.value) || 0) * 1000,
            })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          0 = imediato. Máximo 10 segundos.
        </p>
      </div>
    </Section>
  );
}

// ── Seção 2: Estilo de saída ─────────────────────────────────

function StyleSection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  return (
    <Section
      icon={Sparkles}
      title="Estilo de resposta"
      description="Força o agente a responder como humano em WhatsApp, evitando ficha técnica."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => patch({ outputStyle: "conversational" })}
          className={cn(
            "rounded-xl border p-3 text-left text-sm transition-colors",
            value.outputStyle === "conversational"
              ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
              : "border-border hover:bg-muted/40",
          )}
        >
          <div className="font-medium">Conversacional (recomendado)</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Texto corrido, 1–4 frases, sem bullets/markdown. Sempre termina
            com uma pergunta curta.
          </div>
        </button>
        <button
          type="button"
          onClick={() => patch({ outputStyle: "structured" })}
          className={cn(
            "rounded-xl border p-3 text-left text-sm transition-colors",
            value.outputStyle === "structured"
              ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
              : "border-border hover:bg-muted/40",
          )}
        >
          <div className="font-medium">Estruturado</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            Permite listas, markdown e cabeçalhos. Use pra suporte
            técnico ou FAQ.
          </div>
        </button>
      </div>
    </Section>
  );
}

// ── Seção 2.5: Comportamento humano (typing + read) ──────────

function HumanBehaviorSection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  // Prévia do tempo de "digitando" pra uma mensagem de referência.
  // 120 chars ~ frase média que o agente manda (3 linhas).
  const sampleLen = 120;
  const sampleMs = Math.min(
    1500 + sampleLen * Math.max(0, Math.min(value.typingPerCharMs, 200)),
    25_000,
  );
  const sampleSec = (sampleMs / 1000).toFixed(1);

  return (
    <Section
      icon={Keyboard}
      title="Comportamento humano"
      description="Mostra “digitando…” e marca a mensagem como lida (✔✔ azul) no WhatsApp do cliente antes de responder."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleCard
          icon={Keyboard}
          title="Simular “digitando…”"
          description={`Mostra o indicador por ${sampleSec}s (proporcional ao tamanho da resposta). A API Meta mantém até 25s ou até o envio.`}
          checked={value.simulateTyping}
          onChange={(v) => patch({ simulateTyping: v })}
        />
        <ToggleCard
          icon={CheckCheck}
          title="Marcar como lida (✔✔ azul)"
          description="Chama /messages com status=read na mensagem recebida antes do agente responder. Quando “digitando” está ligado, o read já acontece junto."
          checked={value.markMessagesRead}
          onChange={(v) => patch({ markMessagesRead: v })}
        />
      </div>

      {value.simulateTyping && (
        <div className="grid gap-2 sm:max-w-xs">
          <Label htmlFor="pilot-typing-pace">Velocidade de digitação</Label>
          <select
            id="pilot-typing-pace"
            value={String(value.typingPerCharMs)}
            onChange={(e) =>
              patch({ typingPerCharMs: Number(e.target.value) || 25 })
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="10">Rápida (10ms/char · ~6000 cpm)</option>
            <option value="25">Humana média (25ms/char · ~2400 cpm)</option>
            <option value="50">Deliberada (50ms/char · ~1200 cpm)</option>
            <option value="90">Lenta (90ms/char · ~670 cpm)</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            Base fixa de 1,5s + {value.typingPerCharMs}ms por caractere. Máximo
            25s por limitação da Meta.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <strong className="text-foreground">Como funciona:</strong> a Meta aceita o
        indicador somente respondendo a uma mensagem recebida dos últimos 30s.
        Se o cliente ficou quieto por mais tempo, o agente envia sem indicador
        (sem ruído nem erro). Falhas pontuais nesses endpoints nunca bloqueiam
        o envio da resposta.
      </div>
    </Section>
  );
}

function ToggleCard({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
        checked
          ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
          : "border-border hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          checked
            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{title}</span>
          <span
            className={cn(
              "inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
              checked ? "bg-indigo-500" : "bg-muted-foreground/30",
            )}
          >
            <span
              className={cn(
                "size-4 rounded-full bg-white shadow-sm transition-transform",
                checked ? "translate-x-[18px]" : "translate-x-0.5",
              )}
            />
          </span>
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {description}
        </div>
      </div>
    </button>
  );
}

// ── Seção 3: Inatividade ─────────────────────────────────────

function InactivitySection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  const { data: users = [] } = useQuery({
    queryKey: ["piloting-users"],
    queryFn: fetchHumanUsers,
  });

  const timerMinutes = Math.round(value.inactivityTimerMs / 60_000);

  return (
    <Section
      icon={Clock}
      title="Handoff por inatividade"
      description="Se o cliente parar de responder por X minutos depois do agente falar, transfere pra humano."
    >
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="pilot-timer">Inatividade (minutos)</Label>
        <Input
          id="pilot-timer"
          type="number"
          min={0}
          max={1440}
          step={5}
          value={timerMinutes}
          onChange={(e) =>
            patch({
              inactivityTimerMs:
                Math.max(0, Number(e.target.value) || 0) * 60_000,
            })
          }
        />
        <p className="text-[11px] text-muted-foreground">
          0 = desativado. Ex.: 30 = transfere se o cliente sumir por 30 min.
        </p>
      </div>

      {value.inactivityTimerMs > 0 && (
        <>
          <div className="grid gap-2">
            <Label>Para quem transferir</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <HandoffCard
                active={value.inactivityHandoffMode === "KEEP_OWNER"}
                onClick={() => patch({ inactivityHandoffMode: "KEEP_OWNER" })}
                title="Dono do deal"
                description="Volta pra quem já era dono do negócio (ou fica em fila se não houver)."
              />
              <HandoffCard
                active={value.inactivityHandoffMode === "SPECIFIC_USER"}
                onClick={() =>
                  patch({ inactivityHandoffMode: "SPECIFIC_USER" })
                }
                title="Usuário específico"
                description="Sempre transfere pro mesmo consultor."
              />
              <HandoffCard
                active={value.inactivityHandoffMode === "UNASSIGN"}
                onClick={() => patch({ inactivityHandoffMode: "UNASSIGN" })}
                title="Fila (sem dono)"
                description="Desatribui e deixa pra quem pegar primeiro."
              />
            </div>
          </div>

          {value.inactivityHandoffMode === "SPECIFIC_USER" && (
            <div className="grid gap-2 sm:max-w-sm">
              <Label htmlFor="pilot-handoff-user">Consultor</Label>
              <select
                id="pilot-handoff-user"
                value={value.inactivityHandoffUserId ?? ""}
                onChange={(e) =>
                  patch({ inactivityHandoffUserId: e.target.value || null })
                }
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <option value="">— selecione —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="pilot-farewell">
              Mensagem de despedida (opcional)
            </Label>
            <textarea
              id="pilot-farewell"
              rows={2}
              value={value.inactivityFarewellMessage}
              onChange={(e) =>
                patch({ inactivityFarewellMessage: e.target.value })
              }
              placeholder="Ex.: Vou passar a conversa pra um consultor humano pra te dar continuidade, tá?"
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
            <p className="text-[11px] text-muted-foreground">
              Enviada antes do handoff. Aceita as mesmas variáveis da saudação.
            </p>
          </div>
        </>
      )}
    </Section>
  );
}

function HandoffCard({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left text-sm transition-colors",
        active
          ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
          : "border-border hover:bg-muted/40",
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {active ? (
          <UserCheck className="size-3.5 text-indigo-600" />
        ) : (
          <Handshake className="size-3.5 text-muted-foreground" />
        )}
        {title}
      </div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">
        {description}
      </div>
    </button>
  );
}

// ── Seção 4: Keywords ────────────────────────────────────────

function KeywordSection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  const [draft, setDraft] = React.useState("");

  const addKeyword = () => {
    const k = draft.trim();
    if (!k) return;
    if (value.keywordHandoffs.includes(k)) {
      setDraft("");
      return;
    }
    patch({ keywordHandoffs: [...value.keywordHandoffs, k] });
    setDraft("");
  };

  const removeKeyword = (k: string) =>
    patch({ keywordHandoffs: value.keywordHandoffs.filter((x) => x !== k) });

  return (
    <Section
      icon={Ban}
      title="Palavras-chave que forçam handoff"
      description="Se a mensagem do cliente contém alguma dessas, transfere IMEDIATAMENTE pra humano."
    >
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addKeyword();
            }
          }}
          placeholder="Ex.: cancelar, reclamação, atendente"
        />
        <Button type="button" variant="outline" onClick={addKeyword}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
      {value.keywordHandoffs.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Nenhuma palavra configurada. O agente decide sozinho quando
          transferir via LLM.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.keywordHandoffs.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-[12px]"
            >
              {k}
              <button
                type="button"
                onClick={() => removeKeyword(k)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remover "${k}"`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Match por substring, ignora acentos/maiúsculas. Usa o mesmo destino
        do handoff por inatividade.
      </p>
    </Section>
  );
}

// ── Seção 5: Qualificação ────────────────────────────────────

function QualificationSection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  const [draftQuestion, setDraftQuestion] = React.useState("");
  const [draftHint, setDraftHint] = React.useState("");

  const add = () => {
    const q = draftQuestion.trim();
    if (!q) return;
    const id = Math.random().toString(36).slice(2, 10);
    patch({
      qualificationQuestions: [
        ...value.qualificationQuestions,
        { id, question: q, hint: draftHint.trim() || undefined },
      ],
    });
    setDraftQuestion("");
    setDraftHint("");
  };

  const remove = (id: string) =>
    patch({
      qualificationQuestions: value.qualificationQuestions.filter(
        (q) => q.id !== id,
      ),
    });

  return (
    <Section
      icon={UserCheck}
      title="Perguntas obrigatórias de qualificação"
      description="O agente não transfere pra humano enquanto essas informações não forem coletadas."
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
        <Input
          value={draftQuestion}
          onChange={(e) => setDraftQuestion(e.target.value)}
          placeholder='Ex.: "Qual sua cidade?"'
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Input
          value={draftHint}
          onChange={(e) => setDraftHint(e.target.value)}
          placeholder="Formato (opcional)"
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>

      {value.qualificationQuestions.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          Sem perguntas obrigatórias. O agente decide quando tem informação
          suficiente.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {value.qualificationQuestions.map((q) => (
            <li
              key={q.id}
              className="flex items-start justify-between gap-2 rounded-lg border bg-muted/30 p-2 text-[13px]"
            >
              <div className="min-w-0">
                <div className="font-medium">{q.question}</div>
                {q.hint && (
                  <div className="text-[11px] text-muted-foreground">
                    Formato: {q.hint}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(q.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remover pergunta"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        Essas instruções viram parte do system prompt. O LLM vai coletar
        naturalmente ao longo da conversa (não pede tudo de uma vez).
      </p>
    </Section>
  );
}

// ── Seção 6: Horário de atendimento ──────────────────────────

const DAYS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

function BusinessHoursSection({
  value,
  patch,
}: {
  value: PilotingValue;
  patch: (p: Partial<PilotingValue>) => void;
}) {
  const bh = value.businessHours;

  const toggleEnabled = (enabled: boolean) => {
    // Se ligando e sem slots, bota um default seg-sex 9h-18h.
    if (enabled && bh.weekdays.length === 0) {
      patch({
        businessHours: {
          ...bh,
          enabled: true,
          weekdays: [1, 2, 3, 4, 5].map((day) => ({
            day,
            start: "09:00",
            end: "18:00",
          })),
        },
      });
      return;
    }
    patch({ businessHours: { ...bh, enabled } });
  };

  const toggleDay = (day: number) => {
    const existing = bh.weekdays.find((s) => s.day === day);
    if (existing) {
      patch({
        businessHours: {
          ...bh,
          weekdays: bh.weekdays.filter((s) => s.day !== day),
        },
      });
    } else {
      patch({
        businessHours: {
          ...bh,
          weekdays: [
            ...bh.weekdays,
            { day, start: "09:00", end: "18:00" },
          ].sort((a, b) => a.day - b.day),
        },
      });
    }
  };

  const updateSlot = (
    day: number,
    field: "start" | "end",
    val: string,
  ) => {
    patch({
      businessHours: {
        ...bh,
        weekdays: bh.weekdays.map((s) =>
          s.day === day ? ({ ...s, [field]: val } as BusinessHoursSlot) : s,
        ),
      },
    });
  };

  return (
    <Section
      icon={CalendarClock}
      title="Horário de atendimento"
      description="Fora do horário, o agente não responde. Pode enviar mensagem automática avisando."
    >
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bh.enabled}
            onChange={(e) => toggleEnabled(e.target.checked)}
          />
          Ativar horário comercial
        </label>
      </div>

      {bh.enabled && (
        <>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="pilot-tz">Fuso horário</Label>
            <select
              id="pilot-tz"
              value={bh.timezone}
              onChange={(e) =>
                patch({ businessHours: { ...bh, timezone: e.target.value } })
              }
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              <option value="America/Sao_Paulo">America/Sao_Paulo</option>
              <option value="America/Manaus">America/Manaus</option>
              <option value="America/Rio_Branco">America/Rio_Branco</option>
              <option value="America/Noronha">America/Noronha</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Dias e horários</Label>
            <div className="space-y-1.5">
              {DAYS.map((d) => {
                const slot = bh.weekdays.find((s) => s.day === d.id);
                const enabled = !!slot;
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2",
                      enabled ? "bg-background" : "bg-muted/30",
                    )}
                  >
                    <label className="inline-flex min-w-[64px] items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleDay(d.id)}
                      />
                      {d.label}
                    </label>
                    {enabled && slot ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            updateSlot(d.id, "start", e.target.value)
                          }
                          className="h-8 w-28"
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            updateSlot(d.id, "end", e.target.value)
                          }
                          className="h-8 w-28"
                        />
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">
                        Fechado
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pilot-offhours">
              Mensagem fora do horário (opcional)
            </Label>
            <textarea
              id="pilot-offhours"
              rows={2}
              value={bh.offHoursMessage ?? ""}
              onChange={(e) =>
                patch({
                  businessHours: { ...bh, offHoursMessage: e.target.value },
                })
              }
              placeholder="Ex.: Oi {{contact.firstName}}! Já recebemos sua mensagem. Nosso time responde de segunda a sexta, 9h às 18h."
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
          </div>
        </>
      )}
    </Section>
  );
}
