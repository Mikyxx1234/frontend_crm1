"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Aviso sonoro do inbox: toca um "ping" curto a cada mensagem RECEBIDA
 * (direction="in"). O operador pode silenciar; a preferência fica no
 * localStorage e sincroniza entre abas.
 *
 * O som é sintetizado via Web Audio API (sem asset externo). Navegadores
 * exigem um gesto do usuário para iniciar áudio — resumimos o AudioContext
 * no clique do botão de mudo (gesto) e na primeira interação, então o
 * primeiro ping pode não soar até o operador interagir com a página.
 */

const STORAGE_KEY = "inbox:sound-muted";
const CHANGE_EVENT = "inbox:sound-muted-changed";

export function isInboxSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setInboxSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { muted } }));
  // Um gesto costuma acompanhar a (des)ativação — aproveita pra destravar o áudio.
  if (!muted) void resumeAudio();
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  return audioCtx;
}

/** Destrava o AudioContext num gesto do usuário (clique/tecla). */
export async function resumeAudio(): Promise<void> {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}

/** Toca o aviso sonoro, respeitando o mudo. Idempotente e não-bloqueante. */
export function playInboxPing(): void {
  if (isInboxSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  try {
    const now = ctx.currentTime;
    // Dois tons curtos ascendentes (nota de notificação agradável).
    const notes = [
      { freq: 880, at: 0 }, // A5
      { freq: 1174.66, at: 0.11 }, // D6
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      const t0 = now + n.at;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Hook de UI para o botão de mudo. Lê a preferência após o mount (evita
 * mismatch de SSR) e reage a mudanças de outras abas/instâncias.
 */
export function useInboxSoundMuted(): readonly [boolean, (muted: boolean) => void] {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isInboxSoundMuted());
    const sync = () => setMuted(isInboxSoundMuted());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((v: boolean) => setInboxSoundMuted(v), []);
  return [muted, set] as const;
}
