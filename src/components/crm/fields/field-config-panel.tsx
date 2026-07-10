"use client";

/**
 * FieldConfigPanel — Fase 1 (v3)
 *
 * Painel inline de configuração de campos personalizados.
 * Exibido via botão-gear no DealDetailPanel e no ContactAside.
 *
 * Funcionalidades:
 *  1. Seções separadas por entidade (Negócio | Contato) com pills de tab
 *  2. Criar / Editar / Excluir campos
 *  3. Reordenar arrastando pela alça (DnD) — persiste via inboxLeadPanelOrder
 *  4. Visibilidade de blocos do painel (useFieldLayout), salvo no escopo "admin"
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconX,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
  IconGripVertical,
  IconSparkles,
} from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFieldLayout, type FieldLayoutContext } from "@/hooks/use-field-layout";
import { type SectionConfig } from "@/lib/field-layout";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { Textarea } from "@/components/ui/textarea";
import {
  type HighlightRule,
  type HighlightOp,
  type HighlightSeverity,
  SEVERITY_COLORS,
  OP_LABELS,
  parseHighlightRules,
} from "@/lib/highlight";

/* ─────────── tipos ─────────── */

export type FieldConfigEntity = "deal" | "contact";

export type CustomFieldItem = {
  id: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  entity: string;
  showInInboxLeadPanel?: boolean | null;
  inboxLeadPanelOrder?: number | null;
  highlightRules?: unknown[] | null;
};

const ENTITY_LABEL: Record<FieldConfigEntity, string> = {
  deal: "Negócio",
  contact: "Contato",
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

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label]),
);

/* ─────────── helpers de API ─────────── */

async function fetchFields(entity: string): Promise<CustomFieldItem[]> {
  const res = await fetch(apiUrl(`/api/custom-fields?entity=${entity}`));
  if (!res.ok) throw new Error("Erro ao carregar campos");
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as CustomFieldItem[]) : [];
}

async function createField(data: {
  label: string;
  type: string;
  options: string[];
  required: boolean;
  entity: string;
}) {
  const res = await fetch(apiUrl("/api/custom-fields"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body?.message ?? "Erro ao criar campo");
  }
  return res.json();
}

async function updateField(
  id: string,
  data: {
    label?: string;
    type?: string;
    options?: string[];
    required?: boolean;
    showInInboxLeadPanel?: boolean;
    inboxLeadPanelOrder?: number | null;
    highlightRules?: HighlightRule[];
  },
) {
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

/** Ordena campos: visíveis primeiro (por order), ocultos ao final (por label). */
function sortedFields(fields: CustomFieldItem[]): CustomFieldItem[] {
  return [...fields].sort((a, b) => {
    const aVis = a.showInInboxLeadPanel === true;
    const bVis = b.showInInboxLeadPanel === true;
    if (aVis !== bVis) return aVis ? -1 : 1;
    const ao = a.inboxLeadPanelOrder ?? Infinity;
    const bo = b.inboxLeadPanelOrder ?? Infinity;
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label, "pt-BR");
  });
}

/* ─────────── componente principal ─────────── */

export interface FieldConfigPanelProps {
  /**
   * Entidades a configurar.
   * ["deal","contact"] → pills "Negócio" / "Contato".
   * ["contact"]        → direto para contato (sem pills).
   */
  entities: FieldConfigEntity[];
  context: FieldLayoutContext;
  onClose?: () => void;
}

