"use client"

import { DropdownGlass } from "@/components/crm/dropdown-glass"
import { InputGlass } from "@/components/crm/input-glass"
import { Input } from "@/components/ui/input"
import { BOOL_OPTS } from "@/components/automations/editor-fields"
import { cn } from "@/lib/utils"

const TYPED_FIELD_TYPES = new Set(["SELECT", "MULTI_SELECT", "BOOLEAN", "NUMBER", "DATE"])

/** Hint de variáveis só em texto livre (TEXT/URL/EMAIL/PHONE/desconhecido/nativo). */
export function showsUpdateFieldVariableHint(fieldType: string): boolean {
  return !TYPED_FIELD_TYPES.has((fieldType || "").toUpperCase())
}

function parseMulti(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean)
}

function serializeMulti(selected: string[]): string {
  return selected.join(",")
}

type Props = {
  fieldType: string
  options: string[]
  value: string
  onChange: (next: string) => void
  variant: "inline" | "panel"
}

export function UpdateFieldValueControl({
  fieldType,
  options,
  value,
  onChange,
  variant,
}: Props) {
  const type = (fieldType || "").toUpperCase()
  const selectOpts = options.map((opt) => ({ value: opt, label: opt }))
  const triggerClass = variant === "inline" ? "w-full nodrag" : "w-full"
  const inputClass = variant === "inline" ? "nodrag" : undefined

  // Sem alternativas cadastradas: cai no texto livre (mesmo critério das condições).
  if (type === "SELECT" && options.length > 0) {
    return (
      <DropdownGlass
        triggerClassName={triggerClass}
        placeholder="Selecione…"
        value={value}
        options={[{ value: "", label: "Selecione…" }, ...selectOpts]}
        onValueChange={onChange}
      />
    )
  }

  if (type === "MULTI_SELECT" && options.length > 0) {
    const selected = new Set(parseMulti(value))
    const toggle = (opt: string) => {
      const next = new Set(selected)
      if (next.has(opt)) next.delete(opt)
      else next.add(opt)
      // Ordem estável: ordem das options do campo
      onChange(serializeMulti(options.filter((o) => next.has(o))))
    }
    return (
      <div
        className={cn(
          "flex max-h-40 flex-col gap-1 overflow-y-auto rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-2",
          variant === "inline" && "nodrag nowheel",
        )}
      >
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-overlay)]"
          >
            <input
              type="checkbox"
              className={cn(
                "size-3.5 accent-[var(--brand-primary)]",
                variant === "inline" && "nodrag",
              )}
              checked={selected.has(opt)}
              onChange={() => toggle(opt)}
            />
            <span className="truncate font-medium">{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (type === "BOOLEAN") {
    return (
      <DropdownGlass
        triggerClassName={triggerClass}
        placeholder="Sim/Não"
        value={value}
        options={BOOL_OPTS}
        onValueChange={onChange}
      />
    )
  }

  if (type === "NUMBER") {
    if (variant === "inline") {
      return (
        <InputGlass
          type="number"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }
    return (
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === "DATE") {
    if (variant === "inline") {
      return (
        <InputGlass
          type="date"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    }
    return (
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  // TEXT / URL / EMAIL / PHONE / desconhecido / nativo
  if (variant === "inline") {
    return (
      <InputGlass
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
