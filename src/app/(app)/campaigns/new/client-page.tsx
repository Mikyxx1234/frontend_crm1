"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRocket,
  IconLoader2,
  IconUsers,
  IconFilter,
  IconTag,
  IconUserCircle,
  IconStack2,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { InputGlass } from "@/components/crm/input-glass";
import { Textarea } from "@/components/ui/textarea";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { MultiSelectPopover } from "@/features/dashboard-v2/components/multi-select-popover";

import {
  useAudienceOptions,
  useChannels,
  useCreateCampaign,
  usePreviewAudience,
  useSegments,
  useTemplates,
} from "@/features/campaigns/hooks";
import type {
  CampaignFilters,
  CampaignType,
  CreateCampaignBody,
} from "@/features/campaigns/types";

type StepId = 1 | 2 | 3 | 4;
const STEPS = ["Básico", "Audiência", "Conteúdo", "Agendamento"] as const;

const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Subscriber" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "EVANGELIST", label: "Evangelist" },
];

export default function NewCampaignClientPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const isAuth = authStatus === "authenticated";

  const [step, setStep] = useState<StepId>(1);
  const [error, setError] = useState<string | null>(null);

  // Básico
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignType>("TEMPLATE");
  const [channelId, setChannelId] = useState("");

  // Audiência
  const [audienceMode, setAudienceMode] = useState<"filters" | "segment">("filters");
  const [segmentId, setSegmentId] = useState("");
  const [filters, setFilters] = useState<CampaignFilters>({ hasPhone: true });

  // Conteúdo
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("pt_BR");
  const [textContent, setTextContent] = useState("");

  // Agendamento
  const [sendRate, setSendRate] = useState(80);
  const [scheduledAt, setScheduledAt] = useState("");

  const channelsQuery = useChannels(isAuth);
  const segmentsQuery = useSegments(isAuth);
  const optionsQuery = useAudienceOptions(isAuth);
  const templatesQuery = useTemplates(isAuth && type === "TEMPLATE");
  const preview = usePreviewAudience();
  const createMutation = useCreateCampaign();

  const providerRequired =
    type === "TEMPLATE" ? "META_CLOUD_API" : type === "TEXT" ? "BAILEYS_MD" : null;

  const availableChannels = useMemo(
    () =>
      (channelsQuery.data ?? []).filter(
        (ch) =>
          ch.status === "CONNECTED" &&
          (!providerRequired || ch.provider === providerRequired),
      ),
    [channelsQuery.data, providerRequired],
  );

  const tags = optionsQuery.data?.tags ?? [];
  const pipelines = optionsQuery.data?.pipelines ?? [];
  const users = optionsQuery.data?.users ?? [];
  const stagesForPipeline =
    pipelines.find((p) => p.id === filters.pipelineId)?.stages ?? [];

  // Resolve os filtros efetivos da audiência (segmento salvo OU ad-hoc).
  const effectiveFilters = useMemo<CampaignFilters | null>(() => {
    if (audienceMode === "segment") {
      const seg = segmentsQuery.data?.find((s) => s.id === segmentId);
      return seg ? (seg.filters as CampaignFilters) : null;
    }
    return filters;
  }, [audienceMode, segmentId, segmentsQuery.data, filters]);

  // Preview com debounce sempre que a audiência muda (no passo 2).
  useEffect(() => {
    if (step !== 2 || !effectiveFilters) return;
    const t = setTimeout(() => {
      preview.mutate(effectiveFilters);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, JSON.stringify(effectiveFilters)]);

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return !!name.trim() && !!channelId;
      case 2:
        return audienceMode === "segment" ? !!segmentId : true;
      case 3:
        if (type === "TEMPLATE") return !!templateName;
        if (type === "TEXT") return !!textContent.trim();
        return true;
      default:
        return true;
    }
  }

  function handleCreate() {
    setError(null);
    const body: CreateCampaignBody = {
      name: name.trim(),
      type,
      channelId,
      sendRate,
    };
    if (audienceMode === "segment") body.segmentId = segmentId;
    else body.filters = filters;
    if (type === "TEMPLATE") {
      body.templateName = templateName;
      body.templateLanguage = templateLanguage;
    }
    if (type === "TEXT") body.textContent = textContent;
    if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

    createMutation.mutate(body, {
      onSuccess: (data) => {
        router.push(`/campaigns/${data.campaign.id}`);
      },
      onError: (err) =>
        setError(err instanceof Error ? err.message : "Erro ao criar campanha."),
    });
  }

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          back={{ href: "/campaigns", label: "Campanhas" }}
          icon={<IconRocket size={22} />}
          title="Nova campanha"
          description={`Passo ${step} de 4 — ${STEPS[step - 1]}`}
        />

        <div className="flex gap-1.5 px-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? "bg-[var(--brand-primary)]" : "bg-[var(--glass-bg-subtle)]"
              }`}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-2xl rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glass-shadow)] backdrop-blur-md">
            {step === 1 ? (
              <div className="space-y-5">
                <Field label="Nome da campanha">
                  <InputGlass
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Black Friday 2026"
                  />
                </Field>

                <Field label="Tipo">
                  <div className="grid grid-cols-2 gap-2">
                    <TypeCard
                      active={type === "TEMPLATE"}
                      title="Template Meta"
                      desc="Template aprovado via API oficial"
                      onClick={() => {
                        setType("TEMPLATE");
                        setChannelId("");
                      }}
                    />
                    <TypeCard
                      active={type === "TEXT"}
                      title="Texto livre"
                      desc="Mensagem de texto (janela 24h)"
                      onClick={() => {
                        setType("TEXT");
                        setChannelId("");
                      }}
                    />
                  </div>
                </Field>

                <Field label="Canal de envio">
                  {channelsQuery.isLoading ? (
                    <div className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)]" />
                  ) : availableChannels.length === 0 ? (
                    <p className="font-body text-[12.5px] text-[var(--text-muted)]">
                      Nenhum canal compatível conectado. Conecte um canal WhatsApp
                      em Configurações → Canais.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableChannels.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => setChannelId(ch.id)}
                          className={`flex w-full items-center justify-between rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
                            channelId === ch.id
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                              : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] hover:border-[var(--brand-primary)]/35"
                          }`}
                        >
                          <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                            {ch.name}
                          </span>
                          <span className="font-body text-[11px] text-[var(--text-muted)]">
                            {ch.provider === "META_CLOUD_API" ? "Meta Cloud API" : "Baileys"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-2">
                  <TypeCard
                    active={audienceMode === "filters"}
                    title="Filtros"
                    desc="Combinar critérios manualmente"
                    icon={<IconFilter size={18} />}
                    onClick={() => setAudienceMode("filters")}
                  />
                  <TypeCard
                    active={audienceMode === "segment"}
                    title="Segmento salvo"
                    desc="Usar um segmento existente"
                    icon={<IconUsers size={18} />}
                    onClick={() => setAudienceMode("segment")}
                  />
                </div>

                {audienceMode === "segment" ? (
                  <Field label="Segmento">
                    <DropdownGlass
                      options={(segmentsQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
                      value={segmentId || undefined}
                      onValueChange={setSegmentId}
                      placeholder="Selecione um segmento"
                      triggerClassName="w-full"
                    />
                  </Field>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <MultiSelectPopover
                        label="Tags"
                        icon={<IconTag size={14} />}
                        options={tags.map((t) => ({
                          value: t.id,
                          label: t.name,
                          color: t.color,
                        }))}
                        selected={filters.tagIds ?? []}
                        onChange={(next) =>
                          setFilters((f) => ({
                            ...f,
                            tagIds: next.length ? next : undefined,
                          }))
                        }
                      />
                      <MultiSelectPopover
                        label="Responsável"
                        icon={<IconUserCircle size={14} />}
                        options={users.map((u) => ({ value: u.id, label: u.name }))}
                        selected={filters.dealOwnerId ? [filters.dealOwnerId] : []}
                        onChange={(next) =>
                          setFilters((f) => ({
                            ...f,
                            dealOwnerId: next[next.length - 1],
                          }))
                        }
                      />
                      <MultiSelectPopover
                        label="Pipeline"
                        icon={<IconStack2 size={14} />}
                        options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
                        selected={filters.pipelineId ? [filters.pipelineId] : []}
                        onChange={(next) =>
                          setFilters((f) => ({
                            ...f,
                            pipelineId: next[next.length - 1],
                            stageIds: undefined,
                          }))
                        }
                      />
                      {filters.pipelineId ? (
                        <MultiSelectPopover
                          label="Etapas"
                          options={stagesForPipeline.map((s) => ({
                            value: s.id,
                            label: s.name,
                          }))}
                          selected={filters.stageIds ?? []}
                          onChange={(next) =>
                            setFilters((f) => ({
                              ...f,
                              stageIds: next.length ? next : undefined,
                            }))
                          }
                        />
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Estágio de vida">
                        <DropdownGlass
                          options={[
                            { value: "", label: "Todos" },
                            ...LIFECYCLE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                          ]}
                          value={filters.lifecycleStage ?? ""}
                          onValueChange={(v) =>
                            setFilters((f) => ({
                              ...f,
                              lifecycleStage: v || undefined,
                            }))
                          }
                          triggerClassName="w-full"
                        />
                      </Field>
                      <Field label="Criado desde">
                        <InputGlass
                          type="date"
                          value={filters.createdAfter ?? ""}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              createdAfter: e.target.value || undefined,
                            }))
                          }
                        />
                      </Field>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3 font-body text-[13px] text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--brand-primary)]"
                        checked={!!filters.hasPhone}
                        onChange={(e) =>
                          setFilters((f) => ({
                            ...f,
                            hasPhone: e.target.checked || undefined,
                          }))
                        }
                      />
                      Apenas contatos com telefone (obrigatório p/ WhatsApp)
                    </label>
                  </div>
                )}

                <AudiencePreview
                  loading={preview.isPending}
                  count={preview.data?.count}
                  sample={preview.data?.sample}
                />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                {type === "TEMPLATE" ? (
                  <>
                    <Field label="Template aprovado (Meta)">
                      {templatesQuery.isLoading ? (
                        <div className="h-10 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)]" />
                      ) : (
                        <DropdownGlass
                          options={(templatesQuery.data ?? [])
                            .filter((t) => t.status === "APPROVED")
                            .map((t) => ({ value: t.name, label: `${t.name} (${t.language})` }))}
                          value={templateName || undefined}
                          onValueChange={(v) => {
                            setTemplateName(v);
                            const tpl = (templatesQuery.data ?? []).find((t) => t.name === v);
                            if (tpl?.language) setTemplateLanguage(tpl.language);
                          }}
                          placeholder="Selecione um template"
                          triggerClassName="w-full"
                        />
                      )}
                    </Field>
                    <Field label="Idioma">
                      <InputGlass
                        value={templateLanguage}
                        onChange={(e) => setTemplateLanguage(e.target.value)}
                        placeholder="pt_BR"
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="Mensagem">
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Digite a mensagem que será enviada..."
                      className="min-h-[140px] w-full"
                    />
                  </Field>
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5">
                <Field label={`Velocidade de envio — ${sendRate} msgs/s`}>
                  <input
                    type="range"
                    min={1}
                    max={type === "TEXT" ? 20 : 80}
                    value={sendRate}
                    onChange={(e) => setSendRate(Number(e.target.value))}
                    className="w-full accent-[var(--brand-primary)]"
                  />
                </Field>

                <Field label="Agendamento (opcional)">
                  <InputGlass
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="mt-1 font-body text-[11.5px] text-[var(--text-muted)]">
                    Deixe vazio para enviar imediatamente ao lançar.
                  </p>
                </Field>

                <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4">
                  <ReviewRow label="Nome" value={name} />
                  <ReviewRow label="Tipo" value={type === "TEMPLATE" ? "Template Meta" : "Texto livre"} />
                  <ReviewRow
                    label="Audiência"
                    value={
                      preview.data
                        ? `${preview.data.count} contatos`
                        : audienceMode === "segment"
                          ? "Segmento selecionado"
                          : "Filtros ad-hoc"
                    }
                  />
                  {type === "TEMPLATE" ? (
                    <ReviewRow label="Template" value={templateName} />
                  ) : null}
                  <ReviewRow
                    label="Agendamento"
                    value={
                      scheduledAt
                        ? new Date(scheduledAt).toLocaleString("pt-BR")
                        : "Imediato"
                    }
                  />
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 font-body text-[12.5px] text-[var(--color-danger-text)]">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s))}
            disabled={step === 1}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2 font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-primary)]/35 disabled:opacity-40"
          >
            <IconChevronLeft size={16} /> Anterior
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as StepId)}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary)] px-5 py-2 font-display text-[13px] font-bold text-white transition-colors hover:bg-[var(--brand-primary-dark)] disabled:opacity-40"
            >
              Continuar <IconChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={createMutation.isPending || !name.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-2 font-display text-[13px] font-bold text-white transition-colors hover:bg-[var(--brand-primary-dark)] disabled:opacity-40"
            >
              {createMutation.isPending ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconRocket size={16} />
              )}
              Criar campanha
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-display text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function TypeCard({
  active,
  title,
  desc,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
        active
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] hover:border-[var(--brand-primary)]/35"
      }`}
    >
      <span className="flex items-center gap-1.5 font-display text-[13px] font-bold text-[var(--text-primary)]">
        {icon} {title}
      </span>
      <span className="font-body text-[11.5px] text-[var(--text-muted)]">{desc}</span>
    </button>
  );
}

