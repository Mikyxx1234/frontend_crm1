"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";

type CampaignRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  readCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  channel: { id: string; name: string; provider: string };
  segment: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
};

const STATUS_CONFIG: Record<string, { label: string; variant: string; icon?: typeof Play }> = {
  DRAFT: { label: "Rascunho", variant: "outline" },
  SCHEDULED: { label: "Agendada", variant: "secondary", icon: Clock },
  PROCESSING: { label: "Processando", variant: "default", icon: Loader2 },
  SENDING: { label: "Enviando", variant: "default", icon: Send },
  PAUSED: { label: "Pausada", variant: "secondary", icon: Pause },
  COMPLETED: { label: "Concluída", variant: "outline" },
  CANCELLED: { label: "Cancelada", variant: "destructive" },
  FAILED: { label: "Falhou", variant: "destructive" },
};

const TYPE_LABELS: Record<string, { label: string; icon: typeof Megaphone }> = {
  TEMPLATE: { label: "Template", icon: Megaphone },
  TEXT: { label: "Texto", icon: Send },
  AUTOMATION: { label: "Automação", icon: Zap },
};

function ProgressBar({ sent, failed, total }: { sent: number; failed: number; total: number }) {
  if (total === 0) return null;
  const sentPct = Math.round((sent / total) * 100);
  const failedPct = Math.round((failed / total) * 100);

  return (
    <div className="space-y-1">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-emerald-500 transition-all" style={{ width: `${sentPct}%` }} />
        <div className="bg-red-500 transition-all" style={{ width: `${failedPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{sent} enviados</span>
        {failed > 0 ? <span className="text-destructive">{failed} falhas</span> : null}
        <span>{total} total</span>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const perPage = 12;

  const { data, isLoading } = useQuery({
    queryKey: ["campaigns", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("perPage", String(perPage));
      const res = await fetch(apiUrl(`/api/campaigns?${params}`));
      return res.json() as Promise<{
        items: CampaignRow[];
        total: number;
        page: number;
        totalPages: number;
      }>;
    },
  });

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campanhas"
        description="Envie mensagens em massa com controle de velocidade e tracking."
        icon={<Megaphone />}
        actions={
          <>
            <Link href="/campaigns/segments">
              <Button variant="outline" className="gap-2">
                <Users className="size-4" />
                Segmentos
              </Button>
            </Link>
            <Link href="/campaigns/new">
              <Button className="gap-2">
                <Plus className="size-4" />
                Nova campanha
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="SCHEDULED">Agendada</option>
          <option value="SENDING">Enviando</option>
          <option value="PAUSED">Pausada</option>
          <option value="COMPLETED">Concluída</option>
          <option value="CANCELLED">Cancelada</option>
          <option value="FAILED">Falhou</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Megaphone className="size-12 text-muted-foreground/40" />
            <div className="text-center">
              <CardTitle className="text-lg">Nenhuma campanha</CardTitle>
              <CardDescription className="mt-1">
                Crie sua primeira campanha para enviar mensagens em massa.
              </CardDescription>
            </div>
            <Link href="/campaigns/new">
              <Button className="gap-2">
                <Plus className="size-4" />
                Nova campanha
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((campaign) => {
              const st = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.DRAFT;
              const tp = TYPE_LABELS[campaign.type] ?? TYPE_LABELS.TEMPLATE;
              const TypeIcon = tp.icon;

              return (
                <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                  <Card className="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">
                          {campaign.name}
                        </CardTitle>
                        <Badge variant={st.variant as never} className="shrink-0 text-[10px]">
                          {st.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <TypeIcon className="size-3" />
                        <span>{tp.label}</span>
                        <span>·</span>
                        <span>{campaign.channel.name}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ProgressBar
                        sent={campaign.sentCount}
                        failed={campaign.failedCount}
                        total={campaign.totalRecipients}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {campaign.segment ? (
                          <span className="truncate">{campaign.segment.name}</span>
                        ) : (
                          <span>Filtros ad-hoc</span>
                        )}
                        <span>{formatDateTime(campaign.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {(data?.totalPages ?? 1) > 1 ? (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                {page} / {data?.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Próximo
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
