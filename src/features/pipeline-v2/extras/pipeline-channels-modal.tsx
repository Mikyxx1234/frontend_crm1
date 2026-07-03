"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconFilter,
  IconLoader2,
  IconMail,
  IconMessage,
  IconPlus,
} from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { ApiChannel } from "@/components/channels/types";
import type { ChannelType } from "@/lib/prisma-enum-types";
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
 * Estilo (ícone + cor de fundo) por tipo de canal. As cores ficam em tokens
 * raw porque são identidades de marca (verde WhatsApp, gradient Insta) —
 * não há equivalente no DS v2 que faria sentido aqui.
 */
function getChannelStyle(type: ChannelType): {
  Icon: typeof IconMessage;
  bg: string;
} {
  switch (type) {
    case "WHATSAPP":
      return { Icon: IconBrandWhatsapp, bg: "var(--color-success)" };
    case "INSTAGRAM":
      return { Icon: IconBrandInstagram, bg: "var(--color-lavender)" };
    case "FACEBOOK":
      return { Icon: IconBrandFacebook, bg: "#3b82f6" };
    case "EMAIL":
      return { Icon: IconMail, bg: "var(--color-sky)" };
    case "WEBCHAT":
    default:
      return { Icon: IconMessage, bg: "var(--color-primary)" };
  }
}

/**
 * "Canais do funil": lista os canais da org com um toggle indicando se o
 * inbound daquele canal cai NESTE funil. Marcar vincula o canal a este
 * pipeline (reatribui se estava em outro); desmarcar volta ao funil padrão
 * da org. Espelha o select "Funil de destino" da configuração do canal —
 * a fonte da verdade é `Channel.defaultPipelineId`.
 *
 * Visual: header glass (ícone + título + descrição + ×), lista de canais
 * com ícone-colorido + nome + status + Switch, empty state com CTA para
 * /settings/channels e footer com hint dinâmico de quantos canais estão
 * roteando para este funil. Saves são imediatos por toggle (sem batch).
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

  const linkedHereCount = useMemo(
    () => channels.filter((c) => c.defaultPipelineId === pipelineId).length,
    [channels, pipelineId],
  );

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

  const showEmpty = !isLoading && !isError && channels.length === 0;
  const showList = !isLoading && !isError && channels.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="md" bodyClassName="gap-0 p-0">
        <DialogHeader className="flex-row items-start gap-3 px-5 pb-4 pt-5 border-b border-[var(--glass-border-subtle)]">
          <div
            aria-hidden
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
          >
            <IconFilter size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle>
              Canais do funil
              {pipelineName ? (
                <>
                  {" · "}
                  <span className="text-[var(--brand-primary-dark)]">{pipelineName}</span>
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription className="mt-1.5 max-w-[42ch] text-[12.5px] leading-relaxed">
              Selecione os canais cujos novos leads devem entrar neste funil.
              Conversas que já existem no CRM não são movidas.
            </DialogDescription>
          </div>
          <DialogClose className="static ml-auto flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] opacity-100 transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]" />
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {isError ? (
            <p className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {error instanceof Error ? error.message : "Erro ao carregar canais."}
            </p>
          ) : null}

          {mutation.isError ? (
            <p className="mb-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-3 py-2 text-sm text-[var(--color-danger)]">
              {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar."}
            </p>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 px-1 py-6 text-sm text-[var(--text-muted)]">
              <IconLoader2 size={16} className="animate-spin" /> Carregando canais…
            </div>
          ) : null}

          {showEmpty ? (
            <div className="flex flex-col items-center gap-1.5 px-3 py-7 text-center">
              <div
                aria-hidden
                className="mb-1.5 flex h-[52px] w-[52px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]"
              >
                <IconFilter size={24} />
              </div>
              <h3 className="font-display text-[14.5px] font-bold text-[var(--text-primary)]">
                Nenhum canal configurado ainda
              </h3>
              <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                Conecte um canal de atendimento (WhatsApp, Instagram, etc.) para
                que novos leads entrem automaticamente neste funil.
              </p>
              <Button asChild className="mt-2.5">
                <Link href="/settings/channels">
                  <IconPlus size={15} /> Conectar canal
                </Link>
              </Button>
            </div>
          ) : null}

          {showList ? (
            <ul className="flex flex-col gap-2">
              {channels.map((ch) => {
                const linkedHere = ch.defaultPipelineId === pipelineId;
                const linkedElsewhere =
                  !!ch.defaultPipelineId && ch.defaultPipelineId !== pipelineId;
                const pendingThis =
                  mutation.isPending && mutation.variables?.channelId === ch.id;
                const { Icon, bg } = getChannelStyle(ch.type);
                const status = linkedHere
                  ? "Roteando para este funil"
                  : linkedElsewhere
                    ? `Vinculado a: ${pipelineNameById.get(ch.defaultPipelineId!) ?? "outro funil"}`
                    : "Funil padrão da organização";
                return (
                  <li
                    key={ch.id}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-black/[0.02] px-3.5 py-3 transition-colors",
                      "hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)]",
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white"
                      style={{ backgroundColor: bg }}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[13.5px] font-bold text-[var(--text-primary)]">
                        {ch.name}
                      </p>
                      <p className="truncate text-[11.5px] text-[var(--text-muted)]">
                        {status}
                      </p>
                    </div>
                    {pendingThis ? (
                      <IconLoader2
                        size={16}
                        className="shrink-0 animate-spin text-[var(--text-muted)]"
                      />
                    ) : null}
                    <Switch
                      checked={linkedHere}
                      disabled={mutation.isPending}
                      aria-label={`Ativar ${ch.name} neste funil`}
                      onCheckedChange={(checked) =>
                        mutation.mutate({
                          channelId: ch.id,
                          nextPipelineId: checked ? pipelineId : null,
                        })
                      }
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <DialogFooter className="flex-row items-center gap-2.5 border-t border-[var(--glass-border-subtle)] px-5 py-3.5 sm:justify-end">
          <span className="mr-auto text-[11.5px] text-[var(--text-muted)]">
            {showEmpty
              ? "Nenhum canal configurado"
              : linkedHereCount === 0
                ? "Nenhum canal selecionado"
                : `${linkedHereCount} ${linkedHereCount === 1 ? "canal selecionado" : "canais selecionados"}`}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
