"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Loader2,
  Megaphone,
  MessageSquare,
  Phone,
  Rocket,
  Search,
  Send,
  Tag as TagIcon,
  User as UserIcon,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type Channel = {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
};

type Segment = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
};

type AutomationRow = {
  id: string;
  name: string;
  active: boolean;
};

type TemplateRow = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
};

type FilterState = {
  search?: string;
  lifecycleStage?: string;
  tagIds?: string[];
  companyId?: string;
  assignedToId?: string;
  dealOwnerId?: string;
  pipelineId?: string;
  stageIds?: string[];
  dealStatus?: "OPEN" | "WON" | "LOST";
  createdAfter?: string;
  hasPhone?: boolean;
};

type PipelineRow = {
  id: string;
  name: string;
  stages: { id: string; name: string; color?: string }[];
};

type UserRow = {
  id: string;
  name: string;
  email?: string;
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const v = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return `rgba(99,102,241,${alpha})`;
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

const LIFECYCLE_LABELS: Record<string, string> = {
  SUBSCRIBER: "Subscriber",
  LEAD: "Lead",
  MQL: "MQL",
  SQL: "SQL",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Customer",
  EVANGELIST: "Evangelist",
};

const DEAL_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};

function removeFilter(
  prev: FilterState,
  key: keyof FilterState,
  value?: string,
): FilterState {
  const next: FilterState = { ...prev };
  if (key === "tagIds" && value) {
    next.tagIds = (prev.tagIds ?? []).filter((id) => id !== value);
    if (next.tagIds.length === 0) next.tagIds = undefined;
    return next;
  }
  if (key === "stageIds" && value) {
    next.stageIds = (prev.stageIds ?? []).filter((id) => id !== value);
    if (next.stageIds.length === 0) next.stageIds = undefined;
    return next;
  }
  delete next[key];
  return next;
}

function hasAnyFilter(f: FilterState): boolean {
  return !!(
    f.search ||
    f.lifecycleStage ||
    (f.tagIds && f.tagIds.length > 0) ||
    f.companyId ||
    f.assignedToId ||
    f.dealOwnerId ||
    f.pipelineId ||
    (f.stageIds && f.stageIds.length > 0) ||
    f.dealStatus ||
    f.createdAfter ||
    f.hasPhone
  );
}

type ActiveFilterChipsProps = {
  filters: FilterState;
  tags: { id: string; name: string; color: string }[];
  pipelines: PipelineRow[];
  users: UserRow[];
  onRemove: (key: keyof FilterState, value?: string) => void;
  onClear: () => void;
};

