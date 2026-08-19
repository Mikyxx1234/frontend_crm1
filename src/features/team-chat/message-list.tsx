"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, FileText, Pin, PinOff, SmilePlus, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import { dayKey, formatClock, formatDayLabel, REACTION_EMOJIS, toPerson } from "./helpers";
import type { TeamChatAttachment, TeamChatMessage, TeamChatReaction, TeamChatRoom } from "./types";

async function copyAttachment(att: TeamChatAttachment) {
  if (att.kind === "sticker" && att.emoji) {
    await navigator.clipboard.writeText(att.emoji);
    toast.success("Figurinha copiada");
    return;
  }
  if (!att.url) throw new Error("Sem arquivo");
  const res = await fetch(att.url);
  if (!res.ok) throw new Error("Falha ao ler o arquivo");
  const blob = await res.blob();
  const type = blob.type || att.mimeType || "application/octet-stream";
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    toast.success(att.kind === "image" ? "Imagem copiada" : "Arquivo copiado");
    return;
  }
  await navigator.clipboard.writeText(att.url);
  toast.success("Link copiado");
}

function reactionMine(r: TeamChatReaction, meId: string) {
  return r.userIds ? r.userIds.includes(meId) : r.mine;
}

export function MessageList({
  room,
  messages,
  meId,
  loading,
  query = "",
  onToggleReaction,
  onTogglePin,
}: {
  room: TeamChatRoom;
  messages: TeamChatMessage[];
  meId: string;
  loading: boolean;
  query?: string;
  onToggleReaction: (id: string, emoji: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const isDirect = room.kind === "DM";
  const firstName = room.name.split(" ")[0];
  const q = query.trim().toLowerCase();
  const pinned = messages.filter((m) => m.pinned);
  const visible = useMemo(() => {
    if (!q) return messages;
    return messages.filter(
      (m) => m.kind === "SYSTEM" || m.content.toLowerCase().includes(q) || (m.author?.name ?? "").toLowerCase().includes(q),
    );
  }, [messages, q]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, room.id]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden" data-wa-thread>
      {pinned.length > 0 && (
        <div className="sticky top-0 z-10 shrink-0 bg-[var(--orbita-block-soft)] px-4 py-2">
          <div className="flex w-full items-start gap-2">
            <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--orbita-selected)]" />
            <div className="min-w-0 flex-1 space-y-1">
              {pinned.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    <span className="font-semibold">{m.author?.name ?? "Colega"}</span>
                    <span className="text-muted-foreground"> · {m.content || "Anexo"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onTogglePin(m.id)}
                    aria-label="Desafixar"
                    className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-white/50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="chat-scroll flex-1 overflow-y-auto px-4 py-3 md:px-8">
        <div className="flex min-h-full w-full flex-col">
          <div className="mb-4 flex justify-center">
            <span className="max-w-md rounded-[var(--orbita-radius-inner)] bg-[var(--orbita-block-soft)] px-3 py-1.5 text-center text-[12.5px] leading-relaxed text-muted-foreground">
              {isDirect
                ? `Esta é o início da sua conversa com ${firstName}.`
                : room.topic || `Este é o início do canal #${room.name}.`}
            </span>
          </div>
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : q && visible.every((m) => m.kind === "SYSTEM") && !visible.some((m) => m.content.toLowerCase().includes(q)) ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
          ) : (
            <div className="flex flex-col">
              {visible.map((msg, i) => {
                if (msg.kind === "SYSTEM") {
                  return (
                    <div key={msg.id} className="my-2 flex justify-center">
                      <span className="rounded-[var(--orbita-radius-inner)] bg-[var(--orbita-block-soft)] px-3 py-1 text-[12px] text-muted-foreground">
                        {msg.content}
                      </span>
                    </div>
                  );
                }
                const mine = msg.authorId === meId;
                const author = msg.author ? toPerson(msg.author) : null;
                const prev = visible[i - 1];
                const next = visible[i + 1];
                const showDay = i === 0 || dayKey(msg.createdAt) !== dayKey(prev.createdAt);
                const first = showDay || !prev || prev.kind === "SYSTEM" || prev.authorId !== msg.authorId;
                const last =
                  !next ||
                  next.kind === "SYSTEM" ||
                  next.authorId !== msg.authorId ||
                  dayKey(next.createdAt) !== dayKey(msg.createdAt);
                return (
                  <div key={msg.id}>
                    {showDay && (
                      <div className="my-3 flex justify-center">
                        <span className="rounded-[var(--orbita-radius-inner)] bg-[var(--orbita-block-soft)] px-3 py-1 text-[12px] font-medium text-muted-foreground">
                          {formatDayLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <MessageRow
                      message={msg}
                      meId={meId}
                      authorName={mine ? "Você" : (author?.name ?? "Colega")}
                      author={author}
                      first={first}
                      last={last}
                      mine={mine}
                      isGroup={!isDirect}
                      onToggleReaction={onToggleReaction}
                      onTogglePin={onTogglePin}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div ref={endRef} className="h-2" />
        </div>
      </div>
    </div>
  );
}

function bubbleRadius(last: boolean, mine: boolean) {
  if (mine) {
    if (last) return "rounded-[16px] rounded-br-[6px]";
    return "rounded-[16px]";
  }
  if (last) return "rounded-[16px] rounded-bl-[6px]";
  return "rounded-[16px]";
}

function MessageRow({
  message,
  meId,
  authorName,
  author,
  first,
  last,
  mine,
  isGroup,
  onToggleReaction,
  onTogglePin,
}: {
  message: TeamChatMessage;
  meId: string;
  authorName: string;
  author: ReturnType<typeof toPerson> | null;
  first: boolean;
  last: boolean;
  mine: boolean;
  isGroup: boolean;
  onToggleReaction: (id: string, emoji: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const [picker, setPicker] = useState(false);
  const reactions = message.reactions ?? [];
  return (
    <div className={cn("flex w-full flex-col", mine ? "items-end" : "items-start", first ? "mt-2.5" : "mt-[2px]")}>
      <div
        className={cn(
          "group/msg flex max-w-[min(85%,32rem)] items-end gap-1.5",
          mine ? "flex-row-reverse" : "flex-row",
        )}
      >
        {isGroup && !mine && (
          <div className="flex w-7 shrink-0 justify-center self-end [&_>_div]:rounded-[var(--orbita-radius-avatar)] [&_img]:rounded-[var(--orbita-radius-avatar)]">
            {last && author ? <Avatar person={author} size="sm" /> : null}
          </div>
        )}
        <div className={cn("flex min-w-0 flex-col", mine ? "items-end" : "items-start")}>
          {first && isGroup && !mine && (
            <span className="mb-0.5 px-1 text-[12.5px] font-medium text-[var(--orbita-selected)]">{authorName}</span>
          )}
          <div className={cn("relative w-fit max-w-full", reactions.length > 0 && "mb-3")}>
            <MessageBody message={message} mine={mine} last={last} pinned={message.pinned} />
            {reactions.length > 0 && (
              <div
                className={cn(
                  "absolute -bottom-2.5 z-[1] flex gap-0.5",
                  mine ? "right-1" : "left-1",
                )}
              >
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    onClick={() => onToggleReaction(message.id, r.emoji)}
                    className={cn(
                      "flex items-center gap-0.5 rounded-full px-1.5 py-px text-[12px]",
                      reactionMine(r, meId)
                        ? "bg-[var(--orbita-selected)] text-white"
                        : "bg-[var(--orbita-block)] text-foreground",
                    )}
                  >
                    <span>{r.emoji}</span>
                    {r.count > 1 && <span className="text-[10px] font-semibold opacity-70">{r.count}</span>}
                  </button>
                ))}
              </div>
            )}
            <div
              className={cn(
                "absolute top-0 z-10 items-center rounded-full bg-[var(--orbita-block)]",
                mine ? "right-full mr-1" : "left-full ml-1",
                picker ? "flex" : "hidden group-hover/msg:flex",
              )}
            >
              {(message.attachments ?? []).length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const firstAtt = message.attachments![0];
                    void copyAttachment(firstAtt).catch(() => toast.error("Não foi possível copiar."));
                  }}
                  aria-label="Copiar"
                  className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setPicker((v) => !v)}
                aria-label="Reagir"
                className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onTogglePin(message.id)}
                aria-label="Fixar"
                className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground"
              >
                {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              {picker && (
                <div
                  className={cn(
                    "absolute top-full z-20 mt-1 flex gap-0.5 rounded-full bg-[var(--orbita-block)] p-1 shadow-lg",
                    mine ? "right-0" : "left-0",
                  )}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onToggleReaction(message.id, emoji);
                        setPicker(false);
                      }}
                      className="grid h-7 w-7 place-items-center rounded-full text-base hover:bg-[var(--orbita-block-soft)]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Timestamp below the bubble */}
      {last && (
        <span className={cn("mt-[10px] text-[10px] text-muted-foreground", mine ? "mr-1" : "ml-8")}>
          {formatClock(message.createdAt)}
        </span>
      )}
    </div>
  );
}

function MessageBody({
  message,
  mine,
  last,
  pinned,
}: {
  message: TeamChatMessage;
  mine: boolean;
  last: boolean;
  pinned: boolean;
}) {
  const attachments = message.attachments ?? [];
  const stickers = attachments.filter((a) => a.kind === "sticker");
  const media = attachments.filter((a) => a.kind !== "sticker");
  const hasText = message.content.trim().length > 0;
  const radius = bubbleRadius(last, mine);
  const bubbleCls = cn(
    "relative w-fit max-w-full",
    radius,
    mine
      ? "bg-[var(--orbita-selected)] text-white"
      : "bg-[var(--orbita-block-soft)] text-foreground",
    pinned && "ring-1 ring-[var(--orbita-selected)]/35",
  );

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      {stickers.map((att, i) => (
        <button
          key={`${att.url}-${att.emoji ?? att.name}-${i}`}
          type="button"
          title="Ctrl+C para copiar"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
              e.preventDefault();
              void copyAttachment(att).catch(() => toast.error("Não foi possível copiar."));
            }
          }}
          onClick={() => void copyAttachment(att).catch(() => toast.error("Não foi possível copiar."))}
          className="relative w-fit text-[56px] leading-none"
        >
          {att.emoji ? (
            att.emoji
          ) : att.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={att.url} alt={att.name} className="h-28 w-28 object-contain" />
          ) : (
            "✨"
          )}
        </button>
      ))}
      {media.map((att, i) => (
        <div key={`${att.url}-${i}`} className={cn(bubbleCls, "overflow-hidden p-1")}>
          <MediaChip att={att} />
        </div>
      ))}
      {hasText && (
        <div className={cn(bubbleCls, "px-3 py-2")}>
          <p className="whitespace-pre-wrap break-words text-[14px] leading-[20px]">{message.content}</p>
        </div>
      )}
    </div>
  );
}

function MediaChip({ att }: { att: TeamChatAttachment }) {
  const copy = () =>
    void copyAttachment(att).catch(() =>
      toast.error("Não foi possível copiar. Tente de novo ou baixe o arquivo."),
    );

  if (att.kind === "image") {
    return (
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
            e.preventDefault();
            copy();
          }
        }}
        className="group/media relative w-fit overflow-hidden rounded-[var(--orbita-radius-inner)] outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={att.url} alt={att.name} className="max-h-72 max-w-[18rem] object-cover" />
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar imagem"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (att.kind === "video") {
    return <video src={att.url} controls className="max-h-72 max-w-[18rem] rounded-[var(--orbita-radius-inner)] bg-black" />;
  }

  if (att.kind === "audio") {
    return (
      <div className="min-w-[220px] px-2 py-1">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={att.url} controls className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
          e.preventDefault();
          copy();
        }
      }}
      className="flex w-fit items-center gap-2 px-2 py-1.5 outline-none"
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="max-w-[180px] truncate text-[13px]">{att.name}</span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar arquivo"
        className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/20"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <a
        href={att.url}
        download={att.name}
        aria-label="Baixar"
        className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/20"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
