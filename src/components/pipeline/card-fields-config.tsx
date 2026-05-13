"use client";

import * as React from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CardVisibleFields = {
  contact: boolean;
  product: boolean;
  owner: boolean;
  value: boolean;
  tags: boolean;
  activities: boolean;
  status: boolean;
  unread: boolean;
  number: boolean;
};

export const DEFAULT_CARD_FIELDS: CardVisibleFields = {
  contact: true,
  product: true,
  owner: true,
  value: true,
  tags: true,
  activities: true,
  status: true,
  unread: true,
  number: true,
};

const STORAGE_KEY = "kanban-card-fields";

export function loadCardFields(): CardVisibleFields {
  if (typeof window === "undefined") return DEFAULT_CARD_FIELDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_FIELDS;
    return { ...DEFAULT_CARD_FIELDS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CARD_FIELDS;
  }
}

export function saveCardFields(fields: CardVisibleFields) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {
    /* noop */
  }
}

const FIELD_LABELS: { key: keyof CardVisibleFields; label: string; locked?: boolean }[] = [
  { key: "status", label: "Status (badge)" },
  { key: "number", label: "Número (#ID)" },
  { key: "contact", label: "Contato associado" },
  { key: "product", label: "Produto" },
  { key: "tags", label: "Tags" },
  { key: "owner", label: "Responsável" },
  { key: "unread", label: "Msgs não lidas" },
  { key: "value", label: "Valor" },
  { key: "activities", label: "Tarefas pendentes" },
];

type Props = {
  fields: CardVisibleFields;
  onChange: (fields: CardVisibleFields) => void;
};

export function CardFieldsConfig({ fields, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (key: keyof CardVisibleFields) => {
    const next = { ...fields, [key]: !fields[key] };
    onChange(next);
    saveCardFields(next);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <TooltipHost label="Configurar campos do card" side="bottom">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Configurar campos do card"
        >
          <Settings2 className="size-4" />
        </Button>
      </TooltipHost>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border bg-popover p-2 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-foreground">
            Campos visíveis no card
          </p>
          <div className="flex flex-col gap-0.5">
            {FIELD_LABELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                )}
                onClick={() => toggle(key)}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    fields[key]
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-white"
                  )}
                >
                  {fields[key] && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span className="text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
