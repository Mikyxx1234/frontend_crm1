"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowLeft, BookOpen, Check, ClipboardCopy, Eye, Loader2, MessageCircle, Pencil, Phone, Plus, RefreshCw, Trash2, UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHost } from "@/components/ui/tooltip";
import { analyzeTemplateComponents } from "@/lib/meta-whatsapp/analyze-template-components";
import { mergeOperatorVariables, type OperatorVariableMeta } from "@/lib/meta-whatsapp/operator-template-variables";
import { cn } from "@/lib/utils";

const DOCS_LIST =
  "https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/message_templates/";
const DOCS_COMPONENTS =
  "https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components/";
const DOCS_CALL_PERMISSION =
  "https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/marketing-templates/call-permission-request-message-template";

type MetaTemplateRow = {
  id: string;
  name: string;
  status: string;
  category?: string;
  sub_category?: string;
  language?: string;
  parameter_format?: string;
  components?: unknown[];
  quality_score?: { score?: string };
  rejected_reason?: string;
};

type TemplateConfig = {
  id: string;
  metaTemplateId: string;
  metaTemplateName: string;
  label: string;
  agentEnabled: boolean;
  language: string;
  category: string | null;
  bodyPreview: string;
  hasButtons: boolean;
  buttonTypes: string[];
  hasVariables: boolean;
  flowAction: string | null;
  flowId: string | null;
  operatorVariables?: OperatorVariableMeta[] | null;
};

type ListResponse = {
  data?: MetaTemplateRow[];
  paging?: { cursors?: { after?: string; before?: string } };
};

const STATUS_PT: Record<string, string> = {
  APPROVED: "Aprovado",
  PENDING: "Em análise",
  PENDING_APPROVAL: "Em análise",
  REJECTED: "Rejeitado",
  PAUSED: "Pausado",
  DISABLED: "Desativado",
  IN_APPEAL: "Em recurso",
  LIMIT_EXCEEDED: "Limite excedido",
};

const QUALITY_PT: Record<string, string> = {
  GREEN: "Alta",
  YELLOW: "Média",
  RED: "Baixa",
  UNKNOWN: "—",
  NONE: "—",
};

/** A Meta às vezes envia `rejected_reason: "NONE"` mesmo com status APPROVED — não é rejeição real. */
/**
 * Heurística de identificação de templates do tipo "permissão de ligação"
 * (Call Permission Request). A Meta expõe essa tipagem via `sub_category =
 * CALL_PERMISSIONS_REQUEST` para templates WhatsApp Business Calling — e,
 * por convenção, os operadores nomeiam esses templates começando com
 * `call_permission`. Capturamos os dois sinais para robustez.
 */
function isCallPermissionTemplate(row: Pick<MetaTemplateRow, "name" | "sub_category">): boolean {
  const sub = (row.sub_category ?? "").toUpperCase();
  if (sub.includes("CALL_PERMISSIONS_REQUEST") || sub.includes("CALL_PERMISSION_REQUEST")) {
    return true;
  }
  const n = (row.name ?? "").toLowerCase();
  return n.startsWith("call_permission") || n.includes("call_permission_request");
}

function meaningfulRejectedReason(status: string, reason: string | undefined): string | null {
  if (!reason) return null;
  const r = reason.trim();
  if (!r) return null;
  if (status === "APPROVED" && /^none$/i.test(r)) return null;
  if (/^none$/i.test(r)) return null;
  return r;
}

