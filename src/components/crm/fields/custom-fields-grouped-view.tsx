"use client";

/**
 * View agrupada dos campos personalizados na aside (PRD Agrupamento de
 * Campos na Aside).
 *
 * Estratégia:
 *   1. Lê o layout do contexto (`useFieldLayout`).
 *   2. Resolve grupos vs órfãos via `resolveCustomFieldGroups` (shared
 *      com o backend, garante fallback + tolerância a órfãos).
 *   3. Renderiza CADA grupo como um `SidebarSection` com header
 *      colapsável (chevron). Estado de colapso persistido em
 *      `localStorage` por usuário/contexto/entidade/grupo — PRD F-01.3.
 *   4. Se não há grupos configurados, devolve `null` — o caller deve
 *      renderizar o fallback flat original (RN-05/CA-01).
 */

import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { IconCheck as Check, IconPencil as Pencil, IconX as X } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  resolveCustomFieldGroups,
  type CustomFieldDef,
} from "@/lib/field-layout";
import {
  useFieldLayout,
  type FieldLayoutContext,
} from "@/hooks/use-field-layout";

import { CustomFieldRow, type FieldWithValue } from "./custom-field-row";

const collapseKey = (
  ctx: FieldLayoutContext,
  entity: "deal" | "contact",
  groupId: string,
) => `aside_grupos:${ctx}:${entity}:${groupId}`;

function useCollapsedState(
  ctx: FieldLayoutContext,
  entity: "deal" | "contact",
  groupId: string,
  initial: boolean,
): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return initial;
    const raw = window.localStorage.getItem(collapseKey(ctx, entity, groupId));
    if (raw === "1") return true;
    if (raw === "0") return false;
    return initial;
  });
  const set = React.useCallback(
    (v: boolean) => {
      setCollapsed(v);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(collapseKey(ctx, entity, groupId), v ? "1" : "0");
      }
    },
    [ctx, entity, groupId],
  );
  return [collapsed, set];
}

/**
 * Retorna `null` quando não há grupos configurados — cabe ao caller
 * renderizar a lista flat original. Retorna JSX com N seções
 * colapsáveis quando há grupos.
 */
export function CustomFieldsGroupedView({
  fields,
  entity,
  layoutContext,
  editing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  savePending,
}: {
  fields: FieldWithValue[];
  entity: "deal" | "contact";
  layoutContext: FieldLayoutContext;
  editing: boolean;
  draft: Record<string, string>;
  onDraftChange: (fieldId: string, value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  savePending: boolean;
}): React.ReactElement | null {
  const { sections } = useFieldLayout(layoutContext);

  const groups = React.useMemo(() => {
    const defs: CustomFieldDef[] = fields.map((f) => ({
      id: f.fieldId,
      name: f.name,
      label: f.label,
      type: f.type,
      options: f.options,
      required: f.required,
    }));
    return resolveCustomFieldGroups(sections, defs, entity);
  }, [sections, fields, entity]);

  // Só entra em modo agrupado se HÁ algum grupo real (não apenas o bucket
  // virtual). Isso preserva o fallback flat (RN-05/CA-01).
  const hasRealGroups = groups.some((g) => g.group !== null);
  if (!hasRealGroups) return null;

  const valueById = new Map(fields.map((f) => [f.fieldId, f] as const));

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ group, fields: gFields }, idx) => (
        <QuotaGroupSection
          key={group?.id ?? "__orphans__"}
          title={group?.label ?? "Outros campos"}
          collapsedInitial={group?.collapsedDefault ?? false}
          layoutContext={layoutContext}
          entity={entity}
          groupId={group?.id ?? "__orphans__"}
          headerAction={
            idx === 0 ? (
              !editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-xl"
                  onClick={onStartEdit}
                  aria-label={`Editar campos do ${entity === "deal" ? "negócio" : "contato"}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-xl"
                    onClick={onCancelEdit}
                    aria-label="Cancelar edição"
                  >
                    <X className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-xl text-[var(--color-success-text)]"
                    onClick={onSave}
                    disabled={savePending}
                    aria-label="Salvar campos"
                  >
                    <Check className="size-3.5" />
                  </Button>
                </div>
              )
            ) : null
          }
        >
          <div className="rounded-lg border border-border bg-[var(--color-bg-subtle)]/80">
            {gFields.map((def, i) => {
              const value = valueById.get(def.id);
              if (!value) return null;
              return (
                <CustomFieldRow
                  key={def.id}
                  field={value}
                  editing={editing}
                  draft={draft}
                  onChange={onDraftChange}
                  isLast={i === gFields.length - 1}
                />
              );
            })}
          </div>
        </QuotaGroupSection>
      ))}
    </div>
  );
}

/**
 * Header colapsável simples com chevron. Não reusa `SidebarSection`
 * porque este precisa de chevron + toggle no clique — o wrapper do
 * `SidebarSection` deixaria o header não-clicável.
 */
function QuotaGroupSection({
  title,
  collapsedInitial,
  layoutContext,
  entity,
  groupId,
  headerAction,
  children,
}: {
  title: string;
  collapsedInitial: boolean;
  layoutContext: FieldLayoutContext;
  entity: "deal" | "contact";
  groupId: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useCollapsedState(
    layoutContext,
    entity,
    groupId,
    collapsedInitial,
  );

  return (
    <section className="border-b border-border/90 pb-4 last:border-b-0 last:pb-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-expanded={!collapsed}
        >
          <IconChevronDown
            size={14}
            className={cn(
              "shrink-0 text-[var(--text-muted)] transition-transform",
              collapsed && "-rotate-90",
            )}
            strokeWidth={2.2}
          />
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {title}
          </h3>
        </button>
        {headerAction}
      </div>
      {!collapsed && <div>{children}</div>}
    </section>
  );
}
