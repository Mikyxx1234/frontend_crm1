"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

export type InboxFilters = {
  ownerId?: string;
  channel?: string;
  stageId?: string;
  tagIds?: string[];
  sortBy?: string;
  sortOrder?: string;
};

type Option = { id: string; name: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(apiUrl(url));
  const data = await res.json().catch(() => []);
  return (Array.isArray(data) ? data : data.items ?? data.users ?? data.tags ?? data.stages ?? []) as T;
}

export function InboxFilterBar({ value, onChange, onClose }: {
  value: InboxFilters; onChange: (next: InboxFilters) => void; onClose: () => void;
}) {
  const { data: users = [] } = useQuery<Option[]>({ queryKey: ["filter-users"], queryFn: () => fetchJson("/api/users"), staleTime: 60_000 });
  const { data: tags = [] } = useQuery<Option[]>({ queryKey: ["filter-tags"], queryFn: () => fetchJson("/api/tags"), staleTime: 60_000 });
  const { data: pipelines = [] } = useQuery<{ id: string; name: string; stages?: Option[] }[]>({ queryKey: ["filter-pipelines"], queryFn: () => fetchJson("/api/pipelines"), staleTime: 60_000 });

  const stages = React.useMemo(() => {
    const arr: Option[] = [];
    for (const p of pipelines) for (const s of p.stages ?? []) arr.push({ id: s.id, name: `${p.name} › ${s.name}` });
    return arr;
  }, [pipelines]);

  const set = (partial: Partial<InboxFilters>) => onChange({ ...value, ...partial });
  const clear = () => onChange({});
  const hasAny = !!(value.ownerId || value.channel || value.stageId || (value.tagIds && value.tagIds.length > 0) || value.sortBy);

  const selectClass = "h-9 w-full min-w-[140px] rounded-lg border border-border bg-background px-3 text-[12px] text-foreground transition-colors hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <div className="grid grid-cols-2 gap-2">
        <select className={selectClass} value={value.ownerId ?? ""} onChange={(e) => set({ ownerId: e.target.value || undefined })}>
          <option value="">Todos agentes</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className={selectClass} value={value.channel ?? ""} onChange={(e) => set({ channel: e.target.value || undefined })}>
          <option value="">Todos canais</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">E-mail</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="TELEGRAM">Telegram</option>
        </select>
        <select className={selectClass} value={value.stageId ?? ""} onChange={(e) => set({ stageId: e.target.value || undefined })}>
          <option value="">Todas etapas</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={selectClass} value={value.tagIds?.[0] ?? ""} onChange={(e) => set({ tagIds: e.target.value ? [e.target.value] : undefined })}>
          <option value="">Todas tags</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={selectClass} value={value.sortBy ?? "updatedAt"} onChange={(e) => set({ sortBy: e.target.value })}>
          <option value="updatedAt">Mais recente</option>
          <option value="createdAt">Mais antigo</option>
          <option value="unreadCount">Não lidas</option>
        </select>
        <div className="flex items-center gap-2">
          {hasAny && (
            <button onClick={clear} className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent">
              Limpar
            </button>
          )}
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-accent">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
