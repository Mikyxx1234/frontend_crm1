"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LayoutList, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { useConfirm } from "@/hooks/use-confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  contact: "Contato",
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

  return (
    <div className="w-full">
      <div className="mb-6 flex items-start gap-3">
        <Link href="/settings" className="mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60">
          <ArrowLeft className="size-5" />
        </Link>
        <PageHeader
          title="Campos Personalizados"
          description="Crie campos customizados para contatos, negócios e produtos/serviços."
          icon={<LayoutList />}
          className="flex-1"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-0.5">
          {([
            { val: "all" as const, label: `Todos (${fields.length})` },
            { val: "contact" as const, label: `Contatos (${contactCount})` },
            { val: "deal" as const, label: `Negócios (${dealCount})` },
            { val: "product" as const, label: `Produtos (${productCount})` },
          ]).map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setEntityFilter(opt.val)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                entityFilter === opt.val
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Novo campo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutList className="mb-3 size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {fields.length === 0
                ? "Nenhum campo personalizado criado ainda."
                : "Nenhum campo nesta categoria."}
            </p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Criar campo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((f) => (
            <Card key={f.id} className="group relative transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-semibold">{f.label}</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono">{f.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost" size="icon" className="size-7"
                      onClick={() => setEditItem(f)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10"
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
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
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
                    <Badge className="border border-[#00d4aa]/40 bg-[#00d4aa]/10 text-[10px] font-semibold text-[#0f766e]">
                      Painel Inbox
                    </Badge>
                  )}
                  {f.options.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {f.options.length} opç{f.options.length === 1 ? "ão" : "ões"}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
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
              <SelectNative
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                disabled={mode === "edit"}
                className="h-9"
              >
                <option value="contact">Contato</option>
                <option value="deal">Negócio</option>
                <option value="product">Produto/Serviço</option>
              </SelectNative>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <SelectNative value={type} onChange={(e) => setType(e.target.value)} className="h-9">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectNative>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Identificador (slug)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase())}
              placeholder="ex: lead_source"
              disabled={mode === "edit"}
              className="h-9 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Label (exibição)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Fonte do Lead"
              className="h-9"
            />
          </div>

          {showOptions && (
            <div className="space-y-1.5">
              <Label className="text-xs">Opções (uma por linha)</Label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                placeholder={"Opção 1\nOpção 2\nOpção 3"}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cf-required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="size-4 rounded border-border"
            />
            <Label htmlFor="cf-required" className="text-sm cursor-pointer">
              Campo obrigatório
            </Label>
          </div>

          {supportsInboxPanel && (
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/15 p-3">
              <p className="text-xs font-medium text-foreground">Painel lateral na Inbox</p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Marque os campos que o agente deve ver ao atender no chat.
                {entity === "contact" && <> Ex.: CPF, matrícula, adimplente.</>}
                {entity === "deal" && <> Ex.: origem do lead, segmento, plano.</>}
                {" "}Use tipo <strong>Sim/Não</strong> para situações de destaque.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cf-inbox-panel"
                  checked={showInInboxLeadPanel}
                  onChange={(e) => setShowInInboxLeadPanel(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <Label htmlFor="cf-inbox-panel" className="text-sm cursor-pointer">
                  Exibir no painel lateral (Inbox)
                </Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ordem no painel (opcional)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={inboxOrder}
                  onChange={(e) => setInboxOrder(e.target.value)}
                  placeholder="0 = primeiro; vazio = após os numerados"
                  className="h-9"
                />
              </div>
            </div>
          )}

          <Separator />

          <DialogFooter>
            <DialogClose>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                mutation.isPending || !name.trim() || !label.trim()
              }
            >
              {mutation.isPending
                ? "Salvando…"
                : mode === "create"
                  ? "Criar campo"
                  : "Salvar"}
            </Button>
          </DialogFooter>

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Erro"}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
