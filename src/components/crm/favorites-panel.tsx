"use client"

import { IconStarFilled, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFavoriteMessage, useFavoriteMessagesList } from "@/features/inbox-v2/hooks"

/**
 * Painel "Mensagens favoritas" (estilo WhatsApp) — lista as mensagens
 * que o agente logado marcou com estrela nesta conversa. Acessível
 * pelo kebab (⋮) do header, tanto no inbox quanto no drawer de deal.
 */
export function FavoritesPanel({
  open,
  onOpenChange,
  conversationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string | null
}) {
  const { data, isLoading, isError, error } = useFavoriteMessagesList(conversationId, open)
  const unfavorite = useFavoriteMessage(conversationId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Mensagens favoritas</DialogTitle>
          <DialogDescription>
            Marcador pessoal — só você vê o que favoritou nesta conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
          {isLoading && (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">Carregando…</p>
          )}
          {/* Erro explícito (rota fora do ar, 404, etc.) — antes isso caía
              silenciosamente no estado "vazio" e mascarava o problema real. */}
          {!isLoading && isError && (
            <p className="py-6 text-center text-sm text-red-500">
              {error?.message || "Falha ao carregar mensagens favoritadas."}
            </p>
          )}
          {!isLoading && !isError && (!data || data.length === 0) && (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">
              Nenhuma mensagem favoritada ainda.
            </p>
          )}
          {data?.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-3 py-2.5"
            >
              <IconStarFilled size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                {m.senderName && (
                  <p className="font-display text-[11px] font-semibold text-[var(--text-muted)]">
                    {m.senderName}
                  </p>
                )}
                <p className="break-words text-sm text-[var(--text-primary)]">{m.content}</p>
                <p className="mt-0.5 text-[10.5px] text-[var(--text-muted)]">
                  {new Date(m.createdAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <button
                type="button"
                title="Remover dos favoritos"
                aria-label="Remover dos favoritos"
                onClick={() =>
                  unfavorite.mutate(
                    { messageId: m.id, favorite: false },
                    { onSuccess: () => toast.success("Removida dos favoritos") },
                  )
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
              >
                <IconX size={13} />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
