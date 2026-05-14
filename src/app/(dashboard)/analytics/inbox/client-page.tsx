"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Headphones,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Send,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type InboxMetrics = {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  avgFirstResponseMinutes: number;
  avgResolutionHours: number;
  byAgent: {
    userId: string;
    userName: string;
    conversations: number;
    messagesSent: number;
    avgResponseMinutes: number;
  }[];
  byChannel: { channel: string; count: number }[];
  byDay: { date: string; inbound: number; outbound: number; conversations: number }[];
  byHour: { hour: number; count: number }[];
};

const PERIODS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
] as const;

const CHANNEL_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4",
];

function formatMinutes(mins: number): string {
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatHours(hrs: number): string {
  if (hrs < 1) return `${Math.round(hrs * 60)} min`;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  const d = Math.floor(hrs / 24);
  const h = Math.round(hrs % 24);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export default function InboxAnalyticsPage() {
  const [periodIdx, setPeriodIdx] = React.useState(1);
  const period = PERIODS[periodIdx];

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - period.days);

  const { data, isLoading } = useQuery<InboxMetrics>({
    queryKey: ["inbox-metrics", period.days],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(apiUrl(`/api/analytics/inbox?${params}`));
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Dashboard de Atendimento"
        description="Métricas de conversas, tempo de resposta e performance da equipe."
        icon={<Headphones />}
        actions={
          <div className="flex rounded-xl border border-border/70 bg-card p-1 shadow-[var(--shadow-lg)]">
            {PERIODS.map((p, i) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setPeriodIdx(i)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-bold transition-all duration-200",
                  periodIdx === i
                    ? "bg-primary text-white shadow-[var(--shadow-indigo-glow)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : !data ? (
        <p className="py-20 text-center text-sm text-gray-400">Sem dados</p>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de Conversas"
              value={data.totalConversations}
              icon={MessagesSquare}
              color="blue"
              sub={`${data.openConversations} abertas · ${data.resolvedConversations} resolvidas`}
            />
            <MetricCard
              title="Mensagens"
              value={data.totalMessages}
              icon={MessageSquare}
              color="emerald"
              sub={`${data.inboundMessages} recebidas · ${data.outboundMessages} enviadas`}
            />
            <MetricCard
              title="Tempo de Resposta"
              value={formatMinutes(data.avgFirstResponseMinutes)}
              icon={Timer}
              color="amber"
              sub="Media da primeira resposta"
              isText
            />
            <MetricCard
              title="Tempo de Resolucao"
              value={formatHours(data.avgResolutionHours)}
              icon={Clock}
              color="purple"
              sub="Media ate resolver conversa"
              isText
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Volume por Dia */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-lg)] lg:col-span-2">
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Volume de Mensagens por Dia
              </h3>
              {data.byDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => {
                        const parts = v.split("-");
                        return `${parts[2]}/${parts[1]}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      labelFormatter={(v) => {
                        const [y, m, d] = String(v).split("-");
                        return `${d}/${m}/${y}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="inbound"
                      name="Recebidas"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="outbound"
                      name="Enviadas"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </div>

            {/* Canais */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-lg)]">
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Conversas por Canal
              </h3>
              {data.byChannel.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={data.byChannel}
                        dataKey="count"
                        nameKey="channel"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {data.byChannel.map((_, i) => (
                          <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {data.byChannel.map((ch, i) => (
                      <div key={ch.channel} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
                          />
                          <span className="text-gray-600 dark:text-gray-400">{ch.channel}</span>
                        </div>
                        <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          {ch.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyChart />
              )}
            </div>
          </div>

          {/* Second Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Horarios de Pico */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-lg)]">
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Horários de Pico (mensagens recebidas)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}h`}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    labelFormatter={(v) => `${v}:00 - ${v}:59`}
                  />
                  <Bar dataKey="count" name="Mensagens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Agentes */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-lg)]">
              <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Performance por Agente
              </h3>
              {data.byAgent.length > 0 ? (
                <div className="space-y-0">
                  {/* Header */}
                  <div className="grid grid-cols-4 gap-2 border-b border-gray-100 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-800">
                    <span>Agente</span>
                    <span className="text-center">Conversas</span>
                    <span className="text-center">Msgs Env.</span>
                    <span className="text-center">Resp. Media</span>
                  </div>
                  {data.byAgent.map((agent) => (
                    <div
                      key={agent.userId}
                      className="grid grid-cols-4 gap-2 border-b border-gray-50 py-3 text-sm dark:border-gray-800/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 text-[9px] font-bold text-white">
                          {agent.userName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                          {agent.userName}
                        </span>
                      </div>
                      <span className="text-center font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {agent.conversations}
                      </span>
                      <span className="text-center tabular-nums text-gray-600 dark:text-gray-400">
                        {agent.messagesSent}
                      </span>
                      <span
                        className={cn(
                          "text-center tabular-nums font-medium",
                          agent.avgResponseMinutes <= 5
                            ? "text-emerald-600 dark:text-emerald-400"
                            : agent.avgResponseMinutes <= 30
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {formatMinutes(agent.avgResponseMinutes)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-2 size-8 text-gray-200 dark:text-gray-700" />
                  <p className="text-xs text-gray-400">
                    Nenhum agente com atendimento no periodo
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Ratio bar */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-lg)]">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Proporção de Mensagens
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-full h-4">
                {data.totalMessages > 0 ? (
                  <>
                    <div
                      className="flex items-center justify-center bg-blue-500 text-[9px] font-bold text-white transition-all duration-500"
                      style={{
                        width: `${(data.inboundMessages / data.totalMessages) * 100}%`,
                      }}
                    >
                      {Math.round((data.inboundMessages / data.totalMessages) * 100)}%
                    </div>
                    <div
                      className="flex items-center justify-center bg-emerald-500 text-[9px] font-bold text-white transition-all duration-500"
                      style={{
                        width: `${(data.outboundMessages / data.totalMessages) * 100}%`,
                      }}
                    >
                      {Math.round((data.outboundMessages / data.totalMessages) * 100)}%
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full bg-gray-100 dark:bg-gray-800" />
                )}
              </div>
              <div className="flex shrink-0 gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-blue-500" />
                  <span className="text-gray-500">Recebidas</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="text-gray-500">Enviadas</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
  isText,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "emerald" | "amber" | "purple";
  sub?: string;
  isText?: boolean;
}) {
  const colors = {
    blue: "from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20 text-blue-600 dark:text-blue-400",
    emerald:
      "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    amber:
      "from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 text-amber-600 dark:text-amber-400",
    purple:
      "from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="group/metric rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-lg)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {isText ? value : typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </p>
          {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("flex size-11 items-center justify-center rounded-2xl bg-linear-to-br transition-transform group-hover/metric:scale-110", colors[color])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <p className="text-xs text-muted-foreground">Sem dados no período</p>
    </div>
  );
}
