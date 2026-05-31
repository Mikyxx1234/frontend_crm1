"use client";

import { useEffect, useState } from "react";

export type ThemeV2 = "light" | "dark";

const STORAGE_KEY = "crm-v2-theme";
const DARK_CLASS = "v2-dark";

function getInitialTheme(): ThemeV2 {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeV2 | null;
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useThemeV2() {
  const [theme, setTheme] = useState<ThemeV2>("light");

  // Inicializa a partir do localStorage / prefers-color-scheme
  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function applyTheme(t: ThemeV2) {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add(DARK_CLASS);
    } else {
      root.classList.remove(DARK_CLASS);
    }
  }

  function toggle() {
    setTheme((prev) => {
      const next: ThemeV2 = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }

  return { theme, toggle };
}
