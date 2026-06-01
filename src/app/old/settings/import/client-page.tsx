"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const CONTACT_TEMPLATE = `name,email,phone,external_id,id,lifecycle_stage,source,company,assigned_to_email
João Silva,joao@email.com,+5511999999999,kommo_contact_1001,,LEAD,Site,Minha Empresa,admin@empresa.com`;

const DEAL_TEMPLATE = `title,value,status,stage_id,external_id,deal_number,contact_external_id,owner_email,expected_close,lost_reason
`;

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Baixa um arquivo servido por um endpoint autenticado (GET). Usa
 * fetch + blob (em vez de navegar direto) para que o cookie de sessão
 * viaje e erros venham com mensagem legível.
 */
async function downloadFromApi(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    let msg = "Falha na exportação";
    try {
      const j = (await res.json()) as { message?: string };
      if (typeof j?.message === "string") msg = j.message;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const m = /filename="?([^";]+)"?/.exec(cd);
  const name = m?.[1] ?? fallbackName;
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(objUrl);
}

type ImportResult = {
  created: number;
  updated: number;
  failed: { row: number; message: string }[];
  totalRows: number;
};

async function postCsv(url: string, file: File): Promise<ImportResult> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch(url, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Falha na importação");
  }
  return data as ImportResult;
}

type Pipeline = { id: string; name: string };

function ImportDropzone({
  label,
  uploadUrl,
  onDone,
}: {
  label: string;
  uploadUrl: string;
  onDone: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [last, setLast] = React.useState<ImportResult | null>(null);

  const run = async (file: File) => {
    setBusy(true);
    setLast(null);
    try {
      const r = await postCsv(uploadUrl, file);
      setLast(r);
      toast.success(
        `${label}: ${r.created} criados, ${r.updated} atualizados` +
          (r.failed.length ? `, ${r.failed.length} com erro` : "."),
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void run(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors",
          "hover:border-primary/50 hover:bg-muted/40",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="size-8 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {busy ? "Importando…" : "Arraste um CSV ou clique para escolher"}
        </span>
        <span className="text-xs text-muted-foreground">UTF-8, separador vírgula</span>
      </button>

      {last && (
        <div className="rounded-lg border border-border bg-card p-3 text-sm">
          <p className="font-medium text-foreground">
            Último resultado: {last.created} novos · {last.updated} atualizados · {last.totalRows}{" "}
            linhas
          </p>
          {last.failed.length > 0 && (
            <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs text-destructive">
              {last.failed.slice(0, 20).map((f) => (
                <li key={`${f.row}-${f.message}`}>
                  Linha {f.row}: {f.message}
                </li>
              ))}
              {last.failed.length > 20 && <li>… e mais {last.failed.length - 20} erro(s)</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ImportPanel({ onDone }: { onDone: () => void }) {
  return (
    <Tabs defaultValue="contacts" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="contacts">Contatos</TabsTrigger>
        <TabsTrigger value="deals">Negócios (leads)</TabsTrigger>
      </TabsList>

      <TabsContent value="contacts" className="mt-4 space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="size-5 text-primary" />
              CSV de contatos
            </CardTitle>
            <CardDescription>
              Obrigatório: <code className="text-xs">name</code>. Identificação para upsert:{" "}
              <code className="text-xs">id</code> (deste sistema) ou{" "}
              <code className="text-xs">external_id</code> /{" "}
              <code className="text-xs">kommo_contact_id</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => downloadCsv("contatos-modelo.csv", CONTACT_TEMPLATE)}
              >
                <Download className="size-3.5" />
                Baixar modelo
              </Button>
            </div>
            <ImportDropzone label="Contatos" uploadUrl="/api/contacts/import" onDone={onDone} />
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Colunas úteis</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>
                  <code>lifecycle_stage</code> — SUBSCRIBER, LEAD, MQL, SQL, OPPORTUNITY, CUSTOMER…
                </li>
                <li>
                  <code>company</code> ou <code>company_id</code>
                </li>
                <li>
                  <code>assigned_to_id</code> ou <code>assigned_to_email</code>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="deals" className="mt-4 space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="size-5 text-primary" />
              CSV de negócios
            </CardTitle>
            <CardDescription>
              Obrigatório: <code className="text-xs">title</code> e estágio —{" "}
              <code className="text-xs">stage_id</code> (recomendado) ou par{" "}
              <code className="text-xs">pipeline_name</code> +{" "}
              <code className="text-xs">stage_name</code>. Upsert:{" "}
              <code className="text-xs">id</code>, <code className="text-xs">external_id</code> /{" "}
              <code className="text-xs">kommo_lead_id</code> ou{" "}
              <code className="text-xs">deal_number</code> (número interno do negócio).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => downloadCsv("negocios-modelo.csv", DEAL_TEMPLATE)}
              >
                <Download className="size-3.5" />
                Baixar modelo
              </Button>
            </div>
            <ImportDropzone label="Negócios" uploadUrl="/api/deals/import" onDone={onDone} />
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Vínculo com contato</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>
                  <code>contact_id</code> — id interno do contato
                </li>
                <li>
                  <code>contact_external_id</code> ou <code>kommo_contact_id</code> — mesmo valor
                  usado na planilha de contatos
                </li>
                <li>
                  <code>status</code> — OPEN, WON, LOST · <code>owner_email</code>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function ExportPanel() {
  const [pipelineId, setPipelineId] = React.useState<string>("all");
  const [busy, setBusy] = React.useState<null | "deals" | "contacts">(null);

  const { data: pipelines = [] } = useQuery<Pipeline[]>({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) return [];
      return data
        .filter((p): p is Pipeline => !!p && typeof (p as Pipeline).id === "string")
        .map((p) => ({ id: p.id, name: p.name }));
    },
  });

  const runExport = async (kind: "deals" | "contacts") => {
    setBusy(kind);
    try {
      if (kind === "deals") {
        const qs = pipelineId !== "all" ? `?pipelineId=${encodeURIComponent(pipelineId)}` : "";
        await downloadFromApi(apiUrl(`/api/deals/export${qs}`), "negocios.csv");
      } else {
        await downloadFromApi(apiUrl("/api/contacts/export"), "contatos.csv");
      }
      toast.success("Exportação concluída. Verifique seus downloads.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="size-5 text-primary" />
            Exportar negócios
          </CardTitle>
          <CardDescription>
            Gera um CSV com 1 linha por negócio: dados do negócio, contato vinculado (nome, e-mail,
            telefone, ids), pipeline/estágio, dono, tags, datas e{" "}
            <strong className="font-medium text-foreground">campos personalizados</strong>. O
            arquivo pode ser reimportado nesta mesma tela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="export-pipeline"
              className="text-sm font-medium text-foreground"
            >
              Pipeline
            </label>
            <select
              id="export-pipeline"
              value={pipelineId}
              onChange={(e) => setPipelineId(e.target.value)}
              className={cn(
                "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
              )}
            >
              <option value="all">Todos os pipelines</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            className="gap-1.5"
            disabled={busy !== null}
            onClick={() => void runExport("deals")}
          >
            <Download className="size-4" />
            {busy === "deals" ? "Exportando…" : "Exportar negócios (CSV)"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="size-5 text-primary" />
            Exportar contatos
          </CardTitle>
          <CardDescription>
            CSV com todos os contatos da organização: dados básicos, empresa, responsável, origem de
            anúncio (CTWA), tags e campos personalizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            disabled={busy !== null}
            onClick={() => void runExport("contacts")}
          >
            <Download className="size-4" />
            {busy === "contacts" ? "Exportando…" : "Exportar contatos (CSV)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ImportSettingsPage() {
  const queryClient = useQueryClient();
  const bump = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: ["deals"] });
    void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  }, [queryClient]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/old/settings"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Configurações
        </Link>
        <h1 className={pageHeaderTitleClass}>Importar / Exportar base</h1>
        <p className={pageHeaderDescriptionClass}>
          Importe CSV com identificadores estáveis (como no Kommo) — linhas com o mesmo{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">id</code> /{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">external_id</code> são{" "}
          <strong className="font-medium text-foreground">atualizadas</strong>, não duplicadas. Ou
          exporte sua base atual em CSV para backup, análise ou migração.
        </p>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4">
          <ImportPanel onDone={bump} />
        </TabsContent>

        <TabsContent value="export" className="mt-4">
          <ExportPanel />
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs text-muted-foreground">
        Apenas administradores e gerentes podem importar ou exportar.
      </p>
    </div>
  );
}
