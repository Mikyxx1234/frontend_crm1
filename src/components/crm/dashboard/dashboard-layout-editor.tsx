"use client";

import * as React from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  IconCheck,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconLock,
  IconRotateClockwise,
  IconX,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { ButtonGlass } from "@/components/crm/button-glass";
import {
  DASHBOARD_BLOCKS_CATALOG,
  getDashboardBlock,
  type DashboardBlockPreference,
  type ResolvedDashboardBlock,
} from "@/lib/dashboard-blocks-catalog";

interface LocalBlock {
  key: string;
  enabled: boolean;
}

function toLocal(blocks: ResolvedDashboardBlock[]): LocalBlock[] {
  return blocks.map((b) => ({ key: b.key, enabled: b.enabled }));
}

function signature(items: LocalBlock[]): string {
  return items.map((i) => `${i.key}:${i.enabled ? 1 : 0}`).join("|");
}

interface DashboardLayoutEditorProps {
  initial: ResolvedDashboardBlock[];
  saving: boolean;
  onSave: (blocks: DashboardBlockPreference[]) => void;
  onCancel: () => void;
}

export function DashboardLayoutEditor({
  initial,
  saving,
  onSave,
  onCancel,
}: DashboardLayoutEditorProps) {
  const [items, setItems] = React.useState<LocalBlock[]>(() => toLocal(initial));
  const baseline = React.useMemo(() => signature(toLocal(initial)), [initial]);
  const dirty = signature(items) !== baseline;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    setItems((curr) => {
      const next = [...curr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toggle = (key: string) => {
    setItems((curr) =>
      curr.map((it) => (it.key === key ? { ...it, enabled: !it.enabled } : it)),
    );
  };

  const handleReset = () => {
    setItems(DASHBOARD_BLOCKS_CATALOG.map((b) => ({ key: b.key, enabled: true })));
  };

  const handleSave = () => {
    onSave(
      items.map((it, idx) => ({
        key: it.key,
        enabled: it.enabled,
        order: idx + 1,
      })),
    );
  };

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)]">
            Editar dashboard
          </h3>
          <p className="mt-0.5 font-body text-[12px] text-[var(--text-muted)]">
            Arraste para reordenar e use o olho para ocultar blocos. Vale só para você.
          </p>
        </div>
        {dirty && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] px-2.5 py-1 font-body text-[11px] font-semibold text-[var(--color-warning)]">
            Alterações não salvas
          </span>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-blocks">
          {(provided) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="mt-4 flex flex-col gap-2"
            >
              {items.map((it, idx) => {
                const meta = getDashboardBlock(it.key);
                if (!meta) return null;
                return (
                  <Draggable key={it.key} draggableId={it.key} index={idx}>
                    {(drag, snapshot) => (
                      <li
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={cn(
                          "flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-3 py-2.5 transition-opacity",
                          !it.enabled && "opacity-55",
                          snapshot.isDragging &&
                            "border-[var(--brand-primary)] shadow-[var(--glass-shadow)]",
                        )}
                      >
                        <span
                          {...drag.dragHandleProps}
                          aria-label={`Arrastar ${meta.title}`}
                          className="shrink-0 cursor-grab text-[var(--text-muted)] active:cursor-grabbing"
                        >
                          <IconGripVertical size={16} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                              {meta.title}
                            </p>
                            {meta.locked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-body text-[9.5px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                <IconLock size={10} />
                                Fixo
                              </span>
                            )}
                          </div>
                          <p className="truncate font-body text-[11.5px] text-[var(--text-muted)]">
                            {meta.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggle(it.key)}
                          disabled={meta.locked}
                          aria-label={
                            it.enabled
                              ? `Ocultar ${meta.title}`
                              : `Mostrar ${meta.title}`
                          }
                          className={cn(
                            "shrink-0 rounded-[var(--radius-md)] p-1.5 transition-colors",
                            meta.locked
                              ? "cursor-not-allowed text-[var(--text-muted)] opacity-40"
                              : it.enabled
                                ? "text-[var(--brand-primary)] hover:bg-[var(--glass-bg-overlay)]"
                                : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)]",
                          )}
                        >
                          {it.enabled ? (
                            <IconEye size={16} />
                          ) : (
                            <IconEyeOff size={16} />
                          )}
                        </button>
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <ButtonGlass
          variant="glass"
          size="sm"
          onClick={handleReset}
          disabled={saving}
        >
          <IconRotateClockwise size={15} />
          Restaurar padrão
        </ButtonGlass>
        <ButtonGlass variant="glass" size="sm" onClick={onCancel} disabled={saving}>
          <IconX size={15} />
          Cancelar
        </ButtonGlass>
        <ButtonGlass
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          <IconCheck size={15} />
          {saving ? "Salvando…" : "Salvar"}
        </ButtonGlass>
      </div>
    </section>
  );
}
