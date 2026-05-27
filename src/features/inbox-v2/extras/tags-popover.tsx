"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Chip } from "@/components/crm/chip";
import {
  createTag,
  listTags,
  setConversationTags,
  type Tag,
} from "@/features/inbox-v2/api";

interface TagsPopoverProps {
  conversationId: string | null;
  currentTags: Tag[];
  disabled?: boolean;
}

export function TagsPopover({
  conversationId,
  currentTags,
  disabled,
}: TagsPopoverProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const setTagsMutation = useMutation<
    void,
    Error,
    { conversationId: string; tagIds: string[] }
  >({
    mutationFn: (vars) => setConversationTags(vars.conversationId, vars.tagIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      qc.invalidateQueries({ queryKey: ["contact-detail"] });
    },
    onError: (err) => toast.error(err.message || "Falha ao salvar tag"),
  });

  const createTagMutation = useMutation<Tag, Error, string>({
    mutationFn: (name) => createTag({ name }),
    onSuccess: (newTag) => {
      qc.setQueryData<Tag[]>(["inbox-v2-tags"], (old) =>
        old ? [...old, newTag] : [newTag],
      );
      if (conversationId) {
        const next = Array.from(selectedIds);
        next.push(newTag.id);
        setTagsMutation.mutate({ conversationId, tagIds: next });
      }
      setFilter("");
    },
    onError: (err) => toast.error(err.message || "Falha ao criar tag"),
  });

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggleTag(tagId: string) {
    if (!conversationId) return;
    const next = new Set(selectedIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setTagsMutation.mutate({ conversationId, tagIds: Array.from(next) });
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

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled || !conversationId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Chip variant="ghost">+Tag</Chip>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-2 backdrop-blur-md shadow-[var(--glass-shadow)]">
          <input
            autoFocus
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar ou criar…"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                canCreate &&
                !createTagMutation.isPending
              ) {
                e.preventDefault();
                createTagMutation.mutate(filter.trim());
              }
            }}
            className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
          <ul role="listbox" className="max-h-56 overflow-y-auto">
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
                    className={`flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] hover:bg-white/10 ${
                      checked
                        ? "bg-white/10 text-[var(--brand-primary)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            t.color ?? "var(--brand-primary)",
                        }}
                      />
                      {t.name}
                    </span>
                    {checked && <span aria-hidden>✓</span>}
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
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--brand-primary)] hover:bg-white/10"
                >
                  <span>Criar &ldquo;{filter.trim()}&rdquo;</span>
                  <span aria-hidden>+</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
