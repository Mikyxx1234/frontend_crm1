"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  {
    name: "Mais usados",
    emojis: ["😀", "😂", "😍", "🥰", "😊", "🤔", "😅", "😎", "🙏", "❤️", "🔥", "✅", "👍", "👏", "🎉", "💪", "⭐", "💯", "🚀", "💬"],
  },
  {
    name: "Rostos",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐"],
  },
  {
    name: "Gestos",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪"],
  },
  {
    name: "Corações",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
  },
  {
    name: "Objetos",
    emojis: ["⭐", "🌟", "✨", "⚡", "🔥", "💧", "🌈", "☀️", "🌙", "⏰", "📱", "💻", "📧", "📞", "💰", "💳", "📊", "📈", "📉", "🏷️", "📌", "📎", "✏️", "📝", "📋", "📁", "🗂️", "🔒", "🔑", "🔔", "📣", "💡", "🎯", "🏆", "🎖️", "🚀", "✈️", "🏠", "🏢"],
  },
  {
    name: "Símbolos",
    emojis: ["✅", "❌", "⭕", "❗", "❓", "‼️", "⁉️", "💯", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "▶️", "⏸️", "⏹️", "➡️", "⬅️", "⬆️", "⬇️", "↩️", "↪️", "🔄", "✖️", "➕", "➖", "➗", "♾️"],
  },
] as const;

export function EmojiPicker({
  open,
  onPick,
  className,
  compact = false,
}: {
  open: boolean;
  onPick: (emoji: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const [activeCategory, setActiveCategory] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setActiveCategory(0);
      if (!compact) setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, compact]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const namedCats = q ? CATEGORIES.filter((c) => c.name.toLowerCase().includes(q)) : [];
  const filtered = q
    ? namedCats.length > 0
      ? namedCats.flatMap((c) => c.emojis)
      : CATEGORIES.flatMap((c) => c.emojis).filter((emoji, i, arr) => arr.indexOf(emoji) === i && emoji.includes(search.trim()))
    : CATEGORIES[activeCategory].emojis;

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/60 p-2 shadow-2xl",
        compact && "bg-transparent p-1.5 shadow-none",
        className
      )}
      style={
        compact
          ? undefined
          : { backgroundColor: "var(--color-bg-elevated, var(--color-bg, #ffffff))" }
      }
    >
      {!compact && (
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar emoji…"
          className="mb-2 h-8 w-full rounded-lg border border-border/60 bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[var(--color-brand-primary)]/40"
        />
      )}

      {!search.trim() && (
        <div className={cn("flex gap-0.5 overflow-x-auto", compact ? "mb-1" : "mb-2")}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setActiveCategory(i)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                activeCategory === i
                  ? "bg-[var(--color-brand-primary)]/15 text-[var(--brand-primary)] dark:text-[var(--color-brand-primary)]"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {cat.emojis[0]} {compact ? "" : cat.name}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "grid gap-0.5 overflow-y-auto",
          compact ? "max-h-[168px] grid-cols-8" : "max-h-[320px] grid-cols-9",
        )}
      >
        {filtered.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(emoji)}
            className={cn(
              "flex items-center justify-center rounded-lg transition-colors hover:bg-muted/60",
              compact ? "size-8 text-lg" : "size-9 text-xl",
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
