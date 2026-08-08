"use client"

/**
 * Ticks de ack estilo WhatsApp (pending / sent / delivered / read / failed).
 * Compartilhado entre bolhas do chat e preview do card da lista.
 */
import { cn } from "@/lib/utils"
import {
  IconAlertCircle,
  IconCheck,
  IconChecks,
  IconClock,
} from "@tabler/icons-react"

export type DeliveryTickStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"

/** Ticks de status estilo WhatsApp.
 *  `onLightBg` = true em fundos claros (card da lista, bolha de automação). */
export function StatusTicks({
  status,
  onLightBg,
  size = "bubble",
}: {
  status: DeliveryTickStatus
  onLightBg?: boolean
  /** `card` = ícones levemente menores pro preview da lista. */
  size?: "bubble" | "card"
}) {
  const dim = onLightBg ? "text-[var(--text-muted)]" : "text-white/70"
  const solid = onLightBg ? "text-[var(--text-secondary)]" : "text-white/75"
  const clock = size === "card" ? 11 : 12
  const fail = size === "card" ? 12 : 13
  const check = size === "card" ? 12 : 14
  const checks = size === "card" ? 13 : 15

  if (status === "pending") {
    return (
      <IconClock
        size={clock}
        className={cn("shrink-0", dim)}
        aria-label="Enviando"
      />
    )
  }
  if (status === "failed") {
    return (
      <IconAlertCircle
        size={fail}
        className="shrink-0 text-[var(--wa-tick-fail)]"
        aria-label="Falha no envio"
      />
    )
  }
  if (status === "sent") {
    return (
      <IconCheck
        size={check}
        className={cn("shrink-0", solid)}
        aria-label="Enviada"
      />
    )
  }
  return (
    <IconChecks
      size={checks}
      className={cn(
        "shrink-0",
        status === "read" ? "text-[var(--wa-tick-read,#38bdf8)]" : solid,
      )}
      aria-label={status === "read" ? "Lida" : "Entregue"}
    />
  )
}

/** Normaliza sendStatus / MessageStatus (qualquer casing) para o enum dos ticks. */
export function normalizeDeliveryStatus(
  raw: string | null | undefined,
): DeliveryTickStatus | undefined {
  switch ((raw ?? "").toLowerCase()) {
    case "pending":
      return "pending"
    case "sent":
      return "sent"
    case "delivered":
      return "delivered"
    case "read":
      return "read"
    case "failed":
      return "failed"
    default:
      return undefined
  }
}
