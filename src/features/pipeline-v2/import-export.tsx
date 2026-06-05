"use client";

/**
 * Componentes de Importação e Exportação de dados (contatos e negócios).
 *
 * ImportPanel: fluxo em 3 etapas estilo Kommo:
 *   1) Upload (CSV/XLSX/ODS) com detecção de delimitador
 *   2) Mapping (mapeamento de colunas → campos do CRM + tag + updateExisting)
 *   3) Result (resumo created/updated/skipped/failed + lista de erros)
 *
 * ExportPanel/useImportExportBump/downloadCsv/downloadFromApi: inalterados.
 */

import * as React from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Save,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiUrl } from "@/lib/api";
import {
  type CsvDelimiter,
  detectDelimiter,
  normalizeCsvHeader,
  parseCsv,
  parseXlsx,
} from "@/lib/csv-parse";
import {
  type ImportEntity,
  type ImportModel,
  deleteImportModel,
  getImportModels,
  saveImportModel,
} from "@/lib/import-models";
import { cn } from "@/lib/utils";

// ─── Templates CSV ───────────────────────────────────────────────────────────

const CONTACT_TEMPLATE = `name,email,phone,external_id,id,lifecycle_stage,source,company,assigned_to_email
João Silva,joao.silva@empresa.com,+5511999990001,kommo_contact_1001,,LEAD,Site,Acme Tecnologia,admin@empresa.com
Maria Souza,maria.souza@email.com,+5511999990002,kommo_contact_1002,,MQL,Indicação,Beta Solutions,admin@empresa.com
Pedro Costa,pedro.costa@gmail.com,+5511999990003,kommo_contact_1003,,SQL,Google Ads,Gamma Group,admin@empresa.com
Ana Pereira,ana.pereira@outlook.com,+5511999990004,kommo_contact_1004,,OPPORTUNITY,Facebook Ads,Delta Comercio,admin@empresa.com
Lucas Ribeiro,lucas.ribeiro@uol.com.br,+5521999990005,kommo_contact_1005,,LEAD,Webinar,Epsilon Servicos,admin@empresa.com
Beatriz Almeida,beatriz.almeida@hotmail.com,+5521999990006,kommo_contact_1006,,CUSTOMER,Site,Zeta Industria,admin@empresa.com
Rafael Santos,rafael.santos@yahoo.com,+5531999990007,kommo_contact_1007,,LEAD,LinkedIn,Eta Consultoria,admin@empresa.com
Juliana Oliveira,juliana.oliveira@empresa.com,+5531999990008,kommo_contact_1008,,SUBSCRIBER,Newsletter,Theta Educacao,admin@empresa.com
Marcos Rocha,marcos.rocha@gmail.com,+5541999990009,kommo_contact_1009,,SQL,Indicação,Iota Marketing,admin@empresa.com
Carla Mendes,carla.mendes@outlook.com,+5541999990010,kommo_contact_1010,,MQL,Google Ads,Kappa Logistica,admin@empresa.com`;