export function FieldConfigPanel({ entities, context, onClose }: FieldConfigPanelProps) {
  const { sections, isAdmin, saveAdmin, saveAdminPending } = useFieldLayout(context);
  const [localSections, setLocalSections] = React.useState<SectionConfig[] | null>(null);
  const effectiveSections = localSections ?? sections;

  const [activeEntity, setActiveEntity] = React.useState<FieldConfigEntity>(entities[0]);

  const toggleSection = (id: string) => {
    setLocalSections(
      effectiveSections.map((s) =>
        s.id === id && !s.fixed ? { ...s, hidden: !s.hidden } : s,
      ),
    );
  };

  const saveSections = () => {
    if (!localSections) return;
    saveAdmin(localSections);
    toast.success("Layout salvo");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            Configurar campos
          </p>
          <p className="font-body text-[11px] text-[var(--text-muted)]">
            Visível apenas para admin / manager
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
          >
            <IconX size={15} />
          </button>
        )}
      </div>

      {/* Pills de entidade (só quando >1 entidade) */}
      {entities.length > 1 && (
        <div className="flex gap-1.5">
          {entities.map((ent) => (
            <button
              key={ent}
              type="button"
              onClick={() => setActiveEntity(ent)}
              className={cn(
                "rounded-full px-3 py-1 font-display text-[11.5px] font-semibold transition-colors",
                activeEntity === ent
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {ENTITY_LABEL[ent]}
            </button>
          ))}
        </div>
      )}

      {/* Lista de campos da entidade ativa */}
      <EntityFieldsSection entity={activeEntity} />

      {/* Blocos do painel (só admin) */}
      {isAdmin && effectiveSections.length > 0 && (
        <section>
          <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Blocos do painel
          </p>
          <div className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]">
            {effectiveSections.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  i < effectiveSections.length - 1 &&
                    "border-b border-[var(--glass-border-subtle)]",
                )}
              >
                <p
                  className={cn(
                    "flex-1 font-display text-[12px] font-semibold",
                    s.hidden
                      ? "text-[var(--text-muted)] line-through"
                      : "text-[var(--text-primary)]",
                  )}
                >
                  {s.label}
                </p>
                {s.fixed ? (
                  <span className="font-display text-[10px] text-[var(--text-muted)]">
                    Fixo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    aria-label={s.hidden ? "Mostrar bloco" : "Ocultar bloco"}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                      s.hidden
                        ? "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                        : "text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)]",
                    )}
                  >
                    {s.hidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  </button>
                )}
              </div>
            ))}
          </div>

          {localSections && (
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLocalSections(null)}
                className="rounded-full px-3 py-1.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveSections}
                disabled={saveAdminPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3 py-1.5 font-display text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saveAdminPending ? (
                  <IconLoader2 size={12} className="animate-spin" />
                ) : (
                  <IconCheck size={12} />
                )}
                Salvar layout
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ─────────── seção de campos por entidade com DnD ─────────── */

function EntityFieldsSection({ entity }: { entity: FieldConfigEntity }) {
  const qc = useQueryClient();
  const queryKey = ["field-config-fields", entity];

  /**
   * Invalida a lista de config E as queries que alimentam as asides
   * (inbox ContactAside + pipeline DealDetailPanel). Sem isso, alterar
   * visibilidade/ordem/formatação condicional de um campo não refletia
   * no deal detail (que lê de `contact-sidebar`): só o inbox atualizava,
   * por acaso, via refetch do `use-realtime`. Agora ambos atualizam na
   * hora. `deal-detail-v2` cobre os campos nativos do negócio.
   */
  const invalidatePanels = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["contact-sidebar"] });
    qc.invalidateQueries({ queryKey: ["deal-detail-v2"] });
  };

  const { data: rawFields = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchFields(entity),
  });

  // lista local para refletir drag imediatamente (otimistic)
  const [localOrder, setLocalOrder] = React.useState<CustomFieldItem[] | null>(null);
  const fields = localOrder ?? sortedFields(rawFields);

  // Sincroniza quando o servidor responde
  React.useEffect(() => {
    setLocalOrder(null);
  }, [rawFields]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<CustomFieldItem | null>(null);

  const openCreate = () => {
    setEditItem(null);
    setFormOpen(true);
  };
  const openEdit = (f: CustomFieldItem) => {
    setEditItem(f);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditItem(null);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: () => {
      invalidatePanels();
      toast.success("Campo excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (ordered: CustomFieldItem[]) => {
      // Só reordena campos que já estão visíveis (order !== null)
      const visible = ordered.filter((f) => f.inboxLeadPanelOrder !== null && f.inboxLeadPanelOrder !== undefined);
      await Promise.all(
        visible.map((f, idx) => updateField(f.id, { inboxLeadPanelOrder: idx })),
      );
    },
    onSuccess: () => invalidatePanels(),
    onError: (e: Error) => {
      toast.error(e.message);
      setLocalOrder(null);
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ id, visible, maxOrder }: { id: string; visible: boolean; maxOrder: number }) => {
      return updateField(id, {
        showInInboxLeadPanel: visible,
        inboxLeadPanelOrder: visible ? maxOrder : null,
      });
    },
    onSuccess: () => invalidatePanels(),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleVisibility = (f: CustomFieldItem) => {
    const isVisible = f.showInInboxLeadPanel === true;
    const maxOrder = fields.reduce((acc, cur) => {
      const o = cur.inboxLeadPanelOrder ?? -1;
      return o > acc ? o : acc;
    }, -1);
    visibilityMutation.mutate({ id: f.id, visible: !isVisible, maxOrder: maxOrder + 1 });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(src, 1);
    reordered.splice(dst, 0, moved);

    setLocalOrder(reordered);
    reorderMutation.mutate(reordered);
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Campos de {ENTITY_LABEL[entity as FieldConfigEntity]}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary)] px-2.5 py-1 font-display text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <IconPlus size={12} />
          Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <IconLoader2 size={20} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] p-3 text-[var(--color-danger)]">
          <IconAlertCircle size={15} />
          <span className="font-display text-[12px]">Erro ao carregar campos</span>
        </div>
      ) : fields.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] py-8 text-center">
          <p className="font-display text-[12px] text-[var(--text-muted)]">
            Nenhum campo criado ainda.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-2 inline-flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--brand-primary)] hover:underline"
          >
            <IconPlus size={13} /> Criar campo
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={`fields-${entity}`}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] transition-colors",
                  snapshot.isDraggingOver &&
                    "border-[var(--brand-primary)]/40 bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]",
                )}
              >
                {fields.map((f, i) => (
                  <Draggable key={f.id} draggableId={f.id} index={i}>
                    {(dragProvided, dragSnapshot) => {
                      const isVisible = f.showInInboxLeadPanel === true;
                      return (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            "group flex items-center gap-2 px-3 py-2.5 transition-shadow",
                            isVisible
                              ? "bg-[var(--glass-bg-overlay)]"
                              : "bg-[var(--glass-bg-subtle)]",
                            i < fields.length - 1 && !dragSnapshot.isDragging &&
                              "border-b border-[var(--glass-border-subtle)]",
                            dragSnapshot.isDragging &&
                              "rounded-[var(--radius-md)] shadow-[var(--glass-shadow)] ring-1 ring-[var(--brand-primary)]/30",
                          )}
                        >
                          {/* Alça de drag */}
                          <div
                            {...dragProvided.dragHandleProps}
                            className="flex h-6 w-4 shrink-0 cursor-grab items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing"
                            aria-label="Arrastar para reordenar"
                          >
                            <IconGripVertical size={14} />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "truncate font-display text-[12.5px] font-semibold",
                              isVisible ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                            )}>
                              {f.label}
                            </p>
                            <p className="font-display text-[10.5px] text-[var(--text-muted)]">
                              {TYPE_LABEL[f.type] ?? f.type}
                              {f.required && (
                                <span className="ml-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--color-danger)]">
                                  Obrigatório
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Toggle de visibilidade no painel */}
                          <button
                            type="button"
                            onClick={() => toggleVisibility(f)}
                            disabled={visibilityMutation.isPending}
                            aria-label={isVisible ? "Ocultar do painel" : "Exibir no painel"}
                            title={isVisible ? "Visível no painel" : "Oculto do painel"}
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors disabled:opacity-50",
                              isVisible
                                ? "text-[var(--brand-primary)] hover:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)]"
                                : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
                            )}
                          >
                            {isVisible ? <IconEye size={13} /> : <IconEyeOff size={13} />}
                          </button>

                          {/* Ações (Editar / Excluir) */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEdit(f)}
                              aria-label="Editar campo"
                              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                            >
                              <IconPencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(f.id)}
                              aria-label="Excluir campo"
                              disabled={deleteMutation.isPending}
                              className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] hover:text-[var(--color-danger)] disabled:opacity-50"
                            >
                              <IconTrash size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Mini-form inline */}
      {formOpen && (
        <FieldForm
          entity={entity}
          initial={editItem}
          onCancel={closeForm}
          onSaved={() => {
            invalidatePanels();
            closeForm();
            toast.success(editItem ? "Campo atualizado" : "Campo criado");
          }}
        />
      )}
    </section>
  );
}

