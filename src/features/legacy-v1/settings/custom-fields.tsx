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
  IconAlertCircle,
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
} from "@/components/ui/dialog";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  { value: "TEXT",         label: "Texto" },
  { value: "NUMBER",       label: "Número" },
  { value: "DATE",         label: "Data" },
  { value: "SELECT",       label: "Seleção" },
  { value: "MULTI_SELECT", label: "Multi-seleção" },
  { value: "BOOLEAN",      label: "Sim/Não" },
  { value: "URL",          label: "URL" },
  { value: "EMAIL",        label: "E-mail" },
  { value: "PHONE",        label: "Telefone" },
] as const;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT:         <IconLetterT size={13} strokeWidth={2.5} />,
  NUMBER:       <IconHash size={13} strokeWidth={2.5} />,
  DATE:         <IconCalendar size={13} strokeWidth={2.2} />,
  SELECT:       <IconList size={13} strokeWidth={2.2} />,
  MULTI_SELECT: <IconList size={13} strokeWidth={2.2} />,
  BOOLEAN:      <IconToggleLeft size={13} strokeWidth={2.2} />,
  URL:          <IconLink size={13} strokeWidth={2.2} />,
  EMAIL:        <IconMail size={13} strokeWidth={2.2} />,
  PHONE:        <IconPhone size={13} strokeWidth={2.2} />,
};

type EntityTab = "deal" | "contact";

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchFields(entity: string): Promise<CustomFieldItem[]> {
  const res = await fetch(apiUrl(`/api/custom-fields?entity=${entity}`));
  const data = res.ok ? await res.json() : [];
  return Array.isArray(data) ? data : [];
}
async function createField(data: Record<string, unknown>) {
  const res = await fetch(apiUrl("/api/custom-fields"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string })?.message ?? "Erro ao criar campo");
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

