"use client";

import { apiUrl } from "@/lib/api";
import {
  IconGripVertical,
  IconLink,
  IconMenu2,
  IconPlus,
  IconSettings,
  IconThumbDown,
  IconTrash,
  IconUnlink,
} from "@tabler/icons-react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { ButtonGlass } from "@/components/crm/button-glass";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

type LossReason = {
  id: string;
  label: string;
  position: number;
  isActive: boolean;
  pipelineIds: string[];
};

type PipelineRow = {
  id: string;
  name: string;
  isDefault: boolean;
  lossReasonRequired?: boolean;
};

type PipelineLossMeta = {
  id: string;
  name: string;
  lossReasonRequired: boolean;
  reasons: { id: string; label: string; position: number; linkId: string }[];
};

/** `catalog` = catálogo global; string = id do funil. */
type Scope = "catalog" | string;

async function fetchReasons(): Promise<LossReason[]> {
  const res = await fetch(apiUrl("/api/settings/loss-reasons"));
  if (!res.ok) throw new Error("Erro ao carregar motivos");
  return res.json();
}

async function fetchPipelines(): Promise<PipelineRow[]> {
  const res = await fetch(apiUrl("/api/pipelines"));
  if (!res.ok) throw new Error("Erro ao carregar funis");
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? (data as PipelineRow[]) : [];
}