const DEAL_TEMPLATE = `title,value,status,stage_id,pipeline_name,stage_name,external_id,deal_number,contact_external_id,contact_name,contact_email,contact_phone,owner_email,expected_close,lost_reason
Implantação CRM - Acme,12500.00,OPEN,,Pipeline Principal,Qualificado,kommo_lead_2001,,kommo_contact_1001,João Silva,joao.silva@empresa.com,+5511999990001,admin@empresa.com,2026-07-15,
Pacote Premium - Beta Solutions,8900.50,OPEN,,Pipeline Principal,Proposta,kommo_lead_2002,,kommo_contact_1002,Maria Souza,maria.souza@email.com,+5511999990002,admin@empresa.com,2026-07-22,
Renovação Anual - Gamma Group,24000.00,OPEN,,Pipeline Principal,Negociação,kommo_lead_2003,,kommo_contact_1003,Pedro Costa,pedro.costa@gmail.com,+5511999990003,admin@empresa.com,2026-08-01,
Consultoria Onboarding - Delta,4500.00,WON,,Pipeline Principal,Fechamento,kommo_lead_2004,,kommo_contact_1004,Ana Lima,ana.lima@delta.com.br,+5521999990004,admin@empresa.com,2026-06-30,
Treinamento Equipe - Epsilon,3200.00,OPEN,,Pipeline Principal,Novo,kommo_lead_2005,,kommo_contact_1005,Bruno Alves,bruno.alves@epsilon.io,+5521999990005,admin@empresa.com,2026-08-10,
Pacote Enterprise - Zeta,55000.00,OPEN,,Pipeline Principal,Proposta,kommo_lead_2006,,kommo_contact_1006,Camila Dias,camila.dias@zeta.tech,+5531999990006,admin@empresa.com,2026-09-05,
Upgrade Plano - Eta,1800.00,LOST,,Pipeline Principal,Fechamento,kommo_lead_2007,,kommo_contact_1007,Diego Nunes,diego.nunes@eta.app,+5531999990007,admin@empresa.com,2026-06-15,Preço acima do orçamento
Plataforma EAD - Theta,18750.00,OPEN,,Pipeline Principal,Qualificado,kommo_lead_2008,,kommo_contact_1008,Fernanda Reis,fernanda.reis@theta.edu,+5511999990008,admin@empresa.com,2026-08-20,
Campanha Trimestral - Iota,6700.00,OPEN,,Pipeline Principal,Negociação,kommo_lead_2009,,kommo_contact_1009,Marcos Rocha,marcos.rocha@gmail.com,+5541999990009,admin@empresa.com,2026-07-30,
Migração Sistema - Kappa,32000.00,WON,,Pipeline Principal,Fechamento,kommo_lead_2010,,kommo_contact_1010,Carla Mendes,carla.mendes@outlook.com,+5541999990010,admin@empresa.com,2026-06-20,`;

// ─── Campos do sistema (mapeamento) ──────────────────────────────────────────

type SystemField = { key: string; label: string };

