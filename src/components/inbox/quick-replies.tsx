"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type QuickReplyRow = { id: string; title: string; content: string };

const FALLBACK_REPLIES = [
  "Olá! Como posso ajudar?",
  "Vou verificar e retorno em breve.",
  "Obrigado pelo contato! Já estamos cuidando do seu caso.",
  "Poderia me informar mais detalhes?",
  "Sua solicitação foi encaminhada para o setor responsável.",
];

async function fetchQuickReplies(): Promise<QuickReplyRow[]> {
  const res = await fetch(apiUrl("/api/quick-replies"));
  if (!res.ok) return [];
  return res.json();
}

export function QuickReplies({
  open,
  onPick,
  className,
}: {
  open: boolean;
  onPick: (text: string) => void;
  className?: string;
}) {
  const { data: replies, isLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: fetchQuickReplies,
    enabled: open,
    staleTime: 60_000,
  });

  if (!open) return null;

  const hasDbReplies = replies && replies.length > 0;
  const items = hasDbReplies
    ? replies.map((r) => ({ key: r.id, label: r.title, text: r.content }))
    : FALLBACK_REPLIES.map((t) => ({ key: t, label: t, text: t }));

  return (
    <div
      className={cn(
        "scrollbar-thin flex gap-2 overflow-x-auto border-b border-border/40 pb-2 pt-1",
        className
      )}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Carregando…
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onPick(item.text)}
            title={item.text}
            className="shrink-0 rounded-full border border-border/80 bg-muted/40 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10"
          >
            {item.label}
          </button>
        ))
      )}
    </div>
  );
}
