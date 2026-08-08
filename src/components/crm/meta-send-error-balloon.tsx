"use client"

/**
 * Balão de erro de envio Meta — layout do snapshot de produto:
 * fundo rosa claro, ícone em círculo, título, corpo, "Copiar erro" + cód.
 */

import { useState } from "react"
import { IconAlertTriangle, IconCheck, IconCopy } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  extractMetaErrorCode,
  summarizeSendErrorBody,
  translateSendError,
} from "@/lib/meta-error-catalog"

export function MetaSendErrorBalloon({
  sendError,
  className,
  onCopied,
}: {
  sendError?: string | null
  className?: string
  /** Callback opcional (ex.: toast no chat legado). */
  onCopied?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const body = summarizeSendErrorBody(sendError)
  const code = extractMetaErrorCode(sendError)
  const fullText = translateSendError(sendError)

  return (
    <div
      role="alert"
      className={cn(
        "flex w-max max-w-[min(320px,calc(100vw-3rem))] gap-3 rounded-[18px] bg-[#FFF2F0] px-3.5 py-3 text-left shadow-[0_1px_3px_rgba(125,51,51,0.08)]",
        className,
      )}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F5D5D0]"
        aria-hidden
      >
        <IconAlertTriangle
          size={18}
          stroke={2}
          className="text-[#7D3333]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-bold leading-tight text-[#7D3333]">
          Erro no envio (Meta)
        </p>
        <p className="mt-1 font-body text-[12px] font-normal leading-snug text-[#7D3333] [overflow-wrap:anywhere]">
          {body}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-1.5 font-display text-[11.5px] font-semibold text-[#7D3333] transition-opacity hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation()
              void navigator.clipboard.writeText(fullText).then(() => {
                setCopied(true)
                onCopied?.()
                setTimeout(() => setCopied(false), 1500)
              })
            }}
          >
            {copied ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={2} />}
            {copied ? "Copiado" : "Copiar erro"}
          </button>
          {code != null ? (
            <span className="font-display text-[11px] font-medium tabular-nums text-[#A07575]">
              cód. {code}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
