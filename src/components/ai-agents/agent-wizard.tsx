"use client";

import { apiUrl } from "@/lib/api";
/**
 * Wizard de criação de agente IA (6 etapas).
 *
 * Fluxo:
 *  1. Identidade   — nome, avatar, idioma
 *  2. Arquétipo    — SDR / Atendimento / Vendedor / Suporte
 *  3. Personalidade — tom, modelo, temperatura, prompt override (com preview)
 *  4. Ferramentas  — checkboxes agrupados por categoria
 *  5. Conhecimento — placeholder (configurado após a criação, fase 4)
 *  6. Revisão      — resumo + modo de autonomia + botão "Criar"
 *
 * Sai com um POST em /api/ai-agents. Defaults vêm do arquétipo
 * escolhido (tools + prompt + modelo sugerido).
 */

import { Loader2 } from "lucide-react";
import * as React from "react";

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
import {
  ARCHETYPES,
  type ArchetypeDescriptor,
  type ArchetypeId,
} from "@/lib/ai-agents/archetypes";
import { TOOLS_CATALOG, toolsByCategory } from "@/lib/ai-agents/tools-catalog";
import { cn } from "@/lib/utils";
import { ProductPolicyPanel } from "./product-policy-panel";

type StepId =
  | "identity"
  | "archetype"
  | "personality"
  | "tools"
  | "products"
  | "knowledge"
  | "review";

const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "identity", label: "Identidade", hint: "Nome e avatar" },
  { id: "archetype", label: "Arquétipo", hint: "Tipo de operador" },
  { id: "personality", label: "Personalidade", hint: "Tom e prompt" },
  { id: "tools", label: "Ferramentas", hint: "O que pode fazer" },
  { id: "products", label: "Produtos", hint: "Política de apresentação" },
  { id: "knowledge", label: "Conhecimento", hint: "Base de documentos" },
  { id: "review", label: "Revisão", hint: "Conferir e criar" },
];

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
];

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini — rápido e barato" },
  { value: "gpt-4o", label: "gpt-4o — mais capaz, mais caro" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini — intermediário" },
];

const TONE_PRESETS = [
  "amigável, curioso e objetivo",
  "consultivo, seguro e educado",
  "empático, paciente e profissional",
  "técnico, claro e paciente",
];

type AutonomyMode = "AUTONOMOUS" | "DRAFT";

type AgentWizardProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (agentId: string) => void;
};

