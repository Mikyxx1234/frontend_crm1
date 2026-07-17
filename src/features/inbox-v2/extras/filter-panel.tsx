"use client";

/*
 * InboxFilterButton — botão de funil no header da coluna de conversas
 * que abre um painel (portal) segmentado por abas (padrão Contatos/Funil).
 *
 * Filtros que vão ao backend (GET /api/conversations): ownerId,
 * withoutOwner, channel, stageId, tagIds, sources. Já a ORDEM e a
 * JANELA de 24h são aplicadas CLIENT-SIDE no client-page.
 *
 * Overlay via `usePortalPopover`. Estado em DRAFT — só aplica em "Aplicar".
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useMyPermissions } from "@/hooks/use-my-permissions";
import {
  IconArrowsSort,
  IconBriefcase,
  IconCheck,
  IconChevronDown,
  IconFilter,
  IconMessageCircle,
  IconRotateClockwise,
  IconTag,
  IconX,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { useTeamUsers } from "@/features/inbox-v2/hooks";
import {
  getPipelineBoard,
  listChannels,
  listPipelines,
  listTags,
  type InboxFilters,
} from "@/features/inbox-v2/api";
import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";
import { SOURCE_NONE } from "@/components/pipeline/kanban-filters/types";
import { useContactSources } from "@/hooks/use-contact-sources";

interface InboxFilterButtonProps {
  value: InboxFilters;
  onChange: (next: InboxFilters) => void;
}

/** Tipos de canal suportados pelo filtro `channel` do backend. */
const CHANNEL_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Todos" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "meta", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "email", label: "E-mail" },
  { value: "webchat", label: "Webchat / Formulário" },
];

/** Conversa aberta/fechada (janela 24h Meta/WhatsApp) — client-side. */
const WINDOW_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Todas" },
  { value: "open", label: "Aberta" },
  { value: "closed", label: "Fechada" },
];

/** Opções de ordenação (aplicadas client-side). */
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
const OWNER_NONE = "__none__";

type FilterTab = "ordenar" | "conversa" | "negocio" | "tags";

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
  { id: "ordenar", label: "Ordenar", icon: <IconArrowsSort size={13} stroke={2.2} /> },
  { id: "conversa", label: "Conversa", icon: <IconMessageCircle size={13} stroke={2.2} /> },
  { id: "negocio", label: "Negócio", icon: <IconBriefcase size={13} stroke={2.2} /> },
  { id: "tags", label: "Tags", icon: <IconTag size={13} stroke={2.2} /> },
];

function sortIdFromFilters(f: InboxFilters): string {
  if (!f.sortBy) return DEFAULT_SORT_ID;
  const match = SORT_OPTIONS.find(
    (o) => o.sortBy === f.sortBy && o.sortOrder === (f.sortOrder ?? "desc"),
  );
  return match?.id ?? DEFAULT_SORT_ID;
}

/** Conta filtros ativos (ignora ordenação no default) para o badge. */
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

