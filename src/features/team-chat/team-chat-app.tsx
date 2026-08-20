"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { ChatHeader } from "./chat-header";
import { AddMembersDialog, ComposeDialog } from "./compose-dialogs";
import { Composer } from "./composer";
import { MessageList } from "./message-list";
import { NotesPanel } from "./notes-panel";
import { Sidebar } from "./sidebar";
import {
  useTeamChatColleagues,
  useTeamChatMessages,
  useTeamChatMutations,
  useTeamChatNotes,
  useTeamChatRealtime,
  useTeamChatRooms,
  useOrbitaFavorites,
} from "./hooks";
import { MOCK_PEOPLE, isMockId, mergeUniqueById } from "./mock-data";
import { favoriteKey } from "./helpers";
import {
  addMockNote,
  createMockRoom,
  mockMessagesFor,
  removeMockNote,
  sendMockMessage,
  setActiveMockRoom,
  toggleMockNotePin,
  toggleMockPin,
  toggleMockReaction,
  useMockChat,
} from "./mock-store";
import type { DirectRow, TeamChatRoom } from "./types";

export function TeamChatApp() {
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const meName = session?.user?.name ?? "Você";
  const meAvatar = session?.user?.image ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const ready = status === "authenticated";
  const roomsQuery = useTeamChatRooms(ready);
  const peopleQuery = useTeamChatColleagues(ready);
  const mock = useMockChat();
  const { favorites, toggleFavorite } = useOrbitaFavorites();
  const realRooms = roomsQuery.data?.rooms ?? [];
  const realColleagues = peopleQuery.data?.colleagues ?? [];
  useTeamChatRealtime(isMockId(selectedId) ? null : selectedId, ready);

  useEffect(() => {
    setActiveMockRoom(isMockId(selectedId) ? selectedId : null);
  }, [selectedId]);

  const { createRoom } = useTeamChatMutations();

  const colleagues = useMemo(() => mergeUniqueById(realColleagues, MOCK_PEOPLE), [realColleagues]);
  const rooms = useMemo(() => mergeUniqueById(realRooms, mock.rooms), [realRooms, mock.rooms]);

  const directs = useMemo<DirectRow[]>(() => {
    const dms = rooms.filter((r) => r.kind === "DM");
    const byPeer = new Map<string, (typeof dms)[number]>();
    for (const r of dms) {
      if (r.peer?.id) byPeer.set(r.peer.id, r);
    }
    const seen = new Set<string>();
    const rows: DirectRow[] = [];
    for (const person of colleagues) {
      if (person.id === meId) continue;
      seen.add(person.id);
      rows.push({ person, room: byPeer.get(person.id) ?? null });
    }
    for (const r of dms) {
      if (r.peer && !seen.has(r.peer.id)) rows.push({ person: r.peer, room: r });
    }
    return rows.sort((a, b) => {
      const ta = a.room?.lastMessageAt ? new Date(a.room.lastMessageAt).getTime() : 0;
      const tb = b.room?.lastMessageAt ? new Date(b.room.lastMessageAt).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.person.name.localeCompare(b.person.name, "pt-BR");
    });
  }, [rooms, colleagues, meId]);

  const groups = rooms.filter((r) => r.kind === "GROUP");
  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const notesQuery = useTeamChatNotes(selectedId, notesOpen || !!selectedId);
  const notes = isMockId(selectedId) ? (mock.notes[selectedId ?? ""] ?? []) : (notesQuery.data?.notes ?? []);

  function openPerson(personId: string) {
    const existing = rooms.find((r) => r.kind === "DM" && r.peer?.id === personId);
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    if (isMockId(personId)) {
      const person = colleagues.find((p) => p.id === personId);
      if (!person) return;
      setSelectedId(createMockRoom({ kind: "DM", name: person.name, members: [person] }).id);
      return;
    }
    createRoom.mutate(
      { memberIds: [personId] },
      {
        onSuccess: (res) => setSelectedId(res.room.id),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  const loadError =
    roomsQuery.error instanceof Error
      ? roomsQuery.error.message
      : peopleQuery.error instanceof Error
        ? peopleQuery.error.message
        : null;

  return (
    <div className="team-chat-shell h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      {/* Lista de conversas - coluna esquerda */}
      <div
        className={cn(
          "flex h-full min-h-0 w-[340px] min-w-[320px] shrink-0 flex-col gap-[var(--orbita-gap)]",
          selected ? "hidden lg:flex" : "flex",
        )}
      >
        <Sidebar
          directs={directs}
          groups={groups}
          activeId={selectedId}
          loading={status === "loading"}
          error={directs.length === 0 && groups.length === 0 ? loadError : null}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelectRoom={(id) => {
            setSelectedId(id);
            setNotesOpen(false);
          }}
          onSelectPerson={(id) => {
            setNotesOpen(false);
            openPerson(id);
          }}
          onNew={() => setComposeOpen(true)}
        />
      </div>

      {/* Painel de conversa - coluna direita */}
      <section
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 flex-col gap-[var(--orbita-gap)]",
          selected ? "flex" : "hidden lg:flex",
        )}
      >
        {selected ? (
          <Thread
            room={selected}
            meId={meId}
            meName={meName}
            meAvatar={meAvatar}
            notesOpen={notesOpen}
            noteCount={notes.length}
            favorited={favorites.includes(
              favoriteKey({ roomId: selected.id, personId: selected.peer?.id }),
            )}
            onBack={() => setSelectedId(null)}
            onToggleNotes={() => setNotesOpen((v) => !v)}
            onToggleFavorite={() =>
              toggleFavorite(favoriteKey({ roomId: selected.id, personId: selected.peer?.id }))
            }
            onAddMembers={() => setAddOpen(true)}
          />
        ) : (
          <LandingEmpty onNew={() => setComposeOpen(true)} />
        )}
      </section>

      {selected && notesOpen && (
        <>
          <div className="hidden h-full w-[320px] shrink-0 lg:block">
            <NotesHost roomId={selected.id} notes={notes} onClose={() => setNotesOpen(false)} />
          </div>
          <div className="absolute inset-0 z-20 lg:hidden">
            <NotesHost roomId={selected.id} notes={notes} onClose={() => setNotesOpen(false)} />
          </div>
        </>
      )}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        meId={meId}
        extraPeople={MOCK_PEOPLE}
        onCreated={(id) => {
          setSelectedId(id);
          setComposeOpen(false);
        }}
      />
      {selected?.kind === "GROUP" && (
        <AddMembersDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          room={selected}
          meId={meId}
          extraPeople={MOCK_PEOPLE}
        />
      )}
    </div>
  );
}

function NotesHost({
  roomId,
  notes,
  onClose,
}: {
  roomId: string;
  notes: { id: string; text: string; pinned: boolean; createdAt: string }[];
  onClose: () => void;
}) {
  const { addNote, toggleNotePin, removeNote } = useTeamChatMutations();
  const mock = isMockId(roomId);
  return (
    <NotesPanel
      notes={notes}
      onAdd={(text) =>
        mock
          ? addMockNote(roomId, text)
          : addNote.mutate({ roomId, content: text }, { onError: (e: Error) => toast.error(e.message) })
      }
      onTogglePin={(id) =>
        mock
          ? toggleMockNotePin(roomId, id)
          : toggleNotePin.mutate({ noteId: id, roomId }, { onError: (e: Error) => toast.error(e.message) })
      }
      onDelete={(id) =>
        mock
          ? removeMockNote(roomId, id)
          : removeNote.mutate({ noteId: id, roomId }, { onError: (e: Error) => toast.error(e.message) })
      }
      onClose={onClose}
    />
  );
}

function Thread({
  room,
  meId,
  meName,
  meAvatar,
  notesOpen,
  noteCount,
  favorited,
  onBack,
  onToggleNotes,
  onToggleFavorite,
  onAddMembers,
}: {
  room: TeamChatRoom;
  meId: string;
  meName: string;
  meAvatar: string | null;
  notesOpen: boolean;
  noteCount: number;
  favorited: boolean;
  onBack: () => void;
  onToggleNotes: () => void;
  onToggleFavorite: () => void;
  onAddMembers: () => void;
}) {
  const mock = isMockId(room.id);
  const mockState = useMockChat();
  const { data, isLoading } = useTeamChatMessages(mock ? null : room.id);
  const { send, react, pin } = useTeamChatMutations();
  const liveRoom = mock ? (mockState.rooms.find((r) => r.id === room.id) ?? room) : room;
  const messages = mock ? mockMessagesFor(room.id, meId) : (data?.messages ?? []);
  const [chatQuery, setChatQuery] = useState("");

  useEffect(() => {
    setChatQuery("");
  }, [room.id]);

  return (
    <div className="orbita-block flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatHeader
        room={liveRoom}
        notesOpen={notesOpen}
        noteCount={noteCount}
        searchQuery={chatQuery}
        favorited={favorited}
        onSearchChange={setChatQuery}
        onBack={onBack}
        onToggleNotes={onToggleNotes}
        onToggleFavorite={onToggleFavorite}
        onAddMembers={onAddMembers}
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden" data-wa-thread>
        <MessageList
          room={liveRoom}
          messages={messages}
          meId={meId}
          loading={!mock && isLoading}
          query={chatQuery}
          onToggleReaction={(id, emoji) =>
            mock
              ? toggleMockReaction(room.id, id, emoji, meId)
              : react.mutate({ roomId: room.id, messageId: id, emoji }, { onError: (e: Error) => toast.error(e.message) })
          }
          onTogglePin={(id) =>
            mock
              ? toggleMockPin(room.id, id)
              : pin.mutate({ roomId: room.id, messageId: id }, { onError: (e: Error) => toast.error(e.message) })
          }
        />
      </div>
      <div className="relative z-20 shrink-0 overflow-visible border-t border-black/[0.04] bg-[var(--orbita-chrome)] dark:border-white/[0.06]">
        <Composer
          roomId={room.id}
          placeholder="Digite uma mensagem"
          onSend={async (payload) => {
            if (mock) {
              sendMockMessage(room.id, payload, { id: meId, name: meName, avatarUrl: meAvatar })
              return
            }
            await send.mutateAsync({
              roomId: room.id,
              content: payload.content,
              attachments: payload.attachments,
            })
          }}
        />
      </div>
    </div>
  );
}

function LandingEmpty({ onNew }: { onNew: () => void }) {
  return (
    <div className="orbita-block flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-[32px] font-light tracking-tight text-[var(--orbita-text)]">Órbita</p>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--orbita-text-secondary)]">
        Escolha uma conversa à esquerda ou comece uma nova mensagem.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="mt-5 text-[14px] font-medium text-[var(--orbita-text)] hover:underline"
      >
        Nova conversa
      </button>
    </div>
  );
}
