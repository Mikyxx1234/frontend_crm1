"use client";

/**
 * InlineNativeEditor
 *
 * Editor inline para campos nativos de Contact e Deal
 * (PUT /api/contacts/:id ou PUT /api/deals/:id).
 *
 * UX: valor com lápis ao hover → clique abre input → Enter/✓ salva.
 */

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconPencil, IconCheck, IconX, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

export interface InlineNativeEditorProps {
  value: string | undefined | null;
  entityType: "contact" | "deal";
  entityId: string;
  /** Chave enviada no body do PUT, ex.: "name", "phone", "value" */
  fieldKey: string;
  inputType?: "text" | "email" | "tel" | "number" | "date";
  /** Chaves do react-query para invalidar após salvar */
  invalidateKeys?: unknown[][];
  onSaved?: (newValue: string) => void;
  textClassName?: string;
  placeholder?: string;
  /** Formata o valor para exibição (ex.: moeda, data) */
  formatDisplay?: (raw: string) => string;
  /** Quando true, o ícone ✏ fica sempre visível (seção em modo edição ativo) */
  editMode?: boolean;
  /**
   * Override da persistência. Quando fornecido, é chamado no lugar do
   * PUT nativo (ex.: negócio sem contato vinculado → criar contato + linkar
   * ao deal). Recebe o valor já com trim aplicado.
   */
  customSave?: (trimmedValue: string) => Promise<void>;
}

async function putNativeField(
  entityType: "contact" | "deal",
  entityId: string,
  fieldKey: string,
  rawValue: string,
) {
  const path =
    entityType === "contact"
      ? `/api/contacts/${entityId}`
      : `/api/deals/${entityId}`;

  const body: Record<string, unknown> = {};
  if (fieldKey === "value" || fieldKey === "leadScore") {
    body[fieldKey] = rawValue === "" ? null : Number(rawValue);
  } else {
    body[fieldKey] = rawValue === "" ? null : rawValue;
  }

  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Erro ao salvar");
  }
  return res.json();
}

export function InlineNativeEditor({
  value,
  entityType,
  entityId,
  fieldKey,
  inputType = "text",
  invalidateKeys,
  onSaved,
  textClassName,
  placeholder = "Adicionar",
  formatDisplay,
  editMode = false,
  customSave,
}: InlineNativeEditorProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? "");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(value ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (trimmed === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (customSave) {
        await customSave(trimmed);
      } else {
        await putNativeField(entityType, entityId, fieldKey, trimmed);
      }
      onSaved?.(trimmed);
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          qc.invalidateQueries({ queryKey: key });
        }
      }
      setEditing(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") cancel();
  };

  /* ── Modo exibição ── */
  if (!editing) {
    const isEmpty = !value?.trim();
    const display = isEmpty
      ? placeholder
      : formatDisplay
        ? formatDisplay(value!)
        : value!;

    return (
      <button
        type="button"
        onClick={startEdit}
        className={cn(
          "group flex min-w-0 items-center gap-1.5 text-right transition-colors",
          isEmpty
            ? "font-display text-[11px] italic text-[var(--text-muted)] opacity-60"
            : (textClassName ?? "font-display text-[13px] font-bold text-[var(--text-primary)]"),
        )}
        aria-label={`Editar ${fieldKey}`}
      >
        <span className="min-w-0 break-words">{display}</span>
        <IconPencil
          size={12}
          className={cn(
            "mt-px shrink-0 transition-opacity group-hover:opacity-60",
            editMode ? "opacity-40" : "opacity-0",
          )}
        />
      </button>
    );
  }

  /* ── Modo edição ── */
  const inputBase =
    "h-7 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-[var(--brand-primary)] bg-[var(--glass-bg-strong)] px-2 font-display text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]";

  return (
    <div className="flex w-full items-center justify-end gap-1">
      <input
        ref={inputRef}
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setTimeout(() => {
            if (editing && !saving) void save();
          }, 150);
        }}
        className={inputBase}
      />
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          aria-label="Salvar"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--brand-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] disabled:opacity-50"
        >
          {saving ? (
            <IconLoader2 size={12} className="animate-spin" />
          ) : (
            <IconCheck size={12} />
          )}
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancelar"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
        >
          <IconX size={12} />
        </button>
      </div>
    </div>
  );
}
