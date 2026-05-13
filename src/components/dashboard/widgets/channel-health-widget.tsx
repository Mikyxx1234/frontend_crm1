"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon, CheckCircle2, ExternalLink, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type HealthSeverity = "ok" | "warning" | "critical" | "unknown";

type HealthResponse = {
  reachable: boolean;
  severity: HealthSeverity;
  message: string;
  reasons?: string[];
  checkedAt?: string;
  raw?: Record<string, unknown>;
};

const SEVERITY_STYLES: Record<HealthSeverity, { tone: string; icon: typeof CheckCircle2; label: string }> = {
  ok: { tone: "text-emerald-600", icon: CheckCircle2, label: "Operacional" },
  warning: { tone: "text-amber-600", icon: TriangleAlert, label: "Atenção" },
  critical: { tone: "text-rose-600", icon: AlertOctagon, label: "Crítico" },
  unknown: { tone: "text-muted-foreground", icon: TriangleAlert, label: "Indisponível" },
};

export function ChannelHealthWidget() {
  const { data, isLoading } = useQuery<HealthResponse>({
    queryKey: ["whatsapp-health"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/whatsapp/health"));
      if (!r.ok) throw new Error("health-failed");
      return r.json();
    },
    refetchInterval: 2 * 60 * 1_000,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const severity: HealthSeverity = data?.severity ?? "unknown";
  const style = SEVERITY_STYLES[severity];
  const Icon = style.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Icon className={cn("size-7 shrink-0", style.tone)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">WhatsApp Cloud</p>
          <p className={cn("text-xs font-semibold", style.tone)}>{style.label}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
        <p className="text-xs leading-relaxed text-foreground">
          {data?.message ?? "Sem dados de saúde."}
        </p>
        {data?.reasons && data.reasons.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {data.reasons.slice(0, 3).map((reason, idx) => (
              <li key={idx} className="text-[11px] text-muted-foreground">
                • {reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <Link
          href="https://business.facebook.com/wa/manage/phone-numbers/"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ExternalLink className="size-3" /> Painel Meta
        </Link>
        {data?.checkedAt && (
          <span className="text-muted-foreground">
            Verificado{" "}
            {new Date(data.checkedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
