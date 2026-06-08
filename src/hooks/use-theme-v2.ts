"use client";

import { useEffect, useState } from "react";

export type ThemeV2 = "light" | "dark";

const STORAGE_KEY = "crm-v2-theme";
const DARK_CLASS = "v2-dark";

function readStored(): ThemeV2 {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeV2 | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: ThemeV2) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(DARK_CLASS, t === "dark");
}

/**
 * Fonte ÚNICA de verdade do tema v2, compartilhada por todas as instâncias
 * do hook (nav-rail, barra de seleção, etc.). Sem isso, cada componente tinha
 * seu próprio `useState` e o toggle de uma instância não refletia nas outras —
 * a classe `.v2-dark` mudava, mas os estados ficavam dessincronizados, dando a
 * impressão de "não troca sem refresh".
 */
let current: ThemeV2 | null = null;
const listeners = new Set<(t: ThemeV2) => void>();

function setThemeGlobal(next: ThemeV2) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* localStorage indisponível — ignora */
  }
  applyTheme(next);
  listeners.forEach((l) => l(next));
}

export function useThemeV2() {
  // Começa em "light" no SSR e no 1º render client (evita hydration mismatch);
  // o valor real é resolvido no efeito de mount abaixo.
  const [theme, setTheme] = useState<ThemeV2>("light");

  useEffect(() => {
    if (current === null) current = readStored();
    setTheme(current);
    applyTheme(current);

    const onChange = (t: ThemeV2) => setTheme(t);
    listeners.add(onChange);

    // Sincroniza entre abas/janelas.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = readStored();
      current = next;
      applyTheme(next);
      listeners.forEach((l) => l(next));
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle() {
    const base = current ?? theme;
    setThemeGlobal(base === "light" ? "dark" : "light");
  }

  return { theme, toggle };
}