export function AgentWizard({
  open,
  onOpenChange,
  onCreated,
}: AgentWizardProps) {
  const [step, setStep] = React.useState<StepId>("identity");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [language, setLanguage] = React.useState("pt-BR");
  const [archetype, setArchetype] = React.useState<ArchetypeId>("SDR");
  const [tone, setTone] = React.useState(TONE_PRESETS[0]);
  const [model, setModel] = React.useState("gpt-4o-mini");
  const [temperature, setTemperature] = React.useState(0.7);
  const [override, setOverride] = React.useState("");
  const [productPolicy, setProductPolicy] = React.useState("");
  const [enabledTools, setEnabledTools] = React.useState<string[]>([]);
  const [autonomyMode, setAutonomyMode] =
    React.useState<AutonomyMode>("DRAFT");

  const hasProductTool = enabledTools.includes("search_products");

  // Quando muda o arquétipo, puxa defaults (se o usuário ainda não
  // mexeu manualmente em tools/tom/modelo — detectamos isso por um
  // ref que guarda o último arquétipo aplicado).
  const lastAppliedArchetype = React.useRef<ArchetypeId | null>(null);
  React.useEffect(() => {
    if (lastAppliedArchetype.current === archetype) return;
    const a = ARCHETYPES.find((x) => x.id === archetype);
    if (a) {
      setTone(a.defaultTone);
      setModel(a.suggestedModel);
      setEnabledTools(a.defaultTools);
    }
    lastAppliedArchetype.current = archetype;
  }, [archetype]);

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      setStep("identity");
      setName("");
      setLanguage("pt-BR");
      setArchetype("SDR");
      setTone(TONE_PRESETS[0]);
      setModel("gpt-4o-mini");
      setTemperature(0.7);
      setOverride("");
      setProductPolicy("");
      setEnabledTools([]);
      setAutonomyMode("DRAFT");
      setError(null);
      lastAppliedArchetype.current = null;
    }
  }, [open]);

  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const isLast = step === "review";

  const canAdvance = () => {
    if (step === "identity") return name.trim().length > 0;
    if (step === "tools") return enabledTools.length > 0;
    return true;
  };

  const goNext = () => {
    const next = STEPS[currentIndex + 1];
    if (next) setStep(next.id);
  };
  const goBack = () => {
    const prev = STEPS[currentIndex - 1];
    if (prev) setStep(prev.id);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/ai-agents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          archetype,
          tone,
          language,
          model,
          temperature,
          systemPromptOverride: override.trim() || null,
          productPolicy: productPolicy.trim() || null,
          enabledTools,
          autonomyMode,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? "Erro ao criar agente.");
      }
      const data = await res.json();
      onCreated(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSubmitting(false);
    }
  };

  const archetypeDesc = ARCHETYPES.find((a) => a.id === archetype);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Novo agente IA</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 md:flex-row">
          <StepRail currentStep={step} onJump={setStep} />

          <div className="min-w-0 flex-1 space-y-5">
            {step === "identity" && (
              <IdentityStep
                name={name}
                setName={setName}
                language={language}
                setLanguage={setLanguage}
              />
            )}
            {step === "archetype" && (
              <ArchetypeStep value={archetype} onChange={setArchetype} />
            )}
            {step === "personality" && (
              <PersonalityStep
                name={name || "Agente"}
                language={language}
                archetype={archetypeDesc ?? ARCHETYPES[0]}
                tone={tone}
                setTone={setTone}
                model={model}
                setModel={setModel}
                temperature={temperature}
                setTemperature={setTemperature}
                override={override}
                setOverride={setOverride}
              />
            )}
            {step === "tools" && (
              <ToolsStep
                enabledTools={enabledTools}
                setEnabledTools={setEnabledTools}
              />
            )}
            {step === "products" && (
              <ProductsStep
                value={productPolicy}
                onChange={setProductPolicy}
                enabled={hasProductTool}
              />
            )}
            {step === "knowledge" && <KnowledgeStep />}
            {step === "review" && (
              <ReviewStep
                name={name}
                archetype={archetype}
                language={language}
                tone={tone}
                model={model}
                temperature={temperature}
                enabledTools={enabledTools}
                hasOverride={override.trim().length > 0}
                hasProductPolicy={productPolicy.trim().length > 0}
                autonomyMode={autonomyMode}
                setAutonomyMode={setAutonomyMode}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <div className="flex flex-1" />
          {currentIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={submitting}
            >
              Voltar
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || enabledTools.length === 0}
            >
              {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Criar agente
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={!canAdvance()}>
              Próximo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepRail({
  currentStep,
  onJump,
}: {
  currentStep: StepId;
  onJump: (s: StepId) => void;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);
  return (
    <nav className="md:w-48 md:shrink-0">
      <ol className="flex flex-row gap-2 overflow-x-auto md:flex-col">
        {STEPS.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s.id} className="md:w-full">
              <button
                type="button"
                onClick={() => {
                  // Só deixa voltar para etapas já vistas
                  if (i <= currentIdx) onJump(s.id);
                }}
                className={cn(
                  "flex min-w-max items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors md:w-full",
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-100"
                    : done
                      ? "border-border/70 bg-muted/30 text-foreground/80"
                      : "border-border/50 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                    active
                      ? "border-indigo-500 bg-indigo-500 text-white"
                      : done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border bg-background",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.label}</div>
                  <div className="hidden truncate text-[10px] font-normal opacity-60 md:block">
                    {s.hint}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function IdentityStep({
  name,
  setName,
  language,
  setLanguage,
}: {
  name: string;
  setName: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Como o agente vai se chamar?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          O nome aparece para os leads no WhatsApp e também nos seletores
          internos do CRM.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="w-name">Nome do agente</Label>
        <Input
          id="w-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Júlia (SDR)"
          autoFocus
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="w-lang">Idioma principal</Label>
        <select
          id="w-lang"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          {LANGUAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ArchetypeStep({
  value,
  onChange,
}: {
  value: ArchetypeId;
  onChange: (v: ArchetypeId) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Qual será o papel dele?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada arquétipo já vem com prompt, tom e ferramentas recomendadas.
          Você pode ajustar tudo nas próximas etapas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ARCHETYPES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left text-sm transition-colors",
              value === a.id
                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="font-semibold">{a.label}</div>
            <div className="text-[13px] text-muted-foreground">
              {a.longDescription}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {a.defaultTools.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PersonalityStep({
  name,
  language,
  archetype,
  tone,
  setTone,
  model,
  setModel,
  temperature,
  setTemperature,
  override,
  setOverride,
}: {
  name: string;
  language: string;
  archetype: ArchetypeDescriptor;
  tone: string;
  setTone: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  temperature: number;
  setTemperature: (v: number) => void;
  override: string;
  setOverride: (v: string) => void;
}) {
  // Renderiza o template trocando placeholders por valores atuais.
  const preview = React.useMemo(() => {
    const base = archetype.systemPromptTemplate
      .replaceAll("{{agent_name}}", name || "Agente")
      .replaceAll("{{company_name}}", "{{company_name}}")
      .replaceAll("{{tone}}", tone)
      .replaceAll("{{language}}", language);
    return override.trim() ? `${base}\n\n## Instruções adicionais\n${override}` : base;
  }, [archetype.systemPromptTemplate, name, tone, language, override]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Personalidade e modelo</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure o tom, o modelo LLM e eventuais regras específicas do seu
          negócio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="w-tone">Tom de voz</Label>
          <Input
            id="w-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Ex.: amigável, curioso e objetivo"
          />
          <div className="flex flex-wrap gap-1 pt-1">
            {TONE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTone(p)}
                className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="w-model">Modelo LLM</Label>
          <select
            id="w-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="grid gap-1 pt-2">
            <Label htmlFor="w-temp" className="text-xs font-normal">
              Temperatura: {temperature.toFixed(1)}
            </Label>
            <input
              id="w-temp"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Previsível</span>
              <span>Criativo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="w-override">Instruções adicionais (opcional)</Label>
        <textarea
          id="w-override"
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          rows={4}
          placeholder="Ex.: Nunca mencione nosso concorrente X. Sempre ofereça desconto de 10% pra alunos."
          className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        />
        <p className="text-[11px] text-muted-foreground">
          Essas instruções são somadas ao prompt do arquétipo no final.
        </p>
      </div>

      <details className="rounded-xl border border-border bg-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Pré-visualizar prompt completo
        </summary>
        <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-[11px] leading-relaxed">
          {preview}
        </pre>
      </details>
    </div>
  );
}

function ToolsStep({
  enabledTools,
  setEnabledTools,
}: {
  enabledTools: string[];
  setEnabledTools: (v: string[]) => void;
}) {
  const grouped = React.useMemo(() => toolsByCategory(), []);
  const toggle = (id: string) => {
    if (enabledTools.includes(id)) {
      setEnabledTools(enabledTools.filter((t) => t !== id));
    } else {
      setEnabledTools([...enabledTools, id]);
    }
  };

  const categoryLabel: Record<string, string> = {
    crm: "CRM",
    whatsapp: "WhatsApp",
    handoff: "Transferência",
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Ferramentas habilitadas</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina o que o agente pode fazer. Selecione pelo menos uma ferramenta.
          Recomendamos sempre deixar <strong>transfer_to_human</strong> ativo.
        </p>
      </div>

      {Object.entries(grouped).map(([cat, tools]) => (
        <div key={cat} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {categoryLabel[cat] ?? cat}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {tools.map((t) => {
              const active = enabledTools.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                    active
                      ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                      active
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-border",
                    )}
                  >
                    {active && <span className="text-[10px]">✓</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{t.label}</div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {t.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-lg bg-muted/40 p-3 text-[12px] text-muted-foreground">
        {enabledTools.length} ferramenta{enabledTools.length === 1 ? "" : "s"}{" "}
        habilitada{enabledTools.length === 1 ? "" : "s"}
        {enabledTools.length === 0 && (
          <span className="ml-1 text-destructive">
            — selecione pelo menos uma para continuar.
          </span>
        )}
      </div>
    </div>
  );
}

function ProductsStep({
  value,
  onChange,
  enabled,
}: {
  value: string;
  onChange: (v: string) => void;
  enabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Como apresentar produtos</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Quando a tool <strong>Consultar catálogo de produtos</strong> está
          ativa, o agente busca direto na base. Aqui você orienta o formato da
          apresentação — quais campos priorizar, tom pra falar de preço, quando
          oferecer handoff, etc.
        </p>
      </div>
      <ProductPolicyPanel value={value} onChange={onChange} enabled={enabled} />
    </div>
  );
}

function KnowledgeStep() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Base de conhecimento</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos que o agente pode consultar antes de responder (catálogo,
          política de descontos, FAQ, etc.).
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          📚
        </div>
        <p className="text-sm font-medium">
          Upload de documentos disponível após a criação
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Para não atrasar a criação, você sobe os arquivos (PDF, TXT, MD) na
          aba <strong>Conhecimento</strong> da página do agente. A indexação
          acontece em background com pgvector — leva alguns segundos por
          documento.
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  name,
  archetype,
  language,
  tone,
  model,
  temperature,
  enabledTools,
  hasOverride,
  hasProductPolicy,
  autonomyMode,
  setAutonomyMode,
}: {
  name: string;
  archetype: ArchetypeId;
  language: string;
  tone: string;
  model: string;
  temperature: number;
  enabledTools: string[];
  hasOverride: boolean;
  hasProductPolicy: boolean;
  autonomyMode: AutonomyMode;
  setAutonomyMode: (v: AutonomyMode) => void;
}) {
  const archDesc = ARCHETYPES.find((a) => a.id === archetype);
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Revisão e modo de operação</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Confira as configurações e escolha como o agente vai trabalhar.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <ReviewField label="Nome" value={name || "—"} />
          <ReviewField label="Arquétipo" value={archDesc?.label ?? archetype} />
          <ReviewField label="Idioma" value={language} />
          <ReviewField label="Tom" value={tone} />
          <ReviewField label="Modelo" value={model} />
          <ReviewField
            label="Temperatura"
            value={temperature.toFixed(1)}
          />
          <ReviewField
            label="Instruções extras"
            value={hasOverride ? "Sim" : "Não"}
          />
          <ReviewField
            label="Política de produtos"
            value={
              hasProductPolicy
                ? enabledTools.includes("search_products")
                  ? "Configurada"
                  : "Configurada (tool inativa)"
                : enabledTools.includes("search_products")
                  ? "Padrão"
                  : "N/A"
            }
          />
          <ReviewField
            label="Ferramentas"
            value={`${enabledTools.length} habilitada(s)`}
          />
        </div>
        {enabledTools.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {enabledTools.map((t) => {
              const tool = TOOLS_CATALOG.find((x) => x.id === t);
              return (
                <span
                  key={t}
                  className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {tool?.label ?? t}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Modo de operação</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAutonomyMode("DRAFT")}
            className={cn(
              "rounded-xl border p-3 text-left text-sm transition-colors",
              autonomyMode === "DRAFT"
                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="font-medium">Rascunho</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Gera uma sugestão de resposta. O humano aprova/edita antes de
              enviar. Recomendado pra começar.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAutonomyMode("AUTONOMOUS")}
            className={cn(
              "rounded-xl border p-3 text-left text-sm transition-colors",
              autonomyMode === "AUTONOMOUS"
                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30"
                : "border-border hover:bg-muted/40",
            )}
          >
            <div className="font-medium">Autônomo</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Envia direto pro lead sem supervisão. Requer testes em
              playground e um <code>dailyTokenCap</code> configurado.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-foreground">{value}</div>
    </div>
  );
}