function AudiencePreview({
  loading,
  count,
  sample,
}: {
  loading: boolean;
  count?: number;
  sample?: { id: string; name: string; phone: string }[];
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3 font-body text-[12.5px] text-[var(--text-muted)]">
        <IconLoader2 size={15} className="animate-spin" /> Contando contatos...
      </div>
    );
  }
  if (count === undefined) return null;
  return (
    <div
      className={`rounded-[var(--radius-md)] border p-4 ${
        count > 0
          ? "border-emerald-500/30 bg-[var(--color-success)]/5"
          : "border-amber-500/30 bg-[var(--color-warning)]/5"
      }`}
    >
      <p className="font-display text-[15px] font-bold text-[var(--text-primary)]">
        {count.toLocaleString("pt-BR")} contato{count === 1 ? "" : "s"} na audiência
      </p>
      {sample && sample.length > 0 ? (
        <div className="mt-2 space-y-0.5">
          {sample.slice(0, 5).map((c) => (
            <p key={c.id} className="font-body text-[11.5px] text-[var(--text-muted)]">
              {c.name} {c.phone ? `· ${c.phone}` : ""}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-body text-[12.5px] text-[var(--text-muted)]">{label}</span>
      <span className="text-right font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
        {value || "—"}
      </span>
    </div>
  );
}
