"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCalendar,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconHash,
  IconLayoutList,
  IconLink,
  IconList,
  IconMail,
  IconPhone,
  IconPlus,
  IconSearch,
  IconToggleLeft,
  IconTrash,
  IconPencil,
  IconLetterT,
} from "@tabler/icons-react";
import * as React from "react";

import { useConfirm } from "@/hooks/use-confirm";
import { ButtonGlass } from "@/components/crm/button-glass";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
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
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT: <IconLetterT size={14} strokeWidth={2.5} />,
  NUMBER: <IconHash size={14} strokeWidth={2.5} />,
  DATE: <IconCalendar size={14} strokeWidth={2.2} />,
  SELECT: <IconList size={14} strokeWidth={2.2} />,
  MULTI_SELECT: <IconList size={14} strokeWidth={2.2} />,
  BOOLEAN: <IconToggleLeft size={14} strokeWidth={2.2} />,
  URL: <IconLink size={14} strokeWidth={2.2} />,
  EMAIL: <IconMail size={14} strokeWidth={2.2} />,
  PHONE: <IconPhone size={14} strokeWidth={2.2} />,
};

async function fetchFields(entity: string): Promise<CustomFieldItem[]> {
  const res = await fetch(apiUrl(`/api/custom-fields?entity=${entity}`));
  const data = res.ok ? await res.json() : [];
  return Array.isArray(data) ? data : [];
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

type EntityTab = "deal" | "contact";

export default function CustomFieldsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [activeEntity, setActiveEntity] = React.useState<EntityTab>("deal");
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<CustomFieldItem | null>(null);

  const queryKey = ["custom-fields", activeEntity];

  const { data: fields = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchFields(activeEntity),
  });

  const [localOrder, setLocalOrder] = React.useState<string[]>([]);

  React.useEffect(() => {
    setLocalOrder(fields.map((f) => f.id));
  }, [fields]);

  const orderedFields = React.useMemo(() => {
    const map = Object.fromEntries(fields.map((f) => [f.id, f]));
    return localOrder.map((id) => map[id]).filter(Boolean);
  }, [fields, localOrder]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return orderedFields;
    const q = search.toLowerCase();
    return orderedFields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
    );
  }, [orderedFields, search]);

  const inboxCount = fields.filter((f) => f.showInInboxLeadPanel).length;

  const deleteMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      id,
      inboxLeadPanelOrder,
    }: {
      id: string;
      inboxLeadPanelOrder: number;
    }) => updateField(id, { inboxLeadPanelOrder }),
  });

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const next = Array.from(localOrder);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setLocalOrder(next);
    // Persist new order as inboxLeadPanelOrder
    next.forEach((id, idx) => {
      reorderMutation.mutate({ id, inboxLeadPanelOrder: idx });
    });
  }

  const TABS: { value: EntityTab; label: string }[] = [
    { value: "deal", label: "Negócio" },
    { value: "contact", label: "Contato" },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Entity tabs */}
        <div className="flex items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveEntity(tab.value);
                setSearch("");
              }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                activeEntity === tab.value
                  ? "bg-white text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <IconSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <InputGlass
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar campo..."
            className="pl-8 text-sm"
          />
        </div>

        <div className="flex-1" />

        <ButtonGlass variant="primary" onClick={() => setCreateOpen(true)}>
          <IconPlus size={16} />
          Novo campo
        </ButtonGlass>
      </div>

      {/* Counter row */}
      {!isLoading && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-muted)]">
            {fields.length} campo{fields.length !== 1 ? "s" : ""}
          </span>
          {inboxCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <IconEye size={11} />
              {inboxCount} no painel da Inbox
            </span>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] px-6 py-16 text-center">
          <IconLayoutList
            size={40}
            className="mb-3 text-[var(--text-muted)]/30"
          />
          <p className="text-sm text-[var(--text-muted)]">
            {fields.length === 0
              ? "Nenhum campo personalizado criado ainda."
              : "Nenhum campo encontrado."}
          </p>
          {fields.length === 0 && (
            <ButtonGlass
              variant="glass"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <IconPlus size={14} /> Criar campo
            </ButtonGlass>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="custom-fields-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-1.5"
              >
                {filtered.map((field, index) => (
                  <Draggable
                    key={field.id}
                    draggableId={field.id}
                    index={index}
                  >
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-white px-4 py-3 transition-shadow",
                          snapshot.isDragging && "shadow-lg opacity-90"
                        )}
                      >
                        {/* Drag handle */}
                        <div
                          {...drag.dragHandleProps}
                          className="cursor-grab text-[var(--text-muted)]/40 transition-colors hover:text-[var(--text-muted)] active:cursor-grabbing"
                        >
                          <IconGripVertical size={16} />
                        </div>

                        {/* Type icon */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                          {TYPE_ICONS[field.type] ?? (
                            <IconLetterT size={14} strokeWidth={2.5} />
                          )}
                        </div>

                        {/* Name + slug */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                            {field.name}
                            {" · "}
                            {TYPES.find((t) => t.value === field.type)?.label ??
                              field.type}
                          </p>
                        </div>

                        {/* Inbox badge */}
                        {(field.entity === "contact" ||
                          field.entity === "deal") && (
                          <div
                            className={cn(
                              "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
                              field.showInInboxLeadPanel
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-[var(--glass-bg)] text-[var(--text-muted)]"
                            )}
                          >
                            {field.showInInboxLeadPanel ? (
                              <IconEye size={12} />
                            ) : (
                              <IconEyeOff size={12} />
                            )}
                            Inbox
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <ButtonGlass
                            variant="icon"
                            size="icon"
                            className="size-7"
                            onClick={() => setEditItem(field)}
                          >
                            <IconPencil size={13} />
                          </ButtonGlass>
                          <ButtonGlass
                            variant="icon"
                            size="icon"
                            className="size-7 text-[var(--color-destructive)] hover:bg-red-50 hover:text-[var(--color-destructive)]"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Excluir campo",
                                description: `Excluir o campo "${field.label}"? Todos os valores serão perdidos.`,
                                confirmLabel: "Excluir",
                                variant: "destructive",
                              });
                              if (ok) deleteMutation.mutate(field.id);
                            }}
                          >
                            <IconTrash size={13} />
                          </ButtonGlass>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <FieldFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        defaultEntity={activeEntity}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey });
          setCreateOpen(false);
        }}
      />

      {editItem && (
        <FieldFormDialog
          open={!!editItem}
          onOpenChange={(o) => {
            if (!o) setEditItem(null);
          }}
          mode="edit"
          initial={editItem}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey });
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}

function FieldFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  defaultEntity = "deal",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "create" | "edit";
  initial?: CustomFieldItem;
  defaultEntity?: string;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [type, setType] = React.useState(initial?.type ?? "TEXT");
  const [entity, setEntity] = React.useState(
    initial?.entity ?? defaultEntity
  );
  const [required, setRequired] = React.useState(
    initial?.required ?? false
  );
  const [optionsText, setOptionsText] = React.useState(
    initial?.options.join("\n") ?? ""
  );
  const [showInInboxLeadPanel, setShowInInboxLeadPanel] = React.useState(
    initial?.showInInboxLeadPanel ?? false
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
    } else if (open && !initial) {
      setName("");
      setLabel("");
      setType("TEXT");
      setEntity(defaultEntity);
      setRequired(false);
      setOptionsText("");
      setShowInInboxLeadPanel(false);
    }
  }, [open, initial, defaultEntity]);

  const supportsInboxPanel = entity === "contact" || entity === "deal";

  React.useEffect(() => {
    if (open && mode === "create" && !supportsInboxPanel) {
      setShowInInboxLeadPanel(false);
    }
  }, [supportsInboxPanel, open, mode]);

  const mutation = useMutation({
    mutationFn: async () => {
      const options = optionsText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);

      if (mode === "create") {
        return createField({
          name,
          label,
          type,
          options,
          required,
          entity,
          ...(supportsInboxPanel ? { showInInboxLeadPanel } : {}),
        });
      } else if (initial) {
        const editSupports =
          initial.entity === "contact" || initial.entity === "deal";
        return updateField(initial.id, {
          label,
          type,
          options,
          required,
          ...(editSupports ? { showInInboxLeadPanel } : {}),
        });
      }
    },
    onSuccess: () => onSaved(),
  });

  const showOptions = type === "SELECT" || type === "MULTI_SELECT";

  const entityOptions = [
    { value: "contact", label: "Contato" },
    { value: "deal", label: "Negócio" },
    { value: "product", label: "Produto/Serviço" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo campo" : "Editar campo"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Defina o nome, tipo e entidade para o novo campo."
              : `Editando o campo "${initial?.label}".`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          {/* Entidade + Tipo */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Entidade</Label>
              <DropdownGlass
                options={entityOptions}
                value={entity}
                onValueChange={(v) => setEntity(v)}
                disabled={mode === "edit"}
                triggerClassName="w-full"
              />
              {mode === "edit" && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  Não pode ser alterada
                </p>
              )}
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

          {/* Slug */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Identificador (slug){" "}
              <span className="text-[var(--text-muted)]">— opcional</span>
            </Label>
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
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs">Label (exibição)</Label>
            <InputGlass
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Fonte do Lead"
              autoFocus={mode === "create"}
            />
          </div>

          {/* Options (only for select types) */}
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

          {/* Required toggle */}
          <div className="flex items-start justify-between rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Campo obrigatório
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Impede salvar o registro sem preencher este campo.
              </p>
            </div>
            <SwitchGlass
              checked={required}
              onChange={setRequired}
              aria-label="Campo obrigatório"
              size="sm"
            />
          </div>

          {/* Inbox panel */}
          {supportsInboxPanel && (
            <div className="space-y-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Painel lateral na Inbox
              </p>
              <p className="text-[11px] leading-snug text-[var(--text-muted)]">
                Marque os campos que o agente deve ver ao atender no chat (ex.:
                origem do lead, segmento, plano). A ordem de exibição é definida
                arrastando os campos na lista.
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <CheckboxGlass
                  checked={showInInboxLeadPanel}
                  onChange={setShowInInboxLeadPanel}
                  aria-label="Exibir no painel lateral (Inbox)"
                />
                <span className="text-sm">Exibir no painel lateral (Inbox)</span>
              </label>
            </div>
          )}

          <Separator />

          <DialogFooter>
            <ButtonGlass
              type="button"
              variant="glass"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </ButtonGlass>
            <ButtonGlass
              type="submit"
              variant="primary"
              disabled={mutation.isPending || !label.trim()}
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
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Erro ao salvar"}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
