"use client";

/**
 * RolePermissionsEditor — matriz de permissões de uma role em 2 modos.
 *
 * Visual alinhado ao DS de permissions (variation-a: cards arredondados,
 * coverage bar, segmented Nenhum/Ver/Operar/Total, switches com check).
 * Lógica de níveis permanece em `./level-matrix`.
 *
 *  - Modo "levels" (Simplificado): card por resource com nível + ações.
 *  - Modo "granular": mesmos cards, só checklist/switches por action.
 */

import { createElement, useState } from "react";
import {
  IconBolt,
  IconBriefcase,
  IconBuilding,
  IconCategory,
  IconChartBar,
  IconCheck,
  IconChecklist,
  IconChevronDown,
  IconFilter,
  IconLayoutSidebar,
  IconMessageCircle,
  IconPackage,
  IconPlugConnected,
  IconRobot,
  IconRoute,
  IconSend,
  IconSettings,
  IconShield,
  IconTag,
  IconTemplate,
  type Icon,
} from "@tabler/icons-react";

import { SensitiveBadge } from "@/components/crm/permissions/sensitive-badge";
import { cn } from "@/lib/utils";

import { groupResourcesByCategory } from "./categories";
import {
  LEVELS,
  actionTier,
  applyLevel,
  levelOf,
  withDerivedNav,
} from "./level-matrix";
import type { ActionDef, ResourceDef } from "./types";

export type PermissionsEditorMode = "levels" | "granular";

export interface RolePermissionsEditorProps {
  resources: ResourceDef[];
  /** Chaves `resource:action` ativas. */
  checked: Set<string>;
  onChange: (next: Set<string>) => void;
  mode: PermissionsEditorMode;
  onModeChange: (m: PermissionsEditorMode) => void;
  /** Presets do sistema / loading. */
  disabled?: boolean;
  /**
   * "full" (default): editor completo com toggle de modo e categorias.
   * "embedded": lista granular plana dos `resources` passados.
   */
  variant?: "full" | "embedded";
}

/* ── Resource → ícone ───────────────────────────────────────────────────── */

const RESOURCE_ICONS: Record<string, Icon> = {
  pipeline: IconFilter,
  contact: IconShield,
  company: IconBuilding,
  deal: IconBriefcase,
  conversation: IconMessageCircle,
  automation: IconBolt,
  distribution: IconRoute,
  ai_agent: IconRobot,
  campaign: IconSend,
  task: IconChecklist,
  report: IconChartBar,
  tag: IconTag,
  segment: IconCategory,
  product: IconPackage,
  channel: IconPlugConnected,
  template: IconTemplate,
  settings: IconSettings,
  nav: IconLayoutSidebar,
};

function resourceIcon(resource: string): Icon {
  return RESOURCE_ICONS[resource] ?? IconShield;
}

/* ── Primitivos visuais (DS) ─────────────────────────────────────────────── */

function CoverageBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  const tone =
    pct === 0
      ? "bg-[var(--glass-border)]"
      : pct >= 100
        ? "bg-[var(--brand-primary)]"
        : "bg-[var(--brand-primary)]/70";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-bg-overlay)]">
      <div
        className={cn("h-full rounded-full transition-all", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ScopeChip({ scope }: { scope: string }) {
  return (
    <code className="shrink-0 rounded-md bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--text-muted)]">
      {scope}
    </code>
  );
}

function ActionSwitch({
  on,
  sensitive,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  sensitive?: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        on
          ? sensitive
            ? "bg-amber-500"
            : "bg-[var(--brand-primary)]"
          : "bg-[var(--glass-border)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      >
        {on && (
          <IconCheck
            size={12}
            stroke={3}
            className={sensitive ? "text-amber-500" : "text-[var(--brand-primary)]"}
          />
        )}
      </span>
    </button>
  );
}

/* ── Componente principal ────────────────────────────────────────────────── */

export function RolePermissionsEditor({
  resources,
  checked,
  onChange,
  mode,
  onModeChange,
  disabled = false,
  variant = "full",
}: RolePermissionsEditorProps) {
  const mainResources = resources.filter(
    (r) => r.resource !== "settings" && r.resource !== "nav",
  );
  const groups = groupResourcesByCategory(mainResources);

  if (variant === "embedded") {
    if (resources.length === 0) {
      return (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
          <EmptyCatalog />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.resource}
            resource={resource}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            showLevels={false}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 text-[12px] text-[var(--text-primary)]">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="font-display text-[14.5px] font-bold text-[var(--text-primary)]">
          Permissões
        </h3>
        <ModeToggle mode={mode} onModeChange={onModeChange} disabled={disabled} />
      </div>

      {mainResources.length === 0 ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-white v2-dark:bg-[var(--glass-bg-modal)]">
          <EmptyCatalog />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.id} aria-label={group.label} className="flex flex-col gap-3">
              <h4 className="font-display text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {group.label}
              </h4>
              <div className="flex flex-col gap-4">
                {group.resources.map((resource) => (
                  <ResourceCard
                    key={resource.resource}
                    resource={resource}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    showLevels={mode === "levels"}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Toggle Simplificado / Granular ──────────────────────────────────────── */

function ModeToggle({
  mode,
  onModeChange,
  disabled,
}: {
  mode: PermissionsEditorMode;
  onModeChange: (m: PermissionsEditorMode) => void;
  disabled?: boolean;
}) {
  const options: { value: PermissionsEditorMode; label: string }[] = [
    { value: "levels", label: "Simplificado" },
    { value: "granular", label: "Granular" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Modo de edição de permissões"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-0.5"
    >
      {options.map((opt) => {
        const isActive = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onModeChange(opt.value)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 font-display text-[11px] font-bold transition-all",
              "focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "bg-[var(--brand-primary)] text-[var(--color-primary-foreground)] shadow-[var(--glass-shadow-sm)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Card de resource (DS variation-a) ───────────────────────────────────── */

function ResourceCard({
  resource,
  checked,
  onChange,
  disabled,
  showLevels,
}: {
  resource: ResourceDef;
  checked: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  /** true = modo simplificado (segmented + derived nav). */
  showLevels: boolean;
}) {
  const [open, setOpen] = useState(true);
  const level = showLevels ? levelOf(resource, checked) : null;
  const total = resource.actions.length;
  const count = resource.actions.filter((a) =>
    checked.has(`${resource.resource}:${a.action}`),
  ).length;

  function setLevel(id: 0 | 1 | 2 | 3) {
    onChange(withDerivedNav(applyLevel(resource, id, checked)));
  }

  function toggleAction(key: string) {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(showLevels ? withDerivedNav(next) : next);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-white shadow-[var(--glass-shadow-sm)] v2-dark:bg-[var(--glass-bg-modal)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--glass-bg-overlay)]/40"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
          {createElement(resourceIcon(resource.resource), {
            size: 20,
            "aria-hidden": true,
          })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              {resource.label}
            </h3>
            <span className="rounded-full bg-[var(--glass-bg-overlay)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              {count}/{total} ações
            </span>
            {showLevels && level === null && (
              <span className="text-[11px] font-medium text-[var(--brand-primary)]">
                personalizado
              </span>
            )}
          </div>
          <div className="mt-2 max-w-xs">
            <CoverageBar value={count} total={total} />
          </div>
        </div>
        <IconChevronDown
          size={20}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--glass-border-subtle)]">
          {showLevels && (
            <div className="px-5 pt-4">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Nível de acesso
              </p>
              <div
                role="group"
                aria-label={`Nível de acesso em ${resource.label}`}
                className="grid grid-cols-4 gap-1 rounded-xl bg-[var(--glass-bg-overlay)] p-1"
              >
                {LEVELS.map((lvl) => {
                  const active = level === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setLevel(lvl.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center rounded-lg px-2 py-2 text-center transition",
                        "focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        active
                          ? "bg-white text-[var(--brand-primary)] shadow-sm ring-1 ring-[var(--brand-primary)]/15 v2-dark:bg-[var(--glass-bg-base)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                      )}
                    >
                      <span className="text-[13px] font-semibold">{lvl.label}</span>
                      <span className="text-[10.5px] text-[var(--text-muted)]">
                        {lvl.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              {level === null && (
                <p className="mt-2 text-[11px] font-medium text-[var(--brand-primary)]">
                  Configuração personalizada
                </p>
              )}
            </div>
          )}

          <ul
            className={cn(
              "divide-y divide-[var(--glass-border-subtle)]",
              showLevels ? "mt-3" : "",
            )}
          >
            {resource.actions.map((action) => (
              <ActionSwitchRow
                key={action.action}
                resource={resource.resource}
                action={action}
                checked={checked}
                onToggle={toggleAction}
                disabled={disabled}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Linha de ação com switch (DS) ───────────────────────────────────────── */

function ActionSwitchRow({
  resource,
  action,
  checked,
  onToggle,
  disabled,
}: {
  resource: string;
  action: ActionDef;
  checked: Set<string>;
  onToggle: (key: string) => void;
  disabled?: boolean;
}) {
  const key = `${resource}:${action.action}`;
  const on = checked.has(key);
  const tier = actionTier(action);
  const sensitive = tier === 3 || Boolean(action.destructive);

  return (
    <li
      className={cn(
        "flex items-center gap-3 px-5 py-3",
        sensitive && on && "bg-amber-50/60 v2-dark:bg-amber-500/10",
      )}
    >
      <ActionSwitch
        on={on}
        sensitive={sensitive}
        disabled={disabled}
        label={action.label}
        onToggle={() => onToggle(key)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-[13px] font-medium",
              action.destructive
                ? "text-[var(--color-destructive)]"
                : "text-[var(--text-primary)]",
            )}
          >
            {action.label}
          </span>
          {sensitive && <SensitiveBadge tone="warn" withIcon />}
        </div>
        {action.description ? (
          <p className="truncate text-[11.5px] text-[var(--text-muted)]">
            {action.description}
          </p>
        ) : null}
      </div>
      <ScopeChip scope={key} />
    </li>
  );
}

/* ── Estado vazio ────────────────────────────────────────────────────────── */

function EmptyCatalog() {
  return (
    <div className="px-5 py-8 text-center text-[12px] text-[var(--text-muted)]">
      Nenhum recurso disponível no catálogo.
    </div>
  );
}
