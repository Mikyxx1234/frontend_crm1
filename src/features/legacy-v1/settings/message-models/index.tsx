"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Info,
  LayoutTemplate,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";
import InternalTemplatesPage from "../templates";
import WhatsAppTemplatesPage from "../whatsapp-templates";
import {
  HubCallout,
  HubChip,
  HubPanel,
  HubStat,
  HubStatGrid,
  HubSubHeader,
  HubTabBar,
  HubToolbar,
  type HubTabDef,
} from "./hub-ui";

type InternalRow = {
  id: string;
  name: string;
  content: string;
  category: string | null;
  language: string;
  status: string;
  channelType: string | null;
};

type MetaRow = {
  id: string;
  name: string;
  status: string;
  category?: string;
  language?: string;
};

type FlowListRow = {
  id: string;
  shortId: string | null;
  name: string;
  status: string;
  metaFlowId: string | null;
  updatedAt: string;
};

type MetaFlowListItem = {
  id: string;
  name: string;
  status: string;
  categories: string[];
  alreadyImported: boolean;
  crmFlowDefinitionId: string | null;
};

const META_STATUS: Record<string, string> = {
  APPROVED: "Aprovado",
  PENDING: "Em análise",
  PENDING_APPROVAL: "Em análise",
  REJECTED: "Rejeitado",
};

