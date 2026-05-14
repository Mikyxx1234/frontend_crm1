"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AutomationStats } from "@/lib/automation-stats-types";

const WorkflowCanvas = dynamic(
  () => import("@/components/automations/workflow-canvas").then((m) => m.WorkflowCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#f0f4f8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    ),
  },
);
// Pesado (depende de react-query + fetches) e irrelevante no load
// inicial — carregar só quando o operador abrir o painel.
const CopilotPanel = dynamic(
  () => import("@/components/automations/copilot-panel").then((m) => m.CopilotPanel),
  { ssr: false },
);
import {
  TriggerConfigFields,
  TriggerTypeSelect,
} from "@/components/automations/trigger-config-fields";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHost } from "@/components/ui/tooltip";
import {
  type AutomationStep,
  apiStepsToWorkflow,
  defaultTriggerConfig,
  stepTypeLabel,
  triggerTypeLabel,
  workflowStepsToPayload,
} from "@/lib/automation-workflow";
import { autoAlignWorkflowSteps } from "@/lib/automation-layout";
import { cn, formatDateTime } from "@/lib/utils";

type AutomationDetail = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: unknown;
  active: boolean;
  updatedAt: string;
  steps: {
    id: string;
    type: string;
    config: unknown;
    position: number;
  }[];
};

type LogRow = {
  id: string;
  status: string;
  message: string | null;
  contactId: string | null;
  dealId: string | null;
  executedAt: string;
  payload?: Record<string, unknown> | null;
};

type LogsResponse = {
  logs?: LogRow[];
  items?: LogRow[];
  total: number;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return j.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

function ActiveSwitch({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => onToggle()}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-success" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
          active && "translate-x-5"
        )}
      />
    </button>
  );
}

