"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { Session } from "next-auth";
import { useState } from "react";

import { ConfirmProvider } from "@/hooks/use-confirm";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <SessionProvider session={session}>
      {/* Tema controlado pelo usuário via toggle (botão Sol/Lua no sidebar).
          - `attribute="class"` aplica `.dark` no <html> quando ativo.
          - `defaultTheme="light"` mantém light como padrão até o usuário escolher.
          - `enableSystem={false}` ignora `prefers-color-scheme` do SO — só muda
            quando o usuário clica no toggle (escolha explícita persiste em
            localStorage via next-themes).
          - Variáveis CSS para dark estão definidas em `globals.css` no bloco `.dark`. */}
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
