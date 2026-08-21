"use client";

import { createPortal } from "react-dom";
import {
  IconArrowDown,
  IconArrowUp,
  IconCornerDownLeft,
  IconSearch,
} from "@tabler/icons-react";

import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";
import { cn } from "@/lib/utils";

import type { OmnisearchCoords } from "./use-omnisearch-menu";

export function OmnisearchResultsPanel({
  coords,
  loading,
  query,
  empty,
  total,
  children,
  onSeeAll,
}: {
  coords: OmnisearchCoords;
  loading: boolean;
  query: string;
  empty: boolean;
  total: number;
  children: React.ReactNode;
  onSeeAll?: () => void;
}) {
  return createPortal(
    <div
      data-omnisearch-results
      role="listbox"
      aria-label="Resultados da busca"
      className="fixed z-(--z-popover) flex max-h-[min(32rem,72vh)] flex-col overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
      style={{
        top: coords.top,
        left: coords.left,
        width: Math.max(coords.width, 360),
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {loading ? (
          <p className="px-3 py-6 text-center font-body text-[13px] text-[var(--text-muted)]">
            Buscando…
          </p>
        ) : empty ? (
          <div className="flex flex-col items-center gap-1 px-3 py-8 text-center">
            <IconSearch size={18} className="text-[var(--text-muted)]" />
            <p className="font-body text-[13px] text-[var(--text-secondary)]">
              Nenhum resultado para “{query}”
            </p>
          </div>
        ) : (
          children
        )}
      </div>
      {!loading && !empty && (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.06] px-3 py-2">
          <div className="flex items-center gap-3 font-body text-[11px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <OmnisearchKbd>
                <IconArrowUp size={10} />
                <IconArrowDown size={10} />
              </OmnisearchKbd>
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <OmnisearchKbd>
                <IconCornerDownLeft size={11} />
              </OmnisearchKbd>
              abrir
            </span>
          </div>
          {onSeeAll ? (
            <button
              type="button"
              onClick={onSeeAll}
              className="font-display text-[12px] font-semibold text-[var(--brand-primary)] hover:underline"
            >
              Ver todos os {total} resultado{total === 1 ? "" : "s"}
            </button>
          ) : (
            <span className="font-display text-[12px] font-semibold text-[var(--brand-primary)]">
              Ver todos os {total} resultado{total === 1 ? "" : "s"}
            </span>
          )}
        </footer>
      )}
    </div>,
    document.body,
  );
}

export function OmnisearchKbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-[6px] border border-black/[0.08] bg-[var(--glass-bg-overlay,#f4f6fb)] px-1 py-0.5 text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

export function OmnisearchSection({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </p>
        <span className="ml-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--glass-bg-overlay,#eef1f6)] px-1.5 font-display text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">
          {count}
        </span>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

export function OmnisearchHitButton({
  active,
  onHover,
  onClick,
  children,
}: {
  active: boolean;
  onHover: () => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors",
        active ? "bg-[var(--color-primary-soft,#eef0fe)]" : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      {children}
    </button>
  );
}

export function OmnisearchHitAvatar({
  id,
  name,
  imageUrl,
  overlay,
}: {
  id: string;
  name: string;
  imageUrl?: string | null;
  overlay?: React.ReactNode;
}) {
  return (
    <span className="relative mt-0.5 shrink-0">
      <ChatAvatar
        user={{ id, name, imageUrl: imageUrl ?? null }}
        size={AVATAR_SIZE.lg}
        channel={null}
      />
      {overlay ? (
        <span className="absolute -bottom-px -right-px grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[var(--brand-primary)] shadow-sm ring-1 ring-black/[0.08]">
          {overlay}
        </span>
      ) : null}
    </span>
  );
}

export function OmnisearchStatusPill({
  tone,
  children,
}: {
  tone: "muted" | "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wide",
        tone === "muted" && "bg-[#eef1f6] text-[#64748b]",
        tone === "success" && "bg-[#ecfdf5] text-[#059669]",
        tone === "danger" && "bg-[#fef2f2] text-[#dc2626]",
      )}
    >
      {children}
    </span>
  );
}
