"use client";

/*
 * Drawer de filtros do Kanban v2 — estilo Kommo, mantendo DS v2.
 *
 * Filtros expostos (todos client-side):
 *   - Etapas (stageIds) — multi-select com cor de cada etapa
 *   - Responsável (ownerIds) — multi-select de TeamUser
 *   - Tags (tagIds) — multi-select com swatch de cor
 *   - Valor (valueMin / valueMax) — faixa numérica
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCircleFilled,
  IconCurrencyDollar,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { useDealTags, useTeamUsers } from "@/features/pipeline-v2/hooks";
import type { BoardStageDto } from "@/features/pipeline-v2/api";

// ── Tipos ──────────────────────────────────────────────────────────

export interface KanbanFilters {
  ownerIds: string[];
  tagIds: string[];
  stageIds: string[];
  valueMin: string;
  valueMax: string;
}

export const EMPTY_FILTERS: KanbanFilters = {
  ownerIds: [],
  tagIds: [],
  stageIds: [],
  valueMin: "",
  valueMax: "",
};

export function countActiveFilters(f: KanbanFilters): number {
  return (
    f.ownerIds.length +
    f.tagIds.length +
    f.stageIds.length +
    (f.valueMin !== "" ? 1 : 0) +
    (f.valueMax !== "" ? 1 : 0)
  );
}

// ── Componente principal ───────────────────────────────────────────

interface FiltersPopoverProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  filters: KanbanFilters;
  onChange: (next: KanbanFilters) => void;
  /** Estágios do board atual — para a seção "Etapas" */
  stages?: BoardStageDto[];
}

