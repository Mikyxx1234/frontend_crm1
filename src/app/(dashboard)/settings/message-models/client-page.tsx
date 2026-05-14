"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Plus,
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
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const INTERNAL_STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
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
      router.replace(`/settings/message-models?${sp.toString()}`);
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
      router.push(`/settings/message-models/flows/${out.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="w-full space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Configurações
      </Link>

      <PageHeader
        title="Modelos de mensagem"
        description="Modelos internos multi-canal, templates WhatsApp (WABA) e flows interativos — ponto único estilo Kommo."
        icon={<LayoutGrid />}
        actions={
          <Button type="button" size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            <span className="ml-2">Novo modelo</span>
          </Button>
        }
      />

      <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        As rotas antigas <code className="rounded bg-white/60 px-1 dark:bg-black/30">/settings/templates</code> e{" "}
        <code className="rounded bg-white/60 px-1 dark:bg-black/30">/settings/whatsapp-templates</code> redirecionam
        para este hub.
      </div>

      <Tabs value={safeTab} onValueChange={(v) => setTab(v, { new: null, create: null })}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Visão geral
          </TabsTrigger>
          {canViewTemplates ? (
            <TabsTrigger value="internal" className="text-xs sm:text-sm">
              Internos
            </TabsTrigger>
          ) : null}
          {canSubmitMeta ? (
            <TabsTrigger value="whatsapp" className="text-xs sm:text-sm">
              WhatsApp (Meta)
            </TabsTrigger>
          ) : null}
          {canSubmitMeta ? (
            <TabsTrigger value="flows" className="text-xs sm:text-sm">
              Flows
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Lista rápida dos modelos internos (primeira página) e templates Meta na WABA. Use os separadores para
            gestão completa.
          </p>
          {loadingInt || loadingMeta || loadingFlows ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Estado / idioma</th>
                    <th className="px-3 py-2 font-medium w-[100px]">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {internals.map((t) => (
                    <tr key={`int-${t.id}`} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        <Badge variant="secondary">Interno</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {INTERNAL_STATUS[t.status] ?? t.status} · {t.language}
                      </td>
                      <td className="px-3 py-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setTab("internal", { new: "1" })}>
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(metaPage?.data ?? []).map((t) => (
                    <tr key={`meta-${t.id}`} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        <Badge>WhatsApp</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
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
                    <tr key={`flow-${f.id}`} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        <Badge variant="outline">Flow</Badge>
                      </td>
                      <td className="px-3 py-2 font-medium">{f.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
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
                          onClick={() => router.push(`/settings/message-models/flows/${f.id}`)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {internals.length === 0 && (metaPage?.data ?? []).length === 0 && flows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Nenhum modelo encontrado.</p>
              ) : null}
            </div>
          )}
        </TabsContent>

        {canViewTemplates ? (
          <TabsContent value="internal" className="mt-4">
            <InternalTemplatesPage />
          </TabsContent>
        ) : (
          <TabsContent value="internal" className="mt-4 text-sm text-muted-foreground">
            Sem permissão para modelos internos.
          </TabsContent>
        )}

        {canSubmitMeta ? (
          <TabsContent value="whatsapp" className="mt-4">
            <WhatsAppTemplatesPage />
          </TabsContent>
        ) : (
          <TabsContent value="whatsapp" className="mt-4 text-sm text-muted-foreground">
            Sem permissão para templates na Meta.
          </TabsContent>
        )}

        {canSubmitMeta ? (
          <TabsContent value="flows" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Desenhe o formulário, mapeie campos do contato e publique na WABA para obter o{" "}
                <code className="text-xs">flow_id</code> usado nos templates.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={createFlowMutation.isPending}
                onClick={() => createFlowMutation.mutate()}
              >
                {createFlowMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Workflow className="size-4" />}
                <span className="ml-2">Novo flow</span>
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Meta flow id</th>
                    <th className="px-3 py-2 font-medium">Atualizado</th>
                    <th className="px-3 py-2 w-[100px]" />
                  </tr>
                </thead>
                <tbody>
                  {flows.map((f) => (
                    <tr key={f.id} className="border-b border-border/60">
                      <td className="px-3 py-2 font-medium">{f.name}</td>
                      <td className="px-3 py-2">{f.status}</td>
                      <td className="px-3 py-2 font-mono text-xs">{f.metaFlowId ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(f.updatedAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/settings/message-models/flows/${f.id}`)}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {flows.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">Nenhum flow criado ainda.</p>
              ) : null}
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo modelo</DialogTitle>
            <DialogDescription>Escolha o tipo de modelo, como no Kommo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              onClick={() => {
                setNewOpen(false);
                setTab("internal", { new: "1" });
              }}
            >
              <FileText className="size-6 text-primary" />
              <span className="font-semibold">Modelo geral</span>
              <span className="text-xs text-muted-foreground">Texto reutilizável no CRM (vários canais).</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
              disabled={!canSubmitMeta}
              onClick={() => {
                setNewOpen(false);
                setTab("whatsapp", { create: "1" });
              }}
            >
              <MessageCircle className="size-6 text-emerald-600" />
              <span className="font-semibold">Template WhatsApp</span>
              <span className="text-xs text-muted-foreground">Envio oficial na Meta (WABA).</span>
            </button>
          </div>
          {canSubmitMeta ? (
            <button
              type="button"
              className="flex w-full flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
              onClick={() => {
                setNewOpen(false);
                setTab("flows");
                createFlowMutation.mutate();
              }}
            >
              <Workflow className="size-6 text-indigo-600" />
              <span className="font-semibold">Novo WhatsApp Flow</span>
              <span className="text-xs text-muted-foreground">Formulário interativo + publicação na Meta.</span>
            </button>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