/* ─────────── mini-form de campo ─────────── */

function FieldForm({
  entity,
  initial,
  onCancel,
  onSaved,
}: {
  entity: FieldConfigEntity;
  initial: CustomFieldItem | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [activeTab, setActiveTab] = React.useState<"campos" | "formatacao">("campos");
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [type, setType] = React.useState(initial?.type ?? "TEXT");
  const [required, setRequired] = React.useState(initial?.required ?? false);
  const [optionsText, setOptionsText] = React.useState(
    initial?.options.join("\n") ?? "",
  );
  const [highlightRules, setHighlightRules] = React.useState<HighlightRule[]>(
    () => parseHighlightRules(initial?.highlightRules ?? []),
  );

  const showOptions = type === "SELECT" || type === "MULTI_SELECT";

  const mutation = useMutation({
    mutationFn: async () => {
      const options = optionsText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      if (isEdit && initial) {
        return updateField(initial.id, { label, type, options, required, highlightRules });
      }
      return createField({ label, type, options, required, entity });
    },
    onSuccess: onSaved,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-2 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/30 bg-[color-mix(in_srgb,var(--brand-primary)_5%,transparent)] p-3">
      {/* Cabeçalho: título em cima, tabs abaixo (evita quebra de linha em painel estreito) */}
      <div className="mb-3 flex flex-col gap-2">
        <p className="font-display text-[12px] font-bold text-[var(--text-primary)]">
          {isEdit ? "Editar campo" : "Novo campo"}
        </p>
        {/* tabs Campos / Formatação (apenas edição) */}
        {isEdit && (
          <div className="flex gap-1">
            {(["campos", "formatacao"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[10.5px] font-semibold transition-colors",
                  activeTab === tab
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
                )}
              >
                {tab === "formatacao" && <IconSparkles size={10} />}
                {tab === "campos" ? "Campos" : "Formatação"}
                {tab === "formatacao" && highlightRules.length > 0 && (
                  <span className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--glass-bg-panel)] text-[8px] font-bold">
                    {highlightRules.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab: Campos ── */}
      {activeTab === "campos" && (
        <div className="flex flex-col gap-2.5">
          {/* Label */}
          <label className="flex flex-col gap-1">
            <span className="font-display text-[10.5px] font-semibold text-[var(--text-muted)]">
              Label (exibição)
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Tipo de Inscrição"
              className="h-8 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2.5 font-display text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
            />
          </label>

          {/* Tipo — só na criação */}
          {!isEdit && (
            <div className="flex flex-col gap-1">
              <span className="font-display text-[10.5px] font-semibold text-[var(--text-muted)]">
                Tipo
              </span>
              <DropdownGlass
                options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={type}
                onValueChange={setType}
                matchTriggerWidth
                triggerClassName="h-8 w-full justify-start rounded-[var(--radius-sm)] px-2.5 text-[12px]"
                itemClassName="text-[11.5px] py-1.5"
              />
            </div>
          )}

          {/* Opções */}
          {showOptions && (
            <label className="flex flex-col gap-1">
              <span className="font-display text-[10.5px] font-semibold text-[var(--text-muted)]">
                Opções (uma por linha)
              </span>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={3}
                placeholder={"Opção 1\nOpção 2"}
                className="resize-none text-[12px]"
              />
            </label>
          )}

          {/* Obrigatório */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[var(--glass-border)] accent-[var(--brand-primary)]"
            />
            <span className="font-display text-[12px] font-semibold text-[var(--text-secondary)]">
              Campo obrigatório
            </span>
          </label>
        </div>
      )}

      {/* ── Tab: Formatação condicional ── */}
      {activeTab === "formatacao" && (
        <HighlightRuleEditor
          rules={highlightRules}
          onChange={setHighlightRules}
        />
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 font-display text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !label.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3 py-1.5 font-display text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <IconLoader2 size={12} className="animate-spin" />
          ) : (
            <IconCheck size={12} />
          )}
          {isEdit ? "Salvar" : "Criar"}
        </button>
      </div>
    </div>
  );
}

/* ─────────── editor de regras de destaque ─────────── */

const SEVERITY_OPTIONS: { value: HighlightSeverity; icon: string }[] = [
  { value: "danger", icon: "🔴" },
  { value: "warning", icon: "🟡" },
  { value: "success", icon: "🟢" },
  { value: "info", icon: "🔵" },
];

const OP_OPTIONS: HighlightOp[] = [
  "equals",
  "notEquals",
  "contains",
  "notEmpty",
  "empty",
];

function HighlightRuleEditor({
  rules,
  onChange,
}: {
  rules: HighlightRule[];
  onChange: (rules: HighlightRule[]) => void;
}) {
  const addRule = () => {
    onChange([
      ...rules,
      { op: "equals", value: "", severity: "danger" },
    ]);
  };

  const updateRule = (idx: number, patch: Partial<HighlightRule>) => {
    onChange(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRule = (idx: number) => {
    onChange(rules.filter((_, i) => i !== idx));
  };

  const needsValue = (op: HighlightOp) => op !== "empty" && op !== "notEmpty";

  return (
    <div className="flex flex-col gap-2">
      {/* Dica */}
      <p className="font-display text-[11px] text-[var(--text-muted)]">
        Quando uma condição for verdadeira, o valor será exibido como um badge colorido.
        A primeira regra que casar prevalece.
      </p>

      {rules.length === 0 && (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--glass-border)] py-5 text-center">
          <p className="font-display text-[11.5px] text-[var(--text-muted)]">
            Nenhuma regra configurada
          </p>
          <button
            type="button"
            onClick={addRule}
            className="mt-1.5 inline-flex items-center gap-1 font-display text-[11.5px] font-semibold text-[var(--brand-primary)] hover:underline"
          >
            <IconPlus size={12} /> Adicionar primeira regra
          </button>
        </div>
      )}

      {rules.map((rule, idx) => {
        const colors = SEVERITY_COLORS[rule.severity];
        return (
          <div
            key={idx}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-2.5"
          >
            {/* Linha 1: operador + valor */}
            <div className="flex min-w-0 items-center gap-1.5">
              {/* wrapper necessário para flex-1 propagar ao trigger Radix */}
              <div className="min-w-0 flex-1">
                <DropdownGlass
                  options={OP_OPTIONS.map((op) => ({ value: op, label: OP_LABELS[op] }))}
                  value={rule.op}
                  onValueChange={(v) => updateRule(idx, { op: v as HighlightOp, value: "" })}
                  matchTriggerWidth
                  triggerClassName="h-7 w-full rounded-[var(--radius-sm)] px-2 text-[11px]"
                  itemClassName="text-[11px] py-1"
                />
              </div>

              {needsValue(rule.op) && (
                <input
                  type="text"
                  value={rule.value ?? ""}
                  onChange={(e) => updateRule(idx, { value: e.target.value })}
                  placeholder="valor..."
                  className="h-7 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2 font-display text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
                />
              )}

              <button
                type="button"
                onClick={() => removeRule(idx)}
                aria-label="Remover regra"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] hover:text-[var(--color-danger)]"
              >
                <IconTrash size={13} />
              </button>
            </div>

            {/* Linha 2: cor de destaque */}
            <div className="flex items-start gap-2">
              <span className="mt-1 shrink-0 font-display text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Cor
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SEVERITY_OPTIONS.map((s) => {
                  const c = SEVERITY_COLORS[s.value];
                  const active = rule.severity === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateRule(idx, { severity: s.value })}
                      title={c.label}
                      aria-label={c.label}
                      style={
                        active
                          ? { backgroundColor: c.bg, color: c.text, borderColor: c.border }
                          : undefined
                      }
                      className={cn(
                        "flex h-6 items-center gap-1 rounded-full border px-2 font-display text-[10px] font-semibold transition-all",
                        active
                          ? "border-current"
                          : "border-[var(--glass-border)] text-[var(--text-muted)] hover:border-current hover:text-[var(--text-primary)]",
                      )}
                    >
                      {s.icon} {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linha 3: label personalizado do badge (opcional) */}
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-display text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Badge
              </span>
              <input
                type="text"
                value={rule.label ?? ""}
                onChange={(e) =>
                  updateRule(idx, { label: e.target.value || undefined })
                }
                placeholder="Padrão: usa o valor do campo"
                className="h-6 flex-1 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2 font-display text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
              />
            </div>

            {/* Preview */}
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Preview
              </span>
              <span
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                }}
                className="inline-flex items-center rounded-full px-2 py-0.5 font-display text-[10.5px] font-bold"
              >
                {rule.label?.trim() || (rule.value?.trim() || "valor do campo")}
              </span>
            </div>
          </div>
        );
      })}

      {rules.length > 0 && (
        <button
          type="button"
          onClick={addRule}
          className="mt-0.5 inline-flex items-center gap-1 self-start font-display text-[11.5px] font-semibold text-[var(--brand-primary)] hover:underline"
        >
          <IconPlus size={12} /> Adicionar regra
        </button>
      )}
    </div>
  );
}
