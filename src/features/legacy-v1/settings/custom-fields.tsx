"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLayoutList as LayoutList, IconPencil as Pencil, IconPlus as Plus, IconTrash as Trash2 } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { ButtonGlass } from "@/components/crm/button-glass";
import { GlassCard } from "@/components/crm/glass-card";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { TabsGlass } from "@/components/crm/tabs-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type CustomFieldItem = {
  id: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  entity: string;
  showInInboxLeadPanel?: boolean;
  inboxLeadPanelOrder?: number | null;
};

const TYPES = [
  { value: "TEXT", label: "Texto" },
  { value: "NUMBER", label: "Número" },
  { value: "DATE", label: "Data" },
  { value: "SELECT", label: "Seleção" },
  { value: "MULTI_SELECT", label: "Multi-seleção" },
  { value: "BOOLEAN", label: "Sim/Não" },
  { value: "URL", label: "URL" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
] as const;

const ENTITY_LABELS: Record<string, string> = {
  contact: "Lead (contato)",
  deal: "Negócio",
  product: "Produto/Serviço",
};

async function fetchFields(): Promise<CustomFieldItem[]> {
  const [contactRes, dealRes, productRes] = await Promise.all([
    fetch(apiUrl("/api/custom-fields?entity=contact")),
    fetch(apiUrl("/api/custom-fields?entity=deal")),
    fetch(apiUrl("/api/custom-fields?entity=product")),
  ]);
  const contacts = contactRes.ok ? await contactRes.json() : [];
  const deals = dealRes.ok ? await dealRes.json() : [];
  const products = productRes.ok ? await productRes.json() : [];
  return [
    ...(Array.isArray(contacts) ? contacts : []),
    ...(Array.isArray(deals) ? deals : []),
    ...(Array.isArray(products) ? products : []),
  ];
}

async function createField(data: {
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  entity: string;
  showInInboxLeadPanel?: boolean;
  inboxLeadPanelOrder?: number | null;
}) {
  const res = await fetch(apiUrl("/api/custom-fields"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? "Erro ao criar campo");
  }
  return res.json();
}

async function updateField(id: string, data: Record<string, unknown>) {
  const res = await fetch(apiUrl(`/api/custom-fields/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar campo");
  return res.json();
}

async function deleteField(id: string) {
  const res = await fetch(apiUrl(`/api/custom-fields/${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error("Erro ao excluir campo");
}

export default function CustomFieldsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<CustomFieldItem | null>(null);
  // Permite pré-selecionar a entidade via query string (ex.: a tela de
  // Produtos linka pra cá com `?entity=product` e o usuário cai direto
  // no filtro certo, sem ter que saber que existe uma aba).
  const initialEntity = React.useMemo<"all" | "contact" | "deal" | "product">(() => {
    const p = searchParams?.get("entity");
    if (p === "contact" || p === "deal" || p === "product") return p;
    return "all";
  }, [searchParams]);
  const [entityFilter, setEntityFilter] = React.useState<"all" | "contact" | "deal" | "product">(initialEntity);

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ["custom-fields-all"],
    queryFn: fetchFields,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom-fields-all"] }),
  });

  const filtered = entityFilter === "all"
    ? fields
    : fields.filter((f) => f.entity === entityFilter);

  const contactCount = fields.filter((f) => f.entity === "contact").length;
  const dealCount = fields.filter((f) => f.entity === "deal").length;
  const productCount = fields.filter((f) => f.entity === "product").length;

  const filterOptions = [
    { val: "all" as const, label: "Todos", count: fields.length },
    { val: "contact" as const, label: "Contatos", count: contactCount },
    { val: "deal" as const, label: "Negócios", count: dealCount },
    { val: "product" as const, label: "Produtos", count: productCount },
  ];
  const activeTabIndex = filterOptions.findIndex((o) => o.val === entityFilter);

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TabsGlass
          tabs={filterOptions.map((o) => ({ label: o.label, count: o.count }))}
          activeTab={activeTabIndex === -1 ? 0 : activeTabIndex}
          onChange={(i) => setEntityFilter(filterOptions[i].val)}
        />

        <div className="flex-1" />

        <ButtonGlass variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo campo
        </ButtonGlass>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="border-dashed p-0">
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <LayoutList className="mb-3 size-10 text-[var(--text-muted)]/30" />
            <p className="text-sm text-[var(--text-muted)]">
              {fields.length === 0
                ? "Nenhum campo personalizado criado ainda."
                : "Nenhum campo nesta categoria."}
            </p>
            <ButtonGlass variant="glass" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Criar campo
            </ButtonGlass>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((f) => (
            <GlassCard key={f.id} className="group relative p-0 transition-shadow hover:shadow-[var(--glass-shadow)]">
              <div className="px-4 pb-2 pt-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{f.label}</h3>
                    <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">{f.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <ButtonGlass
                      variant="icon" size="icon" className="size-7"
                      onClick={() => setEditItem(f)}
                    >
                      <Pencil className="size-3" />
                    </ButtonGlass>
                    <ButtonGlass
                      variant="icon" size="icon" className="size-7 text-[var(--color-destructive)] hover:bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] hover:text-[var(--color-destructive)]"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Excluir campo",
                          description: `Excluir o campo "${f.label}"? Todos os valores serão perdidos.`,
                          confirmLabel: "Excluir",
                          variant: "destructive",
                        });
                        if (ok) deleteMutation.mutate(f.id);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </ButtonGlass>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4 pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {ENTITY_LABELS[f.entity] ?? f.entity}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {TYPES.find((t) => t.value === f.type)?.label ?? f.type}
                  </Badge>
                  {f.required && (
                    <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>
                  )}
                  {(f.entity === "contact" || f.entity === "deal") && f.showInInboxLeadPanel && (
                    <Badge className="border border-[var(--color-teal)]/40 bg-[var(--color-teal)]/10 text-[10px] font-semibold text-[#0f766e]">
                      Painel Inbox
                    </Badge>
                  )}
                  {f.options.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {f.options.length} opç{f.options.length === 1 ? "ão" : "ões"}
                    </span>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <FieldFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["custom-fields-all"] });
          setCreateOpen(false);
        }}
      />

      {editItem && (
        <FieldFormDialog
          open={!!editItem}
          onOpenChange={(o) => { if (!o) setEditItem(null); }}
          mode="edit"
          initial={editItem}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["custom-fields-all"] });
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}

