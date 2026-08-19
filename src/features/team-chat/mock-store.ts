"use client";

import { useSyncExternalStore } from "react";

import {
  MOCK_MESSAGES,
  MOCK_NOTES,
  MOCK_ROOMS,
  findMockDmByPeer,
  mockReplyText,
  pickMockReplier,
  previewOf,
} from "./mock-data";
import type {
  TeamChatAttachment,
  TeamChatMessage,
  TeamChatNote,
  TeamChatPerson,
  TeamChatRoom,
} from "./types";

export type MockChatState = {
  rooms: TeamChatRoom[];
  messages: Record<string, TeamChatMessage[]>;
  notes: Record<string, TeamChatNote[]>;
};

function cloneRooms() {
  return MOCK_ROOMS.map((r) => ({ ...r, members: [...r.members] }));
}

function cloneMessages() {
  return Object.fromEntries(
    Object.entries(MOCK_MESSAGES).map(([id, list]) => [id, list.map((m) => ({ ...m, reactions: [...m.reactions] }))]),
  );
}

function cloneNotes() {
  return Object.fromEntries(Object.entries(MOCK_NOTES).map(([id, list]) => [id, list.map((n) => ({ ...n }))]));
}

let state: MockChatState = {
  rooms: cloneRooms(),
  messages: cloneMessages(),
  notes: cloneNotes(),
};

let activeMockRoomId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function setState(next: MockChatState) {
  state = next;
  emit();
}

export function subscribeMockChat(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getMockSnapshot() {
  return state;
}

export function useMockChat() {
  return useSyncExternalStore(subscribeMockChat, getMockSnapshot, getMockSnapshot);
}

export function setActiveMockRoom(roomId: string | null) {
  activeMockRoomId = roomId;
  if (!roomId) return;
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room || room.unread === 0) return;
  setState({
    ...state,
    rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, unread: 0 } : r)),
  });
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function remapAuthor(msg: TeamChatMessage, meId: string): TeamChatMessage {
  if (msg.authorId !== "me") return msg;
  return { ...msg, authorId: meId, author: msg.author ? { ...msg.author, id: meId } : msg.author };
}

export function mockMessagesFor(roomId: string, meId: string) {
  return (state.messages[roomId] ?? []).map((m) => remapAuthor(m, meId));
}

export function sendMockMessage(
  roomId: string,
  input: { content?: string; attachments?: TeamChatAttachment[] },
  me: { id: string; name: string; avatarUrl?: string | null },
) {
  const now = new Date().toISOString();
  const userMsg: TeamChatMessage = {
    id: uid("mock-msg"),
    roomId,
    authorId: me.id || "me",
    kind: "TEXT",
    content: input.content ?? "",
    pinned: false,
    reactions: [],
    attachments: input.attachments,
    createdAt: now,
    author: {
      id: me.id || "me",
      name: me.name || "Você",
      avatarUrl: me.avatarUrl ?? null,
      systemOnline: true,
    },
  };

  const preview = previewOf(userMsg.content, userMsg.attachments);
  setState({
    ...state,
    messages: { ...state.messages, [roomId]: [...(state.messages[roomId] ?? []), userMsg] },
    rooms: state.rooms.map((r) =>
      r.id === roomId ? { ...r, lastMessageAt: now, lastPreview: preview, unread: 0 } : r,
    ),
  });

  const delay = 400 + Math.floor(Math.random() * 500);
  window.setTimeout(() => {
    const room = state.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const peer = pickMockReplier(room, me.id);
    const replyAt = new Date().toISOString();
    const reply: TeamChatMessage = {
      id: uid("mock-msg"),
      roomId,
      authorId: peer.id,
      kind: "TEXT",
      content: mockReplyText(input.content ?? "", input.attachments),
      pinned: false,
      reactions: [],
      createdAt: replyAt,
      author: peer,
    };
    const unread = activeMockRoomId === roomId ? 0 : (room.unread || 0) + 1;
    setState({
      ...state,
      messages: { ...state.messages, [roomId]: [...(state.messages[roomId] ?? []), reply] },
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? { ...r, lastMessageAt: replyAt, lastPreview: reply.content, unread }
          : r,
      ),
    });
  }, delay);
}

