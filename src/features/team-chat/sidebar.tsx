"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hash, MoreVertical, Plus, Search, SquarePen, Star } from "lucide-react";

import { cn } from "@/lib/utils";

import { Avatar } from "./avatar";
import {
  favoriteKey,
  formatListTime,
  loadOrbitaFavorites,
  saveOrbitaFavorites,
  toPerson,
} from "./helpers";
import type { DirectRow, TeamChatRoom } from "./types";

type ListFilter = "all" | "unread" | "favorites";

type ChatListItem =
  | {
      key: string;
      kind: "dm";
      row: DirectRow;
      favId: string;
      at: number;
      unread: number;
      name: string;
      preview: string;
      time: string;
    }
  | {
      key: string;
      kind: "group";
      room: TeamChatRoom;
      favId: string;
      at: number;
      unread: number;
      name: string;
      preview: string;
      time: string;
    };

function HeaderIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function UnreadPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-[19px] min-w-[19px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ChatRow({
  item,
  active,
  favorited,
  onClick,
  onToggleFavorite,
}: {
  item: ChatListItem;
  active: boolean;
  favorited: boolean;
  onClick: () => void;
  onToggleFavorite: () => void;
}) {
  const unread = item.unread;
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {item.kind === "dm" ? (
          <Avatar person={toPerson(item.row.person)} size="md" showPresence />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Hash className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "truncate text-[16px] leading-tight text-foreground",
                unread > 0 || active ? "font-bold" : "font-medium",
              )}
            >
              {item.kind === "group" ? `#${item.name}` : item.name}
            </span>
            {item.time && (
              <span
                className={cn(
                  "ml-auto shrink-0 text-[12px]",
                  unread > 0 ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                {item.time}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[13.5px] leading-snug",
                unread > 0 ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {item.preview}
            </span>
            <UnreadPill count={unread} />
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={favorited ? "Remover dos favoritos" : "Favoritar"}
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
          favorited
            ? "text-primary"
            : "text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", favorited && "fill-current")} />
      </button>
    </div>
  );
}

export function Sidebar({
  directs,
  groups,
  activeId,
  loading,
  error,
  onSelectRoom,
  onSelectPerson,
  onNew,
}: {
  directs: DirectRow[];
  groups: TeamChatRoom[];
  activeId: string | null;
  loading: boolean;
  error?: string | null;
  onSelectRoom: (id: string) => void;
  onSelectPerson: (personId: string) => void;
  onNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    setFavorites(loadOrbitaFavorites());
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveOrbitaFavorites(next);
      return next;
    });
  }

  const unreadTotal = useMemo(
    () =>
      directs.reduce((n, d) => n + (d.room?.unread ?? 0), 0) +
      groups.reduce((n, g) => n + g.unread, 0),
    [directs, groups],
  );

  const items = useMemo<ChatListItem[]>(() => {
    const out: ChatListItem[] = [];
    for (const row of directs) {
      const favId = favoriteKey({ roomId: row.room?.id, personId: row.person.id });
      out.push({
        key: row.room?.id ?? `person-${row.person.id}`,
        kind: "dm",
        row,
        favId,
        at: row.room?.lastMessageAt ? new Date(row.room.lastMessageAt).getTime() : 0,
        unread: row.room?.unread ?? 0,
        name: row.person.name,
        preview: row.room?.lastPreview || "Enviar mensagem",
        time: row.room?.lastMessageAt ? formatListTime(row.room.lastMessageAt) : "",
      });
    }
    for (const room of groups) {
      out.push({
        key: room.id,
        kind: "group",
        room,
        favId: room.id,
        at: room.lastMessageAt ? new Date(room.lastMessageAt).getTime() : 0,
        unread: room.unread,
        name: room.name,
        preview: room.lastPreview || "Comece a conversa",
        time: formatListTime(room.lastMessageAt),
      });
    }
    return out.sort((a, b) => b.at - a.at || a.name.localeCompare(b.name, "pt-BR"));
  }, [directs, groups]);

  const visible = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread" && item.unread <= 0) return false;
      if (filter === "favorites" && !favorites.includes(item.favId)) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
    });
  }, [items, filter, favorites, q]);

  const pills: { id: ListFilter; label: string; count?: number }[] = [
    { id: "all", label: "Tudo" },
    { id: "unread", label: "Não lidas", count: unreadTotal },
    { id: "favorites", label: "Favoritas" },
  ];

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-card lg:min-w-[340px]">
      <header className="shrink-0 px-3 pb-2 pt-3">
        <div className="flex items-center gap-1">
          <h1 className="min-w-0 flex-1 truncate px-1 font-display text-[22px] font-semibold tracking-tight text-foreground">
            Órbita
          </h1>
          <HeaderIcon label="Nova conversa" onClick={onNew}>
            <Plus className="h-5 w-5" />
          </HeaderIcon>
          <div className="relative" ref={menuRef}>
            <HeaderIcon label="Mais opções" onClick={() => setMenuOpen((v) => !v)}>
              <MoreVertical className="h-5 w-5" />
            </HeaderIcon>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onNew();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] text-foreground hover:bg-muted"
                >
                  <SquarePen className="h-4 w-4 text-muted-foreground" />
                  Nova conversa
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar ou começar uma nova conversa"
            className="w-full rounded-lg border border-border bg-muted py-2 pl-10 pr-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5 px-0.5">
          {pills.map((pill) => {
            const selected = filter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilter(pill.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {pill.label}
                {pill.id === "unread" && (pill.count ?? 0) > 0 && (
                  <span className="text-[12px] tabular-nums">{pill.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <nav className="chat-scroll min-h-0 flex-1 overflow-y-auto" aria-label="Conversas">
        {loading ? (
          <p className="px-4 pt-10 text-center text-sm text-muted-foreground">Carregando o time…</p>
        ) : error ? (
          <p className="px-4 pt-10 text-center text-sm text-destructive">{error}</p>
        ) : visible.length === 0 ? (
          <p className="px-4 pt-10 text-center text-sm text-muted-foreground">
            {filter === "unread" && !q
              ? "Nenhuma conversa não lida."
              : filter === "favorites" && !q
                ? "Nenhuma conversa favorita."
                : q
                  ? "Nenhuma conversa encontrada."
                  : "Nenhuma conversa ainda."}
          </p>
        ) : (
          visible.map((item) => (
            <ChatRow
              key={item.key}
              item={item}
              active={item.kind === "dm" ? item.row.room?.id === activeId : item.room.id === activeId}
              favorited={favorites.includes(item.favId)}
              onClick={() => {
                if (item.kind === "group") onSelectRoom(item.room.id);
                else if (item.row.room) onSelectRoom(item.row.room.id);
                else onSelectPerson(item.row.person.id);
              }}
              onToggleFavorite={() => toggleFavorite(item.favId)}
            />
          ))
        )}
      </nav>
    </aside>
  );
}
