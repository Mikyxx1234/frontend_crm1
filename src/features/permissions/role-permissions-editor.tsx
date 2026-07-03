"use client";

/**
 * RolePermissionsEditor — matriz de permissões de uma role em 2 modos.
 *
 * UI gerada via v0 MCP (chat tqb3BtsgQDo) e adaptada ao DS v2:
 * tokens canônicos (--glass-*, --text-*, --brand-*, --radius-*),
 * Tailwind v4 + cn(), ícones @tabler/icons-react.
 *
 * Componente PURAMENTE controlado: sem fetch, sem estado de servidor.
 * A lógica de níveis/derivação vem de `./level-matrix` (fonte da
 * verdade) — aqui é só apresentação.
 *
 *  - Modo "levels" (Simplificado): 1 linha por resource com segmented
 *    control Nenhum · Ver · Operar · Total; `settings` vira grade de
 *    switches; `nav:*` é derivado (rodapé mostra o resultado ao vivo).
 *  - Modo "granular": checklist clássica por action, incluindo
 *    `settings` e `nav` editáveis diretamente.
 */

import { createElement, useId, useState, type ReactNode } from "react";
import {
  IconAlertTriangle,
  IconBolt,
  IconBriefcase,
  IconBuilding,
  IconCategory,
  IconChartBar,
  IconChecklist,
  IconChevronDown,
  IconChevronRight,
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

import { cn } from "@/lib/utils";

import { groupResourcesByCategory } from "./categories";
import {
  LEVELS,
  actionTier,
  applyLevel,
  deriveNav,
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
   * "full" (default): editor completo com toggle de modo, agrupamento por
   * categoria, grade administrativa e navegação derivada.
   * "embedded": lista granular plana dos `resources` passados, sem header,
   * sem toggle e sem settings/nav — usada na seção de mensageria em
   * /settings/conversations.
   */
  variant?: "full" | "embedded";
}

/* ── Resource → ícone (espelha o catálogo do backend) ───────────────────── */

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

/**
 * Rampa de cores dos níveis — espelha o editor de grupo (Negado/Resp./
 * Equipe/Todos) para manter consistência visual entre os dois editores.
 */
const LEVEL_COLOR: Record<0 | 1 | 2 | 3, string> = {
  0: "#94a3b8",
  1: "var(--color-warn)",
  2: "var(--brand-primary-light)",
  3: "var(--brand-primary)",
};

const LEVEL_DOT: Record<0 | 1 | 2 | 3, string> = {
  0: "#cbd5e1",
  1: "var(--color-warn)",
  2: "var(--brand-primary-light)",
  3: "var(--brand-primary)",
};

/* ── Chrome compartilhado (painel + legenda) — DS v2, igual ao grupo ─────── */

function Panel({
  icon,
  title,
  sub,
  children,
}: {
  icon: ReactNode;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-white shadow-[var(--glass-shadow)] v2-dark:bg-[var(--glass-bg-modal)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--glass-border-subtle)] px-4.5 py-3.5">
        <span className="text-[var(--brand-primary)]">{icon}</span>
        <h2 className="font-display text-[14.5px] font-bold text-[var(--text-primary)]">{title}</h2>
        {sub && <span className="text-[12px] text-[var(--text-muted)]">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function LevelLegend() {
  return (
    <div className="flex flex-wrap gap-3.5 border-b border-[var(--glass-border-subtle)] bg-black/[0.015] px-4.5 py-3">
      {LEVELS.map((lvl) => (
        <div
          key={lvl.id}
          className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]"
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: LEVEL_DOT[lvl.id] }}
          />
          {lvl.label}
        </div>
      ))}
    </div>
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
  const settingsResource = resources.find((r) => r.resource === "settings");
  const navResource = resources.find((r) => r.resource === "nav");
  const mainResources = resources.filter(
    (r) => r.resource !== "settings" && r.resource !== "nav",
  );
  const groups = groupResourcesByCategory(mainResources);

  // ── Variante embutida: lista granular plana, sem header/toggle ──────────
  if (variant === "embedded") {
    if (resources.length === 0) {
      return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
          <EmptyCatalog />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 items-start gap-2.5 text-[12px] text-[var(--text-primary)] xl:grid-cols-2">
        {resources.map((resource) => (
          <GranularSection
            key={resource.resource}
            resource={resource}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 text-[12px] text-[var(--text-primary)]">
      {/* Toggle de modo */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="font-display text-[14.5px] font-bold text-[var(--text-primary)]">
          Permissões
        </h3>
        <ModeToggle mode={mode} onModeChange={onModeChange} disabled={disabled} />
      </div>

      {mode === "levels" ? (
        <>
          {/* Recursos com níveis — painel único com legenda + linhas por
              categoria (mesmo chrome do editor de grupo). */}
          {mainResources.length === 0 ? (
            <Panel icon={<IconShield size={18} />} title="Permissões por módulo">
              <EmptyCatalog />
            </Panel>
          ) : (
            <Panel
              icon={<IconShield size={18} />}
              title="Permissões por módulo"
              sub="nível de acesso por recurso"
            >
              <LevelLegend />
              {groups.map((group) => (
                <div key={group.id}>
                  <div className="border-b border-[var(--glass-border-subtle)] bg-black/[0.01] px-4.5 py-2 font-display text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {group.label}
                  </div>
                  {group.resources.map((resource) => (
                    <LevelRow
                      key={resource.resource}
                      resource={resource}
                      checked={checked}
                      onChange={onChange}
                      disabled={disabled}
                    />
                  ))}
                </div>
              ))}
            </Panel>
          )}

          {/* Configurações administrativas */}
          {settingsResource && (
            <SettingsGrid
              resource={settingsResource}
              checked={checked}
              onChange={onChange}
              disabled={disabled}
            />
          )}

          {/* Navegação derivada */}
          <NavDerivedFooter checked={checked} />
        </>
      ) : mainResources.length === 0 && !settingsResource && !navResource ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
          <EmptyCatalog />
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <CategoryGroup key={group.id} label={group.label}>
              {group.resources.map((resource) => (
                <GranularSection
                  key={resource.resource}
                  resource={resource}
                  checked={checked}
                  onChange={onChange}
                  disabled={disabled}
                />
              ))}
            </CategoryGroup>
          ))}
          {(settingsResource || navResource) && (
            <CategoryGroup label="Administração & Sistema">
              {settingsResource && (
                <GranularSection
                  resource={settingsResource}
                  checked={checked}
                  onChange={onChange}
                  disabled={disabled}
                />
              )}
              {navResource && (
                <GranularSection
                  resource={navResource}
                  checked={checked}
                  onChange={onChange}
                  disabled={disabled}
                />
              )}
            </CategoryGroup>
          )}
        </>
      )}
    </div>
  );
}

/* ── Cabeçalho + grade de uma categoria ──────────────────────────────────── */

function CategoryGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <h4 className="font-display text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </h4>
      <div className="grid grid-cols-1 items-start gap-2.5 xl:grid-cols-2 2xl:grid-cols-3">
        {children}
      </div>
    </section>
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

/* ── Modo simplificado: linha de resource com níveis ─────────────────────── */

function LevelRow({
  resource,
  checked,
  onChange,
  disabled,
}: {
  resource: ResourceDef;
  checked: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const level = levelOf(resource, checked);
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
    onChange(withDerivedNav(next));
  }

  return (
    <div className="border-b border-[var(--glass-border-subtle)] last:border-b-0">
      <div className="flex flex-col gap-3 px-4.5 py-4 hover:bg-black/[0.015]">
        {/* Linha: ícone + label + contador + expandir */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
            {createElement(resourceIcon(resource.resource), {
              size: 18,
              "aria-hidden": true,
            })}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-display text-[13.5px] font-bold text-[var(--text-primary)]">
                {resource.label}
              </span>
              {level === null && (
                <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  personalizado
                </span>
              )}
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              {count}/{total} ações
            </span>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Recolher" : "Expandir"} ações de ${resource.label}`}
            className="flex shrink-0 cursor-pointer items-center rounded-[var(--radius-sm)] p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
          >
            {expanded ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
          </button>
        </div>

        {/* Segmented control de nível — colorido por nível (igual ao grupo) */}
        <div
          role="group"
          aria-label={`Nível de acesso em ${resource.label}`}
          className="flex w-full gap-0.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-0.5"
        >
          {LEVELS.map((lvl) => {
            const isActive = level === lvl.id;
            const isFilled = level !== null && lvl.id > 0 && lvl.id < (level ?? 0);
            return (
              <button
                key={lvl.id}
                type="button"
                disabled={disabled}
                onClick={() => setLevel(lvl.id)}
                aria-pressed={isActive}
                title={lvl.label}
                className={cn(
                  "min-w-0 flex-1 cursor-pointer truncate rounded-[var(--radius-sm)] px-1 py-1.5 font-display text-[11px] font-bold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  isActive
                    ? "text-white"
                    : isFilled
                      ? "bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
                style={isActive ? { background: LEVEL_COLOR[lvl.id] } : undefined}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checkboxes por action (linha expandida / personalizado) */}
      {expanded && (
        <ul className="border-t border-[var(--glass-border-subtle)] bg-black/[0.015] px-4.5 py-2">
          {resource.actions.map((action) => (
            <ActionCheckboxRow
              key={action.action}
              resource={resource.resource}
              action={action}
              checked={checked}
              onToggle={toggleAction}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Checkbox de action (compartilhado pelos 2 modos) ────────────────────── */

function ActionCheckboxRow({
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
  const tier = actionTier(action);
  return (
    <li>
      <label
        className={cn(
          "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-1.5 py-1 transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[var(--glass-bg-overlay)]",
        )}
      >
        <input
          type="checkbox"
          checked={checked.has(key)}
          onChange={() => onToggle(key)}
          disabled={disabled}
          aria-label={action.label}
          className="size-3.5 shrink-0 cursor-pointer rounded accent-[var(--brand-primary)] disabled:cursor-not-allowed"
        />
        <span
          className={cn(
            "flex-1 text-[11px]",
            action.destructive
              ? "text-[var(--color-destructive)]"
              : "text-[var(--text-secondary)]",
          )}
        >
          {action.label}
        </span>
        {tier === 3 && (
          <span className="rounded-full bg-[var(--color-warning-soft)] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
            sensível
          </span>
        )}
        <code className="font-mono text-[10px] text-[var(--text-muted)]">{key}</code>
      </label>
    </li>
  );
}

/* ── Configurações administrativas (switches em grid 2 col) ──────────────── */

function SettingsGrid({
  resource,
  checked,
  onChange,
  disabled,
}: {
  resource: ResourceDef;
  checked: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  function toggle(key: string) {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(withDerivedNav(next));
  }

  return (
    <Panel icon={<IconSettings size={18} />} title="Configurações administrativas">
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {resource.actions.map((action) => {
          const key = `${resource.resource}:${action.action}`;
          const on = checked.has(key);
          const isPermissions = key === "settings:permissions";
          return (
            <div
              key={key}
              className="flex items-start gap-2.5 border-b border-r border-[var(--glass-border-subtle)] px-3 py-2.5 last:border-b-0 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <SwitchPill
                on={on}
                disabled={disabled}
                label={action.label}
                onToggle={() => toggle(key)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-medium text-[var(--text-primary)]">
                    {action.label}
                  </span>
                  {isPermissions && on && (
                    <IconAlertTriangle
                      size={12}
                      className="shrink-0 text-[var(--color-warning)]"
                      aria-label="Atenção: concede gestão de permissões"
                    />
                  )}
                </div>
                <code className="font-mono text-[9px] text-[var(--text-muted)]">{key}</code>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SwitchPill({
  on,
  disabled,
  label,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  const id = useId();
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative mt-0.5 h-[18px] w-8 shrink-0 cursor-pointer rounded-full border transition-colors",
        "focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        on
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-strong)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-[var(--color-primary-foreground)] shadow-[var(--glass-shadow-sm)] transition-all",
          on ? "left-[16px]" : "left-[2px]",
        )}
      />
    </button>
  );
}

/* ── Rodapé: navegação derivada (nav:*) ──────────────────────────────────── */

function NavDerivedFooter({ checked }: { checked: Set<string> }) {
  const navKeys = deriveNav(checked).sort();
  return (
    <footer
      aria-label="Permissões de navegação derivadas"
      className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-3 py-2.5"
    >
      <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
        Os itens da sidebar (<code className="font-mono">nav:*</code>) são derivados
        automaticamente da permissão <code className="font-mono">:view</code> de cada
        módulo — não precisam ser marcados manualmente neste modo.
      </p>
      <div className="flex flex-wrap gap-1">
        {navKeys.length === 0 ? (
          <span className="text-[10px] italic text-[var(--text-muted)]">
            Nenhum item de menu ativo
          </span>
        ) : (
          navKeys.map((k) => (
            <code
              key={k}
              className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-px font-mono text-[10px] text-[var(--text-secondary)]"
            >
              {k}
            </code>
          ))
        )}
      </div>
    </footer>
  );
}

/* ── Modo granular: seção colapsável por resource ────────────────────────── */

function GranularSection({
  resource,
  checked,
  onChange,
  disabled,
}: {
  resource: ResourceDef;
  checked: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const allKeys = resource.actions.map((a) => `${resource.resource}:${a.action}`);
  const count = allKeys.filter((k) => checked.has(k)).length;

  function toggleAction(key: string) {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleAll() {
    const next = new Set(checked);
    const allOn = count === allKeys.length;
    for (const k of allKeys) {
      if (allOn) next.delete(k);
      else next.add(k);
    }
    onChange(next);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {createElement(resourceIcon(resource.resource), {
          size: 16,
          className: "shrink-0 text-[var(--text-secondary)]",
          "aria-hidden": true,
        })}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
        >
          <span className="block truncate text-[12px] font-semibold text-[var(--text-primary)]">
            {resource.label}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {count}/{allKeys.length} selecionadas
          </span>
        </button>

        <label
          className={cn(
            "flex shrink-0 items-center gap-1.5",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          )}
        >
          <input
            type="checkbox"
            checked={count === allKeys.length && allKeys.length > 0}
            ref={(el) => {
              if (el) el.indeterminate = count > 0 && count < allKeys.length;
            }}
            onChange={toggleAll}
            disabled={disabled}
            aria-label={`Selecionar todas as ações de ${resource.label}`}
            className="size-3.5 cursor-pointer rounded accent-[var(--brand-primary)] disabled:cursor-not-allowed"
          />
          <span className="text-[10px] text-[var(--text-muted)]">tudo</span>
        </label>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Recolher" : "Expandir"} ${resource.label}`}
          className="flex shrink-0 cursor-pointer items-center rounded-[var(--radius-sm)] p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]"
        >
          {expanded ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
        </button>
      </div>

      {expanded && (
        <ul className="border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-3 py-1.5">
          {resource.actions.map((action) => (
            <ActionCheckboxRow
              key={action.action}
              resource={resource.resource}
              action={action}
              checked={checked}
              onToggle={toggleAction}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Estado vazio ────────────────────────────────────────────────────────── */

function EmptyCatalog() {
  return (
    <div className="px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">
      Nenhum recurso disponível no catálogo.
    </div>
  );
}
