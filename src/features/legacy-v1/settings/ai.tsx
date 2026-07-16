"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertTriangle as AlertTriangle, IconCircleCheck as CheckCircle2, IconEye as Eye, IconEyeOff as EyeOff, IconKey as Key, IconLoader2 as Loader2, IconPlugConnected as PlugZap, IconSparkles as Sparkles, IconTrash as Trash2 } from "@tabler/icons-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { ButtonGlass } from "@/components/crm/button-glass";
import { GlassCard } from "@/components/crm/glass-card";
import { InputGlass } from "@/components/crm/input-glass";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

type AiStatus = {
  configured: boolean;
  source: "database" | "env" | "none";
  preview: string | null;
  updatedAt: string | null;
};

type TestResult =
  | { ok: true; model: string; reply: string }
  | { ok: false; message: string };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data.message === "string") return data.message;
  } catch {
    // fallthrough
  }
  return `HTTP ${res.status}`;
}

export default function AiSettingsPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  const statusQuery = useQuery({
    queryKey: ["ai-settings-status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/settings/ai"));
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as AiStatus;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await fetch(apiUrl("/api/settings/ai"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as AiStatus;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-settings-status"], data);
      setApiKey("");
      setLastError(null);
      setTestResult(null);
    },
    onError: (err: unknown) => {
      setLastError(err instanceof Error ? err.message : String(err));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/settings/ai"), { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as AiStatus;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-settings-status"], data);
      setApiKey("");
      setLastError(null);
      setTestResult(null);
      queryClient.invalidateQueries({ queryKey: ["ai-settings-status"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/settings/ai/test"), { method: "POST" });
      const data = (await res.json()) as TestResult;
      return data;
    },
    onSuccess: (data) => setTestResult(data),
    onError: (err: unknown) => {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const status = statusQuery.data;

  return (
    <div className="w-full space-y-4">
      <GlassCard className="overflow-hidden p-0">
        <div className="space-y-1 border-b border-[var(--glass-border-subtle)] px-6 py-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="flex min-w-0 items-center gap-2 font-display text-lg font-bold text-[var(--text-primary)]">
              <Key className="size-4 text-[var(--text-muted)]" />
              Chave da OpenAI
            </h2>
            <StatusBadge status={status} loading={statusQuery.isLoading} />
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            A chave é armazenada criptografada no banco (AES-256-GCM) e nunca
            aparece em texto puro na interface. Ela é usada por todos os
            agentes de IA, embeddings e respostas automáticas.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {statusQuery.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : status?.configured ? (
            <div className="rounded-lg border border-[var(--color-success-subtle)]/60 bg-[var(--color-success-subtle)]/60 p-3 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/30">
              <div className="flex items-start gap-2 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">IA ativa</p>
                  <p className="mt-0.5 text-[13px] opacity-90">
                    Origem: {status.source === "database" ? "banco de dados" : "variável de ambiente (OPENAI_API_KEY)"}
                    {status.preview ? ` · ${status.preview}` : ""}
                    {status.updatedAt ? ` · atualizada em ${formatDate(status.updatedAt)}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--color-amber-soft)]/60 bg-[var(--color-amber-soft)]/60 p-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-2 text-[var(--color-amber-text)] dark:text-[var(--color-amber-muted)]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">IA desativada</p>
                  <p className="mt-0.5 text-[13px] opacity-90">
                    Nenhuma chave configurada. Os agentes e recursos de IA do
                    CRM ficam indisponíveis até que a credencial seja salva
                    abaixo.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="openai-key">
              {status?.configured ? "Substituir chave" : "Nova chave"}
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 w-full sm:flex-1">
                <InputGlass
                  id="openai-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  spellCheck={false}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
                >
                  {showKey ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <ButtonGlass
                variant="primary"
                type="button"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => saveMutation.mutate(apiKey.trim())}
                disabled={!apiKey.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Salvar
              </ButtonGlass>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Obtenha em{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                platform.openai.com/api-keys
              </a>
              . Recomendamos criar uma chave dedicada para o CRM com limite de
              gasto definido.
            </p>
            {lastError && (
              <p className="text-[12px] text-destructive">{lastError}</p>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-6 py-3">
          <ButtonGlass
            type="button"
            variant="glass"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={!status?.configured || testMutation.isPending}
          >
            {testMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <PlugZap className="mr-2 size-4" />
            )}
            Testar conexão
          </ButtonGlass>
          {status?.source === "database" && (
            <ButtonGlass
              type="button"
              variant="glass"
              size="sm"
              className="text-destructive/80 hover:text-destructive"
              onClick={async () => {
                const ok = await confirm({
                  title: "Remover a chave da OpenAI?",
                  description:
                    "Os agentes de IA ficarão indisponíveis até que uma nova chave seja configurada.",
                  confirmLabel: "Remover",
                  destructive: true,
                });
                if (ok) removeMutation.mutate();
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Remover
            </ButtonGlass>
          )}
        </div>
      </GlassCard>

      {testResult && (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            testResult.ok
              ? "border-[var(--color-success-subtle)]/60 bg-[var(--color-success-subtle)]/60 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-destructive/40 bg-destructive/5 text-destructive",
          )}
        >
          <div className="flex items-start gap-2">
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {testResult.ok ? (
                <>
                  <p className="font-medium">
                    Chave válida — resposta do modelo {testResult.model}
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] opacity-90">
                    “{testResult.reply}”
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Falha no teste</p>
                  <p className="mt-0.5 text-[12px] opacity-90">
                    {testResult.message}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}

function StatusBadge({
  status,
  loading,
}: {
  status: AiStatus | undefined;
  loading: boolean;
}) {
  if (loading || !status) {
    return (
      <Badge variant="outline" className="text-xs">
        Carregando…
      </Badge>
    );
  }
  if (status.configured) {
    return (
      <Badge
        variant="secondary"
        className="bg-[var(--color-success-subtle)] text-emerald-700 hover:bg-[var(--color-success-subtle)] dark:bg-emerald-950 dark:text-emerald-200"
      >
        Ativa
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
        className="bg-[var(--color-amber-soft)] text-[var(--color-amber-text)] hover:bg-[var(--color-amber-soft)] dark:bg-amber-950 dark:text-[var(--color-amber-muted)]"
    >
      Desativada
    </Badge>
  );
}
