"use client";

import { apiUrl } from "@/lib/api";
/**
 * TagPopover — popover de etiquetas da Inbox.
 *
 * Duas operações:
 *   1) Toggle (add/remove) de tags existentes sobre a conversa atual.
 *      Chama `POST /api/conversations/[id]/tags` que replica a tag no
 *      contato e, quando existir, no deal OPEN vinculado (ver route.ts).
 *   2) Criação de nova tag com:
 *        - emoji opcional (picker embutido, prefixado ao `name`);
 *        - paleta de cores pastéis curada (2 linhas × 9 colunas);
 *        - preview da etiqueta em tempo real.
 *      A tag criada é imediatamente aplicada à conversa (add).
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { dt } from "@/lib/design-tokens";
import { cn, tagPillStyle } from "@/lib/utils";
import { EmojiPicker } from "@/components/inbox/emoji-picker";

type TagItem = { id: string; name: string; color: string };

// Paleta pastel curada — 18 tons que funcionam tanto em bg leve (color20)
// quanto em texto (color sólido), garantindo contraste legível em todas as
// linhas/colunas.
const TAG_COLOR_PALETTE: string[] = [
  // Linha 1 — frios / verdes / amarelos
  "#93c5fd", "#a5b4fc", "#67e8f9", "#5eead4", "#86efac", "#bef264", "#fde047", "#fcd34d", "#fbbf24",
  // Linha 2 — quentes / rosas / roxos / neutros
  "#fca5a5", "#f87171", "#f472b6", "#d8b4fe", "#c4b5fd", "#94a3b8", "#cbd5e1", "#a3a3a3", "#d6d3d1",
];

async function fetchTags(): Promise<TagItem[]> {
  const res = await fetch(apiUrl("/api/tags"));
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : data.tags ?? data.items ?? [];
}

// Detecta se `name` começa com um emoji (range BMP estendido). Usado pelo
// preview/listagem para separar visualmente o emoji do texto.
function splitEmojiPrefix(name: string): { emoji: string | null; label: string } {
  if (!name) return { emoji: null, label: "" };
  // eslint-disable-next-line no-misleading-character-class
  const match = name.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u);
  if (match) {
    return { emoji: match[1], label: name.slice(match[0].length).trim() };
  }
  return { emoji: null, label: name };
}

function TagPreviewPill({ name, color }: { name: string; color: string }) {
  const safe = name.trim() || "Etiqueta";
  const { emoji, label } = splitEmojiPrefix(safe);
  return (
    <span
      className={cn(dt.pill.base, "min-h-[22px] gap-1 px-3")}
      style={tagPillStyle(safe, color)}
    >
      {emoji && <span className="text-[13px] leading-none">{emoji}</span>}
      <span>{label || "Etiqueta"}</span>
    </span>
  );
}

export function TagPopover({
  conversationId,
  currentTags = [],
  onTagsUpdated,
  children,
}: {
  conversationId: string;
  currentTags: { name: string; color: string }[];
  onTagsUpdated?: () => void;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [showCreate, setShowCreate] = React.useState(false);

  // Estado do formulário de criação
  const [newTagName, setNewTagName] = React.useState("");
  const [newTagColor, setNewTagColor] = React.useState<string>(TAG_COLOR_PALETTE[0]);
  const [emojiOpen, setEmojiOpen] = React.useState(false);

  const popoverRef = React.useRef<HTMLDivElement>(null);

  const { data: allTags = [], isLoading } = useQuery<TagItem[]>({
    queryKey: ["tags-list"],
    queryFn: fetchTags,
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, search]);

  const currentTagNames = new Set(currentTags.map((t) => t.name.toLowerCase()));
  const appliedCount = allTags.filter((t) => currentTagNames.has(t.name.toLowerCase())).length;

  const toggleMutation = useMutation({
    mutationFn: async ({ tagId, action }: { tagId: string; action: "add" | "remove" }) => {
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/tags`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Erro ao atualizar etiqueta");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-messages"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onTagsUpdated?.();
      if (vars.action === "add") toast.success("Etiqueta aplicada");
      else toast.success("Etiqueta removida");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch(apiUrl("/api/tags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Erro ao criar etiqueta");
      }
      return (await res.json()) as TagItem;
    },
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ["tags-list"] });
      toggleMutation.mutate({ tagId: tag.id, action: "add" });
      setNewTagName("");
      setNewTagColor(TAG_COLOR_PALETTE[0]);
      setShowCreate(false);
      setEmojiOpen(false);
      toast.success(`Etiqueta "${tag.name}" criada`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setShowCreate(false);
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const submitCreate = React.useCallback(() => {
    const name = newTagName.trim();
    if (!name || createMutation.isPending) return;
    if (name.length > 30) {
      toast.warning("Máximo de 30 caracteres");
      return;
    }
    createMutation.mutate({ name, color: newTagColor });
  }, [newTagName, newTagColor, createMutation]);

  return (
    <div className="relative" ref={popoverRef}>
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {children}
      </div>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-card shadow-xl">
          {/* Header: título + criar + fechar */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[14px] font-bold text-foreground">Etiquetas</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate((v) => !v);
                  setEmojiOpen(false);
                }}
                className="rounded-full border border-accent px-3 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/5"
              >
                {showCreate ? "Cancelar" : "Criar etiqueta"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                  setShowCreate(false);
                  setEmojiOpen(false);
                }}
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Formulário rico de criação (emoji + nome + cores + preview) */}
          {showCreate && (
            <div className="space-y-3 border-b border-border px-4 py-3">
              {/* Linha 1: emoji picker button + input de nome */}
              <div className="relative">
                <div className="flex items-stretch gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((v) => !v)}
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      emojiOpen
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}
                    aria-label="Selecionar emoji"
                  >
                    {(() => {
                      const { emoji } = splitEmojiPrefix(newTagName);
                      return emoji ? (
                        <span className="text-[18px] leading-none">{emoji}</span>
                      ) : (
                        <Smile className="size-4" />
                      );
                    })()}
                  </button>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value.slice(0, 30))}
                    placeholder="Nome da etiqueta (máx 30)"
                    maxLength={30}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-muted/30 px-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitCreate();
                      }
                      if (e.key === "Escape") {
                        setShowCreate(false);
                        setNewTagName("");
                        setEmojiOpen(false);
                      }
                    }}
                    autoFocus
                  />
                </div>

                {emojiOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1.5">
                    <EmojiPicker
                      open={emojiOpen}
                      onPick={(emoji) => {
                        const { label } = splitEmojiPrefix(newTagName);
                        const next = `${emoji} ${label}`.trim().slice(0, 30);
                        setNewTagName(next);
                        setEmojiOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Paleta de cores */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Cor de fundo</p>
                <div className="grid grid-cols-9 gap-1.5">
                  {TAG_COLOR_PALETTE.map((c) => {
                    const selected = c.toLowerCase() === newTagColor.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewTagColor(c)}
                        className={cn(
                          "relative size-6 rounded-full transition-transform hover:scale-110",
                          selected && "ring-2 ring-offset-2 ring-offset-card",
                        )}
                        style={{
                          backgroundColor: c,
                          ...(selected ? ({ ["--tw-ring-color" as string]: c } as React.CSSProperties) : {}),
                        }}
                        aria-label={`Cor ${c}`}
                      >
                        {selected && (
                          <Check className="absolute inset-0 m-auto size-3 text-white drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview + ação */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <TagPreviewPill name={newTagName} color={newTagColor} />
                <button
                  type="button"
                  onClick={submitCreate}
                  disabled={!newTagName.trim() || createMutation.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-4 text-[12px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Criando…
                    </>
                  ) : (
                    "Criar"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Busca */}
          <div className="px-4 py-2.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etiqueta"
              className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              autoFocus={!showCreate}
            />
          </div>

          {/* Contadores */}
          <div className="flex items-center justify-between px-4 pb-2">
            <span className="text-[11px] text-muted-foreground">
              {filtered.length} etiqueta{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[11px] font-medium text-accent">
              {appliedCount} aplicada{appliedCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Lista de tags com checkboxes */}
          <div className="max-h-52 overflow-y-auto px-2 pb-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-3 text-center text-[12px] text-muted-foreground">Nenhuma etiqueta encontrada</p>
            ) : (
              filtered.map((tag) => {
                const isSelected = currentTagNames.has(tag.name.toLowerCase());
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleMutation.mutate({ tagId: tag.id, action: isSelected ? "remove" : "add" })}
                    disabled={toggleMutation.isPending}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                  >
                    <TagPreviewPill name={tag.name} color={tag.color} />
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border bg-background",
                      )}
                    >
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