export function FiltersPopover({
  open,
  onClose,
  filters,
  onChange,
  stages = [],
}: FiltersPopoverProps) {
  const { data: users = [] } = useTeamUsers(open);
  const { data: tags = [] } = useDealTags();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Contagem de resultados locais (soma de deals nas etapas filtradas)
  const totalVisible = stages.reduce((sum, s) => {
    if (filters.stageIds.length > 0 && !filters.stageIds.includes(s.id))
      return sum;
    return sum + (s.totalCount ?? s.deals.length);
  }, 0);

  // Fechar ao apertar ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Clique fora do drawer
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay para não capturar o click que abriu
    const timer = setTimeout(
      () => document.addEventListener("mousedown", handler),
      0,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onClose]);

  const active = countActiveFilters(filters);

  function toggleStage(id: string) {
    const has = filters.stageIds.includes(id);
    onChange({
      ...filters,
      stageIds: has
        ? filters.stageIds.filter((x) => x !== id)
        : [...filters.stageIds, id],
    });
  }

  function toggleOwner(id: string) {
    const has = filters.ownerIds.includes(id);
    onChange({
      ...filters,
      ownerIds: has
        ? filters.ownerIds.filter((x) => x !== id)
        : [...filters.ownerIds, id],
    });
  }

  function toggleTag(id: string) {
    const has = filters.tagIds.includes(id);
    onChange({
      ...filters,
      tagIds: has
        ? filters.tagIds.filter((x) => x !== id)
        : [...filters.tagIds, id],
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Overlay semitransparente */}
      <div
        className={cn(
          "fixed inset-0 z-[999] bg-black/20 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer lateral */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Painel de filtros"
        className={cn(
          "fixed bottom-0 right-0 top-0 z-[1000] flex w-[340px] max-w-[95vw] flex-col border-l border-[var(--glass-border)] bg-[var(--dropdown-solid-bg,#fff)] shadow-[−4px_0_40px_rgba(15,20,40,0.12)] transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Cabeçalho */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--glass-border)] px-5 py-4">
          <div>
            <p className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Filtros
            </p>
            {active > 0 && (
              <p className="font-display text-[11px] text-[var(--text-muted)]">
                {active} ativo{active !== 1 ? "s" : ""}
                {" · "}
                <span className="font-semibold text-[var(--brand-primary)]">
                  {totalVisible} negócio{totalVisible !== 1 ? "s" : ""}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {active > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="font-display text-[12px] font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
              >
                Limpar tudo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar filtros"
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="kanban-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {/* ETAPAS */}
          {stages.length > 0 && (
            <Section
              title="Etapas"
              activeCount={filters.stageIds.length}
              onClear={() => onChange({ ...filters, stageIds: [] })}
            >
              {stages.map((s) => {
                const checked = filters.stageIds.includes(s.id);
                return (
                  <FilterRow
                    key={s.id}
                    label={s.name}
                    count={s.totalCount ?? s.deals.length}
                    swatch={s.color}
                    checked={checked}
                    onToggle={() => toggleStage(s.id)}
                  />
                );
              })}
            </Section>
          )}

          {/* RESPONSAVEL */}
          <Section
            title="Responsável"
            activeCount={filters.ownerIds.length}
            onClear={() => onChange({ ...filters, ownerIds: [] })}
            searchable
          >
            {users.length === 0 ? (
              <EmptyState label="Nenhum usuário disponível" />
            ) : (
              users.map((u) => (
                <FilterRow
                  key={u.id}
                  label={u.name ?? "Sem nome"}
                  sub={u.email ?? undefined}
                  checked={filters.ownerIds.includes(u.id)}
                  onToggle={() => toggleOwner(u.id)}
                  avatar={u.name}
                />
              ))
            )}
          </Section>

          {/* TAGS */}
          <Section
            title="Tags"
            activeCount={filters.tagIds.length}
            onClear={() => onChange({ ...filters, tagIds: [] })}
            searchable
          >
            {tags.length === 0 ? (
              <EmptyState label="Nenhuma tag cadastrada" />
            ) : (
              tags.map((t) => (
                <FilterRow
                  key={t.id}
                  label={t.name}
                  swatch={t.color ?? undefined}
                  checked={filters.tagIds.includes(t.id)}
                  onToggle={() => toggleTag(t.id)}
                />
              ))
            )}
          </Section>

          {/* VALOR DE VENDA */}
          <Section title="Valor de venda">
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="relative flex-1">
                <IconCurrencyDollar
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Mínimo"
                  value={filters.valueMin}
                  onChange={(e) =>
                    onChange({ ...filters, valueMin: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-7 pr-2.5 font-display text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
                />
              </div>
              <span className="shrink-0 text-[var(--text-muted)]">—</span>
              <div className="relative flex-1">
                <IconCurrencyDollar
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Máximo"
                  value={filters.valueMax}
                  onChange={(e) =>
                    onChange({ ...filters, valueMax: e.target.value })
                  }
                  className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-7 pr-2.5 font-display text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
          </Section>
        </div>

        {/* Rodapé */}
        <div className="shrink-0 border-t border-[var(--glass-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[var(--brand-primary)] py-2.5 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.30)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] active:translate-y-0"
          >
            {active > 0
              ? `Ver ${totalVisible} resultado${totalVisible !== 1 ? "s" : ""}`
              : "Aplicar filtros"}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Seção colapsável ───────────────────────────────────────────────

function Section({
  title,
  activeCount = 0,
  onClear,
  searchable = false,
  children,
}: {
  title: string;
  activeCount?: number;
  onClear?: () => void;
  searchable?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="mb-1">
      {/* Linha de título */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between px-1 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="rounded-full bg-[var(--brand-primary)]/10 px-1.5 py-px font-display text-[10px] font-bold text-[var(--brand-primary)]">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && onClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.stopPropagation(); onClear?.(); }
              }}
              className="font-display text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
            >
              Limpar
            </span>
          )}
          {collapsed ? (
            <IconChevronDown size={14} className="text-[var(--text-muted)]" />
          ) : (
            <IconChevronUp size={14} className="text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {!collapsed && (
        <div>
          {searchable && (
            <div className="relative mb-1 px-1">
              <IconSearch
                size={12}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                placeholder={`Buscar ${title.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-1.5 pl-7 pr-3 font-display text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
              />
            </div>
          )}
          <FilterList query={query}>{children}</FilterList>
        </div>
      )}

      <div className="my-1 h-px bg-[var(--glass-border)]" />
    </div>
  );
}

// Filtra os filhos pelo query (busca no texto do label)
function FilterList({
  query,
  children,
}: {
  query: string;
  children: React.ReactNode;
}) {
  if (!query) return <div className="flex flex-col">{children}</div>;
  const q = query.toLowerCase();
  const filtered = (
    Array.isArray(children) ? children : [children]
  ).filter((child: any) => {
    const label: string = child?.props?.label ?? "";
    const sub: string = child?.props?.sub ?? "";
    return (
      label.toLowerCase().includes(q) || sub.toLowerCase().includes(q)
    );
  });
  return (
    <div className="flex flex-col">
      {filtered.length === 0 ? (
        <EmptyState label={`Nenhum resultado para "${query}"`} />
      ) : (
        filtered
      )}
    </div>
  );
}

// ── FilterRow ──────────────────────────────────────────────────────

function FilterRow({
  label,
  sub,
  swatch,
  count,
  avatar,
  checked,
  onToggle,
}: {
  label: string;
  sub?: string;
  swatch?: string;
  count?: number;
  avatar?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
        checked
          ? "bg-[var(--brand-primary)]/8 hover:bg-[var(--brand-primary)]/12"
          : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      {/* Checkbox */}
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
        style={{
          background: checked ? "var(--brand-primary, #5b6ff5)" : "transparent",
          borderColor: checked
            ? "var(--brand-primary, #5b6ff5)"
            : "var(--glass-border, rgba(0,0,0,0.15))",
        }}
      >
        {checked && <IconCheck size={11} color="#fff" stroke={3} />}
      </span>

      {/* Swatch de cor (tag / etapa) */}
      {swatch && (
        <IconCircleFilled
          size={10}
          className="shrink-0"
          style={{ color: swatch }}
        />
      )}

      {/* Avatar inicial (responsável) */}
      {avatar && !swatch && (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: stringToColor(avatar) }}
        >
          {avatar
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </span>
      )}

      {/* Label */}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        {sub && (
          <span className="block truncate font-display text-[10.5px] text-[var(--text-muted)]">
            {sub}
          </span>
        )}
      </span>

      {/* Contagem */}
      {count !== undefined && (
        <span className="shrink-0 font-display text-[11px] font-semibold text-[var(--text-muted)]">
          {count}
        </span>
      )}
    </button>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="px-2 py-2 font-display text-[11.5px] italic text-[var(--text-muted)]">
      {label}
    </div>
  );
}

/** Gera uma cor determinística a partir de uma string (para avatares). */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 48%)`;
}
