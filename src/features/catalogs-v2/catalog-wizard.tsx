"use client";

/**
 * Wizard de Catálogo (PRD §6, Fase 4).
 *
 * Faz PERGUNTAS DE NEGÓCIO (não tipos de produto). Cada "sim" liga uma
 * capacidade e revela suas sub-perguntas, montadas dinamicamente a partir do
 * JSON Schema servido por `GET /api/capabilities` — capacidade nova aparece no
 * wizard sem recodificar a tela. Templates pré-marcam respostas (nunca bloqueiam).
 */
import * as React from "react";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconLoader2,
  IconSparkles,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass";
import { cn } from "@/lib/utils";

import { capabilityMeta } from "./constants";
import { defaultConfig, defaultMode, SchemaFields } from "./schema-fields";
import {
  useCapabilities,
  useCatalogTemplates,
  useCreateCatalog,
  useUpdateCatalog,
} from "./hooks";
import type {
  CapabilityPayload,
  CatalogView,
  OverridePolicy,
  SerializedCapability,
} from "./types";

type CapState = {
  enabled: boolean;
  mode: string;
  config: Record<string, unknown>;
  overridePolicy: OverridePolicy;
};

type Props = {
  /** Chamado ao concluir. Na criação, recebe o id do catálogo recém-criado. */
  onDone: (createdCatalogId?: string) => void;
  onCancel: () => void;
  /** Quando presente, o wizard entra em modo EDIÇÃO desse catálogo. */
  catalog?: CatalogView | null;
};

const STEPS = ["Início", "Capacidades", "Revisão"] as const;

const POLICY_OPTIONS: DropdownOption[] = [
  { value: "DEFAULT", label: "Sugerido", description: "Produto pode sobrescrever a config." },
  { value: "LOCKED", label: "Travado", description: "Produto herda e não pode alterar." },
  { value: "OPEN", label: "Aberto", description: "Catálogo não impõe; produto configura do zero." },
];

