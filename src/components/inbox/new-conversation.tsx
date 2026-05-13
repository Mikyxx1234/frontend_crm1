"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquarePlus, Send, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ChannelOption = {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  phoneNumber: string | null;
};

type CreatedConversation = {
  id: string;
  externalId: string | null;
  channel: string;
  status: string;
  inboxName: string | null;
  createdAt: string;
  updatedAt: string;
};

async function fetchChannels(): Promise<ChannelOption[]> {
  const res = await fetch(apiUrl("/api/channels"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao listar canais");
  return Array.isArray(data.channels) ? data.channels : [];
}

async function createConversation(body: {
  contactId: string;
  channelId: string;
  message: string;
}): Promise<CreatedConversation> {
  const res = await fetch(apiUrl("/api/conversations/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao criar conversa");
  return data.conversation;
}

const PROVIDER_LABELS: Record<string, string> = {
  META_CLOUD_API: "API Oficial",
};

const PROVIDER_ICONS: Record<string, string> = {
  META_CLOUD_API: "💼",
};

export function NewConversationButton({
  contactId,
  contactPhone,
  onCreated,
}: {
  contactId: string;
  contactPhone?: string | null;
  onCreated?: (conv: CreatedConversation) => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [selectedChannel, setSelectedChannel] = React.useState("");
  const [message, setMessage] = React.useState("");

  const { data: allChannels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["channels"],
    queryFn: fetchChannels,
    enabled: open,
    staleTime: 30_000,
  });

  const connectedChannels = allChannels.filter((c) => c.status === "CONNECTED");

  React.useEffect(() => {
    if (connectedChannels.length > 0 && !selectedChannel) {
      setSelectedChannel(connectedChannels[0].id);
    }
  }, [connectedChannels, selectedChannel]);

  const selected = allChannels.find((c) => c.id === selectedChannel);

  const mutation = useMutation({
    mutationFn: () =>
      createConversation({
        contactId,
        channelId: selectedChannel,
        message: message.trim(),
      }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessage("");
      setOpen(false);
      onCreated?.(conv);
    },
  });

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus className="size-4" />
        Nova Conversa
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Iniciar Nova Conversa</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => { setOpen(false); setMessage(""); }}
        >
          Cancelar
        </Button>
      </div>

      {contactPhone && (
        <p className="text-xs text-muted-foreground">
          Telefone: <span className="font-medium text-foreground">{contactPhone}</span>
        </p>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Canal de Envio</Label>
        {loadingChannels ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Carregando canais...
          </div>
        ) : connectedChannels.length === 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs text-destructive">
              Nenhum canal conectado encontrado.
            </p>
            {allChannels.length > 0 && (
              <div className="rounded border border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground space-y-1">
                <p className="font-medium">Canais disponíveis (desconectados):</p>
                {allChannels.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-1.5">
                    <WifiOff className="size-3 text-destructive/60" />
                    <span>{ch.name}</span>
                    <span className="text-muted-foreground/50">({PROVIDER_LABELS[ch.provider] ?? ch.provider})</span>
                  </div>
                ))}
                <p className="text-muted-foreground/70 mt-1">
                  Conecte um canal em Configurações &gt; Canais.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <SelectNative
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="h-8 text-sm"
            >
              {connectedChannels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {PROVIDER_ICONS[ch.provider] ?? "🌐"} {ch.name} — {PROVIDER_LABELS[ch.provider] ?? ch.provider}
                  {ch.phoneNumber ? ` (${ch.phoneNumber})` : ""}
                </option>
              ))}
            </SelectNative>

            {selected && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                <Wifi className="size-3 text-emerald-500" />
                <span>Envio via WhatsApp Business API (Meta Oficial)</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Mensagem</Label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escreva a primeira mensagem..."
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg border border-border/80 bg-background px-3 py-2 text-sm",
            "shadow-inner outline-none placeholder:text-muted-foreground",
            "focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && message.trim() && selectedChannel) {
              e.preventDefault();
              mutation.mutate();
            }
          }}
          disabled={mutation.isPending}
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-destructive">
          {mutation.error instanceof Error ? mutation.error.message : "Erro ao criar conversa."}
        </p>
      )}

      <Button
        type="button"
        size="sm"
        className="w-full gap-1.5"
        disabled={
          !message.trim() ||
          !selectedChannel ||
          mutation.isPending ||
          connectedChannels.length === 0
        }
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send className="size-4" /> Enviar mensagem
          </>
        )}
      </Button>
    </div>
  );
}
