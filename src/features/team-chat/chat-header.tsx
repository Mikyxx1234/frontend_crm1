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
        "relative grid h-10 w-10 place-items-center rounded-full transition-colors",
        active
          ? "bg-muted text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
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
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar para a lista"
            className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {isDirect && lead ? (
            <Avatar person={lead} size="sm" showPresence />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full bg-muted">
              <Hash className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-semibold text-foreground">
              {isDirect ? room.name : `#${room.name}`}
            </h2>
            {isDirect && lead ? (
              <span className="text-[13px] text-muted-foreground">{presenceLabel[lead.presence]}</span>
            ) : (
              <div className="flex items-center gap-2">
                <AvatarStack people={people} />
                <span className="truncate text-[13px] text-muted-foreground">
                  {room.topic ? `${room.topic} · ` : ""}
                  {room.memberCount} membros
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
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
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 md:px-4">
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
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
