"use client";

import { useState } from "react";
import { ArrowLeft, Hash, Search, StickyNote, UserPlus, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { Avatar, AvatarStack } from "./avatar";
import { presenceLabel, toPerson } from "./helpers";
import type { TeamChatRoom } from "./types";

function IconButton({
  label,
  active,
  badge,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative grid h-8 w-8 place-items-center rounded-[var(--orbita-radius-inner)] transition-colors",
        active
          ? "bg-[var(--orbita-selected)] text-white"
          : "text-muted-foreground hover:bg-[var(--orbita-block-soft)] hover:text-foreground",
      )}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--orbita-selected)] px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export function ChatHeader({
  room,
  notesOpen,
  noteCount,
  searchQuery,
  onSearchChange,
  onBack,
  onToggleNotes,
  onAddMembers,
}: {
  room: TeamChatRoom;
  notesOpen: boolean;
  noteCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onToggleNotes: () => void;
  onAddMembers: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const isDirect = room.kind === "DM";
  const lead = room.peer ? toPerson(room.peer) : null;
  const people = room.members.map(toPerson);

  return (
    <header className="shrink-0 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para a lista"
            className="grid h-9 w-9 place-items-center rounded-[var(--orbita-radius-inner)] text-muted-foreground hover:bg-[var(--orbita-block-soft)] hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {isDirect && lead ? (
            <div className="shrink-0 [&_>_div]:rounded-[var(--orbita-radius-avatar)] [&_img]:rounded-[var(--orbita-radius-avatar)]">
              <Avatar person={lead} size="sm" showPresence />
            </div>
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-[var(--orbita-radius-avatar)] bg-[var(--orbita-block-soft)]">
              <Hash className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-foreground">
              {isDirect ? room.name : `#${room.name}`}
            </h2>
            {isDirect && lead ? (
              <span className="text-[12px] text-muted-foreground">{presenceLabel[lead.presence]}</span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="[&_>_div]:rounded-[var(--orbita-radius-avatar)] [&_img]:rounded-[var(--orbita-radius-avatar)]">
                  <AvatarStack people={people} />
                </div>
                <span className="truncate text-[12px] text-muted-foreground">
                  {room.topic ? `${room.topic} · ` : ""}
                  {room.memberCount} membros
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {room.kind === "GROUP" && (
            <IconButton label="Adicionar membros" onClick={onAddMembers}>
              <UserPlus className="h-[18px] w-[18px]" />
            </IconButton>
          )}
          <IconButton
            label="Pesquisar na conversa"
            active={searchOpen}
            onClick={() => {
              if (searchOpen) {
                setSearchOpen(false);
                onSearchChange("");
              } else {
                setSearchOpen(true);
              }
            }}
          >
            <Search className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton
            label="Notas da conversa"
            active={notesOpen}
            badge={notesOpen ? undefined : noteCount}
            onClick={onToggleNotes}
          >
            <StickyNote className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </div>
      {searchOpen && (
        <div className="mt-2 flex items-center gap-2 rounded-[var(--orbita-radius-inner)] bg-[var(--orbita-block-soft)] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
            placeholder="Pesquisar nesta conversa"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => {
              setSearchOpen(false);
              onSearchChange("");
            }}
            aria-label="Fechar pesquisa"
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-white/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