async function fetchPipelineMeta(pipelineId: string): Promise<PipelineLossMeta> {
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/loss-reasons`));
  if (!res.ok) throw new Error("Erro ao carregar motivos do funil");
  return res.json();
}

async function fetchAllowOther(): Promise<boolean> {
  const res = await fetch(
    apiUrl("/api/settings/org?key=deals.loss_reason_allow_other"),
  );
  if (!res.ok) return true;
  const data = (await res.json()) as { value?: string | null };
  return data.value !== "false";
}

export default function LossReasonsV2ClientPage() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<Scope | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const reasonsQuery = useQuery({
    queryKey: ["loss-reasons"],
    queryFn: fetchReasons,
  });
  const pipelinesQuery = useQuery({
    queryKey: ["pipelines"],
    queryFn: fetchPipelines,
  });
  const allowOtherQuery = useQuery({
    queryKey: ["org-setting", "deals.loss_reason_allow_other"],
    queryFn: fetchAllowOther,
  });

  const pipelines = pipelinesQuery.data ?? [];
  const reasons = reasonsQuery.data ?? [];

  // Default: funil padrão (ou o primeiro) — obrigatoriedade e vínculos
  // ficam visíveis sem precisar do mini-dash.
  useEffect(() => {
    if (scope != null) return;
    if (!pipelines.length) return;
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    setScope(def.id);
  }, [pipelines, scope]);

  const pipelineId = scope && scope !== "catalog" ? scope : null;
  const pipelineMetaQuery = useQuery({
    queryKey: ["pipeline-loss-reasons", pipelineId],
    queryFn: () => fetchPipelineMeta(pipelineId!),
    enabled: !!pipelineId,
  });
  const pipelineMeta = pipelineMetaQuery.data;

  const createMut = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch(apiUrl("/api/settings/loss-reasons"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      return res.json() as Promise<LossReason>;
    },
    onSuccess: async (created) => {
      setNewLabel("");
      setAddOpen(false);
      await qc.invalidateQueries({ queryKey: ["loss-reasons"] });
      if (pipelineId) {
        const current = pipelineMeta?.reasons.map((r) => r.id) ?? [];
        await fetch(apiUrl(`/api/pipelines/${pipelineId}/loss-reasons`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reasonIds: [...current, created.id] }),
        });
        await qc.invalidateQueries({
          queryKey: ["pipeline-loss-reasons", pipelineId],
        });
      }
      toast.success(
        pipelineId
          ? "Motivo criado e vinculado a este funil"
          : "Motivo adicionado ao catálogo",
      );
    },
    onError: () => toast.error("Não foi possível criar o motivo"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/settings/loss-reasons/${id}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao remover");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loss-reasons"] });
      await qc.invalidateQueries({ queryKey: ["pipeline-loss-reasons"] });
      toast.success("Motivo removido");
    },
  });

  const renameMut = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const res = await fetch(apiUrl(`/api/settings/loss-reasons/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error("Erro ao renomear");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["loss-reasons"] });
      await qc.invalidateQueries({ queryKey: ["pipeline-loss-reasons"] });
    },
  });

  const reorderCatalogMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(apiUrl("/api/settings/loss-reasons"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Erro ao reordenar");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loss-reasons"] }),
  });

  const savePipelineMut = useMutation({
    mutationFn: async (payload: {
      reasonIds?: string[];
      lossReasonRequired?: boolean;
    }) => {
      if (!pipelineId) throw new Error("Sem funil");
      const res = await fetch(
        apiUrl(`/api/pipelines/${pipelineId}/loss-reasons`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message || "Erro ao salvar funil");
      }
      return res.json() as Promise<PipelineLossMeta>;
    },
    onMutate: async (payload) => {
      if (!pipelineId || typeof payload.lossReasonRequired !== "boolean")
        return;
      await qc.cancelQueries({
        queryKey: ["pipeline-loss-reasons", pipelineId],
      });
      const prev = qc.getQueryData<PipelineLossMeta>([
        "pipeline-loss-reasons",
        pipelineId,
      ]);
      if (prev) {
        qc.setQueryData<PipelineLossMeta>(
          ["pipeline-loss-reasons", pipelineId],
          { ...prev, lossReasonRequired: payload.lossReasonRequired },
        );
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (pipelineId && ctx?.prev) {
        qc.setQueryData(["pipeline-loss-reasons", pipelineId], ctx.prev);
      }
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    },
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({
        queryKey: ["pipeline-loss-reasons", pipelineId],
      });
      await qc.invalidateQueries({ queryKey: ["loss-reasons"] });
      await qc.invalidateQueries({ queryKey: ["pipelines"] });
      if (typeof vars.lossReasonRequired === "boolean") {
        toast.success(
          vars.lossReasonRequired
            ? "Motivo de perda obrigatório neste funil"
            : "Motivo de perda opcional neste funil",
        );
      } else if (vars.reasonIds) {
        toast.success("Vínculos do funil atualizados");
      }
    },
  });

  const toggleAllowOther = useMutation({
    mutationFn: async (val: boolean) => {
      const res = await fetch(apiUrl("/api/settings/org"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "deals.loss_reason_allow_other",
          value: val ? "true" : "false",
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["org-setting", "deals.loss_reason_allow_other"],
      });
      toast.success("Configuração salva");
    },
  });

  const catalogItems = useMemo(
    () => [...reasons].sort((a, b) => a.position - b.position),
    [reasons],
  );
  const funnelItems = pipelineMeta?.reasons ?? [];

  const scopeOptions = useMemo(
    () => [
      ...pipelines.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.isDefault ? "Funil padrão" : undefined,
      })),
      {
        value: "catalog",
        label: "Catálogo global",
        description: "Motivos reutilizáveis entre funis",
      },
    ],
    [pipelines],
  );

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    if (!pipelineId) {
      const next = [...catalogItems];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      qc.setQueryData<LossReason[]>(["loss-reasons"], (prev) => {
        if (!prev) return next;
        const byId = new Map(next.map((r, i) => [r.id, { ...r, position: i }]));
        return prev.map((r) => byId.get(r.id) ?? r);
      });
      reorderCatalogMut.mutate(next.map((r) => r.id));
      return;
    }

    const next = [...funnelItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    qc.setQueryData<PipelineLossMeta>(
      ["pipeline-loss-reasons", pipelineId],
      (prev) =>
        prev
          ? { ...prev, reasons: next.map((r, i) => ({ ...r, position: i })) }
          : prev,
    );
    savePipelineMut.mutate({ reasonIds: next.map((r) => r.id) });
  }

  const listItems = !pipelineId
    ? catalogItems.map((r) => ({
        id: r.id,
        label: r.label,
        meta:
          (r.pipelineIds?.length ?? 0) === 0
            ? "Sem funil"
            : `${r.pipelineIds.length} funil(is)`,
      }))
    : funnelItems.map((r) => ({
        id: r.id,
        label: r.label,
        meta: "Neste funil",
      }));

  const scopeLabel = pipelineId
    ? (pipelineMeta?.name ??
      pipelines.find((p) => p.id === pipelineId)?.name ??
      "Funil")
    : "Catálogo global";

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Motivos de perda"
      description="Parametrize por funil — compartilhe motivos ou torne obrigatório"
      icon={<IconThumbDown size={22} />}
      actions={
        <div className="flex items-center gap-2">
          <ButtonGlass
            type="button"
            variant="primary"
            className="h-9 gap-1.5 px-3"
            onClick={() => setAddOpen(true)}
          >
            <IconPlus size={16} stroke={2.2} />
            <span className="hidden sm:inline">Novo motivo</span>
          </ButtonGlass>
          <ActionsMenu
            onAdd={() => setAddOpen(true)}
            onAssign={pipelineId ? () => setAssignOpen(true) : undefined}
            onSettings={() => setSettingsOpen(true)}
          />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-display text-[12px] font-semibold text-[var(--text-muted)]">
              Escopo
            </p>
            <DropdownGlass
              options={scopeOptions}
              value={scope ?? ""}
              onValueChange={(v) => setScope(v as Scope)}
              placeholder={
                pipelinesQuery.isLoading ? "Carregando funis…" : "Selecione o funil"
              }
              className="w-full max-w-md"
            />
            <p className="text-[12px] text-[var(--text-muted)]">
              {pipelineId
                ? "Motivos listados abaixo valem só para este funil. O mesmo motivo pode ser vinculado a vários funis."
                : "Catálogo compartilhado — vincule cada motivo aos funis que devem usá-lo."}
            </p>
          </div>

          {pipelineId && (
            <div className="flex shrink-0 items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                  Obrigatório
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Exige motivo ao marcar perdido
                </p>
              </div>
              <SwitchGlass
                checked={Boolean(pipelineMeta?.lossReasonRequired)}
                onChange={(v) =>
                  savePipelineMut.mutate({ lossReasonRequired: v })
                }
                disabled={pipelineMetaQuery.isLoading || savePipelineMut.isPending}
                aria-label={`Motivo obrigatório em ${scopeLabel}`}
              />
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-2 shadow-[var(--glass-shadow)]">
          <div className="flex shrink-0 items-center justify-between gap-2 px-2 py-1.5">
            <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              {scopeLabel}
              <span className="ml-2 font-normal text-[var(--text-muted)]">
                · {listItems.length}
              </span>
            </p>
            {pipelineId && (
              <ButtonGlass
                type="button"
                variant="glass"
                className="h-8 gap-1.5 px-2.5 text-[12px]"
                onClick={() => setAssignOpen(true)}
              >
                <IconLink size={14} />
                Vincular do catálogo
              </ButtonGlass>
            )}
          </div>

          {reasonsQuery.isLoading ||
          pipelinesQuery.isLoading ||
          (pipelineId && pipelineMetaQuery.isLoading) ? (
            <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--glass-bg-subtle)]" />
          ) : listItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <IconThumbDown size={28} className="text-[var(--text-muted)]" />
              <p className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                {pipelineId
                  ? "Nenhum motivo neste funil"
                  : "Nenhum motivo no catálogo"}
              </p>
              <p className="max-w-sm text-[13px] text-[var(--text-muted)]">
                {pipelineId
                  ? "Crie um motivo novo (já fica vinculado) ou vincule itens do catálogo global."
                  : "Crie motivos reutilizáveis e vincule-os a cada funil."}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <ButtonGlass
                  type="button"
                  variant="primary"
                  onClick={() => setAddOpen(true)}
                >
                  <IconPlus size={16} /> Novo motivo
                </ButtonGlass>
                {pipelineId && (
                  <ButtonGlass
                    type="button"
                    variant="glass"
                    onClick={() => setAssignOpen(true)}
                  >
                    Vincular do catálogo
                  </ButtonGlass>
                )}
              </div>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="loss-reasons">
                {(drop) => (
                  <div
                    ref={drop.innerRef}
                    {...drop.droppableProps}
                    className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-1.5"
                  >
                    {listItems.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(drag, snapshot) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={cn(
                              "flex items-center gap-3 rounded-[var(--radius-xl)] border px-3 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-shadow",
                              snapshot.isDragging
                                ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] shadow-[var(--glass-shadow)]"
                                : "border-[var(--glass-border)] bg-[var(--glass-bg-base)]",
                            )}
                          >
                            <button
                              type="button"
                              aria-label="Arrastar para reordenar"
                              className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)] active:cursor-grabbing"
                              {...drag.dragHandleProps}
                            >
                              <IconGripVertical size={18} stroke={2.2} />
                            </button>
                            <EditableLabel
                              value={item.label}
                              onSave={(label) =>
                                renameMut.mutate({ id: item.id, label })
                              }
                            />
                            <span className="hidden shrink-0 text-[11px] text-[var(--text-muted)] sm:inline">
                              {item.meta}
                            </span>
                            {pipelineId ? (
                              <button
                                type="button"
                                title="Desvincular deste funil"
                                aria-label="Desvincular"
                                className="ml-auto flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]"
                                onClick={() => {
                                  const next = funnelItems
                                    .filter((r) => r.id !== item.id)
                                    .map((r) => r.id);
                                  savePipelineMut.mutate({ reasonIds: next });
                                }}
                              >
                                <IconUnlink size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Excluir do catálogo"
                                aria-label="Excluir"
                                className="ml-auto flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger-text)]"
                                onClick={() => deleteMut.mutate(item.id)}
                              >
                                <IconTrash size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {drop.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Novo motivo de perda</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[var(--text-muted)]">
            {pipelineId
              ? `Será criado no catálogo e vinculado a “${scopeLabel}”.`
              : "Fica no catálogo global — vincule aos funis depois."}
          </p>
          <InputGlass
            autoFocus
            placeholder="Ex.: Preço alto"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) {
                createMut.mutate(newLabel.trim());
              }
            }}
          />
          <DialogFooter>
            <ButtonGlass
              type="button"
              variant="glass"
              onClick={() => setAddOpen(false)}
            >
              Cancelar
            </ButtonGlass>
            <ButtonGlass
              type="button"
              variant="primary"
              disabled={!newLabel.trim() || createMut.isPending}
              onClick={() => createMut.mutate(newLabel.trim())}
            >
              Adicionar
            </ButtonGlass>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>

      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        catalog={catalogItems}
        selectedIds={funnelItems.map((r) => r.id)}
        pending={savePipelineMut.isPending}
        onSave={(ids) => {
          savePipelineMut.mutate(
            { reasonIds: ids },
            { onSuccess: () => setAssignOpen(false) },
          );
        }}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] px-3 py-3">
            <div>
              <p className="font-display text-[13px] font-bold">
                Permitir motivo personalizado
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                Exibe “Outro…” no dialog de perda (global na organização).
              </p>
            </div>
            <SwitchGlass
              checked={allowOtherQuery.data !== false}
              onChange={(v) => toggleAllowOther.mutate(v)}
            />
          </div>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </SettingsV2Shell>
  );
}

