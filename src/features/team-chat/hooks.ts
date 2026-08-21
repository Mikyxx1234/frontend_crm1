"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { subscribeSSEEvents } from "@/hooks/use-sse";
import {
  addTeamChatMembers,
  addTeamChatNote,
  createTeamChatRoom,
  deleteTeamChatNote,
  listTeamChatColleagues,
  listTeamChatMessages,
  listTeamChatNotes,
  listTeamChatRooms,
  pinTeamChatMessage,
  pinTeamChatNote,
  reactTeamChatMessage,
  sendTeamChatMessage,
} from "./api";
import { loadOrbitaFavorites, saveOrbitaFavorites } from "./helpers";
import type { TeamChatAttachment, TeamChatMessage, TeamChatNote } from "./types";

export function useOrbitaFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(loadOrbitaFavorites());
  }, []);

  function toggleFavorite(id: string) {
    if (!id) return;
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveOrbitaFavorites(next);
      return next;
    });
  }

  return { favorites, toggleFavorite };
}

const ROOMS_KEY = "team-chat-rooms";
const MESSAGES_KEY = "team-chat-messages";
const PEOPLE_KEY = "team-chat-colleagues";
const NOTES_KEY = "team-chat-notes";

function patchMessage(qc: ReturnType<typeof useQueryClient>, msg: TeamChatMessage) {
  qc.setQueryData<{ messages: TeamChatMessage[] }>([MESSAGES_KEY, msg.roomId], (prev) => {
    if (!prev) return { messages: [msg] };
    const idx = prev.messages.findIndex((m) => m.id === msg.id);
    if (idx === -1) return { messages: [...prev.messages, msg] };
    const next = [...prev.messages];
    next[idx] = msg;
    return { messages: next };
  });
}

export function useTeamChatRooms(enabled = true) {
  return useQuery({
    queryKey: [ROOMS_KEY],
    queryFn: listTeamChatRooms,
    enabled,
    refetchInterval: 120_000,
  });
}

export function useTeamChatMessages(roomId: string | null) {
  return useQuery({
    queryKey: [MESSAGES_KEY, roomId],
    queryFn: () => listTeamChatMessages(roomId as string),
    enabled: !!roomId,
    refetchInterval: 120_000,
  });
}

export function useTeamChatColleagues(enabled = true) {
  return useQuery({
    queryKey: [PEOPLE_KEY],
    queryFn: listTeamChatColleagues,
    enabled,
    staleTime: 15_000,
  });
}

export function useTeamChatNotes(roomId: string | null, enabled = true) {
  return useQuery({
    queryKey: [NOTES_KEY, roomId],
    queryFn: () => listTeamChatNotes(roomId as string),
    enabled: !!roomId && enabled,
  });
}

export function useTeamChatMutations() {
  const qc = useQueryClient();
  const createRoom = useMutation({
    mutationFn: createTeamChatRoom,
    onSuccess: () => qc.invalidateQueries({ queryKey: [ROOMS_KEY] }),
  });
  const send = useMutation({
    mutationFn: ({
      roomId,
      content,
      attachments,
    }: {
      roomId: string;
      content?: string;
      attachments?: TeamChatAttachment[];
    }) => sendTeamChatMessage(roomId, { content, attachments }),
    onSuccess: (msg) => {
      patchMessage(qc, msg);
      qc.invalidateQueries({ queryKey: [ROOMS_KEY] });
    },
  });
  const addMembers = useMutation({
    mutationFn: ({ roomId, memberIds }: { roomId: string; memberIds: string[] }) =>
      addTeamChatMembers(roomId, memberIds),
    onSuccess: (_room, vars) => {
      qc.invalidateQueries({ queryKey: [ROOMS_KEY] });
      qc.invalidateQueries({ queryKey: [MESSAGES_KEY, vars.roomId] });
    },
  });
  const react = useMutation({
    mutationFn: ({ roomId, messageId, emoji }: { roomId: string; messageId: string; emoji: string }) =>
      reactTeamChatMessage(roomId, messageId, emoji),
    onSuccess: (msg) => patchMessage(qc, msg),
  });
  const pin = useMutation({
    mutationFn: ({ roomId, messageId }: { roomId: string; messageId: string }) =>
      pinTeamChatMessage(roomId, messageId),
    onSuccess: (msg) => patchMessage(qc, msg),
  });
  const addNote = useMutation({
    mutationFn: ({ roomId, content }: { roomId: string; content: string }) =>
      addTeamChatNote(roomId, content),
    onSuccess: (note, vars) => {
      qc.setQueryData<{ notes: TeamChatNote[] }>([NOTES_KEY, vars.roomId], (prev) => ({
        notes: [note, ...(prev?.notes ?? [])],
      }));
    },
  });
  const toggleNotePin = useMutation({
    mutationFn: ({ noteId }: { noteId: string; roomId: string }) => pinTeamChatNote(noteId),
    onSuccess: (note, vars) => {
      qc.setQueryData<{ notes: TeamChatNote[] }>([NOTES_KEY, vars.roomId], (prev) => ({
        notes: (prev?.notes ?? []).map((n) => (n.id === note.id ? note : n)),
      }));
    },
  });
  const removeNote = useMutation({
    mutationFn: ({ noteId }: { noteId: string; roomId: string }) => deleteTeamChatNote(noteId),
    onSuccess: (_ok, vars) => {
      qc.setQueryData<{ notes: TeamChatNote[] }>([NOTES_KEY, vars.roomId], (prev) => ({
        notes: (prev?.notes ?? []).filter((n) => n.id !== vars.noteId),
      }));
    },
  });
  return { createRoom, send, addMembers, react, pin, addNote, toggleNotePin, removeNote };
}

export function useTeamChatRealtime(activeRoomId: string | null, enabled = true) {
  const qc = useQueryClient();
  const activeRef = useRef(activeRoomId);
  activeRef.current = activeRoomId;

  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const bumpRooms = () => {
      const now = Date.now();
      if (now - last < 200) return;
      last = now;
      qc.invalidateQueries({ queryKey: [ROOMS_KEY] });
    };

    return subscribeSSEEvents("/api/sse/messages", {
      team_chat_room_updated: () => bumpRooms(),
      team_chat_message: (raw) => {
        const data = raw as { roomId?: string; message?: TeamChatMessage };
        bumpRooms();
        if (!data.message) return;
        patchMessage(qc, data.message);
      },
    });
  }, [qc, enabled]);
}
