"use client";

/*
 * InboxFilterButton — botão de funil no header da coluna de conversas
 * que abre um painel (portal) para organizar/filtrar a lista.
 *
 * Filtros que vão ao backend (GET /api/conversations): ownerId, channel,
 * stageId, tagIds. Já a ORDEM e a JANELA de 24h são aplicadas CLIENT-SIDE
 * no client-page (ver `InboxFilters`), por isso o painel apenas as expõe
 * no mesmo objeto de filtros.
 *
 * Overlay via `usePortalPopover` (mesmo dos popovers de tag/responsável).
 * Estado em DRAFT local — só aplica em "Aplicar filtros".
 */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { IconChevronDown, IconFilter, IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
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

/** Janela de atendimento (24h da Meta/WhatsApp) — filtro client-side. */
const WINDOW_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Todas" },
  { value: "open", label: "Aberta (em atendimento)" },
  { value: "closed", label: "Fechada (expirada)" },
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
  if (f.ownerId) n += 1;
  if (f.channel) n += 1;
  if (f.stageId) n += 1;
  if (f.tagIds && f.tagIds.length > 0) n += 1;
  if (f.windowState) n += 1;
  if (sortIdFromFilters(f) !== DEFAULT_SORT_ID) n += 1;
  return n;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block font-display text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </span>
  );
}

const controlClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-2.5 py-2 font-display text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--brand-primary)]/40";

export function InboxFilterButton({ value, onChange }: InboxFilterButtonProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();
  const [draft, setDraft] = useState<InboxFilters>(value);
  const [tagsOpen, setTagsOpen] = useState(false);

  // Sincroniza o draft com o valor externo sempre que (re)abrir o painel.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  // ── Fontes de dados (só busca quando aberto) ──────────────────────
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

  // Só mostra tipos de canal que existem na org (+ "Todos"). Cai no
  // catálogo completo se /api/channels não trouxer kinds reconhecidos.
  const channelOptions = useMemo(() => {
    const kinds = new Set(
      channels.map((c) => (c.kind ?? "").toLowerCase()).filter(Boolean),
    );
    const filtered = CHANNEL_OPTIONS.filter(
      (o) => o.value === "" || kinds.size === 0 || kinds.has(o.value),
    );
    return filtered.length > 1 ? filtered : CHANNEL_OPTIONS;
  }, [channels]);

  const selectedTagIds = draft.tagIds ?? [];
  const selectedTagsLabel =
    selectedTagIds.length === 0
      ? "Todas"
      : selectedTagIds.length === 1
        ? tags.find((t) => t.id === selectedTagIds[0])?.name ?? "1 selecionada"
        : `${selectedTagIds.length} selecionadas`;

  const activeCount = countActive(value);
  const pos = computePopoverPosition(rect, 580, 300);

  function toggleTag(id: string) {
    setDraft((d) => {
      const current = d.tagIds ?? [];
      const next = current.includes(id)
        ? current.filter((t) => t !== id)
        : [...current, id];
      return { ...d, tagIds: next.length > 0 ? next : undefined };
    });
  }

  function apply() {
    onChange(draft);
    close();
  }

  function clear() {
    setDraft({});
    setTagsOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Filtrar conversas"
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
                width: 300,
                isolation: "isolate",
              }}
              className="z-[10000] flex max-h-[80vh] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.20)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-4 py-3">
                <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                  Filtros
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fechar"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
                >
                  <IconX size={15} />
                </button>
              </div>

              {/* Corpo rolável */}
              <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
                {/* Atendentes */}
                <div>
                  <FieldLabel>Atendentes</FieldLabel>
                  <select
                    className={controlClass}
                    value={draft.ownerId ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        ownerId: e.target.value || undefined,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Canal / Instância */}
                <div>
                  <FieldLabel>Canal</FieldLabel>
                  <select
                    className={controlClass}
                    value={draft.channel ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        channel: e.target.value || undefined,
                      }))
                    }
                  >
                    {channelOptions.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Negócio na etapa */}
                <div>
                  <FieldLabel>Negócio na etapa</FieldLabel>
                  <select
                    className={controlClass}
                    value={draft.stageId ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        stageId: e.target.value || undefined,
                      }))
                    }
                    disabled={stages.length === 0}
                  >
                    <option value="">Nenhum selecionado</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Janela em atendimento (24h) */}
                <div>
                  <FieldLabel>Janela de conversa</FieldLabel>
                  <select
                    className={controlClass}
                    value={draft.windowState ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        windowState:
                          (e.target.value as "open" | "closed") || undefined,
                      }))
                    }
                  >
                    {WINDOW_OPTIONS.map((o) => (
                      <option key={o.value || "all"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags — dropdown com checklist multi-seleção */}
                <div>
                  <FieldLabel>Tags</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setTagsOpen((v) => !v)}
                    aria-expanded={tagsOpen}
                    className={cn(controlClass, "flex items-center justify-between gap-2 text-left")}
                  >
                    <span
                      className={cn(
                        "truncate",
                        selectedTagIds.length === 0 && "text-[var(--text-muted)]",
                      )}
                    >
                      {selectedTagsLabel}
                    </span>
                    <IconChevronDown
                      size={15}
                      className={cn(
                        "shrink-0 text-[var(--text-muted)] transition-transform",
                        tagsOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {tagsOpen && (
                    <div className="mt-1 max-h-44 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white p-1">
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
                              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
                            >
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border",
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
                              <span className="truncate font-display text-[12.5px] text-[var(--text-primary)]">
                                {t.name}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Ordem */}
                <div>
                  <FieldLabel>Ordem</FieldLabel>
                  <select
                    className={controlClass}
                    value={sortIdFromFilters(draft)}
                    onChange={(e) => {
                      const opt = SORT_OPTIONS.find(
                        (o) => o.id === e.target.value,
                      );
                      setDraft((d) => ({
                        ...d,
                        sortBy: opt?.sortBy,
                        sortOrder: opt?.sortOrder,
                      }));
                    }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 border-t border-[var(--glass-border-subtle)] px-4 py-3">
                <button
                  type="button"
                  onClick={clear}
                  className="flex-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-3 py-2 font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)]"
                >
                  Limpar filtros
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="flex-1 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-3 py-2 font-display text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
