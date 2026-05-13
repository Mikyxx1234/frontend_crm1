"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InboxTemplatePick = {
  id: string;
  name: string;
  content: string;
  category: string | null;
  language: string;
  status: string;
  label?: string;
};

type WabaConfig = {
  id: string;
  metaTemplateId: string;
  metaTemplateName: string;
  label: string;
  agentEnabled: boolean;
  language: string;
  category: string | null;
  bodyPreview: string;
};

async function fetchAgentTemplates(): Promise<InboxTemplatePick[]> {
  const res = await fetch(apiUrl("/api/whatsapp-template-configs/agent-enabled"));
  if (!res.ok) return [];
  const data: WabaConfig[] = await res.json();
  return data.map((c) => ({
    id: c.metaTemplateId,
    name: c.metaTemplateName,
    content: c.bodyPreview,
    category: c.category,
    language: c.language,
    status: "APPROVED",
    label: c.label || undefined,
  }));
}

const CAT_LABEL: Record<string, string> = {
  UTILITY: "Utilidade",
  MARKETING: "Marketing",
  AUTHENTICATION: "Autenticação",
};

export function TemplatePicker({
  open,
  onPick,
  className,
}: {
  open: boolean;
  onPick: (template: InboxTemplatePick) => void;
  className?: string;
}) {
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["agent-templates-picker"],
    queryFn: fetchAgentTemplates,
    enabled: open,
    staleTime: 2 * 60_000,
  });

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? templates.filter(
        (t) =>
          (t.label ?? "").toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      )
    : templates;

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border/60 bg-card p-2 shadow-lg",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar template…"
        className="mb-2 h-8 w-full rounded-lg border border-border/60 bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-indigo-500/40"
      />

      <div className="scrollbar-thin max-h-[240px] space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <FileText className="mb-2 size-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              {templates.length === 0
                ? "Nenhum template liberado para uso. Peça ao administrador para liberar em Configurações → Templates WhatsApp."
                : "Nenhum template encontrado."}
            </p>
          </div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {t.label || t.name}
                </span>
                {t.label && (
                  <span className="font-mono text-[10px] text-muted-foreground">{t.name}</span>
                )}
                {t.category && (
                  <Badge
                    className="ml-auto h-4 px-1.5 text-[9px] font-medium bg-primary/10 text-primary"
                  >
                    {CAT_LABEL[t.category] ?? t.category}
                  </Badge>
                )}
              </div>
              {t.content && (
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  {t.content}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