export default function MessageModelsHubPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [newOpen, setNewOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const tab = searchParams.get("tab") ?? "overview";
  const validTab = ["overview", "internal", "whatsapp", "flows"].includes(tab) ? tab : "overview";

  const { data: permissionsPanel } = useQuery<{ permissionKeys: string[] }>({
    queryKey: ["settings-permissions-panel"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/settings/permissions"));
      if (!r.ok) return { permissionKeys: [] };
      return r.json();
    },
  });
  const perms = new Set(permissionsPanel?.permissionKeys ?? []);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isGestor = role === "ADMIN" || role === "MANAGER";
  const canSubmitMeta = isGestor || perms.has("*") || perms.has("template:submit_meta");
  const canViewTemplates = isGestor || perms.has("*") || perms.has("template:view");

  const safeTab = React.useMemo(() => {
    if (validTab === "internal" && !canViewTemplates) return "overview";
    if ((validTab === "whatsapp" || validTab === "flows") && !canSubmitMeta) return "overview";
    return validTab;
  }, [validTab, canViewTemplates, canSubmitMeta]);

  const setTab = React.useCallback(
    (next: string, extra?: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("tab", next);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v == null || v === "") sp.delete(k);
          else sp.set(k, v);
        }
      }
      // Preserva a rota atual: quando o hub roda dentro do shell v2
      // (`/settings/message-models`), navega na rota canônica; quando roda
      // standalone em `/old/...`, mantém o caminho legado.
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const { data: internals = [], isLoading: loadingInt } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/templates"));
      if (!r.ok) return [] as InternalRow[];
      return r.json() as Promise<InternalRow[]>;
    },
  });

  const { data: metaPage, isLoading: loadingMeta } = useQuery({
    queryKey: ["meta-whatsapp-templates", "hub-first"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/meta/whatsapp/message-templates"));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { data: [] as MetaRow[] };
      return j as { data?: MetaRow[] };
    },
    enabled: safeTab === "overview",
  });

  const { data: flows = [], isLoading: loadingFlows } = useQuery({
    queryKey: ["whatsapp-flow-definitions"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/whatsapp-flow-definitions"));
      if (!r.ok) return [] as FlowListRow[];
      return r.json() as Promise<FlowListRow[]>;
    },
  });

  const createFlowMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl("/api/whatsapp-flow-definitions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Novo flow ${new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`,
          flowCategory: "LEAD_GENERATION",
          screens: [
            {
              title: "Formulário",
              fields: [{ fieldKey: "nome", label: "Nome", fieldType: "TEXT", required: true }],
            },
          ],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j?.message === "string" ? j.message : "Erro ao criar flow.");
      return j as { id: string };
    },
    onSuccess: (out) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-definitions"] });
      router.push(`/settings/message-models/flows/${out.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFlowMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(apiUrl(`/api/whatsapp-flow-definitions/${id}`), { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(typeof j?.message === "string" ? j.message : "Erro ao excluir flow.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-definitions"] });
      toast.success("Flow excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const {
    data: metaFlowsData,
    isLoading: loadingMetaFlows,
    refetch: refetchMetaFlows,
  } = useQuery({
    queryKey: ["whatsapp-flow-meta-list"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/whatsapp-flow-definitions/meta-flows"));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(typeof j?.message === "string" ? j.message : "Erro ao listar flows na Meta.");
      }
      return (j.items ?? []) as MetaFlowListItem[];
    },
    enabled: importOpen && canSubmitMeta,
  });

  const importFlowMutation = useMutation({
    mutationFn: async (metaFlowId: string) => {
      const r = await fetch(apiUrl("/api/whatsapp-flow-definitions/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaFlowId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j?.message === "string" ? j.message : "Erro ao importar.");
      return j as { id: string; created: boolean };
    },
    onSuccess: (out) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-meta-list"] });
      setImportOpen(false);
      toast.success(out.created ? "Flow importado da Meta." : "Flow já estava no CRM — abrindo editor.");
      router.push(`/settings/message-models/flows/${out.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [ovQuery, setOvQuery] = React.useState("");
  const [ovFilter, setOvFilter] = React.useState<"all" | "interno" | "waba" | "flow">("all");
  const [flowQuery, setFlowQuery] = React.useState("");
  const [flowFilter, setFlowFilter] = React.useState<"all" | "PUBLISHED" | "DRAFT">("all");

  const metaRows = metaPage?.data ?? [];
  const metaLoaded = !!metaPage;
  const internalCount = internals.length;
  const metaCount = metaRows.length;
  const flowCount = flows.length;
  const totalCount = internalCount + metaCount + flowCount;
  const metaApproved = metaRows.filter((r) => r.status === "APPROVED").length;
  const metaPending = metaRows.filter(
    (r) => r.status === "PENDING" || r.status === "PENDING_APPROVAL",
  ).length;
  const flowPublished = flows.filter((f) => f.status === "PUBLISHED").length;
  const flowDraft = flows.filter((f) => f.status !== "PUBLISHED").length;
  const flowWithMeta = flows.filter((f) => f.metaFlowId?.trim()).length;

  const tabDefs = React.useMemo<HubTabDef[]>(() => {
    const defs: HubTabDef[] = [
      { value: "overview", label: "Visão geral", count: totalCount || undefined },
    ];
    if (canViewTemplates) defs.push({ value: "internal", label: "Internos", count: internalCount });
    if (canSubmitMeta) {
      defs.push({ value: "whatsapp", label: "WhatsApp (Meta)", count: metaLoaded ? metaCount : undefined });
      defs.push({ value: "flows", label: "Flows", count: flowCount });
    }
    return defs;
  }, [canViewTemplates, canSubmitMeta, totalCount, internalCount, metaLoaded, metaCount, flowCount]);

  const overviewRows = React.useMemo(() => {
    const q = ovQuery.trim().toLowerCase();
    type OvRow = {
      key: string;
      type: "interno" | "waba" | "flow";
      name: string;
      preview: string;
      vars: string[];
      statusKind: "approved" | "pending" | "rejected" | "none";
      statusLabel: string;
      channel: string;
      onOpen: () => void;
    };
    const out: OvRow[] = [];
    if (ovFilter === "all" || ovFilter === "interno") {
      for (const t of internals) {
        out.push({
          key: `int-${t.id}`,
          type: "interno",
          name: t.name,
          preview: t.content ?? "",
          vars: [...new Set((t.content?.match(/\{\{(.*?)\}\}/g) ?? []))],
          statusKind: "none",
          statusLabel: "Modelo interno",
          channel: [t.category, t.channelType].filter(Boolean).join(" · ") || "Interno · todos os canais",
          onOpen: () => setTab("internal"),
        });
      }
    }
    if (ovFilter === "all" || ovFilter === "waba") {
      for (const t of metaRows) {
        const kind =
          t.status === "APPROVED"
            ? "approved"
            : t.status === "REJECTED"
              ? "rejected"
              : "pending";
        out.push({
          key: `meta-${t.id}`,
          type: "waba",
          name: t.name,
          preview: "",
          vars: [],
          statusKind: kind,
          statusLabel: META_STATUS[t.status] ?? t.status,
          channel: ["WhatsApp", t.category, t.language].filter(Boolean).join(" · "),
          onOpen: () => setTab("whatsapp"),
        });
      }
    }
    if (ovFilter === "all" || ovFilter === "flow") {
      for (const f of flows) {
        out.push({
          key: `flow-${f.id}`,
          type: "flow",
          name: f.name,
          preview: f.metaFlowId ? `Meta flow id ${f.metaFlowId}` : "Flow criado no CRM",
          vars: [],
          statusKind: "none",
          statusLabel: f.status === "PUBLISHED" ? "Publicado" : "Rascunho",
          channel: f.status === "PUBLISHED" ? "Flow · publicado" : "Flow · rascunho",
          onOpen: () => router.push(`/settings/message-models/flows/${f.shortId ?? f.id}`),
        });
      }
    }
    if (!q) return out;
    return out.filter(
      (r) => r.name.toLowerCase().includes(q) || r.preview.toLowerCase().includes(q),
    );
  }, [internals, metaRows, flows, ovFilter, ovQuery, router, setTab]);

  const flowRows = React.useMemo(() => {
    const q = flowQuery.trim().toLowerCase();
    return flows.filter((f) => {
      const okF = flowFilter === "all" || f.status === flowFilter;
      const okQ = !q || f.name.toLowerCase().includes(q) || (f.metaFlowId ?? "").includes(q);
      return okF && okQ;
    });
  }, [flows, flowFilter, flowQuery]);

  const headerSlots = useSettingsHeaderSlots();

  const tabBarNode = React.useMemo(
    () => (
      <HubTabBar
        tabs={tabDefs}
        active={safeTab}
        onChange={(value) => setTab(value, { new: null, create: null })}
      />
    ),
    [tabDefs, safeTab, setTab],
  );

  const actionNode = React.useMemo(
    () =>
      safeTab === "overview" ? (
        <Button type="button" size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" />
          <span className="ml-2">Novo modelo</span>
        </Button>
      ) : null,
    [safeTab],
  );

  // Injeta abas + ação na linha do PageHeader (padrão Pipeline) quando
  // rodando dentro do SettingsV2Shell. Sem o shell (rota /old) cai no
  // render inline abaixo.
  React.useEffect(() => {
    if (!headerSlots) return;
    headerSlots.setCenter(tabBarNode);
    headerSlots.setActions(actionNode);
    return () => {
      headerSlots.setCenter(null);
      headerSlots.setActions(null);
    };
  }, [headerSlots, tabBarNode, actionNode]);

  return (
    <div className="w-full space-y-4">
      {!headerSlots ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tabBarNode}
          {actionNode}
        </div>
      ) : null}

      {safeTab === "overview" && (
        <div className="space-y-4">
          <HubStatGrid>
            <HubStat tone="brand" icon={<LayoutTemplate className="size-5" />} value={totalCount} label="Modelos no total" />
            <HubStat tone="violet" icon={<FileText className="size-5" />} value={internalCount} label="Internos" />
            <HubStat tone="success" icon={<CheckCircle2 className="size-5" />} value={metaApproved} label="WhatsApp aprovados" />
            <HubStat tone="warn" icon={<Clock className="size-5" />} value={metaPending} label="Aguardando revisão Meta" />
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

          <HubPanel>
            <HubToolbar
              searchValue={ovQuery}
              onSearchChange={setOvQuery}
              placeholder="Buscar por nome, conteúdo ou variável..."
            >
              <HubChip active={ovFilter === "all"} onClick={() => setOvFilter("all")}>
                Todos os canais
              </HubChip>
              <HubChip active={ovFilter === "interno"} onClick={() => setOvFilter("interno")} dot="var(--text-muted)">
                Interno
              </HubChip>
              <HubChip active={ovFilter === "waba"} onClick={() => setOvFilter("waba")} dot="var(--color-online)">
                WhatsApp
              </HubChip>
              <HubChip active={ovFilter === "flow"} onClick={() => setOvFilter("flow")} dot="var(--brand-primary)">
                Flow
              </HubChip>
            </HubToolbar>

            {loadingInt || loadingMeta || loadingFlows ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : overviewRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
                <Search className="size-9 text-[var(--glass-border)]" />
                <p className="text-[13px] text-[var(--text-muted)]">Nenhum modelo encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="[&>th]:px-[18px] [&>th]:py-3.5 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-[var(--text-muted)] [&>th]:shadow-[0_1px_0_var(--glass-border-subtle)]">
                      <th className="w-[140px]">Tipo</th>
                      <th>Nome / conteúdo</th>
                      <th className="w-[260px]">Status / canal</th>
                      <th className="w-[120px] text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewRows.map((r) => (
                      <tr
                        key={r.key}
                        className="border-b border-[var(--glass-border-subtle)] transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]"
                      >
                        <td className="px-[18px] py-3.5 align-middle">
                          <OverviewTypeBadge type={r.type} />
                        </td>
                        <td className="px-[18px] py-3.5 align-middle">
                          <div className="min-w-0">
                            <div className="font-bold text-[var(--text-primary)]">{r.name}</div>
                            {r.preview ? (
                              <div className="mt-0.5 max-w-[520px] truncate text-[12.5px] text-[var(--text-muted)]">
                                {r.preview}
                              </div>
                            ) : null}
                            {r.vars.length ? (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {r.vars.map((v) => (
                                  <span
                                    key={v}
                                    className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--text-secondary)]"
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-[18px] py-3.5 align-middle">
                          <div className="flex flex-col gap-1.5">
                            <StatusPill kind={r.statusKind} label={r.statusLabel} />
                            <span className="text-[12px] text-[var(--text-secondary)]">{r.channel}</span>
                          </div>
                        </td>
                        <td className="px-[18px] py-3.5 text-right align-middle">
                          <button
                            type="button"
                            onClick={r.onOpen}
                            className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 text-[12.5px] font-bold text-[var(--brand-primary)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--color-enterprise-bg)]"
                          >
                            Abrir <ChevronRight className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HubPanel>
        </div>
      )}

      {safeTab === "internal" &&
        (canViewTemplates ? (
          <InternalTemplatesPage embedded />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Sem permissão para modelos internos.</p>
        ))}

      {safeTab === "whatsapp" &&
        (canSubmitMeta ? (
          <WhatsAppTemplatesPage embedded />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Sem permissão para templates na Meta.</p>
        ))}

      {safeTab === "flows" && canSubmitMeta && (
        <div className="space-y-4">
          <HubSubHeader
            icon={<Workflow className="size-5" />}
            title="Flows interativos"
            actions={
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setImportOpen(true);
                    void refetchMetaFlows();
                  }}
                >
                  <Download className="size-4" />
                  <span className="ml-2">Importar da Meta</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={createFlowMutation.isPending}
                  onClick={() => createFlowMutation.mutate()}
                >
                  {createFlowMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Workflow className="size-4" />
                  )}
                  <span className="ml-2">Novo flow</span>
                </Button>
              </>
            }
          >
            Desenhe um flow direto no CRM ou importe um já publicado na WABA; depois{" "}
            <strong className="font-bold text-[var(--text-secondary)]">mapeie cada resposta para o campo do lead</strong>.
            Flows publicados podem ser anexados como{" "}
            <code className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
              botão Flow
            </code>{" "}
            nos templates da Meta.
          </HubSubHeader>

          <HubStatGrid>
            <HubStat tone="brand" icon={<Workflow className="size-5" />} value={flowCount} label="Flows no total" />
            <HubStat tone="success" icon={<CheckCircle2 className="size-5" />} value={flowPublished} label="Publicados" />
            <HubStat tone="warn" icon={<FileText className="size-5" />} value={flowDraft} label="Rascunhos" />
            <HubStat tone="violet" icon={<LayoutTemplate className="size-5" />} value={flowWithMeta} label="Com Meta flow id" />
          </HubStatGrid>

          <HubCallout tone="info" icon={<Info className="size-[18px]" />}>
            Flows criados só no <strong className="font-bold text-[var(--brand-primary-dark)]">Meta Business Manager</strong>{" "}
            não aparecem aqui automaticamente. Use{" "}
            <strong className="font-bold text-[var(--brand-primary-dark)]">Importar da Meta</strong> para trazer o cadastro
            (ex.: estagiário) e configurar o mapeamento das respostas no lead.
          </HubCallout>

          <HubPanel>
            <HubToolbar
              searchValue={flowQuery}
              onSearchChange={setFlowQuery}
              placeholder="Buscar flow por nome ou Meta flow id..."
            >
              <HubChip active={flowFilter === "all"} onClick={() => setFlowFilter("all")} count={flowCount}>
                Todos
              </HubChip>
              <HubChip active={flowFilter === "PUBLISHED"} onClick={() => setFlowFilter("PUBLISHED")} count={flowPublished}>
                Publicados
              </HubChip>
              <HubChip active={flowFilter === "DRAFT"} onClick={() => setFlowFilter("DRAFT")} count={flowDraft}>
                Rascunhos
              </HubChip>
            </HubToolbar>

            {loadingFlows ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : flowRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <Workflow className="size-9 text-[var(--glass-border)]" />
                <h3 className="text-[15px] font-bold text-[var(--text-secondary)]">Nenhum flow encontrado</h3>
                <p className="text-[13px] text-[var(--text-muted)]">Ajuste a busca ou importe um flow já publicado na Meta.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.06em] [&>th]:text-[var(--text-muted)] [&>th]:shadow-[0_1px_0_var(--glass-border-subtle)]">
                      <th>Nome</th>
                      <th className="w-[140px]">Estado</th>
                      <th className="w-[200px]">Meta flow id</th>
                      <th className="w-[180px]">Atualizado</th>
                      <th className="w-[170px] text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowRows.map((f) => (
                      <tr
                        key={f.id}
                        className="border-b border-[var(--glass-border-subtle)] transition-colors last:border-0 hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]"
                      >
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                              <Workflow className="size-[18px]" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-bold text-[var(--text-primary)]">{f.name}</div>
                              <div className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">
                                {f.metaFlowId ? "Importado da Meta" : "Criado no CRM"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <FlowStateBadge published={f.status === "PUBLISHED"} />
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {f.metaFlowId ? (
                            <span className="font-mono text-[12px] text-[var(--text-secondary)]">{f.metaFlowId}</span>
                          ) : (
                            <span className="text-[var(--text-muted)] opacity-60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-[12.5px] text-[var(--text-secondary)]">
                          {new Date(f.updatedAt).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="Excluir flow"
                              onClick={() => deleteFlowMutation.mutate(f.id)}
                              disabled={deleteFlowMutation.isPending}
                              className="flex size-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--color-danger)]/40 hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:opacity-50"
                            >
                              <Trash2 className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/settings/message-models/flows/${f.shortId ?? f.id}`)}
                              className="rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-1.5 text-[12.5px] font-bold text-[var(--brand-primary)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--color-enterprise-bg)]"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--glass-border-subtle)] px-[18px] py-3">
              <span className="text-[12.5px] text-[var(--text-muted)]">
                {flowRows.length} {flowRows.length === 1 ? "flow" : "flows"}
              </span>
            </div>
          </HubPanel>
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Novo modelo</DialogTitle>
            <DialogDescription>Escolha o tipo de modelo, como no Kommo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4 text-left transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)]"
              onClick={() => {
                setNewOpen(false);
                setTab("internal", { new: "1" });
              }}
            >
              <FileText className="size-6 text-[var(--brand-primary)]" />
              <span className="font-semibold text-[var(--text-primary)]">Modelo geral</span>
              <span className="text-xs text-[var(--text-muted)]">Texto reutilizável no CRM (vários canais).</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4 text-left transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)] disabled:opacity-50"
              disabled={!canSubmitMeta}
              onClick={() => {
                setNewOpen(false);
                setTab("whatsapp", { create: "1" });
              }}
            >
              <MessageCircle className="size-6 text-[var(--color-success)]" />
              <span className="font-semibold text-[var(--text-primary)]">Template WhatsApp</span>
              <span className="text-xs text-[var(--text-muted)]">Envio oficial na Meta (WABA).</span>
            </button>
          </div>
          {canSubmitMeta ? (
            <button
              type="button"
              className="flex w-full flex-col items-start gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-4 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
              onClick={() => {
                setNewOpen(false);
                setTab("flows");
                createFlowMutation.mutate();
              }}
            >
              <Workflow className="size-6 text-[var(--brand-primary)]" />
              <span className="font-semibold text-[var(--text-primary)]">Novo WhatsApp Flow</span>
              <span className="text-xs text-[var(--text-muted)]">Formulário interativo + publicação na Meta.</span>
            </button>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Importar flow da Meta</DialogTitle>
            <DialogDescription>
              Selecione um flow já publicado na sua conta WhatsApp Business. O CRM importa os campos para você
              configurar o mapeamento no lead.
            </DialogDescription>
          </DialogHeader>
          {loadingMetaFlows ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (metaFlowsData ?? []).length === 0 ? (
            <p className="py-4 text-sm text-[var(--text-muted)]">
              Nenhum flow encontrado na WABA ou API Meta não configurada.
            </p>
          ) : (
            <ul className="max-h-[320px] space-y-2 overflow-y-auto py-1">
              {(metaFlowsData ?? []).map((mf) => (
                <li
                  key={mf.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{mf.name}</p>
                    <p className="font-mono text-[10px] text-[var(--text-muted)]">
                      {mf.id} · {mf.status}
                    </p>
                  </div>
                  {mf.alreadyImported ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (mf.crmFlowDefinitionId) {
                          setImportOpen(false);
                          router.push(`/settings/message-models/flows/${mf.crmFlowDefinitionId}`);
                        }
                      }}
                    >
                      Abrir no CRM
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={importFlowMutation.isPending}
                      onClick={() => importFlowMutation.mutate(mf.id)}
                    >
                      {importFlowMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Importar"
                      )}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewTypeBadge({ type }: { type: "interno" | "waba" | "flow" }) {
  const map = {
    interno: {
      label: "Interno",
      icon: <FileText className="size-3.5" />,
      cls: "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
    },
    waba: {
      label: "WhatsApp",
      icon: <MessageCircle className="size-3.5" />,
      cls: "border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]",
    },
    flow: {
      label: "Flow",
      icon: <Workflow className="size-3.5" />,
      cls: "border-[var(--input-border-focus)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary-dark)]",
    },
  } as const;
  const m = map[type];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-2.5 py-1 text-[11.5px] font-bold", m.cls)}>
      {m.icon}
      {m.label}
    </span>
  );
}

function StatusPill({
  kind,
  label,
}: {
  kind: "approved" | "pending" | "rejected" | "none";
  label: string;
}) {
  const map = {
    approved: { color: "text-[var(--color-success-text)]", dot: "bg-[var(--color-online)]" },
    pending: { color: "text-[var(--color-warn)]", dot: "bg-[var(--color-warn)]" },
    rejected: { color: "text-[var(--color-danger-text)]", dot: "bg-[var(--color-danger)]" },
    none: { color: "text-[var(--text-muted)]", dot: "bg-[var(--glass-border)]" },
  } as const;
  const m = map[kind];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 text-[11.5px] font-bold", m.color)}>
      <span className={cn("size-[7px] rounded-full", m.dot)} />
      {label}
    </span>
  );
}

function FlowStateBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        published
          ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
          : "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
      )}
    >
      <span className={cn("size-1.5 rounded-full", published ? "bg-[var(--color-online)]" : "bg-[var(--text-muted)] opacity-60")} />
      {published ? "Published" : "Draft"}
    </span>
  );
}