function ActiveFilterChips({
  filters,
  tags,
  pipelines,
  users,
  onRemove,
  onClear,
}: ActiveFilterChipsProps) {
  if (!hasAnyFilter(filters)) return null;

  const chips: { key: keyof FilterState; value?: string; label: string; color?: string }[] = [];

  if (filters.search) {
    chips.push({ key: "search", label: `Busca: "${filters.search}"` });
  }
  if (filters.lifecycleStage) {
    chips.push({
      key: "lifecycleStage",
      label: `Vida: ${LIFECYCLE_LABELS[filters.lifecycleStage] ?? filters.lifecycleStage}`,
    });
  }
  if (filters.pipelineId) {
    const p = pipelines.find((x) => x.id === filters.pipelineId);
    chips.push({ key: "pipelineId", label: `Pipeline: ${p?.name ?? "—"}` });
  }
  if (filters.stageIds && filters.stageIds.length > 0) {
    for (const sid of filters.stageIds) {
      const stage = pipelines
        .flatMap((p) => p.stages.map((s) => ({ ...s, pipelineName: p.name })))
        .find((s) => s.id === sid);
      chips.push({
        key: "stageIds",
        value: sid,
        label: `Estágio: ${stage?.name ?? "—"}`,
      });
    }
  }
  if (filters.dealStatus) {
    chips.push({
      key: "dealStatus",
      label: `Status: ${DEAL_STATUS_LABELS[filters.dealStatus] ?? filters.dealStatus}`,
    });
  }
  if (filters.dealOwnerId) {
    const u = users.find((x) => x.id === filters.dealOwnerId);
    chips.push({ key: "dealOwnerId", label: `Dono: ${u?.name ?? "—"}` });
  }
  if (filters.createdAfter) {
    chips.push({ key: "createdAfter", label: `Desde ${filters.createdAfter}` });
  }
  if (filters.hasPhone) {
    chips.push({ key: "hasPhone", label: "Com telefone" });
  }
  if (filters.tagIds && filters.tagIds.length > 0) {
    for (const tid of filters.tagIds) {
      const t = tags.find((x) => x.id === tid);
      chips.push({
        key: "tagIds",
        value: tid,
        label: t?.name ?? "—",
        color: t?.color,
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip, i) => (
        <span
          key={`${String(chip.key)}-${chip.value ?? ""}-${i}`}
          className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
          style={
            chip.color
              ? {
                  borderColor: chip.color,
                  backgroundColor: hexToRgba(chip.color, 0.1),
                  color: chip.color,
                }
              : undefined
          }
        >
          {chip.color ? (
            <span className="size-2 rounded-full" style={{ backgroundColor: chip.color }} />
          ) : null}
          <span className="font-medium">{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.key, chip.value)}
            className="opacity-60 transition-opacity hover:opacity-100"
            aria-label="Remover filtro"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Limpar todos
      </button>
    </div>
  );
}

const CAMPAIGN_TYPES = [
  {
    value: "TEMPLATE" as const,
    label: "Template Meta",
    description: "Enviar template aprovado via API oficial WhatsApp",
    icon: Megaphone,
    providerRequired: "META_CLOUD_API",
  },
  {
    value: "TEXT" as const,
    label: "Texto Livre",
    description: "Enviar mensagem de texto via Baileys (QR Code)",
    icon: Send,
    providerRequired: "BAILEYS_MD",
  },
  {
    value: "AUTOMATION" as const,
    label: "Automação",
    description: "Disparar uma automação para cada contato",
    icon: Zap,
    providerRequired: null,
  },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"TEMPLATE" | "TEXT" | "AUTOMATION" | "">("");
  const [channelId, setChannelId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [useAdHocFilters, setUseAdHocFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("pt_BR");
  const [textContent, setTextContent] = useState("");
  const [automationId, setAutomationId] = useState("");
  const [sendRate, setSendRate] = useState(80);
  const [scheduledAt, setScheduledAt] = useState("");

  const channelsQuery = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/channels"));
      const data = await res.json();
      return (data.channels ?? []) as Channel[];
    },
  });

  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/segments"));
      const data = await res.json();
      return (data.segments ?? []) as Segment[];
    },
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/tags"));
      const data = await res.json();
      return (data.tags ?? data ?? []) as { id: string; name: string; color: string }[];
    },
  });

  const pipelinesQuery = useQuery({
    queryKey: ["pipelines-with-stages"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.pipelines ?? []);
      return list as PipelineRow[];
    },
  });

  const usersQuery = useQuery({
    queryKey: ["users-humans"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.users ?? data ?? []) as UserRow[];
    },
  });

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/whatsapp-templates"));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.templates ?? data.data ?? []) as TemplateRow[];
    },
    enabled: type === "TEMPLATE",
  });

  const automationsQuery = useQuery({
    queryKey: ["automations-list"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/automations"));
      const data = await res.json();
      return (data.automations ?? data.items ?? []) as AutomationRow[];
    },
    enabled: type === "AUTOMATION",
  });

  const previewQuery = useQuery({
    queryKey: ["campaign-preview", segmentId, filters, useAdHocFilters],
    queryFn: async () => {
      let f = filters;
      if (segmentId && !useAdHocFilters) {
        const seg = segmentsQuery.data?.find((s) => s.id === segmentId);
        if (seg) f = seg.filters as FilterState;
      }
      const res = await fetch(apiUrl("/api/campaigns/preview"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: f }),
      });
      return res.json() as Promise<{
        count: number;
        sample: { id: string; name: string; phone: string }[];
      }>;
    },
    enabled: step >= 3 && (!!segmentId || useAdHocFilters),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name,
        type,
        channelId,
      };

      if (segmentId && !useAdHocFilters) body.segmentId = segmentId;
      if (useAdHocFilters) body.filters = filters;
      if (type === "TEMPLATE") {
        body.templateName = templateName;
        body.templateLanguage = templateLanguage;
      }
      if (type === "TEXT") body.textContent = textContent;
      if (type === "AUTOMATION") body.automationId = automationId;
      body.sendRate = sendRate;
      if (scheduledAt) body.scheduledAt = scheduledAt;

      const res = await fetch(apiUrl("/api/campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Erro ao criar campanha.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      router.push(`/campaigns/${data.campaign.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const availableChannels = (channelsQuery.data ?? []).filter((ch) => {
    if (ch.status !== "CONNECTED") return false;
    if (!type) return true;
    const t = CAMPAIGN_TYPES.find((ct) => ct.value === type);
    if (!t?.providerRequired) return true;
    return ch.provider === t.providerRequired;
  });

  const selectedChannel = availableChannels.find((ch) => ch.id === channelId);

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return !!type;
      case 2:
        return !!channelId;
      case 3:
        return !!segmentId || useAdHocFilters;
      case 4:
        if (type === "TEMPLATE") return !!templateName;
        if (type === "TEXT") return !!textContent.trim();
        if (type === "AUTOMATION") return !!automationId;
        return false;
      case 5:
        return !!name.trim();
      default:
        return true;
    }
  }

  function handleNext() {
    if (step < 6) setStep((step + 1) as Step);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  const steps = ["Tipo", "Canal", "Destinatários", "Conteúdo", "Configuração", "Revisão"];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
          <ChevronLeft className="size-4" />
        </Button>
        <div>
          <h1 className={pageHeaderTitleClass}>Nova campanha</h1>
          <p className={pageHeaderDescriptionClass}>
            Passo {step} de 6: {steps[step - 1]}
          </p>
        </div>
      </div>

      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {step === 1 ? (
            <div className="grid gap-3">
              <Label className="text-base font-semibold">Tipo de campanha</Label>
              {CAMPAIGN_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => {
                    setType(ct.value);
                    setChannelId("");
                  }}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/30",
                    type === ct.value && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  <ct.icon className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{ct.label}</p>
                    <p className="text-sm text-muted-foreground">{ct.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Canal de envio</Label>
              {channelsQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : availableChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum canal compatível conectado. Conecte um canal em Configurações → Canais.
                </p>
              ) : (
                availableChannels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannelId(ch.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all hover:border-primary/30",
                      channelId === ch.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                  >
                    <MessageSquare className="size-5 text-[#25D366]" />
                    <div>
                      <p className="font-medium">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ch.provider === "META_CLOUD_API" ? "Meta Cloud API" : "Baileys QR"}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      Conectado
                    </Badge>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div>
                <Label className="text-base font-semibold">Destinatários</Label>
                <p className="text-xs text-muted-foreground">
                  Escolha um segmento salvo ou combine filtros para selecionar contatos.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseAdHocFilters(false);
                    setFilters({});
                  }}
                  className={cn(
                    "group relative rounded-xl border-2 p-5 text-left transition-all",
                    !useAdHocFilters
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors",
                      !useAdHocFilters ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <Users className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">Segmento salvo</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Usar um segmento pré-configurado
                  </p>
                  {!useAdHocFilters ? (
                    <CheckCircle2 className="absolute right-3 top-3 size-5 text-primary" />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseAdHocFilters(true);
                    setSegmentId("");
                  }}
                  className={cn(
                    "group relative rounded-xl border-2 p-5 text-left transition-all",
                    useAdHocFilters
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg transition-colors",
                      useAdHocFilters ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    <Filter className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">Filtros ad-hoc</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Combinar vários critérios manualmente
                  </p>
                  {useAdHocFilters ? (
                    <CheckCircle2 className="absolute right-3 top-3 size-5 text-primary" />
                  ) : null}
                </button>
              </div>

              {!useAdHocFilters ? (
                <div className="space-y-2">
                  {segmentsQuery.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (segmentsQuery.data ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum segmento criado. Use filtros ad-hoc ou crie um segmento primeiro.
                      </p>
                    </div>
                  ) : (
                    <select
                      className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                      value={segmentId}
                      onChange={(e) => setSegmentId(e.target.value)}
                    >
                      <option value="">Selecione um segmento</option>
                      {(segmentsQuery.data ?? []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-5 rounded-xl border bg-muted/30 p-5">
                  {/* Chips de filtros ativos */}
                  <ActiveFilterChips
                    filters={filters}
                    tags={tagsQuery.data ?? []}
                    pipelines={pipelinesQuery.data ?? []}
                    users={usersQuery.data ?? []}
                    onClear={() => setFilters({})}
                    onRemove={(key, value) =>
                      setFilters((prev) => removeFilter(prev, key, value))
                    }
                  />

                  {/* Busca + estágio vida */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="filter-search" className="text-xs font-medium">
                        Busca (nome, e-mail ou telefone)
                      </Label>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="filter-search"
                          placeholder="Digite para buscar..."
                          className="h-10 pl-9"
                          value={filters.search ?? ""}
                          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Estágio de vida</Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={filters.lifecycleStage ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            lifecycleStage: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">Todos</option>
                        <option value="SUBSCRIBER">Subscriber</option>
                        <option value="LEAD">Lead</option>
                        <option value="MQL">MQL</option>
                        <option value="SQL">SQL</option>
                        <option value="OPPORTUNITY">Opportunity</option>
                        <option value="CUSTOMER">Customer</option>
                        <option value="EVANGELIST">Evangelist</option>
                      </select>
                    </div>
                  </div>

                  {/* Pipeline + estágio funil + status */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <Layers className="mr-1 inline size-3" />
                        Pipeline
                      </Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={filters.pipelineId ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            pipelineId: e.target.value || undefined,
                            stageIds: undefined, // limpa ao trocar pipeline
                          })
                        }
                      >
                        <option value="">Todos</option>
                        {(pipelinesQuery.data ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Estágio do funil</Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        value={(filters.stageIds ?? [])[0] ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            stageIds: e.target.value ? [e.target.value] : undefined,
                          })
                        }
                        disabled={!filters.pipelineId}
                      >
                        <option value="">Todos</option>
                        {((pipelinesQuery.data ?? []).find((p) => p.id === filters.pipelineId)
                          ?.stages ?? []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Status do deal</Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={filters.dealStatus ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            dealStatus: (e.target.value || undefined) as FilterState["dealStatus"],
                          })
                        }
                      >
                        <option value="">Todos</option>
                        <option value="OPEN">Aberto</option>
                        <option value="WON">Ganho</option>
                        <option value="LOST">Perdido</option>
                      </select>
                    </div>
                  </div>

                  {/* Dono + criado desde */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <UserIcon className="mr-1 inline size-3" />
                        Dono do deal
                      </Label>
                      <select
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        value={filters.dealOwnerId ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            dealOwnerId: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">Todos</option>
                        {(usersQuery.data ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        <Calendar className="mr-1 inline size-3" />
                        Criado desde
                      </Label>
                      <Input
                        type="date"
                        className="h-10"
                        value={filters.createdAfter ?? ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            createdAfter: e.target.value || undefined,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Telefone obrigatório */}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-background p-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-muted-foreground/30 accent-primary"
                      checked={!!filters.hasPhone}
                      onChange={(e) =>
                        setFilters({ ...filters, hasPhone: e.target.checked || undefined })
                      }
                    />
                    <Phone className="size-4 text-muted-foreground" />
                    <span>Apenas contatos com telefone</span>
                  </label>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      <TagIcon className="mr-1 inline size-3" />
                      Tags{" "}
                      <span className="font-normal text-muted-foreground">
                        (busca em contatos e negócios)
                      </span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(tagsQuery.data ?? []).map((tag) => {
                        const selected = filters.tagIds?.includes(tag.id);
                        const color = tag.color || "#6366f1";
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const current = filters.tagIds ?? [];
                              setFilters({
                                ...filters,
                                tagIds: selected
                                  ? current.filter((id) => id !== tag.id)
                                  : [...current, tag.id],
                              });
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                              selected
                                ? "shadow-sm"
                                : "border-border bg-background hover:border-foreground/20",
                            )}
                            style={
                              selected
                                ? {
                                    borderColor: color,
                                    backgroundColor: hexToRgba(color, 0.12),
                                    color: color,
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {tag.name}
                          </button>
                        );
                      })}
                      {(tagsQuery.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhuma tag cadastrada.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* Contador + preview */}
              {previewQuery.isFetching ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Contando contatos...
                </div>
              ) : previewQuery.data ? (
                <div
                  className={cn(
                    "rounded-xl border-2 p-4",
                    previewQuery.data.count > 0
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-amber-500/30 bg-amber-500/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full",
                        previewQuery.data.count > 0
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-amber-500/15 text-amber-600",
                      )}
                    >
                      <Users className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold leading-tight">
                        {previewQuery.data.count.toLocaleString("pt-BR")} contato
                        {previewQuery.data.count === 1 ? "" : "s"} encontrado
                        {previewQuery.data.count === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {previewQuery.data.count > 0
                          ? "Pronto para disparar para esses destinatários."
                          : "Ajuste os filtros — nenhum contato bate com os critérios."}
                      </p>
                    </div>
                  </div>
                  {previewQuery.data.sample.length > 0 ? (
                    <div className="mt-3 space-y-1 border-t border-emerald-500/20 pt-3">
                      {previewQuery.data.sample.slice(0, 5).map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                            {(c.name || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <span className="truncate font-medium text-foreground">{c.name}</span>
                          {c.phone ? (
                            <span className="truncate">· {c.phone}</span>
                          ) : null}
                        </div>
                      ))}
                      {previewQuery.data.count > 5 ? (
                        <p className="pl-8 text-xs text-muted-foreground">
                          e mais {previewQuery.data.count - 5}...
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Conteúdo</Label>

              {type === "TEMPLATE" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Selecione um template aprovado na Meta.
                  </p>
                  {templatesQuery.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    >
                      <option value="">Selecione um template</option>
                      {(templatesQuery.data ?? [])
                        .filter((t) => t.status === "APPROVED")
                        .map((t) => (
                          <option key={t.id ?? t.name} value={t.name}>
                            {t.name} ({t.language})
                          </option>
                        ))}
                    </select>
                  )}
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Input
                      value={templateLanguage}
                      onChange={(e) => setTemplateLanguage(e.target.value)}
                      placeholder="pt_BR"
                    />
                  </div>
                </div>
              ) : null}

              {type === "TEXT" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Digite a mensagem que será enviada para todos os destinatários.
                  </p>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border bg-background p-3 text-sm"
                    placeholder="Digite sua mensagem aqui..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {textContent.length} caracteres
                  </p>
                </div>
              ) : null}

              {type === "AUTOMATION" ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Selecione a automação que será disparada para cada contato.
                  </p>
                  {automationsQuery.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={automationId}
                      onChange={(e) => setAutomationId(e.target.value)}
                    >
                      <option value="">Selecione uma automação</option>
                      {(automationsQuery.data ?? [])
                        .filter((a) => a.active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Configuração</Label>

              <div className="space-y-2">
                <Label htmlFor="campaign-name">Nome da campanha</Label>
                <Input
                  id="campaign-name"
                  placeholder="Ex.: Black Friday 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Velocidade de envio (msgs/segundo)</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={type === "TEXT" ? 20 : 80}
                    value={sendRate}
                    onChange={(e) => setSendRate(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-sm font-medium">{sendRate}/s</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {type === "TEXT"
                    ? "Baileys: recomendado até 10/s para evitar bloqueio."
                    : "Meta Cloud API: limite padrão 80/s. Backoff automático em throttle."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled-at">Agendamento (opcional)</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para enviar imediatamente ao lançar.
                </p>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-4">
              <Label className="text-base font-semibold">Revisão</Label>
              <div className="space-y-3 rounded-lg border p-4">
                <Row label="Nome" value={name} />
                <Row label="Tipo" value={CAMPAIGN_TYPES.find((ct) => ct.value === type)?.label ?? type} />
                <Row label="Canal" value={selectedChannel?.name ?? channelId} />
                <Row
                  label="Destinatários"
                  value={
                    previewQuery.data
                      ? `${previewQuery.data.count} contatos`
                      : segmentId
                        ? "Segmento selecionado"
                        : "Filtros ad-hoc"
                  }
                />
                {type === "TEMPLATE" ? (
                  <Row label="Template" value={templateName} />
                ) : null}
                {type === "TEXT" ? (
                  <Row
                    label="Mensagem"
                    value={textContent.length > 80 ? textContent.slice(0, 80) + "..." : textContent}
                  />
                ) : null}
                {type === "AUTOMATION" ? (
                  <Row
                    label="Automação"
                    value={
                      automationsQuery.data?.find((a) => a.id === automationId)?.name ?? automationId
                    }
                  />
                ) : null}
                <Row label="Velocidade" value={`${sendRate} msgs/s`} />
                <Row
                  label="Agendamento"
                  value={scheduledAt ? new Date(scheduledAt).toLocaleString("pt-BR") : "Imediato"}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Voltar
        </Button>

        {step < 6 ? (
          <Button onClick={handleNext} disabled={!canAdvance()} className="gap-1">
            Continuar
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Rocket className="size-4" />
            )}
            Criar campanha
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}
