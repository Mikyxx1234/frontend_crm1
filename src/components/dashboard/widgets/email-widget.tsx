"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Mail, Plus, ArrowRight } from "lucide-react";

import { apiUrl } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type EmailAccount = {
  id: string;
  email: string;
  unreadCount: number;
  lastSyncedAt: string | null;
};

/**
 * Widget compacto para o dashboard. Dois estados:
 *  - Sem conta conectada → CTA para Settings.
 *  - Com conta(s) → lista até 4 contas, total de não lidos, atalho para a inbox.
 */
export function EmailWidget() {
  const { data: accounts = [], isLoading } = useQuery<EmailAccount[]>({
    queryKey: ["dashboard-email-accounts"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/email-accounts"));
      if (!r.ok) throw new Error("Falha ao carregar contas de e-mail");
      const data = await r.json();
      return (data.accounts ?? []) as EmailAccount[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Estado vazio — sem conta conectada
  if (accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
          <Mail className="size-5" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Nenhuma conta de e-mail conectada
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-[260px]">
          Conecte sua caixa IMAP/SMTP para enviar e receber e-mails no CRM.
        </p>
        <Link
          href="/settings/email-accounts"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--brand-primary-dark)] transition-colors"
        >
          <Plus className="size-3" /> Conectar e-mail
        </Link>
      </div>
    );
  }

  const totalUnread = accounts.reduce((sum, a) => sum + (a.unreadCount ?? 0), 0);
  const top = accounts.slice(0, 4);

  return (
    <div className="flex h-full flex-col gap-3 p-1">
      {/* Header com total e link para inbox */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[28px] font-extrabold font-display leading-none text-[var(--text-primary)]">
            {totalUnread}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            mensagens não lidas
          </p>
        </div>
        <Link
          href="/email"
          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-enterprise-bg)] px-3 py-1.5 text-[11px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors"
        >
          Abrir <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Lista compacta de contas */}
      <div className="flex flex-col gap-1.5">
        {top.map((acc) => (
          <Link
            key={acc.id}
            href="/email"
            className="flex items-center gap-2.5 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--glass-bg-strong)]"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[11px] font-bold text-white">
              {acc.email[0]?.toUpperCase()}
            </span>
            <span className="flex-1 truncate text-[12px] font-semibold text-[var(--text-primary)]">
              {acc.email}
            </span>
            {acc.unreadCount > 0 && (
              <span className="rounded-full bg-[var(--color-enterprise-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--brand-primary)]">
                {acc.unreadCount > 99 ? "99+" : acc.unreadCount}
              </span>
            )}
          </Link>
        ))}
        {accounts.length > top.length && (
          <p className="pl-2 text-[11px] text-[var(--text-muted)]">
            +{accounts.length - top.length} outras contas
          </p>
        )}
      </div>
    </div>
  );
}
