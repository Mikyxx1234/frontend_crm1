"use client";

import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LIFECYCLE_OPTIONS = [
  { value: "", label: "Todos os estágios" },
  { value: "SUBSCRIBER", label: "Assinante" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "CUSTOMER", label: "Cliente" },
  { value: "EVANGELIST", label: "Evangelista" },
  { value: "OTHER", label: "Outro" },
] as const;

export type TagOption = { id: string; name: string };

export function ContactFilters({
  lifecycleStage,
  onLifecycleStageChange,
  tagId,
  onTagIdChange,
  onSearchDebounced,
  tags,
  className,
}: {
  lifecycleStage: string;
  onLifecycleStageChange: (v: string) => void;
  tagId: string;
  onTagIdChange: (v: string) => void;
  onSearchDebounced: (v: string) => void;
  tags: TagOption[];
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const onSearchDebouncedRef = useRef(onSearchDebounced);
  onSearchDebouncedRef.current = onSearchDebounced;

  useEffect(() => {
    const t = window.setTimeout(() => onSearchDebouncedRef.current(deferred.trim()), 300);
    return () => window.clearTimeout(t);
  }, [deferred]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm md:flex-row md:items-end",
        className
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Label htmlFor="contact-search" className="sr-only">
          Buscar
        </Label>
        <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="contact-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone…"
          className="ps-9"
        />
      </div>

      <div className="grid w-full gap-2 md:w-48">
        <Label htmlFor="filter-lifecycle" className="text-xs text-muted-foreground">
          Estágio
        </Label>
        <SelectNative
          id="filter-lifecycle"
          value={lifecycleStage}
          onChange={(e) => onLifecycleStageChange(e.target.value)}
        >
          {LIFECYCLE_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="grid w-full gap-2 md:w-48">
        <Label htmlFor="filter-tag" className="text-xs text-muted-foreground">
          Tag
        </Label>
        <SelectNative
          id="filter-tag"
          value={tagId}
          onChange={(e) => onTagIdChange(e.target.value)}
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </SelectNative>
      </div>
    </div>
  );
}
