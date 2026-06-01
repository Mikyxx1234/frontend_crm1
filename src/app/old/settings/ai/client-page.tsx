"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  PlugZap,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
    <div className="w-full space-y-6">
      <PageHeader
        title="IA"
        description="Configure a chave da OpenAI usada pelos agentes e pelos recursos de IA do CRM."
        icon={<Sparkles />}
      />

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="size-4 text-muted-foreground" />
              Chave da OpenAI
            </CardTitle>
            <StatusBadge status={status} loading={statusQuery.isLoading} />
          </div>
          <CardDescription>
            A chave é armazenada criptografada no banco (AES-256-GCM) e nunca
            aparece em texto puro na interface. Ela é usada por todos os
            agentes de IA, embeddings e respostas automáticas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusQuery.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : status?.configured ? (
            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 p-3 text-sm dark:border-emerald-800/60 dark:bg-emerald-950/30">
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
            <div className="rounded-lg border border-amber-200/60 bg-amber-50/60 p-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
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
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
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
              <Button
                type="button"
                onClick={() => saveMutation.mutate(apiKey.trim())}
                disabled={!apiKey.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Salvar
              </Button>
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
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 py-3">
          <Button
            type="button"
            variant="outline"
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
          </Button>
          {status?.source === "database" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive/80 hover:text-destructive"
              onClick={() => {
                if (!confirm("Remover a chave da OpenAI? Os agentes de IA ficarão indisponíveis até que uma nova chave seja configurada."))
                  return;
                removeMutation.mutate();
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Remover
            </Button>
          )}
        </CardFooter>
      </Card>

      {testResult && (
        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            testResult.ok
              ? "border-emerald-200/60 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200"
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
        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
      >
        Ativa
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200"
    >
      Desativada
    </Badge>
  );
}
