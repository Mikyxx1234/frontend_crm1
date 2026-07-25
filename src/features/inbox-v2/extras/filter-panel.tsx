"use client";

/*
 * InboxFilterButton — abre modal canônica de filtros (mesmo shell do funil).
 *
 * Layout wide 3 colunas:
 *   Col 1 — Ordenar
 *   Col 2 — Conversa | Negócio (abas)
 *   Col 3 — Tags
 *
 * Backend: ownerId, withoutOwner, channel, stageId, tagIds, sources.
 * Client-side: sort + windowState.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  IconAdjustmentsHorizontal as SlidersHorizontal,
  IconCheck,
  IconFilter,
  IconSearch,
  IconUserOff,
  IconX as X,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { ModalPortalContext } from "@/components/ui/modal-portal-context";
import {
  FieldCard,
  MultiSelectDropdown,
  TextField,
} from "@/components/pipeline/kanban-filters/v2/core";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { useTeamUsers } from "@/features/inbox-v2/hooks";
import {
  getPipelineBoard,
  listChannels,
  listPipelines,
  listTags,
  type InboxFilters,
} from "@/features/inbox-v2/api";
import { SOURCE_NONE } from "@/components/pipeline/kanban-filters/types";
import { useContactSources } from "@/hooks/use-contact-sources";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import { useIsDesktop } from "@/hooks/use-media-query";

interface InboxFilterButtonProps {
  value: InboxFilters;
  onChange: (next: InboxFilters) => void;
}

const CHANNEL_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "meta", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "E-mail" },
  { value: "webchat", label: "Webchat / Formulário" },
];

const WINDOW_OPTIONS: ReadonlyArray<{ value: "open" | "closed"; label: string }> = [
  { value: "open", label: "Aberta" },
  { value: "closed", label: "Fechada" },
];

const SORT_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}> = [
  { id: "recent", label: "Mais recentes", sortBy: "lastInboundAt", sortOrder: "desc" },
  { id: "oldest", label: "Mais antigas", sortBy: "lastInboundAt", sortOrder: "asc" },
  { id: "unread", label: "Não lidas primeiro", sortBy: "unreadCount", sortOrder: "desc" },
];

const DEFAULT_SORT_ID = "recent";

type MiddleTab = "conversa" | "negocio";

const MIDDLE_TABS: { id: MiddleTab; label: string; hint: string }[] = [
  { id: "conversa", label: "Conversa", hint: "Responsável, canal e status" },
  { id: "negocio", label: "Negócio", hint: "Etapa e origem" },
];

function sortIdFromFilters(f: InboxFilters): string {
  if (!f.sortBy) return DEFAULT_SORT_ID;
  const match = SORT_OPTIONS.find(
    (o) => o.sortBy === f.sortBy && o.sortOrder === (f.sortOrder ?? "desc"),
  );
  return match?.id ?? DEFAULT_SORT_ID;
}

function countActive(f: InboxFilters): number {
  let n = 0;
  if (f.ownerId || f.withoutOwner) n += 1;
  if (f.channel) n += 1;
  if (f.stageId) n += 1;
  if (f.tagIds && f.tagIds.length > 0) n += 1;
  if (f.sources && f.sources.length > 0) n += 1;
  if (f.windowState) n += 1;
  if (sortIdFromFilters(f) !== DEFAULT_SORT_ID) n += 1;
  return n;
}

function middleTabCount(id: MiddleTab, f: InboxFilters): number {
  if (id === "conversa") {
    return (
      (f.ownerId || f.withoutOwner ? 1 : 0) +
      (f.channel ? 1 : 0) +
      (f.windowState ? 1 : 0)
    );
  }
  return (f.stageId ? 1 : 0) + (f.sources && f.sources.length > 0 ? 1 : 0);
}

function OptionRow({
  active,
  onClick,
  children,
  leading,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-display text-[13px] transition-colors",
        active
          ? "bg-[var(--color-primary-soft)] font-medium text-[var(--brand-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]",
      )}
    >
      {leading}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {active && <IconCheck size={14} stroke={2.6} className="shrink-0" />}
    </button>
  );
}

function InboxFilterModalShell({
  onClose,
  draftCount,
  onClear,
  onApply,
  clearDisabled,
  wide,
  children,
}: {
  onClose: () => void;
  draftCount: number;
  onClear: () => void;
  onApply: () => void;
  clearDisabled: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [portalNode, setPortalNode] = React.useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-(--z-popover) flex items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onMouseDown={onClose}
        aria-hidden
      />
      <div
        ref={setPortalNode}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros de conversas"
        className={cn(
          "relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] text-[var(--text-primary)] shadow-[var(--glass-shadow-lg)] backdrop-blur-xl",
          wide ? "h-[min(84vh,720px)] max-w-[980px]" : "h-[min(92dvh,100%)] max-w-lg",
        )}
      >
        <ModalPortalContext.Provider value={portalNode}>
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                <SlidersHorizontal className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
                    Filtros de conversas
                  </h2>
                  {draftCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1.5 font-display text-[10px] font-bold text-white">
                      {draftCount}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-body text-[12px] text-[var(--text-muted)]">
                  Ordenação, responsável, canal, etapa, origem e tags
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1">{children}</div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)] px-5 py-3">
            <p className="font-body text-[12px] text-[var(--text-muted)]">
              <b className="font-semibold text-[var(--brand-primary)]">{draftCount}</b>{" "}
              critérios selecionados
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClear}
                disabled={clearDisabled}
                className="inline-flex h-9 items-center rounded-[var(--radius-md)] px-3 font-display text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-40"
              >
                Limpar tudo
              </button>
              <button
                type="button"
                onClick={onApply}
                className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-4 font-display text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-opacity hover:opacity-90"
              >
                <IconCheck size={13} />
                Aplicar filtros
              </button>
            </div>
          </footer>
        </ModalPortalContext.Provider>
      </div>
    </div>
  );
}

export function InboxFilterButton({ value, onChange }: InboxFilterButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<InboxFilters>(value);
  const [middleTab, setMiddleTab] = React.useState<MiddleTab>("conversa");
  const [ownerSearch, setOwnerSearch] = React.useState("");
  const [tagQuery, setTagQuery] = React.useState("");
  const isDesktop = useIsDesktop();

  React.useEffect(() => {
    if (!open) return;
    setDraft(value);
    setMiddleTab("conversa");
    setOwnerSearch("");
    setTagQuery("");
  }, [open, value]);

  const { data: users = [] } = useTeamUsers(open);
  const { data: tags = [] } = useQuery({
    queryKey: ["tags", "filter-panel"],
    queryFn: listTags,
    enabled: open,
    staleTime: 60_000,
  });
  const { data: channels = [] } = useQuery({
    queryKey: ["channels", "filter-panel"],
    queryFn: listChannels,
    enabled: open,
    staleTime: 60_000,
  });
  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines", "filter-panel"],
    queryFn: listPipelines,
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const defaultPipelineId =
    pipelines.find((p) => p.isDefault)?.id ?? pipelines[0]?.id ?? null;
  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-board", "filter-panel", defaultPipelineId],
    queryFn: () => getPipelineBoard(defaultPipelineId as string),
    enabled: open && Boolean(defaultPipelineId),
    staleTime: 5 * 60_000,
  });
  const { data: contactSources = [] } = useContactSources(open);
  const { data: myPerms } = useMyPermissions();

  const channelOptions = React.useMemo(() => {
    const channelGrants = myPerms?.channelGrants ?? [];
    const kinds = new Set(
      channels.map((c) => (c.kind ?? "").toLowerCase()).filter(Boolean),
    );
    const filtered = CHANNEL_OPTIONS.filter((o) => {
      if (kinds.size > 0 && !kinds.has(o.value)) return false;
      if (channelGrants.length > 0) {
        return channelGrants.some(
          (g) => g === o.value || g.startsWith(`${o.value}:`),
        );
      }
      return true;
    });
    return filtered.length > 0 ? filtered : CHANNEL_OPTIONS;
  }, [channels, myPerms?.channelGrants]);

  const filteredUsers = React.useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || u.email || "").toLowerCase().includes(q),
    );
  }, [users, ownerSearch]);

  const selectedTagIds = draft.tagIds ?? [];
  const selectedSources = draft.sources ?? [];
  const activeCount = countActive(value);
  const draftCount = countActive(draft);
  const ownerActive = Boolean(draft.ownerId || draft.withoutOwner);

  const filteredTags = React.useMemo(() => {
    const needle = tagQuery.trim().toLowerCase();
    if (!needle) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(needle));
  }, [tags, tagQuery]);

  function toggleTag(id: string) {
    setDraft((d) => {
      const current = d.tagIds ?? [];
      const next = current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id];
      return { ...d, tagIds: next.length > 0 ? next : undefined };
    });
  }

  function toggleSource(source: string) {
    setDraft((d) => {
      const current = d.sources ?? [];
      const next = current.includes(source)
        ? current.filter((s) => s !== source)
        : [...current, source];
      return { ...d, sources: next.length > 0 ? next : undefined };
    });
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clear() {
    setDraft({});
    setOwnerSearch("");
  }

  const sortColumn = (
    <div className="space-y-1">
      <span className="px-2 font-display text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--text-muted)]">
        Ordenar
      </span>
      {SORT_OPTIONS.map((opt) => {
        const selected = sortIdFromFilters(draft) === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                sortBy: opt.sortBy,
                sortOrder: opt.sortOrder,
              }))
            }
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-left font-display text-[11.5px] font-semibold transition-colors",
              selected
                ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]",
            )}
          >
            <span>{opt.label}</span>
            {selected && <IconCheck size={13} stroke={2.6} className="shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const conversaContent = (
    <div className="space-y-3">
      <FieldCard
        label="Responsável"
        active={ownerActive}
        onClear={() =>
          setDraft((d) => ({
            ...d,
            ownerId: undefined,
            withoutOwner: undefined,
          }))
        }
      >
        <div className="space-y-2">
          <TextField
            value={ownerSearch}
            onChange={setOwnerSearch}
            placeholder="Buscar usuário…"
            icon={<IconSearch className="size-3.5" />}
          />
          <div className="max-h-44 space-y-0.5 overflow-y-auto [scrollbar-width:thin]">
            <OptionRow
              active={!ownerActive}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  ownerId: undefined,
                  withoutOwner: undefined,
                }))
              }
            >
              Todos
            </OptionRow>
            <OptionRow
              active={Boolean(draft.withoutOwner)}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  ownerId: undefined,
                  withoutOwner: d.withoutOwner ? undefined : true,
                }))
              }
              leading={
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-strong)] text-[var(--text-muted)]">
                  <IconUserOff size={13} stroke={2.2} />
                </span>
              }
            >
              Sem responsável
            </OptionRow>
            {filteredUsers.map((u) => {
              const active = draft.ownerId === u.id;
              const name = u.name || u.email;
              return (
                <OptionRow
                  key={u.id}
                  active={active}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      ownerId: active ? undefined : u.id,
                      withoutOwner: undefined,
                    }))
                  }
                  leading={
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{
                        background: `hsl(${(name.charCodeAt(0) * 47) % 360} 55% 50%)`,
                      }}
                    >
                      {name[0]?.toUpperCase()}
                    </span>
                  }
                >
                  {name}
                </OptionRow>
              );
            })}
          </div>
        </div>
      </FieldCard>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 [&>*]:h-full">
        <FieldCard
          label="Canal"
          active={Boolean(draft.channel)}
          onClear={() => setDraft((d) => ({ ...d, channel: undefined }))}
        >
          <DropdownGlass
            placeholder="Selecionar canal…"
            options={channelOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={draft.channel}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                channel: d.channel === v ? undefined : v,
              }))
            }
          />
        </FieldCard>

        <FieldCard
          label="Conversa"
          active={Boolean(draft.windowState)}
          onClear={() => setDraft((d) => ({ ...d, windowState: undefined }))}
        >
          <DropdownGlass
            placeholder="Selecionar status…"
            options={WINDOW_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={draft.windowState}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                windowState:
                  d.windowState === v ? undefined : (v as "open" | "closed"),
              }))
            }
          />
        </FieldCard>
      </div>
    </div>
  );

  const negocioContent = (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 [&>*]:h-full">
      <FieldCard
        label="Negócio na etapa"
        active={Boolean(draft.stageId)}
        onClear={() => setDraft((d) => ({ ...d, stageId: undefined }))}
      >
        <DropdownGlass
          placeholder="Selecionar etapa…"
          options={stages.map((s) => ({
            value: s.id,
            label: s.name,
          }))}
          value={draft.stageId}
          onValueChange={(v) =>
            setDraft((d) => ({
              ...d,
              stageId: d.stageId === v ? undefined : v,
            }))
          }
        />
        {stages.length === 0 && (
          <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">Nenhuma etapa.</p>
        )}
      </FieldCard>

      <FieldCard
        label="Origem"
        active={selectedSources.length > 0}
        onClear={() => setDraft((d) => ({ ...d, sources: undefined }))}
      >
        <MultiSelectDropdown
          placeholder="Selecionar origem…"
          emptyLabel="Nenhuma origem cadastrada."
          searchable={contactSources.length > 6}
          searchPlaceholder="Buscar origem…"
          selected={selectedSources}
          options={[
            {
              value: SOURCE_NONE,
              label: "Sem origem",
              searchText: "Sem origem",
            },
            ...contactSources.map((source) => ({
              value: source,
              label: source,
              searchText: source,
            })),
          ]}
          onToggle={toggleSource}
        />
      </FieldCard>
    </div>
  );

  const tagsColumn = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--text-muted)]">
          Tags
        </span>
        <span className="font-display text-[10.5px] font-bold text-[var(--brand-primary)]">
          {selectedTagIds.length} selecionadas
        </span>
      </div>
      <input
        type="search"
        value={tagQuery}
        onChange={(e) => setTagQuery(e.target.value)}
        placeholder="Buscar tags…"
        className="mb-2 h-9 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] px-3 font-body text-[12px] outline-none focus:border-[var(--brand-primary)]/40 focus:ring-2 focus:ring-[var(--brand-primary)]/20"
      />
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {filteredTags.map((t) => {
          const selected = selectedTagIds.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
                selected
                  ? "bg-[var(--brand-primary)]/10"
                  : "hover:bg-[var(--glass-bg-strong)]",
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: t.color ?? "var(--brand-primary)" }}
              />
              <span className="min-w-0 flex-1 truncate font-display text-[12px] font-semibold text-[var(--text-primary)]">
                {t.name}
              </span>
              {selected && (
                <IconCheck size={13} stroke={2.6} className="shrink-0 text-[var(--brand-primary)]" />
              )}
            </button>
          );
        })}
        {filteredTags.length === 0 && (
          <p className="py-6 text-center font-body text-[12px] text-[var(--text-muted)]">
            {tagQuery.trim() ? "Nenhuma tag encontrada." : "Nenhuma tag cadastrada."}
          </p>
        )}
      </div>
      {selectedTagIds.length > 0 && (
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, tagIds: undefined }))}
          className="mt-2 font-display text-[11px] font-semibold text-[var(--brand-primary)]"
        >
          Limpar tags
        </button>
      )}
    </div>
  );

  const middleContent = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-[2] border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-modal)] px-4 pb-3 pt-4">
        <div
          role="tablist"
          aria-label="Categorias de filtros"
          className="flex items-center gap-1 overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] p-1 [scrollbar-width:none]"
        >
          {MIDDLE_TABS.map((tab) => {
            const active = middleTab === tab.id;
            const count = middleTabCount(tab.id, draft);
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMiddleTab(tab.id)}
                className={cn(
                  "inline-flex min-w-max flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2.5 py-2 font-display text-[11px] font-bold transition-colors",
                  active
                    ? "bg-[var(--glass-bg-modal)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                      active
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-[var(--glass-border)] text-[var(--text-secondary)]",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 [scrollbar-width:thin]">
        <div className="mb-4">
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
            {MIDDLE_TABS.find((t) => t.id === middleTab)?.label}
          </h3>
          <p className="mt-0.5 font-body text-[11.5px] text-[var(--text-muted)]">
            {MIDDLE_TABS.find((t) => t.id === middleTab)?.hint}
          </p>
        </div>
        {middleTab === "conversa" ? conversaContent : negocioContent}
      </div>
    </div>
  );

  return (
    <>
      <TooltipGlass label="Filtrar conversas" side="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors",
            activeCount > 0 || open
              ? "border-[var(--brand-primary)]/40 bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:text-[var(--brand-primary)]",
          )}
        >
          <IconFilter size={17} stroke={2} />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </TooltipGlass>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <InboxFilterModalShell
            wide={isDesktop}
            onClose={() => setOpen(false)}
            draftCount={draftCount}
            onClear={clear}
            clearDisabled={draftCount === 0 && activeCount === 0}
            onApply={apply}
          >
            {isDesktop ? (
              <div
                className="grid h-full min-h-0"
                style={{
                  gridTemplateColumns: "200px minmax(0,1.2fr) minmax(220px,.85fr)",
                }}
              >
                <aside className="min-h-0 overflow-y-auto border-r border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)] p-4 [scrollbar-width:none]">
                  {sortColumn}
                </aside>
                <main className="min-h-0 overflow-hidden bg-[var(--glass-bg-base)]">
                  {middleContent}
                </main>
                <aside className="min-h-0 overflow-hidden border-l border-[var(--glass-border-subtle)] p-4">
                  {tagsColumn}
                </aside>
              </div>
            ) : (
              <div className="h-full space-y-4 overflow-y-auto p-4">
                {sortColumn}
                <div className="border-t border-[var(--glass-border-subtle)] pt-3">
                  {middleContent}
                </div>
                <div className="min-h-[220px] rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] p-3">
                  {tagsColumn}
                </div>
              </div>
            )}
          </InboxFilterModalShell>,
          document.body,
        )}
    </>
  );
}
