"use client";

import Link from "next/link";
import { IconLock } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";

/**
 * Tela exibida quando um usuário sem papel de gestão tenta acessar uma
 * rota restrita a ADMIN/MANAGER (ex.: Logs, Distribuição, Automações).
 * Geralmente o `useRequireManager` já redireciona; isto cobre o instante
 * do redirect e o acesso direto por URL.
 */
export function RestrictedScreen({
  title = "Acesso restrito",
  description = "Esta área está disponível apenas para administradores e gerentes.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 items-center justify-center overflow-hidden">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-8 py-10 text-center shadow-[var(--glass-shadow)] backdrop-blur-[16px]">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <IconLock size={26} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-5 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