async function fetchTemplatesPage(after?: string): Promise<ListResponse> {
  const q = new URLSearchParams();
  if (after) q.set("after", after);
  const res = await fetch(apiUrl(`/api/meta/whatsapp/message-templates?${q.toString()}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Erro ao listar");
  }
  return data as ListResponse;
}

async function fetchTemplateConfigs(): Promise<TemplateConfig[]> {
  const res = await fetch(apiUrl("/api/whatsapp-template-configs"));
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function upsertTemplateConfig(payload: Record<string, unknown>): Promise<TemplateConfig> {
  const res = await fetch(apiUrl("/api/whatsapp-template-configs"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao salvar config");
  return data as TemplateConfig;
}

function extractBodyText(components: unknown[] | undefined): string {
  if (!components?.length) return "";
  for (const c of components) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    if (String(o.type ?? "").toUpperCase() === "BODY" && typeof o.text === "string") return o.text;
  }
  return "";
}

/** Extrai textos exibíveis dos componentes retornados pela Graph API. */
function componentPreviewBlocks(components: unknown[] | undefined): { title: string; body: string }[] {
  if (!components?.length) return [];
  const blocks: { title: string; body: string }[] = [];
  for (const c of components) {
    if (!c || typeof c !== "object") continue;
    const o = c as Record<string, unknown>;
    const type = String(o.type ?? "?");
    const text = typeof o.text === "string" ? o.text : "";
    const fmt = typeof o.format === "string" ? o.format : "";
    if (text) {
      blocks.push({
        title: fmt ? `${type} (${fmt})` : type,
        body: text,
      });
    }
    if (type === "BUTTONS" && Array.isArray(o.buttons)) {
      for (const b of o.buttons) {
        if (!b || typeof b !== "object") continue;
        const btn = b as Record<string, unknown>;
        const bt = typeof btn.text === "string" ? btn.text : "";
        if (bt) {
          blocks.push({
            title: `Botão · ${String(btn.type ?? "?")}`,
            body: bt,
          });
        }
      }
    }
  }
  return blocks;
}

class TemplateBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-full space-y-4">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Configurações
          </Link>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
            <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
              <AlertTriangle className="size-5" />
              Erro ao carregar Templates WhatsApp
            </div>
            <pre className="mt-2 max-h-48 overflow-auto rounded border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap font-mono">
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WhatsappMetaTemplatesPageWrapper() {
  return (
    <TemplateBoundary>
      <WhatsappMetaTemplatesPage />
    </TemplateBoundary>
  );
}

function WhatsappMetaTemplatesPage() {
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [afterStack, setAfterStack] = React.useState<string[]>([]);
  const after = afterStack.length ? afterStack[afterStack.length - 1] : undefined;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["meta-whatsapp-templates", after ?? "first"],
    queryFn: () => fetchTemplatesPage(after),
  });

  const rows = data?.data ?? [];
  const nextCursor = data?.paging?.cursors?.after;

  const { data: templateConfigs = [] } = useQuery({
    queryKey: ["whatsapp-template-configs"],
    queryFn: fetchTemplateConfigs,
  });
  const configByMetaId = React.useMemo(() => {
    const m = new Map<string, TemplateConfig>();
    for (const c of templateConfigs) m.set(c.metaTemplateId, c);
    return m;
  }, [templateConfigs]);

  const configMutation = useMutation({
    mutationFn: upsertTemplateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-template-configs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editingLabelId, setEditingLabelId] = React.useState<string | null>(null);
  const [labelDraft, setLabelDraft] = React.useState("");
  const labelInputRef = React.useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createMode, setCreateMode] = React.useState<"assisted" | "json">("assisted");
  const [previewRow, setPreviewRow] = React.useState<MetaTemplateRow | null>(null);

  const [name, setName] = React.useState("");
  const [language, setLanguage] = React.useState("pt_BR");
  const [category, setCategory] = React.useState<"UTILITY" | "MARKETING" | "AUTHENTICATION">("UTILITY");
  const [parameterFormat, setParameterFormat] = React.useState<"POSITIONAL" | "NAMED">("POSITIONAL");
  const [body, setBody] = React.useState("");
  const [headerFormat, setHeaderFormat] = React.useState<"NONE" | "TEXT">("NONE");
  const [headerText, setHeaderText] = React.useState("");
  const [footer, setFooter] = React.useState("");
  const [addSecurityRecommendation, setAddSecurityRecommendation] = React.useState(true);
  const [codeExpirationMinutes, setCodeExpirationMinutes] = React.useState(10);
  const [otpType, setOtpType] = React.useState("COPY_CODE");
  const [otpButtonText, setOtpButtonText] = React.useState("Copiar código");
  const [quickTexts, setQuickTexts] = React.useState<string[]>([""]);
  const [urlRows, setUrlRows] = React.useState<{ text: string; url: string }[]>([{ text: "", url: "" }]);
  const [rawJson, setRawJson] = React.useState(
    '{\n  "name": "meu_template",\n  "language": "pt_BR",\n  "category": "MARKETING",\n  "parameter_format": "POSITIONAL",\n  "components": [\n    { "type": "BODY", "text": "Olá {{1}}" }\n  ]\n}',
  );

  const { data: flowDefsList = [] } = useQuery({
    queryKey: ["whatsapp-flow-definitions"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/whatsapp-flow-definitions"));
      if (!r.ok) return [] as { id: string; name: string; status: string; metaFlowId: string | null }[];
      return r.json() as Promise<{ id: string; name: string; status: string; metaFlowId: string | null }[]>;
    },
    enabled: createOpen && category !== "AUTHENTICATION",
  });
  const publishedFlows = React.useMemo(
    () => flowDefsList.filter((f) => f.status === "PUBLISHED" && f.metaFlowId?.trim()),
    [flowDefsList],
  );

  const [flowAssistEnabled, setFlowAssistEnabled] = React.useState(false);
  const [flowPickId, setFlowPickId] = React.useState("");
  const [flowButtonText, setFlowButtonText] = React.useState("Abrir formulário");
  const [flowActionMeta, setFlowActionMeta] = React.useState<"NAVIGATE" | "DATA_EXCHANGE">("NAVIGATE");

  React.useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    queueMicrotask(() => {
      setCreateOpen(true);
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("create");
      const qs = sp.toString();
      router.replace(qs ? `/settings/message-models?${qs}` : "/settings/message-models?tab=whatsapp");
    });
  }, [router, searchParams]);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown> | { raw: true; payload: Record<string, unknown> }) => {
      const res = await fetch(apiUrl("/api/meta/whatsapp/message-templates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j?.message === "string" ? j.message : "Erro ao criar");
      return j;
    },
    onSuccess: () => {
      toast.success("Template enviado à Meta para análise.");
      queryClient.invalidateQueries({ queryKey: ["meta-whatsapp-templates"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/meta/whatsapp/message-templates/${encodeURIComponent(id)}`), {
        method: "DELETE",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j?.message === "string" ? j.message : "Erro ao excluir");
      return j;
    },
    onSuccess: () => {
      toast.success("Template removido na Meta.");
      queryClient.invalidateQueries({ queryKey: ["meta-whatsapp-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function resetForm() {
    setName("");
    setBody("");
    setFooter("");
    setHeaderText("");
    setHeaderFormat("NONE");
    setQuickTexts([""]);
    setUrlRows([{ text: "", url: "" }]);
    setCreateMode("assisted");
    setFlowAssistEnabled(false);
    setFlowPickId("");
    setFlowButtonText("Abrir formulário");
    setFlowActionMeta("NAVIGATE");
  }

  function submitAssisted() {
    const buttons: Record<string, unknown>[] = [];
    for (const t of quickTexts) {
      const x = t.trim();
      if (x) buttons.push({ type: "QUICK_REPLY", text: x });
    }
    for (const u of urlRows) {
      if (u.text.trim() && u.url.trim()) {
        buttons.push({ type: "URL", text: u.text.trim(), url: u.url.trim() });
      }
    }
    if (flowAssistEnabled && flowPickId.trim()) {
      buttons.push({
        type: "FLOW",
        text: (flowButtonText.trim() || "Abrir fluxo").slice(0, 25),
        flow_id: flowPickId.trim(),
        flow_action: flowActionMeta,
      });
    }
    createMutation.mutate({
      name,
      language,
      category,
      parameterFormat,
      body,
      headerFormat,
      headerText: headerFormat === "TEXT" ? headerText : undefined,
      footer: category !== "AUTHENTICATION" ? footer : undefined,
      buttons: category !== "AUTHENTICATION" && buttons.length ? buttons : undefined,
      addSecurityRecommendation,
      codeExpirationMinutes,
      otpType,
      otpButtonText,
    });
  }

  function submitJson() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      toast.error("JSON inválido.");
      return;
    }
    createMutation.mutate({ raw: true, payload: parsed });
  }

  return (
    <div className="w-full space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Configurações
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={pageHeaderTitleClass}>
            Templates WhatsApp (Meta)
          </h1>
          <p className={cn(pageHeaderDescriptionClass, "max-w-2xl")}>
            Lista, criação e exclusão na conta comercial (WABA). Tipos suportados no assistente:{" "}
            <strong>UTILITY</strong>, <strong>MARKETING</strong> e <strong>AUTHENTICATION</strong>. O assistente também
            permite <strong>botão Flow</strong> com <code className="text-xs">flow_id</code> publicado no CRM (aba Flows
            em Modelos de mensagem). Carrossel e permissão de ligação continuam no modo <strong>JSON avançado</strong>.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <a
              href={DOCS_LIST}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              <BookOpen className="size-3" /> API message_templates
            </a>
            <a
              href={DOCS_COMPONENTS}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              Componentes
            </a>
            <a
              href={DOCS_CALL_PERMISSION}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              Permissão de ligação
            </a>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="ml-2">Atualizar</span>
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            <span className="ml-2">Novo template</span>
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao falar com a Meta."}{" "}
          Se aparecer configuração em falta, confira no servidor{" "}
          <code className="rounded bg-muted px-1 text-xs">META_WHATSAPP_*</code> e o escopo{" "}
          <code className="text-xs">whatsapp_business_management</code> no token.
        </div>
      ) : !isLoading ? (
        <p className="text-xs text-muted-foreground">
          Com a lista a carregar bem, o token no servidor já tem acesso à WABA.{" "}
          <strong className="font-medium text-foreground">Dica:</strong> não reutilize o mesmo nome de template
          enquanto outro com esse nome estiver pendente na Meta.
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro"}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum template encontrado nesta WABA.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Idioma</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium">Qualidade</th>
                <th className="px-3 py-2 font-medium text-center">
                  <TooltipHost label="Liberado para o agente usar no chat" side="bottom">
                    <span className="flex items-center justify-center gap-1">
                      <UserCheck className="size-4" />
                      <span className="text-xs font-normal text-muted-foreground">Agente</span>
                    </span>
                  </TooltipHost>
                </th>
                <th className="px-3 py-2 font-medium w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const st = STATUS_PT[row.status] ?? row.status;
                const scoreRaw =
                  row.quality_score?.score == null ? "" : String(row.quality_score.score).trim();
                const q =
                  scoreRaw && !/^none$/i.test(String(scoreRaw))
                    ? QUALITY_PT[String(scoreRaw).toUpperCase()] ?? scoreRaw
                    : "—";
                const rejectReason = meaningfulRejectedReason(row.status, row.rejected_reason);
                const cfg = configByMetaId.get(row.id);
                const isEditingLabel = editingLabelId === row.id;

                function saveConfig(patch: Partial<{ label: string; agentEnabled: boolean }>) {
                  const analysis = analyzeTemplateComponents(
                    Array.isArray(row.components) ? row.components : undefined,
                    { parameterFormat: row.parameter_format },
                  );
                  const bodyTxt = extractBodyText(row.components);
                  const prevVars = Array.isArray(cfg?.operatorVariables)
                    ? (cfg!.operatorVariables as OperatorVariableMeta[])
                    : undefined;
                  const operatorVariables = mergeOperatorVariables(bodyTxt, prevVars);
                  configMutation.mutate({
                    metaTemplateId: row.id,
                    metaTemplateName: row.name,
                    label: patch.label ?? cfg?.label ?? "",
                    agentEnabled: patch.agentEnabled ?? cfg?.agentEnabled ?? false,
                    language: row.language ?? "pt_BR",
                    category: row.category ?? null,
                    bodyPreview: bodyTxt,
                    hasButtons: analysis.hasButtons,
                    buttonTypes: analysis.buttonTypes,
                    hasVariables: analysis.hasVariables,
                    flowAction: analysis.flowAction,
                    flowId: analysis.flowId,
                    operatorVariables,
                  });
                }

                const isCallPermission = isCallPermissionTemplate(row);

                return (
                  <tr key={row.id} className="border-b border-border/80 last:border-0">
                    <td className="px-3 py-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{row.name}</span>
                        {isCallPermission ? (
                          <TooltipHost label="Template de permissão de ligação (Business Calling API)" side="top">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200">
                              <Phone className="size-2.5" />
                              Voz
                            </span>
                          </TooltipHost>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {isEditingLabel ? (
                        <form className="flex items-center gap-1" onSubmit={(e) => {
                          e.preventDefault();
                          saveConfig({ label: labelDraft });
                          setEditingLabelId(null);
                        }}>
                          <Input
                            ref={labelInputRef}
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            className="h-7 w-36 text-xs"
                            placeholder="Ex: Boas-vindas"
                            autoFocus
                            onBlur={() => {
                              saveConfig({ label: labelDraft });
                              setEditingLabelId(null);
                            }}
                          />
                          <button type="submit" className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50">
                            <Check className="size-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="group/lbl flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingLabelId(row.id); setLabelDraft(cfg?.label ?? ""); }}
                        >
                          <span className={cn(cfg?.label ? "font-medium text-foreground" : "italic")}>
                            {cfg?.label || "Sem label"}
                          </span>
                          <Pencil className="size-3 opacity-0 group-hover/lbl:opacity-100" />
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.language ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs">
                        {row.category ?? "—"}
                        {row.sub_category ? (
                          <span className="text-muted-foreground"> · {row.sub_category}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          row.status === "APPROVED" && "bg-emerald-100 text-emerald-900",
                          (row.status === "PENDING" || row.status === "PENDING_APPROVAL") &&
                            "bg-amber-100 text-amber-900",
                          row.status === "REJECTED" && "bg-red-100 text-red-900",
                        )}
                      >
                        {st}
                      </Badge>
                      {rejectReason ? (
                        <TooltipHost label={rejectReason} side="bottom">
                          <p className="mt-1 max-w-xs text-xs text-destructive">
                            {rejectReason}
                          </p>
                        </TooltipHost>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs">{q}</td>
                    <td className="px-3 py-2 text-center">
                      <TooltipHost
                        label={cfg?.agentEnabled ? "Liberado para agentes — clique para bloquear" : "Bloqueado para agentes — clique para liberar"}
                        side="left"
                      >
                        <button
                          type="button"
                          aria-label={cfg?.agentEnabled ? "Bloquear para agentes" : "Liberar para agentes"}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            cfg?.agentEnabled
                              ? "border-emerald-400 bg-emerald-500"
                              : "border-border bg-muted",
                            row.status !== "APPROVED" && "cursor-not-allowed opacity-40",
                          )}
                          onClick={() => saveConfig({ agentEnabled: !cfg?.agentEnabled })}
                          disabled={row.status !== "APPROVED"}
                        >
                          <span className={cn(
                            "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
                            cfg?.agentEnabled ? "translate-x-5" : "translate-x-0",
                          )} />
                        </button>
                      </TooltipHost>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <TooltipHost label="Ver texto do template" side="top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Ver texto do template"
                            onClick={() => setPreviewRow(row)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipHost>
                        <TooltipHost label="Copiar ID Graph" side="top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Copiar ID Graph"
                            onClick={() => {
                              void navigator.clipboard.writeText(row.id);
                              toast.message("ID copiado");
                            }}
                          >
                            <ClipboardCopy className="size-3.5" />
                          </Button>
                        </TooltipHost>
                        <TooltipHost label="Excluir na Meta" side="top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            aria-label="Excluir na Meta"
                            onClick={async () => {
                              const ok = await confirmDialog({
                                title: "Excluir template",
                                description: `Excluir o template "${row.name}" na Meta? Esta ação não pode ser desfeita.`,
                                confirmLabel: "Excluir",
                                variant: "destructive",
                              });
                              if (ok) deleteMutation.mutate(row.id);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TooltipHost>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAfterStack((s) => [...s, nextCursor])}
        >
          Carregar mais
        </Button>
      ) : null}
      {afterStack.length > 0 ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setAfterStack([])}>
          Voltar ao início da lista
        </Button>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="xl" panelClassName="max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              Novo template na Meta
            </DialogTitle>
            <DialogDescription>
              O template segue para análise automática da Meta. Campos variáveis:{" "}
              <code className="text-xs">{"{{1}}"}</code> (POSITIONAL) ou nomes em NAMED, conforme a doc.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-border pb-2">
            <Button
              type="button"
              variant={createMode === "assisted" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCreateMode("assisted")}
            >
              Assistido
            </Button>
            <Button
              type="button"
              variant={createMode === "json" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCreateMode("json")}
            >
              JSON avançado
            </Button>
          </div>

          {createMode === "json" ? (
            <div className="space-y-2">
              <Label>Cole o JSON do corpo do POST (oficial Meta)</Label>
              <Textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                className="min-h-[220px] font-mono text-xs"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Use para <strong>FLOW</strong>, <strong>carousel</strong>,{" "}
                <strong>call permission request</strong>, MPM, etc. — copie a estrutura dos exemplos da Meta e
                ajuste nomes/IDs.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label>Nome interno (snake_case)</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase())}
                    placeholder="ex.: lembrete_pagamento"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Idioma</Label>
                  <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="pt_BR" />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <SelectNative
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as "UTILITY" | "MARKETING" | "AUTHENTICATION")
                  }
                  className="w-full"
                >
                  <option value="UTILITY">UTILITY (transacional)</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="AUTHENTICATION">AUTHENTICATION (OTP)</option>
                </SelectNative>
              </div>
              {category !== "AUTHENTICATION" ? (
                <div>
                  <Label>Formato de parâmetros</Label>
                  <SelectNative
                    value={parameterFormat}
                    onChange={(e) => setParameterFormat(e.target.value as "POSITIONAL" | "NAMED")}
                    className="w-full"
                  >
                    <option value="POSITIONAL">POSITIONAL ({"{{1}}, {{2}}"}…)</option>
                    <option value="NAMED">NAMED (nomes na doc Meta)</option>
                  </SelectNative>
                </div>
              ) : null}

              {category !== "AUTHENTICATION" ? (
                <>
                  <div>
                    <Label>Cabeçalho</Label>
                    <SelectNative
                      value={headerFormat}
                      onChange={(e) => setHeaderFormat(e.target.value as "NONE" | "TEXT")}
                      className="w-full"
                    >
                      <option value="NONE">Sem cabeçalho</option>
                      <option value="TEXT">TEXT</option>
                    </SelectNative>
                  </div>
                  {headerFormat === "TEXT" ? (
                    <div>
                      <Label>Texto do cabeçalho</Label>
                      <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} />
                    </div>
                  ) : null}
                </>
              ) : null}

              <div>
                <Label>Corpo {category === "AUTHENTICATION" ? "(ex.: {{1}} é seu código)" : ""}</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="text-sm" />
              </div>

              {category === "AUTHENTICATION" ? (
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={addSecurityRecommendation}
                      onChange={(e) => setAddSecurityRecommendation(e.target.checked)}
                    />
                    Recomendação de segurança (Meta)
                  </label>
                  <div>
                    <Label>Expiração do código (minutos)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={codeExpirationMinutes}
                      onChange={(e) => setCodeExpirationMinutes(Number(e.target.value) || 10)}
                    />
                  </div>
                  <div>
                    <Label>Tipo OTP</Label>
                    <SelectNative value={otpType} onChange={(e) => setOtpType(e.target.value)} className="w-full">
                      <option value="COPY_CODE">COPY_CODE</option>
                      <option value="ONE_TAP">ONE_TAP</option>
                    </SelectNative>
                  </div>
                  <div>
                    <Label>Texto do botão OTP</Label>
                    <Input value={otpButtonText} onChange={(e) => setOtpButtonText(e.target.value)} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Rodapé (opcional)</Label>
                    <Input value={footer} onChange={(e) => setFooter(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Botões rápidos (um por linha)</Label>
                    {quickTexts.map((q, i) => (
                      <Input
                        key={i}
                        className="mb-1 mt-1"
                        value={q}
                        onChange={(e) => {
                          const n = [...quickTexts];
                          n[i] = e.target.value;
                          setQuickTexts(n);
                        }}
                        placeholder="Texto do quick reply"
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => setQuickTexts((q) => [...q, ""])}
                    >
                      + Quick reply
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Botões URL</Label>
                    {urlRows.map((r, i) => (
                      <div key={i} className="mb-2 flex gap-2">
                        <Input
                          placeholder="Texto"
                          value={r.text}
                          onChange={(e) => {
                            const n = [...urlRows];
                            n[i] = { ...n[i], text: e.target.value };
                            setUrlRows(n);
                          }}
                        />
                        <Input
                          placeholder="https://..."
                          value={r.url}
                          onChange={(e) => {
                            const n = [...urlRows];
                            n[i] = { ...n[i], url: e.target.value };
                            setUrlRows(n);
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUrlRows((u) => [...u, { text: "", url: "" }])}
                    >
                      + URL
                    </Button>
                  </div>
                  <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={flowAssistEnabled}
                        onChange={(e) => setFlowAssistEnabled(e.target.checked)}
                      />
                      Botão WhatsApp Flow (assistido)
                    </label>
                    {flowAssistEnabled ? (
                      <div className="mt-3 space-y-2">
                        <div>
                          <Label>Flow publicado (CRM)</Label>
                          <SelectNative
                            value={flowPickId}
                            onChange={(e) => setFlowPickId(e.target.value)}
                            className="mt-1 w-full"
                          >
                            <option value="">— escolha —</option>
                            {publishedFlows.map((f) => (
                              <option key={f.id} value={f.metaFlowId!.trim()}>
                                {f.name} ({f.metaFlowId})
                              </option>
                            ))}
                          </SelectNative>
                          {publishedFlows.length === 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Publique um flow em{" "}
                              <Link
                                href="/settings/message-models?tab=flows"
                                className="font-medium text-primary underline-offset-2 hover:underline"
                              >
                                Modelos → Flows
                              </Link>
                              .
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <Label>Texto do botão (máx. 25)</Label>
                          <Input
                            value={flowButtonText}
                            onChange={(e) => setFlowButtonText(e.target.value.slice(0, 25))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>flow_action</Label>
                          <SelectNative
                            value={flowActionMeta}
                            onChange={(e) =>
                              setFlowActionMeta(e.target.value as "NAVIGATE" | "DATA_EXCHANGE")
                            }
                            className="mt-1 w-full"
                          >
                            <option value="NAVIGATE">NAVIGATE</option>
                            <option value="DATA_EXCHANGE">DATA_EXCHANGE</option>
                          </SelectNative>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => (createMode === "json" ? submitJson() : submitAssisted())}
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              <span className={cn(createMutation.isPending && "ml-2")}>Criar na Meta</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewRow} onOpenChange={(open) => { if (!open) setPreviewRow(null); }}>
        <DialogContent size="xl" panelClassName="max-h-[min(88vh,640px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{previewRow?.name ?? "Template"}</DialogTitle>
            <DialogDescription>
              {previewRow?.language ?? "—"} · {previewRow?.status ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewRow && componentPreviewBlocks(previewRow.components).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Não há campo de texto nos componentes devolvidos pela API (pode ocorrer em tipos especiais).
                Consulte o conteúdo no{" "}
                <a
                  href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Gestor do WhatsApp
                </a>
                .
              </p>
            ) : null}
            {previewRow
              ? componentPreviewBlocks(previewRow.components).map((b, i) => (
                  <div key={`${b.title}-${i}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {b.title}
                    </p>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">
                      {b.body}
                    </pre>
                  </div>
                ))
              : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewRow(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