const SYSTEM_FIELDS: Record<ImportEntity, SystemField[]> = {
  contacts: [
    { key: "name", label: "Nome" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefone" },
    { key: "external_id", label: "ID externo" },
    { key: "id", label: "ID do sistema (atualizar)" },
    { key: "lifecycle_stage", label: "Estágio do ciclo de vida" },
    { key: "source", label: "Origem" },
    { key: "company", label: "Empresa" },
    { key: "assigned_to_email", label: "Responsável (e-mail)" },
    { key: "lead_score", label: "Lead Score" },
    { key: "avatar_url", label: "URL do avatar" },
  ],
  deals: [
    { key: "title", label: "Título do negócio" },
    { key: "value", label: "Valor" },
    { key: "status", label: "Status (OPEN/WON/LOST)" },
    { key: "stage_id", label: "ID da etapa" },
    { key: "pipeline_name", label: "Nome do pipeline" },
    { key: "stage_name", label: "Nome da etapa" },
    { key: "external_id", label: "ID externo" },
    { key: "id", label: "ID do sistema (atualizar)" },
    { key: "deal_number", label: "Número do negócio" },
    { key: "contact_external_id", label: "ID externo do contato" },
    { key: "contact_name", label: "Nome do contato (criar se não existir)" },
    { key: "contact_email", label: "E-mail do contato" },
    { key: "contact_phone", label: "Telefone do contato" },
    { key: "owner_email", label: "Responsável (e-mail)" },
    { key: "expected_close", label: "Previsão de fechamento" },
    { key: "lost_reason", label: "Motivo da perda" },
  ],
};

const ALIAS_MAP: Record<string, string> = {
  nome: "name",
  telefone: "phone",
  celular: "phone",
  whatsapp: "phone",
  email: "email",
  e_mail: "email",
  empresa: "company",
  responsavel: "assigned_to_email",
  proprietario: "owner_email",
  titulo: "title",
  valor: "value",
  etapa: "stage_name",
  pipeline: "pipeline_name",
  origem: "source",
};

function autoMapColumns(headers: string[], entity: ImportEntity): Record<string, string> {
  const mapping: Record<string, string> = {};
  const fields = SYSTEM_FIELDS[entity];
  for (const header of headers) {
    const normalized = normalizeCsvHeader(header);
    const exact = fields.find((f) => f.key === normalized);
    if (exact) {
      mapping[header] = exact.key;
      continue;
    }
    const byLabel = fields.find((f) => normalizeCsvHeader(f.label) === normalized);
    if (byLabel) {
      mapping[header] = byLabel.key;
      continue;
    }
    if (ALIAS_MAP[normalized]) {
      mapping[header] = ALIAS_MAP[normalized];
    }
  }
  return mapping;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadFromApi(url: string, fallbackName: string): Promise<void> {
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

function buildRemappedCsv(
  headers: string[],
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
): string {
  const usedColumns = headers.filter((h) => columnMapping[h] && columnMapping[h] !== "");
  const targetKeys = usedColumns.map((h) => columnMapping[h]);
  const escape = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [targetKeys.join(",")];
  for (const row of rows) {
    lines.push(usedColumns.map((h) => escape(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ─── Tipos do fluxo ──────────────────────────────────────────────────────────

type ImportStep = "upload" | "mapping" | "result";

interface ImportResult {
  created: number;
  updated: number;
  skipped?: number;
  failed: { row: number; message: string }[];
  totalRows: number;
  tagId?: string | null;
}

// ─── ImportPanel ──────────────────────────────────────────────────────────────

export function ImportPanel({ onDone }: { onDone: () => void }) {
  const [entity, setEntity] = React.useState<ImportEntity>("contacts");

  // Estado do fluxo (independente por aba)
  const [step, setStep] = React.useState<ImportStep>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [delimiter, setDelimiter] = React.useState<CsvDelimiter>(",");
  const [skipHeader, setSkipHeader] = React.useState(true);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [allRows, setAllRows] = React.useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({});
  const [tag, setTag] = React.useState(`importar_${todayYmd()}`);
  const [updateExisting, setUpdateExisting] = React.useState(true);
  const [modelName, setModelName] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState("");
  const [savedModels, setSavedModels] = React.useState<ImportModel[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Carregar modelos salvos quando a aba muda
  React.useEffect(() => {
    setSavedModels(getImportModels(entity));
  }, [entity]);

  const reset = React.useCallback(() => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setAllRows([]);
    setColumnMapping({});
    setResult(null);
    setSelectedModel("");
    setModelName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleEntityChange = (next: string) => {
    if (next !== "contacts" && next !== "deals") return;
    if (next === entity) return;
    reset();
    setEntity(next);
  };

  const ingestFile = async (f: File) => {
    setBusy(true);
    try {
      const name = f.name.toLowerCase();
      let parsed: { headers: string[]; rows: Record<string, string>[] };
      let detected: CsvDelimiter = delimiter;

      if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
        const buf = await f.arrayBuffer();
        parsed = await parseXlsx(buf);
      } else {
        const text = await f.text();
        detected = detectDelimiter(text);
        parsed = parseCsv(text, detected);
      }

      if (parsed.headers.length === 0) {
        toast.error("Arquivo vazio ou sem cabeçalho.");
        return;
      }

      setFile(f);
      setDelimiter(detected);
      setHeaders(parsed.headers);
      setAllRows(parsed.rows);
      setColumnMapping(autoMapColumns(parsed.headers, entity));
      setStep("mapping");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler o arquivo.");
    } finally {
      setBusy(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void ingestFile(f);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void ingestFile(f);
  };

  const reparseWithDelimiter = async (d: CsvDelimiter) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
      // XLSX/ODS não usa delimitador
      setDelimiter(d);
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = parseCsv(text, d);
      setDelimiter(d);
      setHeaders(parsed.headers);
      setAllRows(parsed.rows);
      setColumnMapping(autoMapColumns(parsed.headers, entity));
    } finally {
      setBusy(false);
    }
  };

  const applyModel = (modelId: string) => {
    setSelectedModel(modelId);
    if (!modelId) return;
    const m = savedModels.find((x) => x.id === modelId);
    if (!m) return;
    setColumnMapping(m.columnMapping);
    setDelimiter(m.delimiter);
    setSkipHeader(m.skipHeader);
    setUpdateExisting(m.updateExisting);
    toast.success(`Modelo "${m.name}" aplicado.`);
  };

  const persistModel = () => {
    const name = modelName.trim();
    if (!name) {
      toast.error("Informe um nome para o modelo.");
      return;
    }
    saveImportModel({
      name,
      entity,
      columnMapping,
      delimiter,
      skipHeader,
      updateExisting,
    });
    setSavedModels(getImportModels(entity));
    setModelName("");
    toast.success(`Modelo "${name}" salvo.`);
  };

  const removeModel = (id: string) => {
    deleteImportModel(id);
    setSavedModels(getImportModels(entity));
    if (selectedModel === id) setSelectedModel("");
  };

  const submit = async () => {
    if (!file) return;
    const usedColumns = headers.filter((h) => columnMapping[h]);
    if (usedColumns.length === 0) {
      toast.error("Mapeie ao menos uma coluna.");
      return;
    }

    setBusy(true);
    try {
      const remapped = buildRemappedCsv(headers, allRows, columnMapping);
      const fd = new FormData();
      fd.append("file", new Blob([remapped], { type: "text/csv;charset=utf-8" }), "import.csv");
      fd.append("delimiter", ",");
      if (tag.trim()) fd.append("tag", tag.trim());
      fd.append("updateExisting", String(updateExisting));

      const endpoint = entity === "contacts" ? "/api/contacts/import" : "/api/deals/import";
      const res = await fetch(apiUrl(endpoint), { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as ImportResult | { message?: string };

      if (!res.ok) {
        const msg = "message" in json && typeof json.message === "string" ? json.message : "Falha na importação";
        toast.error(msg);
        return;
      }

      const r = json as ImportResult;
      setResult(r);
      setStep("result");

      const created = r.created ?? 0;
      const updated = r.updated ?? 0;
      const failed = r.failed?.length ?? 0;
      const skipped = r.skipped ?? 0;
      const successCount = created + updated;

      if (failed === 0 && successCount > 0) {
        toast.success(
          `Importação concluída: ${created} criado(s), ${updated} atualizado(s)` +
            (skipped > 0 ? `, ${skipped} ignorado(s).` : "."),
        );
      } else if (successCount > 0 && failed > 0) {
        toast.warning(
          `Importação parcial: ${created} criado(s), ${updated} atualizado(s), ${failed} falha(s).`,
        );
      } else if (failed > 0 && successCount === 0) {
        toast.error(`Nenhuma linha importada. ${failed} falha(s).`);
      } else if (successCount === 0 && skipped > 0) {
        toast.info(`${skipped} linha(s) ignorada(s). Nenhuma criação ou atualização.`);
      }

      if (successCount > 0) onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar.");
    } finally {
      setBusy(false);
    }
  };

  // ── Render ──
  return (
    <Tabs value={entity} onValueChange={handleEntityChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="contacts">Contatos</TabsTrigger>
        <TabsTrigger value="deals">Negócios (leads)</TabsTrigger>
      </TabsList>

      <TabsContent value="contacts" className="mt-4">
        <ImportFlow
          entity="contacts"
          step={step}
          file={file}
          delimiter={delimiter}
          skipHeader={skipHeader}
          headers={headers}
          rows={allRows}
          columnMapping={columnMapping}
          tag={tag}
          updateExisting={updateExisting}
          modelName={modelName}
          selectedModel={selectedModel}
          savedModels={savedModels}
          busy={busy}
          result={result}
          fileInputRef={fileInputRef}
          template={CONTACT_TEMPLATE}
          onSelectFile={() => fileInputRef.current?.click()}
          onFileInputChange={handleFileInputChange}
          onDrop={handleDrop}
          onDelimiterChange={(d) => void reparseWithDelimiter(d)}
          onSkipHeaderChange={setSkipHeader}
          onColumnChange={(h, v) => setColumnMapping((m) => ({ ...m, [h]: v }))}
          onTagChange={setTag}
          onUpdateExistingChange={setUpdateExisting}
          onModelNameChange={setModelName}
          onApplyModel={applyModel}
          onSaveModel={persistModel}
          onDeleteModel={removeModel}
          onBackToUpload={reset}
          onCancel={reset}
          onSubmit={submit}
          onCloseResult={() => {
            reset();
          }}
        />
      </TabsContent>

      <TabsContent value="deals" className="mt-4">
        <ImportFlow
          entity="deals"
          step={step}
          file={file}
          delimiter={delimiter}
          skipHeader={skipHeader}
          headers={headers}
          rows={allRows}
          columnMapping={columnMapping}
          tag={tag}
          updateExisting={updateExisting}
          modelName={modelName}
          selectedModel={selectedModel}
          savedModels={savedModels}
          busy={busy}
          result={result}
          fileInputRef={fileInputRef}
          template={DEAL_TEMPLATE}
          onSelectFile={() => fileInputRef.current?.click()}
          onFileInputChange={handleFileInputChange}
          onDrop={handleDrop}
          onDelimiterChange={(d) => void reparseWithDelimiter(d)}
          onSkipHeaderChange={setSkipHeader}
          onColumnChange={(h, v) => setColumnMapping((m) => ({ ...m, [h]: v }))}
          onTagChange={setTag}
          onUpdateExistingChange={setUpdateExisting}
          onModelNameChange={setModelName}
          onApplyModel={applyModel}
          onSaveModel={persistModel}
          onDeleteModel={removeModel}
          onBackToUpload={reset}
          onCancel={reset}
          onSubmit={submit}
          onCloseResult={() => {
            reset();
          }}
        />
      </TabsContent>
    </Tabs>
  );
}

// ─── ImportFlow (compartilhado entre tabs) ───────────────────────────────────

interface ImportFlowProps {
  entity: ImportEntity;
  step: ImportStep;
  file: File | null;
  delimiter: CsvDelimiter;
  skipHeader: boolean;
  headers: string[];
  rows: Record<string, string>[];
  columnMapping: Record<string, string>;
  tag: string;
  updateExisting: boolean;
  modelName: string;
  selectedModel: string;
  savedModels: ImportModel[];
  busy: boolean;
  result: ImportResult | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  template: string;
  onSelectFile: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDelimiterChange: (d: CsvDelimiter) => void;
  onSkipHeaderChange: (v: boolean) => void;
  onColumnChange: (header: string, value: string) => void;
  onTagChange: (v: string) => void;
  onUpdateExistingChange: (v: boolean) => void;
  onModelNameChange: (v: string) => void;
  onApplyModel: (id: string) => void;
  onSaveModel: () => void;
  onDeleteModel: (id: string) => void;
  onBackToUpload: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  onCloseResult: () => void;
}

function ImportFlow(props: ImportFlowProps) {
  if (props.step === "upload") return <UploadStep {...props} />;
  if (props.step === "mapping") return <MappingStep {...props} />;
  return <ResultStep {...props} />;
}

// ─── Step 1 — Upload ──────────────────────────────────────────────────────────

function UploadStep({
  entity,
  busy,
  fileInputRef,
  template,
  onSelectFile,
  onFileInputChange,
  onDrop,
}: ImportFlowProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="size-5 text-primary" />
          Importar {entity === "contacts" ? "contatos" : "negócios"} de uma planilha
        </CardTitle>
        <CardDescription>
          Você pode importar {entity === "contacts" ? "contatos" : "negócios"}, campos e tags, tudo
          de uma vez só. Formatos aceitos: <code>.csv</code>, <code>.xlsx</code>, <code>.xls</code>,{" "}
          <code>.ods</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.ods,text/csv"
          className="hidden"
          onChange={onFileInputChange}
        />

        <div
          onClick={onSelectFile}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-12 text-center transition-colors",
            "hover:border-primary/50 hover:bg-muted/40",
            busy && "pointer-events-none opacity-60",
          )}
        >
          {busy ? (
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-8 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {busy ? "Lendo arquivo…" : "Arraste o arquivo aqui ou clique para selecionar"}
          </span>
          <span className="text-xs text-muted-foreground">
            CSV, XLSX, XLS, ODS — até 10MB
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onSelectFile} disabled={busy}>
            <Upload className="size-3.5" />
            Carregar arquivo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              downloadCsv(
                entity === "contacts" ? "contatos-modelo.csv" : "negocios-modelo.csv",
                template,
              )
            }
          >
            <Download className="size-3.5" />
            Baixar exemplo
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Dica: para arquivos com datas, use CSV com separador <code>;</code> (ponto e vírgula).
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Step 2 — Mapping ─────────────────────────────────────────────────────────

function MappingStep({
  entity,
  delimiter,
  skipHeader,
  headers,
  rows,
  columnMapping,
  tag,
  updateExisting,
  modelName,
  selectedModel,
  savedModels,
  busy,
  file,
  onDelimiterChange,
  onSkipHeaderChange,
  onColumnChange,
  onTagChange,
  onUpdateExistingChange,
  onModelNameChange,
  onApplyModel,
  onSaveModel,
  onDeleteModel,
  onBackToUpload,
  onCancel,
  onSubmit,
}: ImportFlowProps) {
  const fields = SYSTEM_FIELDS[entity];
  const preview = rows.slice(0, 3);
  const isSpreadsheet =
    !!file && /\.(xlsx|xls|ods)$/i.test(file.name);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Configurações de Importação</CardTitle>
            <CardDescription>
              Arquivo: <code className="text-xs">{file?.name}</code> · {rows.length} linhas
              detectadas
            </CardDescription>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onBackToUpload}>
            <ArrowLeft className="size-3.5" />
            Trocar arquivo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Modelo salvo + delimitador */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Modelo salvo</label>
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={(e) => onApplyModel(e.target.value)}
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="">— Nenhum (mapeamento atual) —</option>
                {savedModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {selectedModel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteModel(selectedModel)}
                  title="Remover modelo"
                >
                  <XCircle className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Delimitador</label>
            <select
              value={delimiter}
              onChange={(e) => onDelimiterChange(e.target.value as CsvDelimiter)}
              disabled={isSpreadsheet}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground disabled:opacity-50"
            >
              <option value=";">Ponto e vírgula (;)</option>
              <option value=",">Vírgula (,)</option>
              <option value="\t">Tab</option>
            </select>
            {isSpreadsheet && (
              <p className="text-xs text-muted-foreground">
                Não aplicável a planilhas (XLSX/ODS).
              </p>
            )}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={skipHeader}
            onChange={(e) => onSkipHeaderChange(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-sm text-foreground">
            Não importe a primeira linha (contém nomes de campos)
          </span>
        </label>

        {/* Tabela preview + mapeamento */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-b border-border/40">
                  {headers.map((h) => (
                    <td
                      key={h}
                      className="max-w-[200px] truncate px-3 py-2 text-foreground"
                      title={row[h]}
                    >
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
              {/* linha do mapeamento */}
              <tr className="bg-muted/30">
                {headers.map((h) => (
                  <td key={h} className="px-2 py-2">
                    <select
                      value={columnMapping[h] ?? ""}
                      onChange={(e) => onColumnChange(h, e.target.value)}
                      className="w-full rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground"
                    >
                      <option value="">Não importar</option>
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tag + salvar modelo */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Criar tag</label>
            <input
              value={tag}
              onChange={(e) => onTagChange(e.target.value)}
              placeholder="Nome da tag (opcional)"
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Salvar modelo</label>
            <div className="flex gap-2">
              <input
                value={modelName}
                onChange={(e) => onModelNameChange(e.target.value)}
                placeholder="Nome para salvar o mapeamento"
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSaveModel}
                disabled={!modelName.trim()}
              >
                <Save className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={updateExisting}
            onChange={(e) => onUpdateExistingChange(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-sm text-foreground">
            Atualizar dados existentes (quando encontrar match por <code>id</code> /{" "}
            <code>external_id</code>)
          </span>
        </label>

        <div className="space-y-3 pt-2">
          {busy && (
            <div
              className="rounded-md border border-border/60 bg-muted/40 p-3"
              role="status"
              aria-live="polite"
            >
              <div className="mb-2 flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="font-medium">Importando {rows.length} linha(s)…</span>
                <span className="text-muted-foreground">não feche esta janela</span>
              </div>
              {/* Barra indeterminada (CSS-only) */}
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="absolute inset-y-0 left-0 w-1/3 animate-[importprogress_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button type="button" onClick={onSubmit} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Importando…" : "Importar"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 3 — Result ──────────────────────────────────────────────────────────

function ResultStep({ result, onCloseResult, onBackToUpload }: ImportFlowProps) {
  if (!result) return null;
  const skipped = result.skipped ?? 0;
  const failed = Array.isArray(result.failed) ? result.failed : [];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="size-5 text-emerald-600" />
          Importação concluída
        </CardTitle>
        <CardDescription>
          {result.totalRows} linhas processadas
          {result.tagId && " · tag aplicada"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResultStat label="Criados" value={result.created} color="emerald" />
          <ResultStat label="Atualizados" value={result.updated} color="indigo" />
          <ResultStat label="Ignorados" value={skipped} color="slate" />
          <ResultStat label="Falhas" value={failed.length} color="red" />
        </div>

        {failed.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 dark:border-red-900/40 dark:bg-red-950/20">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-300">
              <AlertCircle className="size-4" />
              Linhas com falha ({failed.length})
            </h4>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1 text-xs">
              {failed.map((f, i) => (
                <div
                  key={`${f.row}-${i}`}
                  className="flex gap-3 border-b border-red-100 py-1 last:border-0 dark:border-red-900/40"
                >
                  <span className="shrink-0 text-muted-foreground">Linha {f.row}</span>
                  <span className="text-foreground/80">{f.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" onClick={onCloseResult}>
            Fechar
          </Button>
          <Button type="button" variant="outline" onClick={onBackToUpload}>
            Nova importação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "indigo" | "slate" | "red";
}) {
  const colorClass: Record<typeof color, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    slate: "text-slate-600 dark:text-slate-300",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-center">
      <div className={cn("font-display text-2xl font-bold", colorClass[color])}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ─── ExportPanel ──────────────────────────────────────────────────────────────

type Pipeline = { id: string; name: string };

export function ExportPanel() {
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
        .map((p) => ({ id: p.id, name: (p as Pipeline).name }));
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
            Gera um CSV com 1 linha por negócio: dados do negócio, contato, pipeline/estágio, dono,
            tags, datas e campos personalizados. O arquivo pode ser reimportado nesta mesma tela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="export-pipeline" className="text-sm font-medium text-foreground">
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
            CSV com todos os contatos da organização: dados básicos, empresa, responsável, origem,
            tags e campos personalizados.
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

// ─── useImportExportBump ──────────────────────────────────────────────────────

/** Retorna um callback que invalida as queries de leads/contatos após import. */
export function useImportExportBump() {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    void queryClient.invalidateQueries({ queryKey: ["deals"] });
    void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  }, [queryClient]);
}