function FieldFormDialog({
  open, onOpenChange, mode, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  initial?: CustomFieldItem;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [type, setType] = React.useState(initial?.type ?? "TEXT");
  const [entity, setEntity] = React.useState(initial?.entity ?? "contact");
  const [required, setRequired] = React.useState(initial?.required ?? false);
  const [optionsText, setOptionsText] = React.useState(initial?.options.join("\n") ?? "");
  const [showInInboxLeadPanel, setShowInInboxLeadPanel] = React.useState(
    initial?.showInInboxLeadPanel ?? false
  );
  const [inboxOrder, setInboxOrder] = React.useState(
    initial?.inboxLeadPanelOrder != null ? String(initial.inboxLeadPanelOrder) : ""
  );

  React.useEffect(() => {
    if (open && initial) {
      setName(initial.name);
      setLabel(initial.label);
      setType(initial.type);
      setEntity(initial.entity);
      setRequired(initial.required);
      setOptionsText(initial.options.join("\n"));
      setShowInInboxLeadPanel(initial.showInInboxLeadPanel ?? false);
      setInboxOrder(initial.inboxLeadPanelOrder != null ? String(initial.inboxLeadPanelOrder) : "");
    } else if (open && !initial) {
      setName("");
      setLabel("");
      setType("TEXT");
      setEntity("contact");
      setRequired(false);
      setOptionsText("");
      setShowInInboxLeadPanel(false);
      setInboxOrder("");
    }
  }, [open, initial]);

  const supportsInboxPanel = entity === "contact" || entity === "deal";
  React.useEffect(() => {
    if (open && mode === "create" && !supportsInboxPanel) {
      setShowInInboxLeadPanel(false);
      setInboxOrder("");
    }
  }, [supportsInboxPanel, open, mode]);

  const mutation = useMutation({
    mutationFn: async () => {
      const options = optionsText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);

      const orderTrim = inboxOrder.trim();
      const inboxLeadPanelOrder =
        supportsInboxPanel && orderTrim !== "" && Number.isFinite(Number(orderTrim))
          ? Math.floor(Number(orderTrim))
          : supportsInboxPanel && orderTrim === ""
            ? null
            : undefined;

      if (mode === "create") {
        return createField({
          name,
          label,
          type,
          options,
          required,
          entity,
          ...(supportsInboxPanel
            ? {
                showInInboxLeadPanel,
                inboxLeadPanelOrder: inboxLeadPanelOrder ?? null,
              }
            : {}),
        });
      } else if (initial) {
        const editSupports = initial.entity === "contact" || initial.entity === "deal";
        return updateField(initial.id, {
          label,
          type,
          options,
          required,
          ...(editSupports
            ? {
                showInInboxLeadPanel,
                ...(inboxLeadPanelOrder !== undefined ? { inboxLeadPanelOrder } : {}),
              }
            : {}),
        });
      }
    },
    onSuccess: () => onSaved(),
  });

  const showOptions = type === "SELECT" || type === "MULTI_SELECT";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo campo" : "Editar campo"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Defina o nome, tipo e entidade para o novo campo."
              : `Editando o campo "${initial?.label}".`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Entidade</Label>
              <DropdownGlass
                options={[
                  { value: "contact", label: "Contato" },
                  { value: "deal", label: "Negócio" },
                  { value: "product", label: "Produto/Serviço" },
                ]}
                value={entity}
                onValueChange={(v) => setEntity(v)}
                disabled={mode === "edit"}
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <DropdownGlass
                options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={type}
                onValueChange={(v) => setType(v)}
                triggerClassName="w-full"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Identificador (slug) — opcional</Label>
            <InputGlass
              value={name}
              onChange={(e) => {
                const cleaned = e.target.value
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "")
                  .replace(/_+/g, "_");
                setName(cleaned);
              }}
              placeholder="vazio = gerar automático pelo label"
              disabled={mode === "edit"}
              className="font-mono"
            />
            {mode === "create" ? (
              <p className="text-[11px] text-muted-foreground">
                Se deixar vazio, o sistema gera automaticamente (ex.:{" "}
                <span className="font-mono">fonte_do_lead</span>).
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Label (exibição)</Label>
            <InputGlass
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Fonte do Lead"
            />
          </div>

          {showOptions && (
            <div className="space-y-1.5">
              <Label className="text-xs">Opções (uma por linha)</Label>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-full rounded-lg text-sm"
                placeholder={"Opção 1\nOpção 2\nOpção 3"}
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <CheckboxGlass
              checked={required}
              onChange={(v) => setRequired(v)}
              aria-label="Campo obrigatório"
            />
            <span className="text-sm">Campo obrigatório</span>
          </label>

          {supportsInboxPanel && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3">
              <p className="text-xs font-medium text-[var(--text-primary)]">Painel lateral na Inbox</p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Marque os campos que o agente deve ver ao atender no chat.
                {entity === "contact" && <> Ex.: CPF, matrícula, adimplente.</>}
                {entity === "deal" && <> Ex.: origem do lead, segmento, plano.</>}
                {" "}Use tipo <strong>Sim/Não</strong> para situações de destaque.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <CheckboxGlass
                  checked={showInInboxLeadPanel}
                  onChange={(v) => setShowInInboxLeadPanel(v)}
                  aria-label="Exibir no painel lateral (Inbox)"
                />
                <span className="text-sm">Exibir no painel lateral (Inbox)</span>
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs">Ordem no painel (opcional)</Label>
                <InputGlass
                  type="number"
                  inputMode="numeric"
                  value={inboxOrder}
                  onChange={(e) => setInboxOrder(e.target.value)}
                  placeholder="0 = primeiro; vazio = após os numerados"
                />
              </div>
            </div>
          )}

          <Separator />

          <DialogFooter>
            <ButtonGlass type="button" variant="glass" onClick={() => onOpenChange(false)}>
              Cancelar
            </ButtonGlass>
            <ButtonGlass
              type="submit"
              variant="primary"
              disabled={
                mutation.isPending || !label.trim()
              }
            >
              {mutation.isPending
                ? "Salvando…"
                : mode === "create"
                  ? "Criar campo"
                  : "Salvar"}
            </ButtonGlass>
          </DialogFooter>

          {mutation.isError && (
            <p className="text-sm text-[var(--color-destructive)]">
              {mutation.error instanceof Error ? mutation.error.message : "Erro"}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
