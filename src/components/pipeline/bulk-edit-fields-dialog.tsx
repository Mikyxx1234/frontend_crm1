"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiUrl } from "@/lib/api";
import { listTags, type DealTag } from "@/features/pipeline-v2/api/deal-tags";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

/**
 * Definição de custom field como retornada por GET /api/custom-fields.
 * Atenção: a chave é `id` (modelo Prisma), convertida para `fieldId` ao
 * montar o payload da rota /api/deals/bulk/custom-fields.
 */
type CustomFieldDef = {
  id: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
};

async function fetchCustomFields(entity: "deal" | "contact"): Promise<CustomFieldDef[]> {
  const res = await fetch(apiUrl(`/api/custom-fields?entity=${entity}`), {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

type DealNativeKey = "title" | "value" | "expectedClose";
type ContactNativeKey = "name" | "email" | "phone" | "source";

/**
 * Contexto para a seleção "todos que batem no filtro". Quando presente,
 * o usuário pode escolher aplicar a edição não só aos IDs selecionados,
 * mas a TODOS os negócios do funil (ou de uma etapa) que batem no filtro
 * atual do board — o servidor resolve os IDs (até o teto de 5000).
 */
export type BulkScopeContext = {
  pipelineId: string;
  /** Status do board ("OPEN" | "WON" | "LOST" | "ALL"). */
  status: string;
  /** Filtros avançados ativos no board (AdvancedDealFilters serializável). */
  filters: unknown;
  /** Total aproximado de negócios do funil que batem no filtro (exibição). */
  pipelineTotal: number;
  /** Quando toda a seleção está numa única etapa, habilita o escopo "etapa". */
  stage?: { id: string; name: string; total: number } | null;
};

type ScopeMode = "selected" | "stage" | "pipeline";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** IDs dos deals selecionados. */
  dealIds: string[];
  /** Disparado quando a operação é enfileirada (202). */
  onEnqueued: (operationId: string, total: number) => void;
  /** Habilita a opção "selecionar todos que batem no filtro". */
  scopeContext?: BulkScopeContext;
};

/**
 * Dialog de edição em massa de campos/tags do pipeline. Semântica
 * skip-empty: só os campos preenchidos são enviados (vazio = não altera).
 * Tudo é processado pelo worker-leads (rota responde 202 + operationId).
 */
export function BulkEditFieldsDialog({ open, onOpenChange, dealIds, onEnqueued, scopeContext }: Props) {
  const [scopeMode, setScopeMode] = React.useState<ScopeMode>("selected");
  const [dealCustom, setDealCustom] = React.useState<Record<string, string>>({});
  const [contactCustom, setContactCustom] = React.useState<Record<string, string>>({});
  const [dealNative, setDealNative] = React.useState<Record<DealNativeKey, string>>({
    title: "", value: "", expectedClose: "",
  });
  const [contactNative, setContactNative] = React.useState<Record<ContactNativeKey, string>>({
    name: "", email: "", phone: "", source: "",
  });
  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = React.useState("");
  const [newTagNames, setNewTagNames] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const { data: dealFields = [] } = useQuery({
    queryKey: ["custom-fields", "deal"],
    queryFn: () => fetchCustomFields("deal"),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: contactFields = [] } = useQuery({
    queryKey: ["custom-fields", "contact"],
    queryFn: () => fetchCustomFields("contact"),
    enabled: open,
    staleTime: 60_000,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["tags-all"],
    queryFn: listTags,
    enabled: open,
    staleTime: 60_000,
  });

  // Reset ao abrir.
  React.useEffect(() => {
    if (open) {
      setScopeMode("selected");
      setDealCustom({});
      setContactCustom({});
      setDealNative({ title: "", value: "", expectedClose: "" });
      setContactNative({ name: "", email: "", phone: "", source: "" });
      setSelectedTagIds(new Set());
      setNewTagName("");
      setNewTagNames([]);
      setSubmitting(false);
    }
  }, [open]);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addNewTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    // Evita duplicar com tag existente (case-insensitive) ou já adicionada.
    const existsInList = tags.some((t) => t.name.toLowerCase() === name.toLowerCase());
    const alreadyTyped = newTagNames.some((n) => n.toLowerCase() === name.toLowerCase());
    if (existsInList) {
      const t = tags.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (t) toggleTag(t.id);
    } else if (!alreadyTyped) {
      setNewTagNames((prev) => [...prev, name]);
    }
    setNewTagName("");
  };

  const buildPayload = () => {
    const customToList = (rec: Record<string, string>) =>
      Object.entries(rec)
        .map(([fieldId, value]) => ({ fieldId, value: value.trim() }))
        .filter((u) => u.value.length > 0);

    const updates = customToList(dealCustom);
    const contactCustomList = customToList(contactCustom);

    const dealNativeObj: Record<string, string> = {};
    (Object.keys(dealNative) as DealNativeKey[]).forEach((k) => {
      if (dealNative[k].trim().length > 0) dealNativeObj[k] = dealNative[k].trim();
    });
    const contactNativeObj: Record<string, string> = {};
    (Object.keys(contactNative) as ContactNativeKey[]).forEach((k) => {
      if (contactNative[k].trim().length > 0) contactNativeObj[k] = contactNative[k].trim();
    });

    const tagsPayload = [
      ...[...selectedTagIds].map((tagId) => ({ tagId })),
      ...newTagNames.map((tagName) => ({ tagName })),
    ];

    // Escopo: por padrão usa os IDs selecionados. Quando o usuário escolhe
    // "todos da etapa" ou "todos do funil", manda `scope` e o servidor
    // resolve os IDs (respeitando filtros + visibilidade).
    const scopeSel: Record<string, unknown> =
      scopeContext && scopeMode !== "selected"
        ? {
            scope: {
              pipelineId: scopeContext.pipelineId,
              status: scopeContext.status,
              filters: scopeContext.filters,
              ...(scopeMode === "stage" && scopeContext.stage
                ? { stageId: scopeContext.stage.id }
                : {}),
            },
          }
        : { dealIds };

    return {
      ...scopeSel,
      updates,
      contactCustom: contactCustomList,
      ...(Object.keys(dealNativeObj).length ? { dealNative: dealNativeObj } : {}),
      ...(Object.keys(contactNativeObj).length ? { contactNative: contactNativeObj } : {}),
      tags: tagsPayload,
      hasWork:
        updates.length > 0 ||
        contactCustomList.length > 0 ||
        Object.keys(dealNativeObj).length > 0 ||
        Object.keys(contactNativeObj).length > 0 ||
        tagsPayload.length > 0,
    };
  };

  // Quantidade efetiva conforme o escopo escolhido (para exibição/total).
  const effectiveCount =
    scopeMode === "pipeline"
      ? scopeContext?.pipelineTotal ?? dealIds.length
      : scopeMode === "stage"
        ? scopeContext?.stage?.total ?? dealIds.length
        : dealIds.length;

  const submit = async () => {
    const { hasWork, ...payload } = buildPayload();
    if (!hasWork) {
      toast.error("Preencha ao menos um campo ou selecione uma tag.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/deals/bulk/custom-fields"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { message?: string }).message ?? "Erro ao enfileirar a edição.");
      }
      const operationId = (data as { operationId?: string }).operationId;
      const total = (data as { total?: number }).total ?? effectiveCount;
      if ((data as { capped?: boolean }).capped) {
        toast.warning("Seleção excedeu 5000 negócios — apenas os primeiros 5000 serão processados.");
      }
      if (operationId) {
        onEnqueued(operationId, total);
        onOpenChange(false);
      } else {
        throw new Error("Resposta inesperada do servidor.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enfileirar a edição.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      busy={submitting}
      size="lg"
      title="Editar campos em massa"
      description={<>Aplicando a <strong>{effectiveCount}</strong> negócio(s). Só os campos preenchidos serão alterados — o restante permanece como está.</>}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "Enfileirando…" : "Aplicar alterações"}
          </Button>
        </>
      }
    >
      <div onClick={(e) => e.stopPropagation()}>

        {scopeContext && (
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3">
            <p className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Aplicar a
            </p>
            <ScopeOption
              checked={scopeMode === "selected"}
              onSelect={() => setScopeMode("selected")}
              label={`Apenas os selecionados (${dealIds.length})`}
            />
            {scopeContext.stage && (
              <ScopeOption
                checked={scopeMode === "stage"}
                onSelect={() => setScopeMode("stage")}
                label={`Todos da etapa "${scopeContext.stage.name}" (${scopeContext.stage.total})`}
              />
            )}
            <ScopeOption
              checked={scopeMode === "pipeline"}
              onSelect={() => setScopeMode("pipeline")}
              label={`Todos do funil no filtro atual (${scopeContext.pipelineTotal})`}
            />
            {scopeMode !== "selected" && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Os negócios são resolvidos no servidor respeitando os filtros e a
                sua visibilidade. Máximo de 5000 por operação.
              </p>
            )}
          </div>
        )}

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {/* Negócio */}
          <Section title="Negócio">
            <NativeField label="Título">
              <Input
                value={dealNative.title}
                onChange={(e) => setDealNative((p) => ({ ...p, title: e.target.value }))}
                placeholder="(manter)"
              />
            </NativeField>
            <NativeField label="Valor">
              <Input
                type="number"
                value={dealNative.value}
                onChange={(e) => setDealNative((p) => ({ ...p, value: e.target.value }))}
                placeholder="(manter)"
              />
            </NativeField>
            <NativeField label="Previsão de fechamento">
              <DatePicker
                value={dealNative.expectedClose}
                onChange={(value) => setDealNative((p) => ({ ...p, expectedClose: value }))}
              />
            </NativeField>
            {dealFields.map((f) => (
              <NativeField key={f.id} label={f.label}>
                <FieldInput
                  field={f}
                  value={dealCustom[f.id] ?? ""}
                  onChange={(v) => setDealCustom((p) => ({ ...p, [f.id]: v }))}
                />
              </NativeField>
            ))}
          </Section>

          {/* Contato */}
          <Section title="Contato vinculado">
            <NativeField label="Nome">
              <Input
                value={contactNative.name}
                onChange={(e) => setContactNative((p) => ({ ...p, name: e.target.value }))}
                placeholder="(manter)"
              />
            </NativeField>
            <NativeField label="E-mail">
              <Input
                type="email"
                value={contactNative.email}
                onChange={(e) => setContactNative((p) => ({ ...p, email: e.target.value }))}
                placeholder="(manter)"
              />
            </NativeField>
            <NativeField label="Telefone">
              <Input
                value={contactNative.phone}
                onChange={(e) => setContactNative((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(manter)"
              />
            </NativeField>
            <NativeField label="Origem">
              <Input
                value={contactNative.source}
                onChange={(e) => setContactNative((p) => ({ ...p, source: e.target.value }))}
                placeholder="(manter)"
              />
            </NativeField>
            {contactFields.map((f) => (
              <NativeField key={f.id} label={f.label}>
                <FieldInput
                  field={f}
                  value={contactCustom[f.id] ?? ""}
                  onChange={(v) => setContactCustom((p) => ({ ...p, [f.id]: v }))}
                />
              </NativeField>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Aplicado ao contato vinculado de cada negócio. Negócios sem
              contato são registrados como falha individual.
            </p>
          </Section>

          {/* Tags */}
          <Section title="Adicionar tags ao negócio">
            <div className="flex flex-wrap gap-2">
              {tags.map((t: DealTag) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                    selectedTagIds.has(t.id)
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "border-border bg-transparent text-foreground hover:bg-accent",
                  )}
                >
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && (
                <span className="text-[12px] text-muted-foreground">Nenhuma tag cadastrada.</span>
              )}
            </div>
            {newTagNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newTagNames.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--brand-primary)] px-3 py-1.5 text-sm text-[var(--brand-primary)]"
                  >
                    {n} (nova)
                    <button
                      type="button"
                      onClick={() => setNewTagNames((prev) => prev.filter((x) => x !== n))}
                      className="text-[var(--brand-primary)]/70 hover:text-[var(--brand-primary)]"
                      aria-label={`Remover ${n}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewTag();
                  }
                }}
                placeholder="Criar/selecionar tag por nome…"
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={addNewTag}>
                Adicionar
              </Button>
            </div>
          </Section>
        </div>

      </div>
    </FormSheet>
  );
}

function ScopeOption({
  checked,
  onSelect,
  label,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 text-left"
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-[var(--brand-primary)]" : "border-muted-foreground/40",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-[var(--brand-primary)]" />}
      </span>
      <span className={cn("text-[13px]", checked ? "font-medium text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="font-display text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function NativeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-[38%] shrink-0 text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Renderiza o input adequado ao tipo do custom field (espelha o editor single-deal). */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "SELECT" && field.options.length > 0) {
    return (
      <SelectNative value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full">
        <option value="">(manter)</option>
        {field.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </SelectNative>
    );
  }
  if (field.type === "BOOLEAN") {
    return (
      <SelectNative value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full">
        <option value="">(manter)</option>
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </SelectNative>
    );
  }
  if (field.type === "DATE") {
    return <DatePicker value={value} onChange={onChange} />;
  }
  return (
    <Input
      type={field.type === "NUMBER" ? "number" : field.type === "EMAIL" ? "email" : field.type === "URL" ? "url" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="(manter)"
      className="h-9"
    />
  );
}
