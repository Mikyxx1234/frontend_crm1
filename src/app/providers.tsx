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
      {/* CRM EduIT é light-only por design (ver ui-fidelity.mdc): cards brancos,
          sidebar navy, sem toggle de tema. `enableSystem` ficou desligado e
          `forcedTheme="light"` blinda contra `prefers-color-scheme: dark` do SO
          do usuário — sem isso, o navegador em modo escuro injetava
          `class="dark"` no <html> e o bloco `.dark` em globals.css (mantido só
          por compatibilidade) sobrescrevia `--color-background` para preto. */}
      <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