// ─── DS v2 helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
      {hint && <span className="ml-1 normal-case font-normal text-[var(--text-muted)]/70">{hint}</span>}
    </label>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  React.useEffect(() => { setLocalOrder(fields.map((f) => f.id)); }, [fields]);

  const orderedFields = React.useMemo(() => {
    const map = Object.fromEntries(fields.map((f) => [f.id, f]));
    return localOrder.map((id) => map[id]).filter(Boolean);
  }, [fields, localOrder]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? orderedFields.filter((f) => f.label.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)) : orderedFields;
  }, [orderedFields, search]);

  const inboxCount = fields.filter((f) => f.showInInboxLeadPanel).length;

  const deleteMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, inboxLeadPanelOrder }: { id: string; inboxLeadPanelOrder: number }) =>
      updateField(id, { inboxLeadPanelOrder }),
  });

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const next = Array.from(localOrder);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setLocalOrder(next);
    next.forEach((id, idx) => reorderMutation.mutate({ id, inboxLeadPanelOrder: idx }));
  }

  return (
    <div className="w-full space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Entity pill tabs */}
        <div className="flex items-center rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1">
          {(["deal", "contact"] as const).map((entity, i) => (
            <button
              key={entity}
              type="button"
              onClick={() => { setActiveEntity(entity); setSearch(""); }}
              className={cn(
                "rounded-[var(--radius-md)] px-4 py-1.5 font-display text-[13px] font-semibold transition-all",
                activeEntity === entity
                  ? "bg-[var(--glass-bg-panel)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {i === 0 ? "Negócio" : "Contato"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <IconSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar campo..."
            className="h-9 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] pl-8 pr-3 font-body text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--brand-primary)]"
          />
        </div>

        <div className="flex-1" />

        <ButtonGlass variant="primary" onClick={() => setCreateOpen(true)} className="gap-1.5 rounded-[var(--radius-lg)]">
          <IconPlus size={15} />
          Novo campo
        </ButtonGlass>
      </div>

      {/* ── Counter ── */}
      {!isLoading && (
        <div className="flex items-center gap-2">
          <span className="font-body text-[12.5px] text-[var(--text-muted)]">
            {fields.length} campo{fields.length !== 1 ? "s" : ""}
          </span>
          {inboxCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-display text-[11px] font-semibold text-emerald-700">
              <IconEye size={11} />
              {inboxCount} no painel da Inbox
            </span>
          )}
        </div>
      )}

      {/* ── List ── */}
      {isLoading ? (
        <div className="flex flex-col gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-[var(--radius-xl)] bg-[var(--glass-bg-strong)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
            <IconLayoutList size={22} className="text-[var(--text-muted)] opacity-50" />
          </div>
          <div>
            <p className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
              {fields.length === 0 ? "Nenhum campo personalizado criado" : "Nenhum campo encontrado"}
            </p>
            <p className="mt-1 font-body text-[12.5px] text-[var(--text-muted)]">
              {fields.length === 0 ? "Crie campos para enriquecer seus registros." : "Tente um termo diferente."}
            </p>
          </div>
          {fields.length === 0 && (
            <ButtonGlass variant="primary" size="sm" onClick={() => setCreateOpen(true)} className="mt-1 gap-1.5">
              <IconPlus size={13} /> Criar campo
            </ButtonGlass>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="custom-fields-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-1.5">
                {filtered.map((field, index) => (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(drag, snapshot) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={cn(
                          "group flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-4 py-3 transition-all",
                          snapshot.isDragging && "opacity-90 shadow-lg",
                        )}
                      >
                        {/* Drag handle */}
                        <div
                          {...drag.dragHandleProps}
                          className="cursor-grab text-[var(--text-muted)]/30 transition-colors hover:text-[var(--text-muted)] active:cursor-grabbing"
                        >
                          <IconGripVertical size={15} />
                        </div>

                        {/* Type icon badge */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                          {TYPE_ICONS[field.type] ?? <IconLetterT size={13} strokeWidth={2.5} />}
                        </div>

                        {/* Name + meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                              {field.label}
                            </span>
                            {field.required && (
                              <span className="shrink-0 rounded-[4px] bg-red-50 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-red-500">
                                Obrigatório
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-body text-[11.5px] text-[var(--text-muted)]">
                            {field.name}
                            {" · "}
                            {TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                          </p>
                        </div>

                        {/* Inbox badge */}
                        {(field.entity === "contact" || field.entity === "deal") && (
                          <div className={cn(
                            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-display text-[11px] font-semibold transition-colors",
                            field.showInInboxLeadPanel
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
                          )}>
                            {field.showInInboxLeadPanel ? <IconEye size={11} /> : <IconEyeOff size={11} />}
                            Inbox
                          </div>
                        )}

                        {/* Actions (hover) */}
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setEditItem(field)}
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                          >
                            <IconPencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: "Excluir campo",
                                description: `Excluir o campo "${field.label}"? Todos os valores serão perdidos.`,
                                confirmLabel: "Excluir",
                                variant: "destructive",
                              });
                              if (ok) deleteMutation.mutate(field.id);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <IconTrash size={13} />
                          </button>
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

      {/* ── Modals ── */}
      <FieldFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        defaultEntity={activeEntity}
        onSaved={() => { queryClient.invalidateQueries({ queryKey }); setCreateOpen(false); }}
      />
      {editItem && (
        <FieldFormDialog
          open={!!editItem}
          onOpenChange={(o) => { if (!o) setEditItem(null); }}
          mode="edit"
          initial={editItem}
          onSaved={() => { queryClient.invalidateQueries({ queryKey }); setEditItem(null); }}
        />
      )}
    </div>
  );
}

// ─── Field form dialog ────────────────────────────────────────────────────────

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
  const [entity, setEntity] = React.useState(initial?.entity ?? defaultEntity);
  const [required, setRequired] = React.useState(initial?.required ?? false);
  const [optionsText, setOptionsText] = React.useState(initial?.options.join("\n") ?? "");
  const [showInInboxLeadPanel, setShowInInboxLeadPanel] = React.useState(initial?.showInInboxLeadPanel ?? false);

  React.useEffect(() => {
    if (open && initial) {
      setName(initial.name); setLabel(initial.label); setType(initial.type);
      setEntity(initial.entity); setRequired(initial.required);
      setOptionsText(initial.options.join("\n"));
      setShowInInboxLeadPanel(initial.showInInboxLeadPanel ?? false);
    } else if (open && !initial) {
      setName(""); setLabel(""); setType("TEXT");
      setEntity(defaultEntity); setRequired(false);
      setOptionsText(""); setShowInInboxLeadPanel(false);
    }
  }, [open, initial, defaultEntity]);

  const supportsInboxPanel = entity === "contact" || entity === "deal";
  React.useEffect(() => {
    if (open && mode === "create" && !supportsInboxPanel) setShowInInboxLeadPanel(false);
  }, [supportsInboxPanel, open, mode]);

  const mutation = useMutation({
    mutationFn: async () => {
      const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
      if (mode === "create") {
        return createField({ name, label, type, options, required, entity, ...(supportsInboxPanel ? { showInInboxLeadPanel } : {}) });
      } else if (initial) {
        const editSupports = initial.entity === "contact" || initial.entity === "deal";
        return updateField(initial.id, { label, type, options, required, ...(editSupports ? { showInInboxLeadPanel } : {}) });
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
      <DialogContent size="md" bodyClassName="p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            {TYPE_ICONS[type] ?? <IconLetterT size={16} strokeWidth={2.5} />}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              {mode === "create" ? "Novo campo" : "Editar campo"}
            </h2>
            <p className="font-body text-[12px] text-[var(--text-muted)]">
              {mode === "create" ? "Defina o nome, tipo e entidade." : `Editando "${initial?.label}"`}
            </p>
          </div>
          <DialogClose />
        </div>

        {/* Body */}
        <form
          id="field-form"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        >
          <div className="flex flex-col gap-5 px-6 py-5">
            {/* Entidade + Tipo */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Entidade</FieldLabel>
                <DropdownGlass
                  options={entityOptions}
                  value={entity}
                  onValueChange={(v) => setEntity(v)}
                  disabled={mode === "edit"}
                  triggerClassName="w-full"
                />
                {mode === "edit" && (
                  <p className="font-body text-[11px] text-[var(--text-muted)]">Não pode ser alterada</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Tipo</FieldLabel>
                <DropdownGlass
                  options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  value={type}
                  onValueChange={(v) => setType(v)}
                  triggerClassName="w-full"
                />
              </div>
            </div>

            {/* Slug */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel hint="— deixe vazio para gerar automaticamente">
                Identificador (slug)
              </FieldLabel>
              <InputGlass
                value={name}
                onChange={(e) => {
                  const cleaned = e.target.value.toLowerCase().normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_")
                    .replace(/^_+|_+$/g, "").replace(/_+/g, "_");
                  setName(cleaned);
                }}
                placeholder="ex: fonte_do_lead"
                disabled={mode === "edit"}
                className="font-mono"
              />
            </div>

            {/* Label */}
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Nome (exibição)</FieldLabel>
              <InputGlass
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ex: Fonte do Lead"
                autoFocus={mode === "create"}
              />
            </div>

            {/* Options */}
            {showOptions && (
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Opções (uma por linha)</FieldLabel>
                <textarea
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  rows={4}
                  placeholder={"Opção 1\nOpção 2\nOpção 3"}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5 font-body text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--brand-primary)]"
                />
              </div>
            )}

            {/* Required toggle */}
            <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-3">
              <div>
                <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">Campo obrigatório</p>
                <p className="mt-0.5 font-body text-[11.5px] text-[var(--text-muted)]">Impede salvar o registro sem preencher este campo.</p>
              </div>
              <SwitchGlass checked={required} onChange={setRequired} aria-label="Campo obrigatório" size="sm" />
            </div>

            {/* Inbox panel */}
            {supportsInboxPanel && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4">
                <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">Painel lateral — Inbox</p>
                <p className="mt-1 font-body text-[11.5px] leading-snug text-[var(--text-muted)]">
                  Marque os campos que o agente deve ver ao atender no chat. A ordem é definida arrastando os campos na lista.
                </p>
                <label className="mt-3 flex cursor-pointer items-center gap-2.5">
                  <CheckboxGlass
                    checked={showInInboxLeadPanel}
                    onChange={setShowInInboxLeadPanel}
                    aria-label="Exibir no painel lateral"
                  />
                  <span className="font-body text-[13px] text-[var(--text-primary)]">Exibir no painel lateral</span>
                </label>
              </div>
            )}

            {/* Error */}
            {mutation.isError && (
              <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-100 bg-red-50 px-3 py-2.5">
                <IconAlertCircle size={14} className="shrink-0 text-red-500" />
                <p className="font-body text-[12.5px] text-red-600">
                  {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar"}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--glass-border-subtle)] px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
            >
              Cancelar
            </button>
            <ButtonGlass type="submit" variant="primary" disabled={mutation.isPending || !label.trim()}>
              {mutation.isPending ? "Salvando…" : mode === "create" ? "Criar campo" : "Salvar"}
            </ButtonGlass>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
