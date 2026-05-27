"use client";

import { useQuery } from "@tanstack/react-query";

import { listQuickReplies, type QuickReply } from "@/features/inbox-v2/api";

/**
 * Popover/lista simples de quick replies — inserido no draft via
 * `onInsert(content)`. UI minimalista (sem busca/edicao) — a edicao
 * fica na pagina /settings/quick-replies do CRM (intocada).
 */
export function QuickReplyList({
  onInsert,
  onClose,
}: {
  onInsert: (content: string) => void;
  onClose?: () => void;
}) {
  const { data, isLoading } = useQuery<QuickReply[]>({
    queryKey: ["quick-replies"],
    queryFn: listQuickReplies,
    staleTime: 60_000,
  });

  return (
    <div className="w-72 max-h-80 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2 shadow-[var(--glass-shadow)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Respostas rapidas
        </span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Fechar
          </button>
        ) : null}
      </div>
      {isLoading ? (
        <div className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
          Carregando...
        </div>
      ) : !data?.length ? (
        <div className="px-2 py-3 text-center text-[12px] text-[var(--text-muted)]">
          Nenhuma resposta rapida cadastrada.
        </div>
      ) : (
        data.map((qr) => (
          <button
            key={qr.id}
            type="button"
            onClick={() => {
              onInsert(qr.content);
              onClose?.();
            }}
            className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]"
          >
            <span className="font-display text-[11px] font-bold text-[var(--brand-primary)]">
              /{qr.shortcut}
            </span>
            <span className="ml-1.5 text-[var(--text-secondary)]">{qr.content}</span>
          </button>
        ))
      )}
    </div>
  );
}
