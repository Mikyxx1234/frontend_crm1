"use client";

import { apiUrl } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useConfirm } from "@/hooks/use-confirm";
import {
  ChevronRight,
  Plus,
  Radio,
  Settings2,
  UserCircle,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChannelCard } from "@/components/channels/channel-card";
import { CreateChannelDialog } from "@/components/channels/create-channel-dialog";
import { MetaConfigPanel } from "@/components/channels/meta-config-panel";
import type { ApiChannel } from "@/components/channels/types";
import { WhatsappQrModal } from "@/components/channels/whatsapp-qr-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

const sidebarItems = [
  {
    id: "canais",
    label: "Canais",
    href: "/settings/channels" as const,
    icon: Radio,
  },
  { id: "equipe", label: "Equipe", href: "/settings" as const, icon: Users },
  { id: "geral", label: "Geral", href: "/settings" as const, icon: Settings2 },
] as const;

export default function SettingsChannelsPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrChannel, setQrChannel] = useState<ApiChannel | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrInitial, setQrInitial] = useState<string | null>(null);
  const [metaChannel, setMetaChannel] = useState<ApiChannel | null>(null);
  const [simpleChannel, setSimpleChannel] = useState<ApiChannel | null>(null);
  const [simpleName, setSimpleName] = useState("");
  const [simplePhone, setSimplePhone] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    setSimpleChannel(ch);
  }

  function openQr(ch: ApiChannel) {
    setQrChannel(ch);
    setQrInitial(ch.qrCode);
    setQrOpen(true);
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const active =
                item.href === "/settings/channels"
                  ? pathname.startsWith("/settings/channels")
                  : pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href} className="block">
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "border-border bg-card font-medium text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-8">
          <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <Link href="/settings" className="hover:text-foreground">
                  Configurações
                </Link>
                <ChevronRight className="size-3.5 opacity-60" />
                <span className="text-foreground">Canais</span>
              </nav>
              <h1 className={pageHeaderTitleClass}>
                Canais de Comunicação
              </h1>
              <p className={cn(pageHeaderDescriptionClass, "max-w-2xl")}>
                Conecte e gerencie WhatsApp, Instagram, e-mail e webchat via
                credenciais oficiais da Meta Cloud API.
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 gap-2 self-start sm:self-auto"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              Novo Canal
            </Button>
          </div>

          {isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error instanceof Error ? error.message : "Erro ao carregar canais."}
            </p>
          ) : null}

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
              <Radio className="mb-3 size-10 text-muted-foreground" />
              <p className="font-medium text-foreground">Nenhum canal ainda</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Crie um canal para começar a receber conversas no CRM.
              </p>
              <Button
                type="button"
                className="mt-6 gap-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Novo Canal
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {channels.map((ch) => (
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
                      title: "Excluir canal",
                      description: "Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.",
                      confirmLabel: "Excluir",
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
        </div>
      </div>

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
        <DialogContent size="lg" panelClassName="max-h-[90vh] overflow-y-auto">
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
              <Input
                id="simp-name"
                value={simpleName}
                onChange={(e) => setSimpleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simp-phone">Telefone (opcional)</Label>
              <Input
                id="simp-phone"
                value={simplePhone}
                onChange={(e) => setSimplePhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSimpleChannel(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saveSimpleMutation.isPending || !simpleName.trim()}
              onClick={() => saveSimpleMutation.mutate()}
            >
              Salvar
            </Button>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={(o) => { if (!o) { setDeleteConfirmId(null); deleteMutation.reset(); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir canal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.
            Todas as conversas vinculadas permanecerão no histórico.
          </p>
          {deleteMutation.isError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : "Erro ao excluir canal."}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId, {
                    onSuccess: () => setDeleteConfirmId(null),
                  });
                }
              }}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </div>
  );
}
