"use client"

import * as React from "react"
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export interface DropdownOption {
  value: string
  label: React.ReactNode
  /** Ícone exibido à esquerda do item */
  icon?: React.ReactNode
  /** Texto auxiliar exibido abaixo do label */
  description?: string
  /** Estilo de ação destrutiva */
  danger?: boolean
  disabled?: boolean
}

type Align = "start" | "center" | "end"
type Side = "top" | "right" | "bottom" | "left"

interface DropdownGlassProps {
  options: DropdownOption[]
  value?: string
  onValueChange?: (value: string) => void
  /** Gatilho customizado (asChild). Quando omitido, usa o gatilho padrão estilo select. */
  trigger?: React.ReactElement
  /** Placeholder do gatilho padrão quando não há valor selecionado */
  placeholder?: string
  align?: Align
  side?: Side
  sideOffset?: number
  /** Largura do painel acompanha a largura do gatilho */
  matchTriggerWidth?: boolean
  /** Rótulo opcional no topo do painel */
  menuLabel?: string
  className?: string
  triggerClassName?: string
  disabled?: boolean
}

/**
 * Dropdown / Select do Design System (glass claro).
 *
 * Uso como select:
 *   <DropdownGlass options={opts} value={v} onValueChange={setV} />
 *
 * Uso com gatilho customizado:
 *   <DropdownGlass options={opts} value={v} onValueChange={setV} trigger={<button>...</button>} />
 */
export function DropdownGlass({
  options,
  value,
  onValueChange,
  trigger,
  placeholder = "Selecione",
  align = "start",
  side = "bottom",
  sideOffset = 6,
  matchTriggerWidth = true,
  menuLabel,
  className,
  triggerClassName,
  disabled,
}: DropdownGlassProps) {
  const selected = options.find((o) => o.value === value)

  return (
    <DropdownPrimitive.Root>
      {/*
       * suppressHydrationWarning: o Radix usa useId internamente para
       * o atributo id="radix-..." do trigger. Em árvores onde algo acima
       * (ex.: useSession do NextAuth, queries que resolvem entre SSR e
       * mount) reordena os contadores de useId do React 19, o servidor
       * e o cliente geram IDs diferentes — atributos não-determinísticos
       * são exatamente o caso de uso recomendado p/ suppressHydrationWarning.
       * Nenhum impacto funcional: o ID final é o do cliente.
       */}
      <DropdownPrimitive.Trigger asChild disabled={disabled} suppressHydrationWarning>
        {trigger ?? (
          <button
            type="button"
            suppressHydrationWarning
            className={cn(
              "group inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] px-3.5",
              "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-sm",
              "shadow-[var(--glass-shadow-sm)] transition-colors",
              "font-display text-[13px] font-semibold",
              selected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
              "hover:bg-[var(--glass-bg-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40",
              "data-[state=open]:ring-2 data-[state=open]:ring-[var(--brand-primary)]/40 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
              triggerClassName,
            )}
          >
            {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <IconChevronDown
              size={15}
              className="ml-auto shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </button>
        )}
      </DropdownPrimitive.Trigger>

      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          className={cn(
            "z-50 overflow-hidden rounded-[var(--radius-lg)] p-1.5",
            "border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-xl",
            "shadow-[var(--glass-shadow)]",
            "max-h-[min(320px,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto",
            matchTriggerWidth && "min-w-[var(--radix-dropdown-menu-trigger-width)]",
            "origin-(--radix-dropdown-menu-content-transform-origin)",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
            className,
          )}
        >
          {menuLabel && (
            <DropdownPrimitive.Label className="px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {menuLabel}
            </DropdownPrimitive.Label>
          )}
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <DropdownPrimitive.Item
                key={option.value}
                disabled={option.disabled}
                onSelect={() => onValueChange?.(option.value)}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2",
                  "font-display text-[13px] font-semibold outline-none transition-colors",
                  "text-[var(--text-secondary)]",
                  "data-[highlighted]:bg-[var(--glass-bg-strong)] data-[highlighted]:text-[var(--text-primary)]",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                  isSelected && "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
                  option.danger &&
                    "text-[var(--color-danger)] data-[highlighted]:bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] data-[highlighted]:text-[var(--color-danger)]",
                )}
              >
                {option.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {option.icon}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="truncate font-body text-[11px] font-normal text-[var(--text-muted)]">
                      {option.description}
                    </span>
                  )}
                </span>
                {isSelected && !option.danger && (
                  <IconCheck size={15} strokeWidth={2.5} className="shrink-0 text-[var(--brand-primary)]" />
                )}
              </DropdownPrimitive.Item>
            )
          })}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  )
}
