"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  Download,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsGlass } from "@/components/crm/tabs-glass";

import InternalTemplatesPage from "../templates/client-page";
import WhatsAppTemplatesPage from "../whatsapp-templates/client-page";

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
      router.replace(`/old/settings/message-models?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const { data: internals = [], isLoading: loadingInt } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/templates"));
      if (!r.ok) return [] as InternalRow[];
      return r.json() as Promise<InternalRow[]>;
    },
    enabled: safeTab === "overview",
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
    enabled: safeTab === "overview" || safeTab === "flows",
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
      router.push(`/old/settings/message-models/flows/${out.id}`);
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
      router.push(`/old/settings/message-models/flows/${out.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabDefs = React.useMemo(() => {
    const defs: { value: string; label: string }[] = [
      { value: "overview", label: "Visão geral" },
    ];
    if (canViewTemplates) defs.push({ value: "internal", label: "Internos" });
    if (canSubmitMeta) defs.push({ value: "whatsapp", label: "WhatsApp (Meta)" });
    if (canSubmitMeta) defs.push({ value: "flows", label: "Flows" });
    return defs;
  }, [canViewTemplates, canSubmitMeta]);

  const activeIndex = Math.max(
    0,
    tabDefs.findIndex((t) => t.value === safeTab),
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsGlass
          tabs={tabDefs.map((t) => t.label)}
          activeTab={activeIndex}
          onChange={(i) => setTab(tabDefs[i].value, { new: null, create: null })}
          className="w-auto"
        />
        <Button type="button" size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" />
          <span className="ml-2">Novo modelo</span>
        </Button>
      </div>

      {safeTab === "overview" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Lista rápida dos modelos internos (primeira página) e templates Meta na WABA. Use os separadores para
            gestão completa.
          </p>
          {loadingInt || loadingMeta || loadingFlows ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]">
                  <tr>
                    <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Tipo</th>
                    <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Nome</th>
                    <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Detalhes</th>
                    <th className="px-3 py-2 font-medium text-[var(--text-secondary)] w-[100px]">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {internals.map((t) => (
                    <tr key={`int-${t.id}`} className="border-b border-[var(--glass-border-subtle)]">
                      <td className="px-3 py-2">
                        <Badge variant="secondary">Interno</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{t.name}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">
                        {[t.category, t.channelType].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setTab("internal")}>
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(metaPage?.data ?? []).map((t) => (
                    <tr key={`meta-${t.id}`} className="border-b border-[var(--glass-border-subtle)]">
                      <td className="px-3 py-2">
                        <Badge>WhatsApp</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{t.name}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">
                        {META_STATUS[t.status] ?? t.status} · {t.language ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setTab("whatsapp")}>
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {flows.map((f) => (
                    <tr key={`flow-${f.id}`} className="border-b border-[var(--glass-border-subtle)]">
                      <td className="px-3 py-2">
                        <Badge variant="outline">Flow</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{f.name}</td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">
                        {f.status}
                        {f.metaFlowId ? (
                          <>
                            {" "}
                            · <code className="text-[10px]">{f.metaFlowId}</code>
                          </>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/old/settings/message-models/flows/${f.id}`)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {internals.length === 0 && (metaPage?.data ?? []).length === 0 && flows.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--text-muted)]">Nenhum modelo encontrado.</p>
              ) : null}
            </div>
          )}
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
        <div className="space-y-3">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-info)]/30 bg-[color-mix(in_srgb,var(--color-info)_8%,transparent)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            Flows criados só no <strong>Meta Business Manager</strong> não aparecem aqui automaticamente.
            Use <strong>Importar da Meta</strong> para trazer o cadastro (ex.: estagiário) e configurar o mapeamento
            das respostas no lead.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[var(--text-muted)]">
              Desenhe no CRM ou importe um flow já publicado na WABA; depois mapeie cada resposta para o campo do
              lead.
            </p>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]">
                <tr>
                  <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Nome</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Estado</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Meta flow id</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-secondary)]">Atualizado</th>
                  <th className="px-3 py-2 w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {flows.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--glass-border-subtle)]">
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{f.name}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{f.status}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">{f.metaFlowId ?? "—"}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {new Date(f.updatedAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/old/settings/message-models/flows/${f.id}`)}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {flows.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--text-muted)]">Nenhum flow criado ainda.</p>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
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
        <DialogContent className="sm:max-w-lg">
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
                          router.push(`/old/settings/message-models/flows/${mf.crmFlowDefinitionId}`);
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
