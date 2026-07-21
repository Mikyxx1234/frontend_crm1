"use client";

/*
 * ContactTagsPopover — popover de tags ligado a CONTACT (nao Conversation
 * nem Deal). Espelho funcional do TagsPopover deste mesmo diretorio, mas
 * persiste em POST/DELETE /api/contacts/:id/tags em vez das tags da
 * conversa.
 *
 * Por que existe: o `TagsPopover` (conversa) e `TagsPopover` do pipeline
 * (deal) cobrem dois escopos distintos. Faltava o terceiro — tag do
 * contato propriamente dito (vive enquanto o contato existir, atravessa
 * conversas e deals). Decidido no questionario "Tags" (DD9/IB7) como
 * "Expor tags de Contact nos dois lugares, separado de Deal.tags".
 */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chip } from "@/components/crm/chip";
import { createTag, listTags, type Tag } from "@/features/inbox-v2/api";
import { addContactTag, removeContactTag } from "@/features/directory-v2/api";

import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";

interface ContactTagsPopoverProps {
  contactId: string | null;
  currentTags: Tag[];
  disabled?: boolean;
  triggerVariant?: "chip" | "icon";
}

export function ContactTagsPopover({
  contactId,
  currentTags,
  disabled,
  triggerVariant = "chip",
}: ContactTagsPopoverProps) {
  const qc = useQueryClient();
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();
  const [filter, setFilter] = useState("");

  const tagsQuery = useQuery<Tag[]>({
    queryKey: ["inbox-v2-tags"],
    queryFn: listTags,
    enabled: open,
    staleTime: 60_000,
  });

  const selectedIds = useMemo(
    () => new Set(currentTags.map((t) => t.id)),
    [currentTags],
  );

  // Tags de contato sao a fonte canonica do contato. Invalidamos os
  // queries que mostram esses tags em qualquer painel: ContactAside
  // (contact-sidebar), DealDetailPanel (deal-detail-v2 — backend traz
  // contact.tags no include), board v2 e directory.
  function invalidateAfterTagChange() {
    qc.invalidateQueries({ queryKey: ["contact-sidebar"] });
    qc.invalidateQueries({ queryKey: ["contact-detail"] });
    qc.invalidateQueries({ queryKey: ["directory-v2-contacts"] });
    qc.invalidateQueries({ queryKey: ["deal-detail-v2"] });
    qc.invalidateQueries({ queryKey: ["pipeline-board"] });
  }

  const setTagsMutation = useMutation<
    unknown,
    Error,
    { contactId: string; tagId: string; action: "add" | "remove" }
  >({
    mutationFn: (vars) =>
      vars.action === "add"
        ? addContactTag(vars.contactId, vars.tagId)
        : removeContactTag(vars.contactId, vars.tagId),
    onSuccess: invalidateAfterTagChange,
    onError: (err) => toast.error(err.message || "Falha ao salvar tag"),
  });

  const createTagMutation = useMutation<Tag, Error, string>({
    mutationFn: (name) => createTag({ name }),
    onSuccess: (newTag) => {
      qc.setQueryData<Tag[]>(["inbox-v2-tags"], (old) =>
        old ? [...old, newTag] : [newTag],
      );
      if (contactId) {
        setTagsMutation.mutate({
          contactId,
          tagId: newTag.id,
          action: "add",
        });
      }
      setFilter("");
    },
    onError: (err) => toast.error(err.message || "Falha ao criar tag"),
  });

  function toggleTag(tagId: string) {
    if (!contactId) return;
    const action = selectedIds.has(tagId) ? "remove" : "add";
    setTagsMutation.mutate({ contactId, tagId, action });
  }

  const allTags = tagsQuery.data ?? [];
  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const canCreate =
    filter.trim().length > 0 &&
    !allTags.some(
      (t) => t.name.trim().toLowerCase() === filter.trim().toLowerCase(),
    );

  const pos = computePopoverPosition(rect, 280, 256);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || !contactId}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="inline-flex"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Editar tags do contato"
      >
        {triggerVariant === "icon" ? (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[12px] font-bold leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]">
            +
          </span>
        ) : (
          <Chip variant="ghost">+Tag</Chip>
        )}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 256,
                isolation: "isolate",
              }}
              className="z-(--z-popover) rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-2 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
            >
              <div className="mb-2 px-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Tags do contato
              </div>
              <input
                autoFocus
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar ou criar…"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    close();
                    return;
                  }
                  if (
                    e.key === "Enter" &&
                    canCreate &&
                    !createTagMutation.isPending
                  ) {
                    e.preventDefault();
                    createTagMutation.mutate(filter.trim());
                  }
                }}
                className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]/40"
              />
              <ul className="max-h-56 overflow-y-auto">
                {tagsQuery.isLoading && (
                  <li className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                    Carregando…
                  </li>
                )}
                {!tagsQuery.isLoading && filtered.length === 0 && !canCreate && (
                  <li className="px-2 py-2 text-[12px] text-[var(--text-muted)]">
                    Nenhuma tag.
                  </li>
                )}
                {filtered.map((t) => {
                  const checked = selectedIds.has(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={setTagsMutation.isPending}
                        onClick={() => toggleTag(t.id)}
                        className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-[var(--glass-bg-strong)] ${
                          checked
                            ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)] font-semibold"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            aria-hidden
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: t.color ?? "var(--brand-primary)",
                            }}
                          />
                          {t.name}
                        </span>
                        {checked && (
                          <span aria-hidden className="text-[var(--brand-primary)]">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {canCreate && (
                  <li>
                    <button
                      type="button"
                      disabled={createTagMutation.isPending}
                      onClick={() => createTagMutation.mutate(filter.trim())}
                      className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--brand-primary)] transition-colors hover:bg-[var(--color-enterprise-bg)]"
                    >
                      <span>Criar &ldquo;{filter.trim()}&rdquo;</span>
                      <span aria-hidden>+</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