function LogsTableView({
  rows,
  expandedId,
  onToggle,
  statusVariant,
}: {
  rows: LogRow[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  statusVariant: (s: string) => "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[28px]" />
          <TableHead>Status</TableHead>
          <TableHead>Quando</TableHead>
          <TableHead>Mensagem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const hasPayload = row.payload && Object.keys(row.payload).length > 0;
          const msg = row.message ?? "";
          // Uma msg "longa" (>60 chars) também deve poder ser expandida
          // mesmo sem payload — é o caso típico de erro "send_whatsapp_message:
          // content obrigatório (mensagem vazia)" que antes ficava truncado
          // sem jeito de o operador ler o texto completo.
          const isLongMessage = msg.length > 60;
          const isExpandable = hasPayload || isLongMessage;
          const isExpanded = expandedId === row.id;
          return (
            <TableRow
              key={row.id}
              className={cn(
                isExpandable && "cursor-pointer hover:bg-muted/40",
                isExpanded && "bg-muted/30"
              )}
              onClick={() => {
                if (isExpandable) onToggle(isExpanded ? null : row.id);
              }}
            >
              <TableCell className="w-[28px] px-1">
                {isExpandable && (
                  isExpanded
                    ? <ChevronDown className="size-3.5 text-muted-foreground" />
                    : <ChevronRight className="size-3.5 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(row.executedAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className={isExpanded ? "whitespace-pre-wrap wrap-break-word" : "max-w-[320px] truncate"}>
                  {row.message ?? "—"}
                </div>
                {isExpanded && hasPayload && (
                  <pre className="mt-2 max-h-[200px] overflow-auto rounded border border-border bg-muted/50 p-2 text-[11px] leading-relaxed text-foreground">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function AutomationDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("contact_created");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    {}
  );
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [stepLogsId, setStepLogsId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["automation", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}`));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as AutomationDetail;
    },
  });

  const logsQuery = useQuery({
    queryKey: ["automation-logs", id],
    enabled: Boolean(id) && logsOpen,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}/logs?perPage=50`));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as LogsResponse;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["automation-stats", id],
    enabled: Boolean(id) && hydrated,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}/stats`));
      if (!res.ok) return null;
      return (await res.json()) as AutomationStats;
    },
  });

  const stepLogsQuery = useQuery({
    queryKey: ["automation-step-logs", id, stepLogsId],
    enabled: Boolean(id) && Boolean(stepLogsId),
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}/logs?perPage=50&stepId=${stepLogsId}`)
      );
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as LogsResponse;
    },
  });

  const stepLogsLabel = useMemo(() => {
    if (!stepLogsId) return "";
    if (stepLogsId === "trigger") return "Gatilho";
    const st = steps.find((s) => s.id === stepLogsId);
    if (!st) return stepLogsId.slice(0, 8);
    return stepTypeLabel(st.type);
  }, [stepLogsId, steps]);

  const stepLogRows = stepLogsQuery.data?.logs ?? stepLogsQuery.data?.items ?? [];

  const handleStepLogsOpen = useCallback((stepId: string) => {
    setStepLogsId(stepId);
  }, []);

  useEffect(() => {
    const d = detailQuery.data;
    if (!d) return;
    setName(d.name);
    setDescription(d.description ?? "");
    setTriggerType(d.triggerType);
    const tc =
      typeof d.triggerConfig === "object" &&
      d.triggerConfig !== null &&
      !Array.isArray(d.triggerConfig)
        ? { ...(d.triggerConfig as Record<string, unknown>) }
        : defaultTriggerConfig(d.triggerType);
    setTriggerConfig(tc);
    setSteps(apiStepsToWorkflow(d.steps));
    setActive(d.active);
    setHydrated(true);
    setDirty(false);
  }, [detailQuery.data]);

  const onTriggerTypeChange = useCallback((t: string) => {
    setTriggerType(t);
    setTriggerConfig(defaultTriggerConfig(t));
    setDirty(true);
  }, []);

  const handleStepsChange = useCallback(
    (s: AutomationStep[]) => {
      setSteps(s);
      setDirty(true);
    },
    []
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          triggerType,
          triggerConfig,
          steps: workflowStepsToPayload(steps),
        }),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as AutomationDetail;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["automation", id], data);
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
      void queryClient.invalidateQueries({
        queryKey: ["automation-logs", id],
      });
      setDirty(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}/toggle`), {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as AutomationDetail;
    },
    onMutate: async () => {
      setActive((a) => !a);
    },
    onError: () => {
      setActive(detailQuery.data?.active ?? false);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["automation", id], data);
      setActive(data.active);
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/automations/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error(await readErrorMessage(res));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
      router.push("/automations");
    },
  });

  const openNameEdit = () => {
    setNameDraft(name);
    setNameDialogOpen(true);
  };

  const saveName = () => {
    const t = nameDraft.trim();
    if (t) {
      setName(t);
      setDirty(true);
    }
    setNameDialogOpen(false);
  };

  const handleAutoAlign = useCallback(() => {
    setSteps((prev) => autoAlignWorkflowSteps(prev));
    setDirty(true);
  }, []);

  const handleExportJson = useCallback(() => {
    const payload = {
      id,
      name: name.trim(),
      description: description.trim() || null,
      triggerType,
      triggerConfig,
      active,
      steps: workflowStepsToPayload(steps),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const safeName = (name.trim() || "automacao")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName || "automacao"}-fluxo.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [active, description, id, name, steps, triggerConfig, triggerType]);

  const logRows = logsQuery.data?.logs ?? logsQuery.data?.items ?? [];

  const statusVariant = (
    s: string
  ): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" => {
    if (s === "SUCCESS") return "success";
    if (s === "FAILED") return "destructive";
    if (s === "SKIPPED") return "warning";
    return "secondary";
  };

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!id) {
    return <p className="text-sm text-muted-foreground">ID inválido.</p>;
  }

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[480px] w-full rounded-xl" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-sm text-destructive">
          {(detailQuery.error as Error)?.message ?? "Não foi possível carregar"}
        </p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/automations">Voltar à lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="-m-6 flex h-[calc(100dvh-0px)] flex-col overflow-hidden md:-m-8">
      {/* ═══ Top bar premium ═══
          glassmorphism + pill buttons + glow no Salvar — alinhado ao
          design system EduIT Premium. ActiveSwitch local mantido pra
          não desalinhar com os outros usos no Config dialog. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-white/85 px-4 py-2.5 shadow-[0_1px_0_rgba(13,27,62,0.04)] backdrop-blur-xl">
        {/* Breadcrumb */}
        <Link
          href="/automations"
          className="group/back flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-bold tracking-tight text-[var(--color-ink-soft)] transition-colors hover:bg-[#eef4ff]/60 hover:text-primary"
        >
          <ArrowLeft className="size-4 transition-transform group-hover/back:-translate-x-0.5" strokeWidth={2.4} />
          Automações
        </Link>
        <ChevronRight className="size-3.5 text-slate-300" />
        <button
          type="button"
          onClick={openNameEdit}
          className="group/name flex items-center gap-1.5 rounded-lg px-2 py-1 text-[14px] font-extrabold tracking-tighter text-slate-900 transition-colors hover:bg-[var(--color-bg-subtle)]"
        >
          {name}
          <Pencil className="size-3 text-[var(--color-ink-muted)] transition-colors group-hover/name:text-primary" strokeWidth={2.4} />
        </button>

        {/* Unsaved indicator — pílula âmbar */}
        {dirty && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold tracking-tight text-amber-700 ring-1 ring-amber-200">
            <span className="size-1.5 animate-pulse-soft rounded-full bg-amber-500" />
            Alterações não salvas
          </span>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1 ring-1 transition-colors",
              active
                ? "bg-emerald-50 ring-emerald-200"
                : "bg-[var(--color-bg-subtle)] ring-slate-200"
            )}
          >
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-widest",
                active ? "text-emerald-700" : "text-slate-500"
              )}
            >
              {active ? "Ativa" : "Inativa"}
            </span>
            <ActiveSwitch
              active={active}
              disabled={toggleMutation.isPending}
              onToggle={() => toggleMutation.mutate()}
            />
          </div>

          <TooltipHost label="Configuração" side="bottom">
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900"
              aria-label="Configuração"
            >
              <Settings2 className="size-4" strokeWidth={2.2} />
            </button>
          </TooltipHost>

          <TooltipHost
            label={copilotOpen ? "Fechar Copilot" : "Copilot IA (auditoria + sugestões)"}
            side="bottom"
          >
            <button
              type="button"
              onClick={() => setCopilotOpen((o) => !o)}
              aria-label="Copilot"
              aria-pressed={copilotOpen}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold tracking-tight transition-all",
                copilotOpen
                  ? "bg-primary text-white shadow-[var(--shadow-indigo-glow)] hover:-translate-y-px"
                  : "border border-border bg-white text-foreground hover:-translate-y-px hover:border-[#c9d7f5] hover:text-primary hover:shadow-sm",
              )}
            >
              <Sparkles className="size-3.5" strokeWidth={2.4} />
              Copilot
            </button>
          </TooltipHost>

          <TooltipHost label="Auto alinhar fluxo" side="bottom">
            <button
              type="button"
              onClick={handleAutoAlign}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[12px] font-bold tracking-tight text-foreground transition-all hover:-translate-y-px hover:border-[#c9d7f5] hover:text-primary hover:shadow-sm"
            >
              <Sparkles className="size-3.5" strokeWidth={2.4} />
              Auto alinhar
            </button>
          </TooltipHost>

          <TooltipHost label="Exportar fluxo em JSON" side="bottom">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-white px-3.5 text-[12px] font-bold tracking-tight text-foreground transition-all hover:-translate-y-px hover:border-[#c9d7f5] hover:text-primary hover:shadow-sm"
            >
              <Download className="size-3.5" strokeWidth={2.4} />
              Exportar JSON
            </button>
          </TooltipHost>

          <button
            type="button"
            onClick={() => setLogsOpen(true)}
            className="h-9 rounded-full border border-border bg-white px-3.5 text-[12px] font-bold tracking-tight text-foreground transition-all hover:-translate-y-px hover:border-slate-300 hover:bg-[var(--color-bg-subtle)] hover:shadow-sm"
          >
            Logs
          </button>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-rose-500 px-3.5 text-[12px] font-bold tracking-tight text-white shadow-[0_10px_30px_-10px_rgba(244,63,94,0.4)] transition-all hover:-translate-y-px hover:bg-rose-600 hover:shadow-[0_12px_30px_-8px_rgba(244,63,94,0.5)]"
          >
            <Trash2 className="size-3.5" strokeWidth={2.4} />
            Excluir
          </button>

          <button
            type="button"
            disabled={!hydrated || saveMutation.isPending || !name.trim()}
            onClick={() => saveMutation.mutate()}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[12px] font-extrabold tracking-tight text-white shadow-[var(--shadow-indigo-glow)] transition-all",
              !hydrated || saveMutation.isPending || !name.trim()
                ? "cursor-not-allowed opacity-60"
                : "hover:-translate-y-px hover:bg-[#4466d6] hover:shadow-[0_14px_30px_-6px_rgba(80,125,241,0.45)]"
            )}
          >
            <Save className="size-3.5" strokeWidth={2.4} />
            {saveMutation.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      {saveMutation.isError && (
        <div className="shrink-0 border-b border-rose-200/60 bg-rose-50/70 px-4 py-2 text-[12px] font-bold text-rose-700 backdrop-blur-sm">
          {(saveMutation.error as Error).message}
        </div>
      )}

      {/* ═══ Canvas + Copilot lateral ═══ */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {hydrated ? (
            <WorkflowCanvas
              steps={steps}
              onStepsChange={handleStepsChange}
              triggerType={triggerType}
              triggerConfig={triggerConfig}
              stats={statsQuery.data}
              onStepLogsOpen={handleStepLogsOpen}
              className="h-full"
            />
          ) : (
            <Skeleton className="h-full w-full" />
          )}
        </div>
        {copilotOpen && hydrated && (
          <CopilotPanel
            automationId={id}
            automationName={name}
            description={description}
            triggerType={triggerType}
            triggerConfig={triggerConfig}
            active={active}
            steps={steps}
            onStepsChange={handleStepsChange}
            onClose={() => setCopilotOpen(false)}
          />
        )}
      </div>

      {/* ═══ Config dialog ═══ */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent size="lg" panelClassName="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração</DialogTitle>
            <DialogDescription>
              Nome, descrição e parâmetros de gatilho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ad-name">Nome</Label>
              <Input
                id="ad-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-desc">Descrição</Label>
              <Textarea
                id="ad-desc"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <TriggerTypeSelect
              value={triggerType}
              onChange={onTriggerTypeChange}
            />
            <TriggerConfigFields
              triggerType={triggerType}
              value={triggerConfig}
              onChange={(v) => {
                setTriggerConfig(v);
                setDirty(true);
              }}
            />

            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">Simular comportamento humano</p>
              <p className="text-xs text-muted-foreground">
                Faz o robô parecer uma pessoa real para o cliente no WhatsApp.
              </p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">Marcar como lida</p>
                  <p className="text-xs text-muted-foreground">
                    Exibe ticks azuis ao receber mensagem.
                  </p>
                </div>
                <ActiveSwitch
                  active={triggerConfig.markAsRead === true}
                  onToggle={() => {
                    setTriggerConfig((tc) => ({ ...tc, markAsRead: !tc.markAsRead }));
                    setDirty(true);
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm">Simular digitação</p>
                  <p className="text-xs text-muted-foreground">
                    Mostra &ldquo;digitando...&rdquo; antes de cada resposta.
                  </p>
                </div>
                <ActiveSwitch
                  active={triggerConfig.simulateTyping === true}
                  onToggle={() => {
                    setTriggerConfig((tc) => ({ ...tc, simulateTyping: !tc.simulateTyping }));
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Logs dialog ═══ */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent size="xl" panelClassName="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execuções</DialogTitle>
            <DialogDescription>
              Últimos registros (
              {logsQuery.data?.total ?? logRows.length} no total).
            </DialogDescription>
          </DialogHeader>
          {logsQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : logsQuery.isError ? (
            <p className="text-sm text-destructive">
              {(logsQuery.error as Error).message}
            </p>
          ) : logRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum log ainda.
            </p>
          ) : (
            <LogsTableView rows={logRows} expandedId={expandedLogId} onToggle={setExpandedLogId} statusVariant={statusVariant} />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogsOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Step logs dialog ═══ */}
      <Dialog open={Boolean(stepLogsId)} onOpenChange={(open) => { if (!open) setStepLogsId(null); }}>
        <DialogContent size="xl" panelClassName="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eventos — {stepLogsLabel}</DialogTitle>
            <DialogDescription>
              {stepLogsQuery.data
                ? `${stepLogsQuery.data.total} registro(s)`
                : "Carregando…"}
            </DialogDescription>
          </DialogHeader>
          {stepLogsQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : stepLogsQuery.isError ? (
            <p className="text-sm text-destructive">
              {(stepLogsQuery.error as Error).message}
            </p>
          ) : stepLogRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum evento ainda.
            </p>
          ) : (
            <LogsTableView rows={stepLogRows} expandedId={expandedLogId} onToggle={setExpandedLogId} statusVariant={statusVariant} />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepLogsId(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Name edit ═══ */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome</DialogTitle>
            <DialogDescription>
              Altere o nome desta automação.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
            }}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNameDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={saveName} disabled={!nameDraft.trim()}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete confirm ═══ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir automação?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A automação e seus passos serão
              removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
