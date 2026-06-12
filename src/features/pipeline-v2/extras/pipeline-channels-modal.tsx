"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { apiUrl } from "@/lib/api";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiChannel } from "@/components/channels/types";
import { listPipelines } from "@/features/inbox-v2/api/misc";

async function fetchChannels(): Promise<ApiChannel[]> {
  const res = await fetch(apiUrl("/api/channels"));
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Erro ao carregar canais.";
    throw new Error(msg);
  }
  if (Array.isArray(data)) return data as ApiChannel[];
  if (data && typeof data === "object" && "channels" in data) {
    const ch = (data as { channels: unknown }).channels;
    if (Array.isArray(ch)) return ch as ApiChannel[];
  }
  return [];
}

/**
 * "Canais do funil": lista os canais da org com um toggle indicando se o
 * inbound daquele canal cai NESTE funil. Marcar vincula o canal a este
 * pipeline (reatribui se estava em outro); desmarcar volta ao funil padrão
 * da org. Espelha o select "Funil de destino" da configuração do canal —
 * a fonte da verdade é `Channel.defaultPipelineId`.
 */
export function PipelineChannelsModal({
  pipelineId,
  pipelineName,
  open,
  onClose,
}: {
  pipelineId: string;
  pipelineName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    data: channels = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["channels"],
    queryFn: fetchChannels,
    enabled: open,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines-channel-select"],
    queryFn: listPipelines,
    enabled: open,
  });

  const pipelineNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pipelines) map.set(p.id, p.name);
    return map;
  }, [pipelines]);

  const mutation = useMutation({
    mutationFn: async (vars: {
      channelId: string;
      nextPipelineId: string | null;
    }) => {
      const res = await fetch(apiUrl(`/api/channels/${vars.channelId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPipelineId: vars.nextPipelineId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Erro ao salvar.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="lg" panelClassName="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Canais do funil{pipelineName ? ` · ${pipelineName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-[var(--text-muted)]">
          Selecione os canais cujos novos leads devem entrar neste funil.
          Conversas que já existem no CRM não são movidas.
        </p>

        {isError ? (
          <p className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {error instanceof Error ? error.message : "Erro ao carregar canais."}
          </p>
        ) : null}

        {mutation.isError ? (
          <p className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-danger)]">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Erro ao salvar."}
          </p>
        ) : null}

        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 px-1 py-4 text-sm text-[var(--text-muted)]">
              <Loader2 className="size-4 animate-spin" /> Carregando canais…
            </div>
          ) : channels.length === 0 ? (
            <p className="px-1 py-4 text-sm text-[var(--text-muted)]">
              Nenhum canal configurado ainda.
            </p>
          ) : (
            channels.map((ch) => {
              const linkedHere = ch.defaultPipelineId === pipelineId;
              const linkedElsewhere =
                !!ch.defaultPipelineId && ch.defaultPipelineId !== pipelineId;
              const pendingThis =
                mutation.isPending && mutation.variables?.channelId === ch.id;
              return (
                <label
                  key={ch.id}
                  className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5 transition-colors hover:bg-[var(--glass-bg-strong)]"
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-[var(--brand-primary)]"
                    checked={linkedHere}
                    disabled={mutation.isPending}
                    onChange={(e) =>
                      mutation.mutate({
                        channelId: ch.id,
                        nextPipelineId: e.target.checked ? pipelineId : null,
                      })
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
                      {ch.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {linkedHere
                        ? "Roteando para este funil"
                        : linkedElsewhere
                          ? `Vinculado a: ${pipelineNameById.get(ch.defaultPipelineId!) ?? "outro funil"}`
                          : "Funil padrão da organização"}
                    </p>
                  </div>
                  {pendingThis ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-[var(--text-muted)]" />
                  ) : null}
                </label>
              );
            })
          )}
        </div>

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