function tabCount(id: FilterTab, f: InboxFilters): number {
  switch (id) {
    case "ordenar":
      return sortIdFromFilters(f) !== DEFAULT_SORT_ID ? 1 : 0;
    case "conversa": {
      let n = 0;
      if (f.ownerId || f.withoutOwner) n += 1;
      if (f.channel) n += 1;
      if (f.windowState) n += 1;
      return n;
    }
    case "negocio": {
      let n = 0;
      if (f.stageId) n += 1;
      if (f.sources && f.sources.length > 0) n += 1;
      return n;
    }
    case "tags":
      return f.tagIds && f.tagIds.length > 0 ? 1 : 0;
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block font-display text-[9.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </span>
  );
}

function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

export function InboxFilterButton({ value, onChange }: InboxFilterButtonProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();
  const [draft, setDraft] = useState<InboxFilters>(value);
  const [tab, setTab] = useState<FilterTab>("ordenar");
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(value);
      setTab("ordenar");
      setSourcesOpen(false);
    }
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
  const channelGrants = myPerms?.channelGrants ?? [];

  const channelOptions = useMemo(() => {
    const kinds = new Set(
      channels.map((c) => (c.kind ?? "").toLowerCase()).filter(Boolean),
    );
    const filtered = CHANNEL_OPTIONS.filter((o) => {
      if (o.value === "") return true;
      if (kinds.size > 0 && !kinds.has(o.value)) return false;
      if (channelGrants.length > 0) {
        return channelGrants.some(
          (g) => g === o.value || g.startsWith(`${o.value}:`),
        );
      }
      return true;
    });
    return filtered.length > 1 ? filtered : CHANNEL_OPTIONS;
  }, [channels, channelGrants]);

  const selectedTagIds = draft.tagIds ?? [];
  const selectedSources = draft.sources ?? [];
  const selectedSourcesLabel =
    selectedSources.length === 0
      ? "Todas"
      : selectedSources.length === 1
        ? selectedSources[0] === SOURCE_NONE
          ? "Sem origem"
          : selectedSources[0]
        : `${selectedSources.length} selecionadas`;

  const activeCount = countActive(value);
  const draftCount = countActive(draft);
  const pos = computePopoverPosition(rect, 560, 400);

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
    close();
  }

  function clear() {
    setDraft({});
    setSourcesOpen(false);
  }

  const ownerValue = draft.withoutOwner
    ? OWNER_NONE
    : (draft.ownerId ?? "");

  return (
    <>
      <TooltipGlass label="Filtrar conversas" side="bottom">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
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

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Filtros de conversas"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 380,
                isolation: "isolate",
              }}
              className="z-(--z-popover) flex max-h-[80vh] flex-col overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.13)] v2-dark:bg-[var(--glass-bg-modal)] v2-dark:shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                    Filtros
                  </span>
                  <FilterCountBadge count={draftCount || activeCount} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={clear}
                    disabled={draftCount === 0 && activeCount === 0}
                    className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
                  >
                    <IconRotateClockwise size={13} /> Limpar
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Fechar"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                  >
                    <IconX size={15} />
                  </button>
                </div>
              </div>

              {/* Abas segmentadas */}
              <div className="px-4 pb-3">
                <div
                  role="tablist"
                  aria-label="Seções do filtro"
                  className="flex items-center gap-0.5 rounded-full bg-[var(--glass-bg-strong)] p-1"
                >
                  {FILTER_TABS.map((t) => {
                    const active = tab === t.id;
                    const badge = tabCount(t.id, draft);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setTab(t.id);
                          setSourcesOpen(false);
                        }}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-1.5 font-display text-[11px] font-bold transition-all",
                          active
                            ? "bg-[var(--glass-bg-modal,#fff)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
                            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                        )}
                      >
                        <span className={active ? "text-[var(--brand-primary)]" : undefined}>
                          {t.icon}
                        </span>
                        <span className="truncate">{t.label}</span>
                        {badge > 0 && (
                          <span
                            className={cn(
                              "inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-bold",
                              active
                                ? "bg-[var(--brand-primary)] text-white"
                                : "bg-[var(--glass-border)] text-[var(--text-secondary)]",
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conteúdo da aba */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
                {tab === "ordenar" && (
                  <div className="flex flex-col gap-2" role="listbox" aria-label="Ordenar por">
                    <p className="mb-0.5 font-display text-[12px] font-semibold text-[var(--text-muted)]">
                      Ordenar resultados por
                    </p>
                    {SORT_OPTIONS.map((opt) => {
                      const selected = sortIdFromFilters(draft) === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              sortBy: opt.sortBy,
                              sortOrder: opt.sortOrder,
                            }))
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left font-display text-[13px] font-semibold transition-colors",
                            selected
                              ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--text-primary)]"
                              : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                              selected
                                ? "border-[var(--brand-primary)]"
                                : "border-[var(--glass-border)]",
                            )}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                            )}
                          </span>
                          {opt.label}
                          {selected && (
                            <IconCheck size={14} stroke={2.6} className="ml-auto text-[var(--brand-primary)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {tab === "conversa" && (
                  <>
                    <div>
                      <FieldLabel>Responsável</FieldLabel>
                      <DropdownGlass
                        triggerClassName="w-full h-8 px-2.5 text-xs"
                        itemClassName="text-xs py-1.5"
                        value={ownerValue}
                        onValueChange={(v) => {
                          if (v === OWNER_NONE) {
                            setDraft((d) => ({
                              ...d,
                              ownerId: undefined,
                              withoutOwner: true,
                            }));
                          } else {
                            setDraft((d) => ({
                              ...d,
                              ownerId: v || undefined,
                              withoutOwner: undefined,
                            }));
                          }
                        }}
                        options={[
                          { value: "", label: "Todos" },
                          { value: OWNER_NONE, label: "Sem responsável" },
                          ...users.map((u) => ({
                            value: u.id,
                            label: u.name || u.email,
                          })),
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Canal</FieldLabel>
                      <DropdownGlass
                        triggerClassName="w-full h-8 px-2.5 text-xs"
                        itemClassName="text-xs py-1.5"
                        value={draft.channel ?? ""}
                        onValueChange={(v) =>
                          setDraft((d) => ({ ...d, channel: v || undefined }))
                        }
                        options={channelOptions.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                      />
                    </div>

                    <div>
                      <FieldLabel>Conversa</FieldLabel>
                      <DropdownGlass
                        triggerClassName="w-full h-8 px-2.5 text-xs"
                        itemClassName="text-xs py-1.5"
                        value={draft.windowState ?? ""}
                        onValueChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            windowState: (v as "open" | "closed") || undefined,
                          }))
                        }
                        options={WINDOW_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                      />
                    </div>
                  </>
                )}

                {tab === "negocio" && (
                  <>
                    <div>
                      <FieldLabel>Negócio na etapa</FieldLabel>
                      <DropdownGlass
                        triggerClassName="w-full h-8 px-2.5 text-xs"
                        itemClassName="text-xs py-1.5"
                        value={draft.stageId ?? ""}
                        onValueChange={(v) =>
                          setDraft((d) => ({ ...d, stageId: v || undefined }))
                        }
                        disabled={stages.length === 0}
                        options={[
                          { value: "", label: "Nenhum selecionado" },
                          ...stages.map((s) => ({ value: s.id, label: s.name })),
                        ]}
                      />
                    </div>

                    <div>
                      <FieldLabel>Origem</FieldLabel>
                      <button
                        type="button"
                        onClick={() => setSourcesOpen((v) => !v)}
                        aria-expanded={sourcesOpen}
                        className="group inline-flex h-8 w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 font-display text-[12px] font-semibold shadow-[var(--glass-shadow-sm)] backdrop-blur-sm transition-colors hover:bg-[var(--glass-bg-strong)] data-[state=open]:ring-2 data-[state=open]:ring-[var(--brand-primary)]/40"
                      >
                        <span
                          className={cn(
                            "truncate",
                            selectedSources.length === 0 && "text-[var(--text-muted)]",
                          )}
                        >
                          {selectedSourcesLabel}
                        </span>
                        <IconChevronDown
                          size={15}
                          className={cn(
                            "ml-auto shrink-0 text-[var(--text-muted)] transition-transform",
                            sourcesOpen && "rotate-180",
                          )}
                        />
                      </button>

                      {sourcesOpen && (
                        <div className="mt-1 max-h-44 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white p-1 v2-dark:bg-[var(--glass-bg-modal)]">
                          <button
                            type="button"
                            onClick={() => toggleSource(SOURCE_NONE)}
                            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                                selectedSources.includes(SOURCE_NONE)
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                  : "border-[var(--glass-border)]",
                              )}
                            >
                              {selectedSources.includes(SOURCE_NONE) && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            <span className="truncate font-display text-xs text-[var(--text-primary)]">
                              Sem origem
                            </span>
                          </button>
                          {contactSources.length === 0 ? (
                            <p className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                              Nenhuma origem cadastrada.
                            </p>
                          ) : (
                            contactSources.map((source) => {
                              const selected = selectedSources.includes(source);
                              return (
                                <button
                                  key={source}
                                  type="button"
                                  onClick={() => toggleSource(source)}
                                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
                                >
                                  <span
                                    className={cn(
                                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                                      selected
                                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                        : "border-[var(--glass-border)]",
                                    )}
                                  >
                                    {selected && (
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M20 6 9 17l-5-5" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className="truncate font-display text-xs text-[var(--text-primary)]">
                                    {source}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {tab === "tags" && (
                  <div className="max-h-52 space-y-0.5 overflow-y-auto">
                    {tags.length === 0 ? (
                      <p className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                        Nenhuma tag cadastrada.
                      </p>
                    ) : (
                      tags.map((t) => {
                        const selected = selectedTagIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTag(t.id)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]",
                              selected && "bg-[var(--color-primary-soft)]",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border",
                                selected
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                  : "border-[var(--glass-border)]",
                              )}
                            >
                              {selected && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: t.color ?? "var(--brand-primary)" }}
                            />
                            <span className="truncate font-display text-xs text-[var(--text-primary)]">
                              {t.name}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--glass-border-subtle)] px-4 py-3">
                <button
                  type="button"
                  onClick={apply}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
                >
                  {draftCount > 0 ? `Aplicar (${draftCount})` : "Aplicar"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