export function toggleMockReaction(roomId: string, messageId: string, emoji: string, meId: string) {
  const list = state.messages[roomId];
  if (!list) return;
  setState({
    ...state,
    messages: {
      ...state.messages,
      [roomId]: list.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = [...msg.reactions];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          reactions.push({ emoji, count: 1, mine: true, userIds: [meId] });
        } else {
          const cur = reactions[idx];
          const ids = new Set(cur.userIds ?? []);
          const mine = ids.has(meId) || cur.mine;
          if (mine) {
            ids.delete(meId);
            const count = Math.max(0, cur.count - 1);
            if (count === 0) reactions.splice(idx, 1);
            else reactions[idx] = { ...cur, count, mine: false, userIds: [...ids] };
          } else {
            ids.add(meId);
            reactions[idx] = { ...cur, count: cur.count + 1, mine: true, userIds: [...ids] };
          }
        }
        return { ...msg, reactions };
      }),
    },
  });
}

export function toggleMockPin(roomId: string, messageId: string) {
  const list = state.messages[roomId];
  if (!list) return;
  setState({
    ...state,
    messages: {
      ...state.messages,
      [roomId]: list.map((msg) => (msg.id === messageId ? { ...msg, pinned: !msg.pinned } : msg)),
    },
  });
}

export function addMockNote(roomId: string, text: string) {
  const note: TeamChatNote = {
    id: uid("mock-note"),
    text,
    pinned: false,
    createdAt: new Date().toISOString(),
  };
  setState({
    ...state,
    notes: { ...state.notes, [roomId]: [note, ...(state.notes[roomId] ?? [])] },
  });
}

export function toggleMockNotePin(roomId: string, noteId: string) {
  const list = state.notes[roomId] ?? [];
  setState({
    ...state,
    notes: {
      ...state.notes,
      [roomId]: list.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n)),
    },
  });
}

export function removeMockNote(roomId: string, noteId: string) {
  setState({
    ...state,
    notes: {
      ...state.notes,
      [roomId]: (state.notes[roomId] ?? []).filter((n) => n.id !== noteId),
    },
  });
}

export function createMockRoom(input: {
  kind: "DM" | "GROUP";
  name: string;
  members: TeamChatPerson[];
  topic?: string;
}) {
  if (input.kind === "DM" && input.members[0]) {
    const existing = findMockDmByPeer(input.members[0].id, state.rooms);
    if (existing) return existing;
  }
  const now = new Date().toISOString();
  const peer = input.kind === "DM" ? input.members[0] ?? null : null;
  const room: TeamChatRoom = {
    id: uid(input.kind === "DM" ? "mock-room-dm" : "mock-room-ch"),
    kind: input.kind,
    name: input.name,
    topic: input.topic ?? null,
    lastMessageAt: now,
    lastPreview: "Comece a conversa",
    createdAt: now,
    unread: 0,
    peer,
    members: input.members,
    memberCount: input.members.length + 1,
  };
  setState({
    ...state,
    rooms: [room, ...state.rooms],
    messages: { ...state.messages, [room.id]: [] },
    notes: { ...state.notes, [room.id]: [] },
  });
  return room;
}

export function addMockMembers(roomId: string, people: TeamChatPerson[]) {
  const room = state.rooms.find((r) => r.id === roomId);
  if (!room) return;
  const have = new Set(room.members.map((m) => m.id));
  const extra = people.filter((p) => !have.has(p.id));
  if (extra.length === 0) return;
  const members = [...room.members, ...extra];
  setState({
    ...state,
    rooms: state.rooms.map((r) =>
      r.id === roomId ? { ...r, members, memberCount: members.length + 1 } : r,
    ),
  });
}
