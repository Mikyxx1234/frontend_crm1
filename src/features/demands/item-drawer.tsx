"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTeamUsersQuery } from "@/features/shared/queries/team-users";
import { useCan } from "@/hooks/use-my-permissions";
import { useDemandItem, useDemandMutations, kindOptions, priorityOptions } from "./hooks";
import { EVENT_LABEL, KIND_LABEL, PRIORITY_LABEL } from "./types";

export function DemandItemDrawer({
  itemId,
  boardId,
  onClose,
}: {
  itemId: string | null;
  boardId: string;
  onClose: () => void;
}) {
  const { data: item, isLoading } = useDemandItem(itemId);
  const { patchItem, comment, vote } = useDemandMutations();
  const { data: users = [] } = useTeamUsersQuery();
  const canEdit = useCan("demand:edit");
  const canComment = useCan("demand:comment");
  const canVote = useCan("demand:vote");
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    setDraft("");
  }, [itemId]);

  return (
    <FormDialog
      open={!!itemId}
      onOpenChange={(open) => !open && onClose()}
      title={item?.title ?? "Demanda"}
      description={item ? `#${item.number}` : undefined}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {canComment && item ? (
            <Button
              form="demand-comment-form"
              type="submit"
              disabled={!draft.trim() || comment.isPending}
            >
              Comentar
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading || !item ? (
        <p className="text-[13px] text-[var(--text-muted)]">Carregando…</p>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{KIND_LABEL[item.kind]}</Badge>
            <Badge variant="secondary">{PRIORITY_LABEL[item.priority]}</Badge>
            <button
              type="button"
              disabled={!canVote || vote.isPending}
              onClick={() => vote.mutate({ id: item.id, boardId })}
              className="rounded-full border border-[var(--glass-border)] px-2.5 py-0.5 text-[11px] font-semibold hover:border-primary/40"
            >
              {item.votedByMe ? "Votado" : "Votar"} · {item.votesCount}
            </button>
          </div>

          {item.description ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {item.description}
            </p>
          ) : (
            <p className="text-[13px] text-[var(--text-muted)]">Sem descrição.</p>
          )}

          {canEdit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Tipo</Label>
                <SelectNative
                  value={item.kind}
                  onChange={(e) =>
                    patchItem.mutate({
                      id: item.id,
                      boardId,
                      patch: { kind: e.target.value as typeof item.kind },
                    })
                  }
                >
                  {kindOptions().map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="grid gap-1">
                <Label>Prioridade</Label>
                <SelectNative
                  value={item.priority}
                  onChange={(e) =>
                    patchItem.mutate({
                      id: item.id,
                      boardId,
                      patch: { priority: e.target.value as typeof item.priority },
                    })
                  }
                >
                  {priorityOptions().map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label>Responsável</Label>
                <SelectNative
                  value={item.assigneeId ?? ""}
                  onChange={(e) =>
                    patchItem.mutate({
                      id: item.id,
                      boardId,
                      patch: { assigneeId: e.target.value || null },
                    })
                  }
                >
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-[var(--text-primary)]">
              Comentários
            </h3>
            <div className="grid gap-2">
              {item.comments.length === 0 && (
                <p className="text-[12px] text-[var(--text-muted)]">Nenhum comentário ainda.</p>
              )}
              {item.comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 py-2"
                >
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {c.author.name} ·{" "}
                    {formatDistanceToNow(new Date(c.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13px]">{c.content}</p>
                </div>
              ))}
            </div>
            {canComment && (
              <form
                id="demand-comment-form"
                className="mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text) return;
                  comment.mutate(
                    { id: item.id, content: text },
                    { onSuccess: () => setDraft("") },
                  );
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Atualizar o time…"
                  rows={3}
                />
              </form>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-[var(--text-primary)]">
              Atividade
            </h3>
            <ul className="grid gap-1.5">
              {item.events.map((ev) => (
                <li key={ev.id} className="text-[12px] text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">
                    {ev.actor?.name ?? "Sistema"}
                  </span>{" "}
                  {EVENT_LABEL[ev.type] ?? ev.type}
                  {typeof ev.payload?.toStageName === "string"
                    ? ` → ${ev.payload.toStageName}`
                    : ""}
                  {" · "}
                  {formatDistanceToNow(new Date(ev.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </FormDialog>
  );
}
