"use client";

/**
 * RunAutomationButton — botao + dropdown que lista as automacoes com
 * triggerType=`manual` ativas e dispara uma delas para o contato/deal
 * onde o operador esta (inbox ou kanban).
 *
 * 27/mai/26 — Criado como ponto unico de UI para o novo gatilho
 * `manual`. Compartilhado entre `ConversationHeader.toolbarActions`
 * (inbox) e `DealHeader` (kanban). Erros mostram toast e nao quebram
 * a UI; sucesso mostra toast confirmando o disparo.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 as Loader2, IconWorkflow as Workflow } from "@tabler/icons-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type ManualAutomation = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  triggerType: string;
  stepCount: number;
};

type ListResponse = {
  items: ManualAutomation[];
  total: number;
};

type RunAutomationButtonProps = {
  contactId: string;
  conversationId?: string | null;
  dealId?: string | null;
  /** Variante visual: barra do header (default) ou inline (botao maior). */
  variant?: "toolbar" | "inline";
  /** Texto customizado pro tooltip e aria-label. */
  label?: string;
};

async function fetchManualAutomations(): Promise<ManualAutomation[]> {
  const url = apiUrl(
    "/api/automations?triggerType=manual&active=true&perPage=100",
  );
  const res = await fetch(url);
  const json = (await res.json().catch(() => ({}))) as Partial<ListResponse>;
  if (!res.ok) {
    throw new Error("Falha ao carregar automacoes manuais");
  }
  return Array.isArray(json.items) ? json.items : [];
}

async function runAutomation(
  automationId: string,
  payload: {
    contactId: string;
    conversationId?: string | null;
    dealId?: string | null;
  },
): Promise<{ ok: boolean; automationName?: string; message?: string }> {
  const res = await fetch(apiUrl(`/api/automations/${automationId}/run`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contactId: payload.contactId,
      conversationId: payload.conversationId ?? undefined,
      dealId: payload.dealId ?? undefined,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    automationName?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(typeof json?.message === "string" ? json.message : "Falha ao executar");
  }
  return {
    ok: !!json.ok,
    automationName: json.automationName,
    message: json.message,
  };
}

export function RunAutomationButton({
  contactId,
  conversationId,
  dealId,
  variant = "toolbar",
  label = "Rodar automação",
}: RunAutomationButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [runningId, setRunningId] = React.useState<string | null>(null);

  // Carrega só quando o dropdown abre — evita N fetches paralelos quando o
  // operador percorre rapidamente entre conversas.
  //
  // Bug 29/mai/26: `staleTime: 30_000` causava UX confusa — o operador abria
  // o dropdown (lista vazia, fechava), criava uma automação manual em
  // /automations, voltava ao inbox e abria o dropdown DENTRO de 30s →
  // continuava vazio porque o React Query servia cache stale. Removido o
  // staleTime e forçado refetch a cada abertura para que o operador veja
  // sempre a lista mais recente. Custo: um fetch ~600ms quando abre, mas
  // é um endpoint leve e só dispara on-demand.
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["manual-automations"],
    queryFn: fetchManualAutomations,
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const items = data ?? [];
  const hasItems = items.length > 0;

  async function handleRun(automation: ManualAutomation) {
    if (runningId) return;
    setRunningId(automation.id);
    try {
      const result = await runAutomation(automation.id, {
        contactId,
        conversationId,
        dealId,
      });
      const niceName = result.automationName ?? automation.name;
      toast.success(`Automação disparada: ${niceName}`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao executar automação");
    } finally {
      setRunningId(null);
    }
  }

  const triggerClass =
    variant === "toolbar"
      ? "flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-ink-soft)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
      : "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* Bug 29/mai/26: o DropdownMenu deste projeto é custom (NÃO Radix —
          ver src/components/ui/dropdown-menu.tsx), e o Trigger é um <button>
          que captura onClick e chama setOpen. Em /run-automation-button
          envolvíamos isso num TooltipHost — que aplica TooltipTrigger asChild
          em um <span> wrapper. O <span> ficava ENTRE o triggerRef do dropdown
          e o root do componente, e o `pointerdown` listener global do
          DropdownMenu (linha 59 do componente) usa
          `containerRef.current?.contains(target)` pra decidir se fecha o
          menu. Como o pointerdown também era capturado pelo span do Tooltip,
          o close-on-outside-click disparava ANTES do open-on-click do
          trigger conseguir efetivar a abertura. Resultado: tooltip abria,
          fetch rodava, mas o menu não permanecia aberto.
          Solução: tooltip apenas via atributo `title` nativo. Mantém UX
          (hover mostra texto) sem interferir no event flow do DropdownMenu. */}
      <DropdownMenuTrigger className={triggerClass} aria-label={label} title={label}>
        <Workflow
          className={cn("shrink-0", variant === "toolbar" ? "size-4" : "size-3.5")}
          strokeWidth={1.8}
        />
        {variant === "inline" ? <span>Rodar automação</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(340px,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto"
      >
        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Automações manuais
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-3 py-4 text-[12px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Carregando…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-1.5 px-3 py-4 text-center">
            <p className="text-[12px] text-destructive">Erro ao carregar.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Tentar de novo
            </button>
          </div>
        ) : !hasItems ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[12px] text-muted-foreground">
              Nenhuma automação manual ativa.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              Crie uma em <span className="font-medium">Automações</span> com gatilho{" "}
              <span className="font-medium">&quot;Manual&quot;</span>.
            </p>
          </div>
        ) : (
          items.map((a) => {
            const isRunning = runningId === a.id;
            return (
              <DropdownMenuItem
                key={a.id}
                disabled={!!runningId}
                onClick={(e) => {
                  // O DropdownMenuItem deste projeto é um <button> que dispara
                  // via onClick (não onSelect/Radix). `preventDefault` mantém o
                  // menu aberto enquanto roda (o item checa !defaultPrevented
                  // antes de fechar) → mostra o spinner inline.
                  e.preventDefault();
                  void handleRun(a);
                }}
                className="flex flex-col items-start gap-0.5 px-3 py-2 text-[12px]"
              >
                <div className="flex w-full items-center gap-2">
                  {isRunning ? (
                    <Loader2 className="size-3 shrink-0 animate-spin text-primary" />
                  ) : (
                    <Workflow className="size-3 shrink-0 text-primary" />
                  )}
                  <span className="flex-1 truncate font-medium text-foreground">{a.name}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {a.stepCount} passo{a.stepCount === 1 ? "" : "s"}
                  </span>
                </div>
                {a.description ? (
                  <span className="line-clamp-2 pl-5 text-[11px] text-muted-foreground">
                    {a.description}
                  </span>
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
