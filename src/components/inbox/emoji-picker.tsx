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
}: {
  open: boolean;
  onPick: (emoji: string) => void;
  className?: string;
}) {
  const [activeCategory, setActiveCategory] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setActiveCategory(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const filtered = search.trim()
    ? CATEGORIES.flatMap((c) => c.emojis).filter((_, i, arr) => arr.indexOf(arr[i]) === i)
    : CATEGORIES[activeCategory].emojis;

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/60 bg-card p-2 shadow-lg",
        className
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar emoji…"
        className="mb-2 h-8 w-full rounded-lg border border-border/60 bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-indigo-500/40"
      />

      {!search.trim() && (
        <div className="mb-2 flex gap-0.5 overflow-x-auto">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(i)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                activeCategory === i
                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {cat.emojis[0]} {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid max-h-[200px] grid-cols-8 gap-0.5 overflow-y-auto">
        {filtered.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => onPick(emoji)}
            className="flex size-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-muted/60"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
