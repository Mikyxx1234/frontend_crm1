"use client";

/**
 * Bloco colapsável para grupos de campos personalizados na aside
 * (PRD Agrupamento de Campos na Aside). Header com chevron + título
 * uppercase; estado persistido em localStorage por `storageKey`.
 *
 * Compartilhado por:
 *   - deal-detail-panel.tsx (Informações do Negócio / pipeline v2)
 *   - contact-aside.tsx (Inbox v2 — Informações do Contato / do Negócio)
 */

import * as React from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function CustomFieldGroupBlock({
  storageKey,
  title,
  collapsedInitial,
  children,
}: {
  storageKey: string;
  title: string;
  collapsedInitial: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return collapsedInitial;
    const raw = window.localStorage.getItem(storageKey);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return collapsedInitial;
  });
  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      }
      return next;
    });
  };
  return (
    <div className="mt-1 first:mt-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="mb-1.5 flex w-full items-center gap-1.5 text-left"
      >
        <IconChevronDown
          size={12}
          strokeWidth={2.4}
          className={cn(
            "shrink-0 text-slate-500 transition-transform",
            collapsed && "-rotate-90",
          )}
        />
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {title}
        </span>
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
