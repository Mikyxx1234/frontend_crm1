"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowLeft, BookOpen, Check, CheckCircle2, ClipboardCopy, Clock, Eye, Info, Layers, Loader2, MessageCircle, MessageSquare, Pencil, Phone, Plus, RefreshCw, Search, Trash2, UserCheck,
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
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHost } from "@/components/ui/tooltip";
import { analyzeTemplateComponents } from "@/lib/meta-whatsapp/analyze-template-components";
import { mergeOperatorVariables, type OperatorVariableMeta } from "@/lib/meta-whatsapp/operator-template-variables";
import { cn } from "@/lib/utils";
import {
  HubCallout,
  HubChip,
  HubPanel,
  HubStat,
  HubStatGrid,
  HubSubHeader,
  HubToolbar,
} from "./message-models/hub-ui";

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
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="size-4" /> Configurações
          </Link>
          <div className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[var(--color-danger-bg)] p-6 text-sm">
            <div className="mb-2 flex items-center gap-2 font-bold text-[var(--color-danger)]">
              <AlertTriangle className="size-5" />
              Erro ao carregar Templates WhatsApp
            </div>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] p-3 font-mono text-xs text-[var(--text-secondary)]">
              {this.state.error.message}
              {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-[var(--radius-full)] bg-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
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

export default function WhatsappMetaTemplatesPageWrapper({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <TemplateBoundary>
      <WhatsappMetaTemplatesPage embedded={embedded} />
    </TemplateBoundary>
  );
}

function WhatsappMetaTemplatesPage({ embedded = false }: { embedded?: boolean }) {
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

  const countUtility = rows.filter((r) => (r.category ?? "").toUpperCase() === "UTILITY").length;
  const countMarketing = rows.filter((r) => (r.category ?? "").toUpperCase() === "MARKETING").length;
  const countAuth = rows.filter((r) => (r.category ?? "").toUpperCase() === "AUTHENTICATION").length;
  const countApproved = rows.filter((r) => r.status === "APPROVED").length;
  const countPending = rows.filter(
    (r) => r.status === "PENDING" || r.status === "PENDING_APPROVAL",
  ).length;
  const countAgent = rows.filter((r) => configByMetaId.get(r.id)?.agentEnabled).length;

  const [query, setQuery] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<"all" | "UTILITY" | "MARKETING" | "AUTHENTICATION">("all");

  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const okC = catFilter === "all" || (r.category ?? "").toUpperCase() === catFilter;
      const cfgLabel = configByMetaId.get(r.id)?.label ?? "";
      const okQ = !q || r.name.toLowerCase().includes(q) || cfgLabel.toLowerCase().includes(q);
      return okC && okQ;
    });
  }, [rows, query, catFilter, configByMetaId]);

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
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-6"}>
      {!embedded && (
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-4" /> Configurações
        </Link>
      )}

      <HubSubHeader
        tone="success"
        icon={<MessageCircle className="size-[22px]" />}
        title="Templates WhatsApp (Meta)"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              <span className="ml-2">Atualizar</span>
            </Button>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              <span className="ml-2">Novo template</span>
            </Button>
          </>
        }
      >
        Lista, criação e exclusão na conta comercial (WABA). Tipos suportados no assistente:{" "}
        <strong className="font-bold text-[var(--text-secondary)]">UTILITY</strong>,{" "}
        <strong className="font-bold text-[var(--text-secondary)]">MARKETING</strong> e{" "}
        <strong className="font-bold text-[var(--text-secondary)]">AUTHENTICATION</strong>. O assistente também permite{" "}
        <strong className="font-bold text-[var(--text-secondary)]">botão Flow</strong> com{" "}
        <code className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
          flow_id
        </code>{" "}
        publicado no CRM (aba Flows). Carrossel e permissão de ligação continuam no modo{" "}
        <strong className="font-bold text-[var(--text-secondary)]">JSON avançado</strong>.
        <div className="mt-2.5 flex flex-wrap items-center gap-4">
          <a
            href={DOCS_LIST}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)]"
          >
            <BookOpen className="size-3.5" /> API message_templates
          </a>
          <a
            href={DOCS_COMPONENTS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)]"
          >
            <Layers className="size-3.5" /> Componentes
          </a>
          <a
            href={DOCS_CALL_PERMISSION}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)]"
          >
            <Phone className="size-3.5" /> Permissão de ligação
          </a>
        </div>
      </HubSubHeader>

      <HubStatGrid>
        <HubStat tone="success" icon={<CheckCircle2 className="size-5" />} value={countApproved} label="Aprovados pela Meta" />
        <HubStat tone="warn" icon={<Clock className="size-5" />} value={countPending} label="Em revisão" />
        <HubStat tone="brand" icon={<MessageSquare className="size-5" />} value={rows.length} label="Templates na WABA" />
        <HubStat tone="violet" icon={<UserCheck className="size-5" />} value={countAgent} label="Habilitados p/ Agente" />
      </HubStatGrid>

      <HubCallout icon={<Info className="size-[18px]" />}>
        As rotas antigas{" "}
        <code className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--color-warn)]">
          /settings/templates
        </code>{" "}
        e{" "}
        <code className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--color-warn)]">
          /settings/whatsapp-templates
        </code>{" "}
        redirecionam para este hub.
      </HubCallout>

      {isError ? (
        <HubCallout tone="danger" icon={<AlertTriangle className="size-[18px]" />}>
          {error instanceof Error ? error.message : "Erro ao falar com a Meta."}{" "}
          Se aparecer configuração em falta, confira no servidor{" "}
          <code className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--color-danger)]">
            META_WHATSAPP_*
          </code>{" "}
          e o escopo{" "}
          <code className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--color-danger)]">
            whatsapp_business_management
          </code>{" "}
          no token.
        </HubCallout>
      ) : null}

      <HubPanel>
        <HubToolbar
          searchValue={query}
          onSearchChange={setQuery}
          placeholder="Buscar por nome do template..."
        >
          <HubChip active={catFilter === "all"} onClick={() => setCatFilter("all")} count={rows.length}>
            Todos
          </HubChip>
          <HubChip active={catFilter === "UTILITY"} onClick={() => setCatFilter("UTILITY")} count={countUtility}>
            Utility
          </HubChip>
          <HubChip active={catFilter === "MARKETING"} onClick={() => setCatFilter("MARKETING")} count={countMarketing}>
            Marketing
          </HubChip>
          <HubChip active={catFilter === "AUTHENTICATION"} onClick={() => setCatFilter("AUTHENTICATION")} count={countAuth}>
            Auth
          </HubChip>
        </HubToolbar>

        <p className="px-[18px] pt-3 text-[12px] text-[var(--text-muted)]">
          Com a lista a carregar, o token no servidor já tem acesso à WABA.{" "}
          <strong className="font-bold text-[var(--text-secondary)]">Dica:</strong> não reutilize o mesmo nome de template
          enquanto outro com esse nome estiver pendente na Meta.
        </p>

        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
            <AlertTriangle className="size-9 text-[var(--color-danger)] opacity-70" />
            <p className="text-[13px] text-[var(--text-muted)]">
              Não foi possível carregar os templates da WABA. Veja o aviso acima.
            </p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Search className="size-9 text-[var(--glass-border)]" />
            <p className="text-[13px] text-[var(--text-muted)]">
              {rows.length === 0 ? "Nenhum template encontrado nesta WABA." : "Nenhum template com esses filtros."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-[var(--text-muted)] [&>th]:shadow-[0_1px_0_var(--glass-border-subtle)]">
                <th>Nome</th>
                <th>Label</th>
                <th>Idioma</th>
                <th>Categoria</th>
                <th>Estado</th>
                <th>Qualidade</th>
                <th className="text-center">
                  <TooltipHost label="Liberado para o agente usar no chat" side="bottom">
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <UserCheck className="size-3.5" />
                      Agente
                    </span>
                  </TooltipHost>
                </th>
                <th className="w-[120px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
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
                  <tr
                    key={row.id}
                    className="border-b border-[var(--glass-border-subtle)] transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]"
                  >
                    <td className="px-4 py-3.5 align-middle font-mono text-[13px] font-semibold text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <span>{row.name}</span>
                        {isCallPermission ? (
                          <TooltipHost label="Template de permissão de ligação (Business Calling API)" side="top">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-info)] ring-1 ring-[color-mix(in_srgb,var(--color-info)_30%,transparent)]">
                              <Phone className="size-2.5" />
                              Voz
                            </span>
                          </TooltipHost>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
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
                          <button type="submit" className="rounded p-0.5 text-[var(--color-success)] hover:bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)]">
                            <Check className="size-3.5" />
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          className="group/lbl flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          onClick={() => { setEditingLabelId(row.id); setLabelDraft(cfg?.label ?? ""); }}
                        >
                          <span className={cn(cfg?.label ? "font-medium text-[var(--text-primary)]" : "italic")}>
                            {cfg?.label || "Sem label"}
                          </span>
                          <Pencil className="size-3 opacity-0 group-hover/lbl:opacity-100" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle tabular-nums text-[var(--text-muted)]">{row.language ?? "—"}</td>
                    <td className="px-4 py-3.5 align-middle">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {row.category ?? "—"}
                        {row.sub_category ? (
                          <span className="text-[var(--text-muted)]"> · {row.sub_category}</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <Badge
                        variant="secondary"
                        className={cn(
                          row.status === "APPROVED" && "bg-[color-mix(in_srgb,var(--color-success)_18%,transparent)] text-[var(--color-success)]",
                          (row.status === "PENDING" || row.status === "PENDING_APPROVAL") &&
                            "bg-[color-mix(in_srgb,var(--color-warning)_18%,transparent)] text-[var(--color-warning)]",
                          row.status === "REJECTED" && "bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-[var(--color-danger)]",
                        )}
                      >
                        {st}
                      </Badge>
                      {rejectReason ? (
                        <TooltipHost label={rejectReason} side="bottom">
                          <p className="mt-1 max-w-xs text-xs text-[var(--color-danger)]">
                            {rejectReason}
                          </p>
                        </TooltipHost>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-xs text-[var(--text-secondary)]">{q}</td>
                    <td className="px-4 py-3.5 text-center align-middle">
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
                              ? "border-[var(--color-success)] bg-[var(--color-success)]"
                              : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]",
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
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex items-center justify-end gap-1">
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
                            className="size-8 text-[var(--color-danger)] hover:text-[var(--color-danger)]"
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
      </HubPanel>

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
              <MessageCircle className="size-5 text-[var(--brand-primary)]" />
              Novo template na Meta
            </DialogTitle>
            <DialogDescription>
              O template segue para análise automática da Meta. Campos variáveis:{" "}
              <code className="font-mono text-xs text-[var(--text-secondary)]">{"{{1}}"}</code> (POSITIONAL) ou nomes em NAMED, conforme a doc.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-[var(--glass-border-subtle)] pb-2">
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
              <p className="text-xs text-[var(--text-muted)]">
                Use para <strong className="font-bold text-[var(--text-secondary)]">FLOW</strong>,{" "}
                <strong className="font-bold text-[var(--text-secondary)]">carousel</strong>,{" "}
                <strong className="font-bold text-[var(--text-secondary)]">call permission request</strong>, MPM, etc. — copie a estrutura dos exemplos da Meta e
                ajuste nomes/IDs.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_236px]">
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
                <DropdownGlass
                  options={[
                    { value: "UTILITY", label: "UTILITY (transacional)" },
                    { value: "MARKETING", label: "MARKETING" },
                    { value: "AUTHENTICATION", label: "AUTHENTICATION (OTP)" },
                  ]}
                  value={category}
                  onValueChange={(v) => setCategory(v as "UTILITY" | "MARKETING" | "AUTHENTICATION")}
                  triggerClassName="w-full"
                />
              </div>
              {category !== "AUTHENTICATION" ? (
                <div>
                  <Label>Formato de parâmetros</Label>
                  <DropdownGlass
                    options={[
                      { value: "POSITIONAL", label: "POSITIONAL ({{1}}, {{2}}…)" },
                      { value: "NAMED", label: "NAMED (nomes na doc Meta)" },
                    ]}
                    value={parameterFormat}
                    onValueChange={(v) => setParameterFormat(v as "POSITIONAL" | "NAMED")}
                    triggerClassName="w-full"
                  />
                </div>
              ) : null}

              {category !== "AUTHENTICATION" ? (
                <>
                  <div>
                    <Label>Cabeçalho</Label>
                    <DropdownGlass
                      options={[
                        { value: "NONE", label: "Sem cabeçalho" },
                        { value: "TEXT", label: "TEXT" },
                      ]}
                      value={headerFormat}
                      onValueChange={(v) => setHeaderFormat(v as "NONE" | "TEXT")}
                      triggerClassName="w-full"
                    />
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
                <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] p-3 text-sm">
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
                    <DropdownGlass
                      options={[
                        { value: "COPY_CODE", label: "COPY_CODE" },
                        { value: "ONE_TAP", label: "ONE_TAP" },
                      ]}
                      value={otpType}
                      onValueChange={(v) => setOtpType(v)}
                      triggerClassName="w-full"
                    />
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
                    <Label className="text-xs text-[var(--text-muted)]">Botões rápidos (um por linha)</Label>
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
                    <Label className="text-xs text-[var(--text-muted)]">Botões URL</Label>
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
                  <div className="rounded-[var(--radius-lg)] border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--brand-primary)]"
                        checked={flowAssistEnabled}
                        onChange={(e) => setFlowAssistEnabled(e.target.checked)}
                      />
                      Botão WhatsApp Flow (assistido)
                    </label>
                    {flowAssistEnabled ? (
                      <div className="mt-3 space-y-2">
                        <div>
                          <Label>Flow publicado (CRM)</Label>
                          <DropdownGlass
                            options={publishedFlows.map((f) => ({
                              value: f.metaFlowId!.trim(),
                              label: `${f.name} (${f.metaFlowId})`,
                            }))}
                            value={flowPickId || undefined}
                            onValueChange={(v) => setFlowPickId(v)}
                            placeholder="— escolha —"
                            triggerClassName="mt-1 w-full"
                          />
                          {publishedFlows.length === 0 ? (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              Publique um flow em{" "}
                              <Link
                                href="/settings/message-models?tab=flows"
                                className="font-bold text-[var(--brand-primary)] underline-offset-2 hover:underline"
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
                          <DropdownGlass
                            options={[
                              { value: "NAVIGATE", label: "NAVIGATE" },
                              { value: "DATA_EXCHANGE", label: "DATA_EXCHANGE" },
                            ]}
                            value={flowActionMeta}
                            onValueChange={(v) => setFlowActionMeta(v as "NAVIGATE" | "DATA_EXCHANGE")}
                            triggerClassName="mt-1 w-full"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
              </div>
              <WhatsappTemplatePreview
                category={category}
                headerFormat={headerFormat}
                headerText={headerText}
                body={body}
                footer={footer}
                quickTexts={quickTexts}
                urlRows={urlRows}
                otpButtonText={otpButtonText}
              />
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
              <p className="text-sm text-[var(--text-muted)]">
                Não há campo de texto nos componentes devolvidos pela API (pode ocorrer em tipos especiais).
                Consulte o conteúdo no{" "}
                <a
                  href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[var(--brand-primary)] underline underline-offset-2"
                >
                  Gestor do WhatsApp
                </a>
                .
              </p>
            ) : null}
            {previewRow
              ? componentPreviewBlocks(previewRow.components).map((b, i) => (
                  <div key={`${b.title}-${i}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                      {b.title}
                    </p>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] p-3 text-sm text-[var(--text-secondary)]">
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

/** Realça variáveis {{...}} dentro do corpo no preview do balão. */
function highlightTemplateVars(text: string): React.ReactNode {
  const parts = text.split(/(\{\{.*?\}\})/g);
  return parts.map((p, i) =>
    /^\{\{.*\}\}$/.test(p) ? (
      <span
        key={i}
        className="rounded-[var(--radius-sm)] px-1 font-mono text-[11px] font-bold"
        style={{ background: "color-mix(in srgb, var(--wa-accent) 22%, transparent)", color: "var(--wa-accent-strong)" }}
      >
        {p}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

/**
 * Pré-visualização do balão WhatsApp em tempo real (modo assistido do modal
 * "Novo template na Meta"). Apenas apresentação: consome o estado já existente
 * do formulário, sem chamadas de API. Cores ISOLADAS em --wa-* (não tokens
 * globais), por serem cores de marca do canal.
 */
function WhatsappTemplatePreview({
  category,
  headerFormat,
  headerText,
  body,
  footer,
  quickTexts,
  urlRows,
  otpButtonText,
}: {
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  headerFormat: "NONE" | "TEXT";
  headerText: string;
  body: string;
  footer: string;
  quickTexts: string[];
  urlRows: { text: string; url: string }[];
  otpButtonText: string;
}) {
  const isAuth = category === "AUTHENTICATION";
  const buttons: { text: string; kind: "reply" | "url" }[] = [];
  if (isAuth) {
    if (otpButtonText.trim()) buttons.push({ text: otpButtonText.trim(), kind: "url" });
  } else {
    for (const q of quickTexts) {
      if (q.trim()) buttons.push({ text: q.trim(), kind: "reply" });
    }
    for (const u of urlRows) {
      if (u.text.trim()) buttons.push({ text: u.text.trim(), kind: "url" });
    }
  }

  return (
    <aside aria-label="Pré-visualização do WhatsApp" className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">Pré-visualização</p>
      <div
        className="overflow-hidden rounded-[22px] border-[5px] shadow-[var(--glass-shadow)]"
        style={{ borderColor: "var(--wa-frame)", background: "var(--wa-bg)" }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: "var(--wa-header)" }}>
          <span className="text-[10px] font-bold text-white">WhatsApp Business</span>
        </div>
        <div className="space-y-1.5 p-3">
          <div
            className="rounded-[12px] rounded-tl-[4px] px-2.5 py-2 text-[12px] shadow-sm"
            style={{ background: "var(--wa-bubble)", color: "var(--wa-text)" }}
          >
            {headerFormat === "TEXT" && headerText.trim() ? (
              <p className="mb-1 font-bold">{headerText}</p>
            ) : null}
            <p className="whitespace-pre-line leading-relaxed">
              {body.trim() ? highlightTemplateVars(body) : "Corpo da mensagem…"}
            </p>
            {!isAuth && footer.trim() ? (
              <p className="mt-1.5 text-[10px]" style={{ color: "var(--wa-text-muted)" }}>{footer}</p>
            ) : null}
          </div>
          {buttons.length ? (
            <div className="space-y-1">
              {buttons.map((b, i) => (
                <div
                  key={`${b.text}-${i}`}
                  className="rounded-[10px] py-1.5 text-center text-[11px] font-bold"
                  style={{ background: "var(--wa-bubble)", color: "var(--wa-accent-strong)", border: "1px solid var(--wa-field-border)" }}
                >
                  {b.text}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}


