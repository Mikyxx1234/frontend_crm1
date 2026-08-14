"use client";

import { useEffect, useState } from "react";

const C_PARAM = "c";
const LEGACY_PARAMS = ["conversationId", "conversation", "conv"] as const;

export function isInboxConversationNumberParam(raw: string): boolean {
  return /^\d+$/.test(raw.trim());
}

/** Link público da conversa: só o número sequencial, nunca o CUID. */
export function inboxConversationHref(number: number): string {
  return `/inbox?c=${encodeURIComponent(String(number))}`;
}

export function matchesConversationUrlRef(
  row: { id: string; number?: number | null },
  ref: string,
): boolean {
  return row.id === ref || (row.number != null && String(row.number) === ref);
}

function readInboxConversationParam(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const c = url.searchParams.get(C_PARAM)?.trim();
  if (c) return c;
  for (const key of LEGACY_PARAMS) {
    const v = url.searchParams.get(key)?.trim();
    if (v) return v;
  }
  return null;
}

function writeInboxConversationParam(value: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let dirty = false;
  for (const key of LEGACY_PARAMS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      dirty = true;
    }
  }
  const cur = url.searchParams.get(C_PARAM);
  if (value == null || value === "") {
    if (url.searchParams.has(C_PARAM)) {
      url.searchParams.delete(C_PARAM);
      dirty = true;
    }
  } else if (cur !== value) {
    url.searchParams.set(C_PARAM, value);
    dirty = true;
  }
  if (!dirty) return;
  window.history.replaceState(window.history.state, "", url.toString());
}

/**
 * Deep-link `?c=` — URL só número sequencial; estado interno continua CUID.
 *
 * Leitura: dígitos → number; senão CUID legado (`?c=`, `?conversationId=`,
 * `?conversation=`, `?conv=`). Depois do load, CUID na query vira `?c=<number>`.
 */
export function useInboxUrlSync(
  activeId: string | null,
  setActiveId: (id: string | null) => void,
  conversationNumber?: number | null,
  conversationRowId?: string | null,
) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = readInboxConversationParam();
    if (raw) setActiveId(raw);
    setHydrated(true);
  }, [setActiveId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!activeId) {
      writeInboxConversationParam(null);
      return;
    }
    if (conversationNumber != null && conversationRowId === activeId) {
      writeInboxConversationParam(String(conversationNumber));
    }
  }, [activeId, conversationNumber, conversationRowId, hydrated]);

  return { hydrated };
}