export function CatalogWizard({ onDone, onCancel, catalog }: Props) {
  const isEdit = !!catalog;
  const {
    data: capabilities,
    isLoading: loadingCaps,
    isError: capsError,
    refetch,
  } = useCapabilities();
  const { data: templates } = useCatalogTemplates();
  const createMutation = useCreateCatalog();
  const updateMutation = useUpdateCatalog(catalog?.id ?? null);
  const mutation = isEdit ? updateMutation : createMutation;

  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState(catalog?.name ?? "");
  const [description, setDescription] = React.useState(catalog?.description ?? "");
  const [templateKey, setTemplateKey] = React.useState<string | null>(
    catalog?.templateKey ?? null,
  );
  const [activeTemplateId, setActiveTemplateId] = React.useState<string | null>(null);
  const [caps, setCaps] = React.useState<Record<string, CapState>>({});

  // Inicializa o estado das capacidades quando o registro carrega.
  // Em edição, semeia a partir das capacidades já gravadas no catálogo.
  React.useEffect(() => {
    if (!capabilities) return;
    setCaps((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const init: Record<string, CapState> = {};
      for (const cap of capabilities) {
        const fromCat = catalog?.capabilities.find((c) => c.capabilityKey === cap.key);
        if (fromCat) {
          const mode = fromCat.mode || defaultMode(cap.configSchema);
          init[cap.key] = {
            enabled: fromCat.enabled,
            mode,
            config: { ...defaultConfig(cap.configSchema, mode), ...fromCat.config },
            overridePolicy: fromCat.overridePolicy ?? "DEFAULT",
          };
        } else {
          const mode = defaultMode(cap.configSchema);
          init[cap.key] = {
            enabled: false,
            mode,
            config: defaultConfig(cap.configSchema, mode),
            overridePolicy: "DEFAULT",
          };
        }
      }
      return init;
    });
  }, [capabilities, catalog]);

  function applyTemplate(id: string | null) {
    const tpl = templates?.find((t) => t.id === id) ?? null;
    setActiveTemplateId(tpl ? id : null);
    setTemplateKey(tpl?.templateKey ?? null);
    if (!tpl || !capabilities) return;
    setCaps(() => {
      const next: Record<string, CapState> = {};
      for (const cap of capabilities) {
        const fromTpl = tpl.capabilities.find((c) => c.capabilityKey === cap.key);
        if (fromTpl) {
          const mode = fromTpl.mode || defaultMode(cap.configSchema);
          next[cap.key] = {
            enabled: fromTpl.enabled,
            mode,
            config: { ...defaultConfig(cap.configSchema, mode), ...fromTpl.config },
            overridePolicy: fromTpl.overridePolicy ?? "DEFAULT",
          };
        } else {
          const mode = defaultMode(cap.configSchema);
          next[cap.key] = {
            enabled: false,
            mode,
            config: defaultConfig(cap.configSchema, mode),
            overridePolicy: "DEFAULT",
          };
        }
      }
      return next;
    });
    if (tpl.name && !name) setName(tpl.name.replace(/\s*\(template\)\s*$/i, ""));
  }

  function toggleCap(key: string) {
    setCaps((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key]?.enabled } }));
  }

  function setCapConfig(key: string, config: Record<string, unknown>) {
    setCaps((prev) => ({ ...prev, [key]: { ...prev[key], config } }));
  }

  function setCapMode(key: string, mode: string, config: Record<string, unknown>) {
    setCaps((prev) => ({ ...prev, [key]: { ...prev[key], mode, config } }));
  }

  function setCapPolicy(key: string, overridePolicy: OverridePolicy) {
    setCaps((prev) => ({ ...prev, [key]: { ...prev[key], overridePolicy } }));
  }

  const enabledCaps = React.useMemo(
    () => (capabilities ?? []).filter((c) => caps[c.key]?.enabled),
    [capabilities, caps],
  );

  function handleSubmit() {
    const payload: CapabilityPayload[] = enabledCaps.map((c) => ({
      capabilityKey: c.key,
      mode: caps[c.key]?.mode ?? defaultMode(c.configSchema),
      config: caps[c.key]?.config ?? {},
      overridePolicy: caps[c.key]?.overridePolicy ?? "DEFAULT",
      enabled: true,
    }));
    const onError = (err: unknown) =>
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");

    if (isEdit) {
      updateMutation.mutate(
        {
          name: name.trim(),
          description: description.trim() || null,
          capabilities: payload,
        },
        {
          onSuccess: () => {
            toast.success("Catálogo atualizado.");
            onDone();
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(
        {
          name: name.trim(),
          description: description.trim() || null,
          templateKey,
          capabilities: payload,
        },
        {
          onSuccess: (data) => {
            toast.success("Catálogo criado com sucesso.");
            onDone(data?.catalog?.id);
          },
          onError,
        },
      );
    }
  }

  const affectedProducts = catalog?._count?.products ?? 0;
  const canNext = step === 0 ? name.trim().length > 0 : true;

  return (
    <div className="flex flex-col gap-6">
      <Stepper step={step} />

      {/* ── Passo 1: Início ──────────────────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-name" className="text-[12.5px] font-semibold">
              Nome do catálogo
            </Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Cursos 2026, Vagas, Loja online…"
              className="h-10 text-[13px]"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-desc" className="text-[12.5px] font-semibold">
              Descrição{" "}
              <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
            </Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que serve este catálogo?"
              className="min-h-[64px] text-[13px]"
            />
          </div>

          {!isEdit && templates && templates.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-[12.5px] font-semibold">
                Começar de um modelo{" "}
                <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
              </Label>
              <p className="-mt-1 text-[11.5px] text-[var(--text-muted)]">
                Pré-seleciona capacidades comuns. Você ajusta tudo no próximo passo.
              </p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => {
                  const active = activeTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(active ? null : t.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                        active
                          ? "border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)] text-[var(--text-primary)] hover:border-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)]",
                      )}
                    >
                      <IconSparkles size={13} className="text-[var(--brand-primary)]" />
                      {t.name}
                      {active && <IconCheck size={13} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Passo 2: Capacidades ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] text-[var(--text-muted)] leading-relaxed">
            Responda o que se aplica ao seu negócio. Cada resposta ativa uma capacidade
            e revela suas configurações — só o que você ligar será usado.
          </p>

          {loadingCaps && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[72px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)]"
                />
              ))}
            </div>
          )}

          {capsError && (
            <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center">
              <IconAlertTriangle size={24} className="text-[var(--color-danger)]" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                  Não foi possível carregar as capacidades
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  Verifique a conexão com o servidor e tente novamente.
                </p>
              </div>
              <Button size="sm" variant="glass" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!loadingCaps &&
            !capsError &&
            (capabilities ?? []).map((cap) => (
              <CapabilityCard
                key={cap.key}
                cap={cap}
                enabled={caps[cap.key]?.enabled ?? false}
                mode={caps[cap.key]?.mode ?? defaultMode(cap.configSchema)}
                config={caps[cap.key]?.config ?? {}}
                overridePolicy={caps[cap.key]?.overridePolicy ?? "DEFAULT"}
                onToggle={() => toggleCap(cap.key)}
                onConfigChange={(cfg) => setCapConfig(cap.key, cfg)}
                onModeChange={(m, cfg) => setCapMode(cap.key, m, cfg)}
                onPolicyChange={(p) => setCapPolicy(cap.key, p)}
              />
            ))}
        </div>
      )}

      {/* ── Passo 3: Revisão ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          {isEdit && affectedProducts > 0 && (
            <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-warning,#d97706)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-warning,#d97706)_8%,transparent)] px-3.5 py-2.5">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-warning,#d97706)]" />
              <p className="text-[12px] leading-snug text-[var(--text-primary)]">
                <strong>{affectedProducts} produto(s)</strong> usam este catálogo. Mudanças em
                capacidades travadas (Travado) afetam todos eles imediatamente.
              </p>
            </div>
          )}
          <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4">
            <p className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              {name || "Catálogo sem nome"}
            </p>
            {description && (
              <p className="mt-1 text-[12.5px] text-[var(--text-muted)] leading-relaxed">
                {description}
              </p>
            )}
            {templateKey && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
                <IconSparkles size={11} /> {templateKey}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Capacidades ativas ({enabledCaps.length})
            </Label>
            {enabledCaps.length === 0 ? (
              <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--glass-border)] p-3 text-[12px] text-[var(--text-muted)]">
                Nenhuma capacidade ativa. O catálogo servirá apenas para agrupar produtos —
                você pode ativar capacidades depois.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {enabledCaps.map((c) => {
                  const meta = capabilityMeta(c.key);
                  const Icon = meta.icon;
                  return (
                    <div
                      key={c.key}
                      className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary)]">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                          {c.label}
                        </p>
                        <p className="truncate text-[11px] text-[var(--text-muted)]">
                          {c.description}
                        </p>
                      </div>
                      <IconCheck size={16} className="shrink-0 text-[var(--brand-primary)]" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
        <Button
          variant="ghost"
          onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}
          disabled={mutation.isPending}
        >
          {step === 0 ? (
            "Cancelar"
          ) : (
            <>
              <IconArrowLeft size={15} /> Voltar
            </>
          )}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Avançar <IconArrowRight size={15} />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? (
              <>
                <IconLoader2 size={15} className="animate-spin" />{" "}
                {isEdit ? "Salvando…" : "Criando…"}
              </>
            ) : (
              <>
                <IconCheck size={15} /> {isEdit ? "Salvar alterações" : "Criar catálogo"}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─────────── Stepper ─────────── */

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex w-full min-w-0 items-center">
      {STEPS.map((label, i) => {
        const isActive = i === step;
        return (
          <React.Fragment key={label}>
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                  isActive
                    ? "bg-[var(--brand-primary)] text-white shadow-[0_2px_8px_color-mix(in_srgb,var(--brand-primary)_45%,transparent)]"
                    : i < step
                      ? "bg-[color-mix(in_srgb,var(--brand-primary)_18%,transparent)] text-[var(--brand-primary)]"
                      : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
                )}
              >
                {i < step ? <IconCheck size={14} /> : i + 1}
              </span>
              {/* Em telas estreitas, mostra o label apenas do passo ativo
                  (evita transbordo horizontal do modal). */}
              <span
                className={cn(
                  "truncate font-display text-[12.5px] font-semibold transition-colors",
                  i <= step ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                  isActive ? "inline" : "hidden sm:inline",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-px min-w-[12px] flex-1 transition-colors sm:mx-3",
                  i < step
                    ? "bg-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)]"
                    : "bg-[var(--glass-border)]",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────── Card de capacidade ─────────── */

function CapabilityCard({
  cap,
  enabled,
  mode,
  config,
  overridePolicy,
  onToggle,
  onConfigChange,
  onModeChange,
  onPolicyChange,
}: {
  cap: SerializedCapability;
  enabled: boolean;
  mode: string;
  config: Record<string, unknown>;
  overridePolicy: OverridePolicy;
  onToggle: () => void;
  onConfigChange: (cfg: Record<string, unknown>) => void;
  onModeChange: (mode: string, cfg: Record<string, unknown>) => void;
  onPolicyChange: (policy: OverridePolicy) => void;
}) {
  const meta = capabilityMeta(cap.key);
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border bg-[var(--glass-bg-panel)] transition-colors",
        enabled
          ? "border-[color-mix(in_srgb,var(--brand-primary)_45%,transparent)] shadow-[0_1px_10px_color-mix(in_srgb,var(--brand-primary)_10%,transparent)]"
          : "border-[var(--glass-border)] hover:border-[color-mix(in_srgb,var(--brand-primary)_25%,transparent)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
            enabled
              ? "bg-[var(--brand-primary)] text-white"
              : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
          )}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
            {meta.question || cap.label}
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--text-muted)]">
            {cap.description}
          </p>
        </div>
        <span
          role="switch"
          aria-checked={enabled}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
            enabled ? "bg-[var(--brand-primary)]" : "bg-[var(--text-muted)]/30",
          )}
        >
          <span
            className={cn(
              "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-[18px]" : "translate-x-[3px]",
            )}
          />
        </span>
      </button>
      {enabled && (
        <div className="mx-4 mb-4 flex flex-col gap-4 border-t border-[var(--glass-border)] pt-4">
          <SchemaFields
            schema={cap.configSchema}
            mode={mode}
            config={config}
            onChange={onConfigChange}
            onModeChange={onModeChange}
          />
          <div className="flex flex-col gap-1">
            <Label className="text-[12px] font-medium">Política de override</Label>
            <DropdownGlass
              options={POLICY_OPTIONS}
              value={overridePolicy}
              onValueChange={(v) => onPolicyChange(v as OverridePolicy)}
              triggerClassName="h-9 w-full text-[13px]"
            />
            <p className="text-[11px] text-[var(--text-muted)] leading-snug">
              Define se os produtos deste catálogo podem alterar esta capacidade.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
