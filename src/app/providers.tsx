"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
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
      {/* Tema controlado exclusivamente por `useThemeV2` (toggle Sol/Lua no
          sidebar), que aplica `.v2-dark` + `.dark` no <html> e persiste em
          localStorage (`crm-v2-theme`). Um script inline em `layout.tsx`
          já aplica essas classes antes do paint (evita FOUC). Não usar
          `ThemeProvider` do next-themes aqui — ele teria sua própria fonte
          de verdade e entraria em conflito com `useThemeV2`. */}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