function EditableLabel({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (!editing) {
    return (
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left font-display text-[14.5px] font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)]"
        onClick={() => setEditing(true)}
        title="Clique para editar"
      >
        {value}
      </button>
    );
  }

  return (
    <InputGlass
      autoFocus
      value={draft}
      className="min-w-0 flex-1"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const t = draft.trim();
        if (t && t !== value) onSave(t);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}

function AssignDialog({
  open,
  onOpenChange,
  catalog,
  selectedIds,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalog: LossReason[];
  selectedIds: string[];
  pending: boolean;
  onSave: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedIds));
  useEffect(() => {
    if (open) setPicked(new Set(selectedIds));
  }, [open, selectedIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular motivos ao funil</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-[var(--text-muted)]">
          Marque os motivos deste funil. O mesmo item pode aparecer em vários
          funis.
        </p>
        <div className="max-h-[360px] space-y-1 overflow-y-auto">
          {catalog.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-[var(--text-muted)]">
              Catálogo vazio — crie um motivo primeiro.
            </p>
          ) : (
            catalog.map((r) => {
              const checked = picked.has(r.id);
              return (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-2.5 transition-colors",
                    checked
                      ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--glass-border)] hover:bg-[var(--glass-bg-overlay)]",
                  )}
                >
                  <CheckboxGlass
                    checked={checked}
                    onChange={() => {
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        return next;
                      });
                    }}
                  />
                  <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">
                    {r.label}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <DialogFooter>
          <ButtonGlass
            type="button"
            variant="glass"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </ButtonGlass>
          <ButtonGlass
            type="button"
            variant="primary"
            disabled={pending}
            onClick={() => onSave([...picked])}
          >
            Salvar vínculos
          </ButtonGlass>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}

/** Menu em portal — o header tem overflow e cortava o dropdown. */
function ActionsMenu({
  onAdd,
  onAssign,
  onSettings,
}: {
  onAdd: () => void;
  onAssign?: () => void;
  onSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { icon: <IconPlus size={16} />, label: "Adicionar motivo", onClick: onAdd },
    ...(onAssign
      ? [
          {
            icon: <IconLink size={16} />,
            label: "Vincular do catálogo",
            onClick: onAssign,
          },
        ]
      : []),
    {
      icon: <IconSettings size={16} />,
      label: "Configurações",
      onClick: onSettings,
      divider: true as const,
    },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-[filter,box-shadow] hover:brightness-105",
          open && "ring-2 ring-[var(--brand-primary)]/35 brightness-95",
        )}
      >
        <IconMenu2 size={18} stroke={2.2} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[200] w-[220px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md"
          >
            {items.map((it) => (
              <div key={it.label}>
                {"divider" in it && it.divider && (
                  <div className="my-1 h-px bg-[var(--glass-border)]" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
                >
                  <span className="text-[var(--text-muted)]">{it.icon}</span>
                  {it.label}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
