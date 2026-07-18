"use client";

import { apiUrl } from "@/lib/api";

import { useConfirm } from "@/hooks/use-confirm";
import { IconPlus as Plus, IconRadio as Radio } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChannelCard } from "@/components/channels/channel-card";
import { ChannelPipelineSelect } from "@/components/channels/channel-pipeline-select";
import { CreateChannelDialog } from "@/components/channels/create-channel-dialog";
import { MetaConfigPanel } from "@/components/channels/meta-config-panel";
import type { ApiChannel } from "@/components/channels/types";
import { WhatsappQrModal } from "@/components/channels/whatsapp-qr-modal";
import { ButtonGlass } from "@/components/crm/button-glass";
import { GlassCard } from "@/components/crm/glass-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGlass } from "@/components/crm/input-glass";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SettingsListFilterBar,
  type SettingsFilterGroup,
} from "@/components/crm/settings-filter-bar";
import { PageActionsMenu } from "@/components/crm/page-toolbar";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";

async function fetchChannels(): Promise<ApiChannel[]> {
  const res = await fetch(apiUrl("/api/channels"));
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "message" in data &&
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

export default function SettingsChannelsPage({
  search: searchProp,
  createOpen: createOpenProp,
  onCreateOpenChange,
  hideToolbar = false,
}: {
  /** Filtro de busca controlado pelo header (quando fornecido). */
  search?: string;
  /** Estado controlado do diálogo "Novo Canal" (quando fornecido). */
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  /** Oculta a barra interna de ação (botão sobe para o header). */
  hideToolbar?: boolean;
} = {}) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const slots = useSettingsHeaderSlots();
  const [createOpenInternal, setCreateOpenInternal] = useState(false);
  const createOpen = createOpenProp ?? createOpenInternal;
  const setCreateOpen = onCreateOpenChange ?? setCreateOpenInternal;
  const [search, setSearch] = useState(searchProp ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qrChannel, setQrChannel] = useState<ApiChannel | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrInitial, setQrInitial] = useState<string | null>(null);
  const [metaChannel, setMetaChannel] = useState<ApiChannel | null>(null);
  const [simpleChannel, setSimpleChannel] = useState<ApiChannel | null>(null);
  const [simpleName, setSimpleName] = useState("");
  const [simplePhone, setSimplePhone] = useState("");
  const [simplePipelineId, setSimplePipelineId] = useState<string | null>(null);

  const { data: channels = [], isLoading, isError, error } = useQuery({
    queryKey: ["channels"],
    queryFn: fetchChannels,
  });

  const connectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/channels/${id}/connect`), { method: "POST" });
      const data = (await res.json()) as {
        status?: string;
        qrCode?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro ao conectar.");
      }
      return { id, ...data };
    },
    onSuccess: async (result) => {
      await queryClient.refetchQueries({ queryKey: ["channels"] });
      const list = queryClient.getQueryData<ApiChannel[]>(["channels"]);
      const ch = list?.find((c) => c.id === result.id);
      const shouldOpenQr =
        result.qrCode ||
        result.status === "QR_READY" ||
        result.status === "CONNECTING";
      if (shouldOpenQr && ch) {
        setQrChannel({
          ...ch,
          status: (result.status as ApiChannel["status"]) ?? "QR_READY",
          qrCode: result.qrCode ?? ch.qrCode,
        });
        setQrInitial(result.qrCode ?? ch.qrCode ?? null);
        setQrOpen(true);
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/channels/${id}/disconnect`), {
        method: "POST",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro ao desconectar.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/channels/${id}`), { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro ao excluir.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const saveSimpleMutation = useMutation({
    mutationFn: async () => {
      if (!simpleChannel) return;
      const res = await fetch(apiUrl(`/api/channels/${simpleChannel.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: simpleName.trim(),
          phoneNumber: simplePhone.trim() || null,
          defaultPipelineId: simplePipelineId,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message ?? "Erro ao salvar.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["channels"] });
      setSimpleChannel(null);
    },
  });

  function openConfigure(ch: ApiChannel) {
    if (ch.provider === "META_CLOUD_API") {
      setMetaChannel(ch);
      return;
    }
    setSimpleName(ch.name);
    setSimplePhone(ch.phoneNumber ?? "");
    setSimplePipelineId(ch.defaultPipelineId ?? null);
    setSimpleChannel(ch);
  }

  function openQr(ch: ApiChannel) {
    setQrChannel(ch);
    setQrInitial(ch.qrCode);
    setQrOpen(true);
  }

  const statusCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const c of channels) acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, [channels]);

  const filterGroups = useMemo<SettingsFilterGroup[]>(
    () => [
      {
        key: "status",
        label: "Filtrar por status",
        value: statusFilter,
        onChange: setStatusFilter,
        options: [
          { value: "all", label: "Todos", count: channels.length },
          { value: "CONNECTED", label: "Conectado", count: statusCounts.CONNECTED },
          { value: "DISCONNECTED", label: "Desconectado", count: statusCounts.DISCONNECTED },
          { value: "CONNECTING", label: "Conectando", count: statusCounts.CONNECTING },
          { value: "QR_READY", label: "Aguardando QR", count: statusCounts.QR_READY },
          { value: "FAILED", label: "Falha", count: statusCounts.FAILED },
        ],
      },
    ],
    [statusFilter, statusCounts, channels.length],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredChannels = channels.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!normalizedSearch) return true;
    return [c.name, c.phoneNumber, c.provider, c.type]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const searchNode = useMemo(
    () => (
      <SettingsListFilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Buscar canais por nome, telefone..."
        ariaLabel="Buscar canais"
        groups={filterGroups}
        onClearAll={() => {
          setSearch("");
          setStatusFilter("all");
        }}
      />
    ),
    [search, filterGroups],
  );

  const actionsNode = useMemo(
    () => (
      <PageActionsMenu
        items={[
          {
            icon: <Plus size={16} />,
            label: "Novo canal",
            onClick: () => setCreateOpen(true),
            primary: true,
          },
        ]}
      />
    ),
    [setCreateOpen],
  );

  useEffect(() => {
    if (!slots) return;
    slots.setCenter(searchNode);
    slots.setActions(actionsNode);
    return () => {
      slots.setCenter(null);
      slots.setActions(null);
    };
  }, [slots, searchNode, actionsNode]);

  return (
    <div className="min-w-0 w-full shrink-0 space-y-6">
      {!slots && !hideToolbar ? (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">{searchNode}</div>
          {actionsNode}
        </div>
      ) : null}

      {isError ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error instanceof Error ? error.message : "Erro ao carregar canais."}
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[232px] rounded-[var(--radius-xl)]" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <GlassCard variant="subtle" className="flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
          <Radio className="mb-3 size-10 text-[var(--text-muted)]" />
          <p className="font-medium text-[var(--text-primary)]">Nenhum canal ainda</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            Crie um canal para começar a receber conversas no CRM.
          </p>
          <ButtonGlass
            type="button"
            variant="primary"
            className="mt-6"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Novo Canal
          </ButtonGlass>
        </GlassCard>
      ) : filteredChannels.length === 0 ? (
        <GlassCard variant="subtle" className="flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
          <Radio className="mb-3 size-10 text-[var(--text-muted)]" />
          <p className="font-medium text-[var(--text-primary)]">Nenhum canal encontrado</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
            Nenhum canal corresponde à busca atual.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]">
          {filteredChannels.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onConnect={(id) => connectMutation.mutate(id)}
              onDisconnect={async (id) => {
                const ok = await confirm({
                  title: "Desconectar canal",
                  description: "Desconectar este canal?",
                  confirmLabel: "Desconectar",
                  variant: "destructive",
                });
                if (ok) disconnectMutation.mutate(id);
              }}
              onConfigure={openConfigure}
              onDelete={async (id) => {
                const ok = await confirm({
                  title: `Excluir canal "${ch.name}"?`,
                  description:
                    "Atenção: as conversas vinculadas a este canal serão desvinculadas — o histórico permanece no banco, mas ficará sem canal associado e não será mais possível enviar novas mensagens por aqui. Esta ação não pode ser desfeita.",
                  confirmLabel: "Excluir canal",
                  variant: "destructive",
                });
                if (ok) deleteMutation.mutate(id);
              }}
              onOpenQr={openQr}
              isConnectPending={
                connectMutation.isPending &&
                connectMutation.variables === ch.id
              }
              isDisconnectPending={
                disconnectMutation.isPending &&
                disconnectMutation.variables === ch.id
              }
              isDeletePending={
                deleteMutation.isPending && deleteMutation.variables === ch.id
              }
            />
          ))}
        </div>
      )}

      <CreateChannelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["channels"] });
        }}
      />

      <WhatsappQrModal
        channel={qrChannel}
        open={qrOpen}
        onOpenChange={(o) => {
          setQrOpen(o);
          if (!o) {
            setQrChannel(null);
            setQrInitial(null);
            void queryClient.invalidateQueries({ queryKey: ["channels"] });
          }
        }}
        initialQr={qrInitial}
      />

      <Dialog
        open={!!metaChannel}
        onOpenChange={(o) => {
          if (!o) setMetaChannel(null);
        }}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Configurar Meta Cloud API</DialogTitle>
          </DialogHeader>
          {metaChannel ? (
            <MetaConfigPanel
              channel={metaChannel}
              onSaved={() => setMetaChannel(null)}
            />
          ) : null}
          <DialogClose />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!simpleChannel}
        onOpenChange={(o) => {
          if (!o) setSimpleChannel(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar canal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="simp-name">Nome</Label>
              <InputGlass
                id="simp-name"
                value={simpleName}
                onChange={(e) => setSimpleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simp-phone">Telefone (opcional)</Label>
              <InputGlass
                id="simp-phone"
                value={simplePhone}
                onChange={(e) => setSimplePhone(e.target.value)}
              />
            </div>
            <ChannelPipelineSelect
              id="simp-pipeline"
              value={simplePipelineId}
              onChange={setSimplePipelineId}
            />
          </div>
          <DialogFooter>
            <ButtonGlass
              type="button"
              variant="glass"
              onClick={() => setSimpleChannel(null)}
            >
              Cancelar
            </ButtonGlass>
            <ButtonGlass
              type="button"
              variant="primary"
              disabled={saveSimpleMutation.isPending || !simpleName.trim()}
              onClick={() => saveSimpleMutation.mutate()}
            >
              Salvar
            </ButtonGlass>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>

    </div>
  );
}
