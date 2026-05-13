"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  CircleCheck,
  CircleX,
  Clock,
  Eye,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Rocket,
  Send,
  X,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  DRAFT: { label: "Rascunho", variant: "outline" },
  SCHEDULED: { label: "Agendada", variant: "secondary" },
  PROCESSING: { label: "Processando", variant: "default" },
  SENDING: { label: "Enviando", variant: "default" },
  PAUSED: { label: "Pausada", variant: "secondary" },
  COMPLETED: { label: "Concluída", variant: "outline" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
  FAILED: { label: "Falhou", variant: "destructive" },
};

const RECIPIENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "text-muted-foreground" },
  SENDING: { label: "Enviando", color: "text-blue-500" },
  SENT: { label: "Enviado", color: "text-emerald-500" },
  DELIVERED: { label: "Entregue", color: "text-emerald-600" },
  READ: { label: "Lido", color: "text-primary" },
  FAILED: { label: "Falhou", color: "text-destructive" },
};

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  sendRate: number;
  templateName?: string;
  textContent?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  channel: { id: string; name: string; provider: string };
  segment?: { id: string; name: string } | null;
  automation?: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
};

type Recipient = {
  id: string;
  status: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  contact: { id: string; name: string; phone: string };
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [recipientFilter, setRecipientFilter] = useState("");
  const [recipientPage, setRecipientPage] = useState(1);

  const isActive = (status: string) =>
    ["PROCESSING", "SENDING", "SCHEDULED"].includes(status);

  const { data: campaignData, isLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/campaigns/${id}`));
      if (!res.ok) throw new Error("Campanha não encontrada.");
      const data = await res.json();
      return data.campaign as Campaign;
    },
    refetchInterval: (query) =>
      query.state.data && isActive(query.state.data.status) ? 3000 : false,
  });

  const statsQuery = useQuery({
    queryKey: ["campaign-stats", id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/campaigns/${id}/stats`));
      return res.json() as Promise<{
        totalRecipients: number;
        sentCount: number;
        deliveredCount: number;
        failedCount: number;
        readCount: number;
        pendingCount: number;
      }>;
    },
    // 3s era agressivo demais — gera ~20 req/min por usuário com a aba
    // aberta. 10s segue sensação de "ao vivo" sem martelar o backend.
    refetchInterval: campaignData && isActive(campaignData.status) ? 10_000 : false,
    enabled: !!campaignData,
  });

  const recipientsQuery = useQuery({
    queryKey: ["campaign-recipients", id, recipientFilter, recipientPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (recipientFilter) params.set("status", recipientFilter);
      params.set("page", String(recipientPage));
      params.set("perPage", "20");
      const res = await fetch(apiUrl(`/api/campaigns/${id}/recipients?${params}`));
      return res.json() as Promise<{
        items: Recipient[];
        total: number;
        totalPages: number;
      }>;
    },
    enabled: !!campaignData && campaignData.totalRecipients > 0,
  });

  function actionMutation(action: string) {
    return async () => {
      const res = await fetch(apiUrl(`/api/campaigns/${id}/${action}`), { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign-stats", id] });
    };
  }

  const launchMutation = useMutation({ mutationFn: actionMutation("launch") });
  const pauseMutation = useMutation({ mutationFn: actionMutation("pause") });
  const resumeMutation = useMutation({ mutationFn: actionMutation("resume") });
  const cancelMutation = useMutation({ mutationFn: actionMutation("cancel") });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return <p className="text-muted-foreground">Campanha não encontrada.</p>;
  }

  const campaign = campaignData;
  const stats = statsQuery.data;
  const st = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;

  const pctSent = campaign.totalRecipients
    ? Math.round(((stats?.sentCount ?? campaign.sentCount) / campaign.totalRecipients) * 100)
    : 0;
  const pctFailed = campaign.totalRecipients
    ? Math.round(((stats?.failedCount ?? campaign.failedCount) / campaign.totalRecipients) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
            <ChevronLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">{campaign.name}</h1>
              <Badge variant={st.variant as never}>{st.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {campaign.channel.name} ·{" "}
              {campaign.type === "TEMPLATE"
                ? `Template: ${campaign.templateName}`
                : campaign.type === "TEXT"
                  ? "Texto livre"
                  : `Automação: ${campaign.automation?.name}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {campaign.status === "DRAFT" ? (
            <Button
              onClick={() => launchMutation.mutate()}
              disabled={launchMutation.isPending}
              className="gap-2"
            >
              {launchMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Rocket className="size-4" />
              )}
              Lançar
            </Button>
          ) : null}
          {campaign.status === "SENDING" || campaign.status === "PROCESSING" ? (
            <Button
              variant="secondary"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="gap-2"
            >
              <Pause className="size-4" />
              Pausar
            </Button>
          ) : null}
          {campaign.status === "PAUSED" ? (
            <Button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="gap-2"
            >
              <Play className="size-4" />
              Retomar
            </Button>
          ) : null}
          {["DRAFT", "SCHEDULED", "PROCESSING", "SENDING", "PAUSED"].includes(campaign.status) ? (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="gap-2"
            >
              <X className="size-4" />
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>

      {launchMutation.error ? (
        <p className="text-sm text-destructive">
          {(launchMutation.error as Error).message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total"
          value={stats?.totalRecipients ?? campaign.totalRecipients}
          icon={Megaphone}
        />
        <StatCard
          label="Enviados"
          value={stats?.sentCount ?? campaign.sentCount}
          icon={Send}
          color="text-emerald-500"
        />
        <StatCard
          label="Entregues"
          value={stats?.deliveredCount ?? campaign.deliveredCount}
          icon={CircleCheck}
          color="text-emerald-600"
        />
        <StatCard
          label="Lidos"
          value={stats?.readCount ?? campaign.readCount}
          icon={Eye}
          color="text-primary"
        />
        <StatCard
          label="Falhas"
          value={stats?.failedCount ?? campaign.failedCount}
          icon={CircleX}
          color="text-destructive"
        />
      </div>

      {campaign.totalRecipients > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${pctSent}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${pctFailed}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{pctSent}% enviado</span>
              <span>{stats?.pendingCount ?? 0} pendentes</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {campaign.totalRecipients > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Destinatários</CardTitle>
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              value={recipientFilter}
              onChange={(e) => {
                setRecipientFilter(e.target.value);
                setRecipientPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="SENT">Enviado</option>
              <option value="DELIVERED">Entregue</option>
              <option value="READ">Lido</option>
              <option value="FAILED">Falhou</option>
            </select>
          </CardHeader>
          <CardContent>
            {recipientsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {(recipientsQuery.data?.items ?? []).map((r) => {
                    const rs = RECIPIENT_STATUS[r.status] ?? RECIPIENT_STATUS.PENDING;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg p-2 text-sm hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{r.contact.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {r.contact.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {r.errorMessage ? (
                            <span className="max-w-[200px] truncate text-xs text-destructive">
                              {r.errorMessage}
                            </span>
                          ) : null}
                          <span className={cn("text-xs font-medium", rs.color)}>
                            {rs.label}
                          </span>
                          {r.sentAt ? (
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateTime(r.sentAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(recipientsQuery.data?.totalPages ?? 1) > 1 ? (
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recipientPage <= 1}
                      onClick={() => setRecipientPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      {recipientPage} / {recipientsQuery.data?.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recipientPage >= (recipientsQuery.data?.totalPages ?? 1)}
                      onClick={() => setRecipientPage((p) => p + 1)}
                    >
                      Próximo
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <DetailRow label="Criado por" value={campaign.createdBy.name} />
          <DetailRow label="Criado em" value={formatDateTime(campaign.createdAt)} />
          {campaign.startedAt ? (
            <DetailRow label="Iniciado em" value={formatDateTime(campaign.startedAt)} />
          ) : null}
          {campaign.completedAt ? (
            <DetailRow label="Concluído em" value={formatDateTime(campaign.completedAt)} />
          ) : null}
          {campaign.scheduledAt ? (
            <DetailRow label="Agendado para" value={formatDateTime(campaign.scheduledAt)} />
          ) : null}
          <DetailRow label="Velocidade" value={`${campaign.sendRate} msgs/s`} />
          {campaign.segment ? (
            <DetailRow label="Segmento" value={campaign.segment.name} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof Megaphone;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4">
        <Icon className={cn("size-5", color ?? "text-muted-foreground")} />
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
