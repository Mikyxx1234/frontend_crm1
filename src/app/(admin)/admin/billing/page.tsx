import { CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { prismaBase } from "@/lib/prisma-base";
import { getCurrentPeriodUsage } from "@/lib/billing/aggregate";
import {
  getEffectiveLimit,
  getPlan,
  PLANS,
} from "@/lib/billing/plans";
import { listMeters, type MeterKey } from "@/lib/billing/meters";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  ACTIVE: { label: "Ativa", variant: "success" },
  TRIALING: { label: "Trial", variant: "secondary" },
  PAST_DUE: { label: "Atrasado", variant: "warning" },
  UNPAID: { label: "Inadimplente", variant: "destructive" },
  CANCELED: { label: "Cancelada", variant: "secondary" },
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatUsage(meter: MeterKey, value: number): string {
  if (meter === "storage_bytes") return formatBytes(value);
  return formatNumber(value);
}

function pct(used: number, limit: number | null): number | null {
  if (limit === null || limit === 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function AdminBillingPage() {
  const orgs = await prismaBase.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      subscription: {
        select: {
          planKey: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          stripeSubscriptionId: true,
          limitsOverride: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const meters = listMeters();

  const rows = await Promise.all(
    orgs.map(async (org) => {
      const usage = await getCurrentPeriodUsage(org.id);
      return { org, usage };
    }),
  );

  // Totais
  let mrrUsd = 0;
  let orgsActive = 0;
  let orgsPastDue = 0;
  let orgsOverLimit = 0;
  for (const { org, usage } of rows) {
    const sub = org.subscription;
    const plan = getPlan(sub?.planKey ?? "free");
    if (sub?.status === "ACTIVE" || sub?.status === "TRIALING") {
      orgsActive++;
      mrrUsd += plan.priceUsd;
    } else if (sub?.status === "PAST_DUE" || sub?.status === "UNPAID") {
      orgsPastDue++;
      mrrUsd += plan.priceUsd;
    }
    const overrides = (sub?.limitsOverride ?? null) as
      | Record<MeterKey, number>
      | null;
    for (const m of meters) {
      const limit = getEffectiveLimit(
        sub?.planKey ?? "free",
        m.key as MeterKey,
        overrides,
      );
      if (limit !== null && Number(usage[m.key as MeterKey] ?? BigInt(0)) > limit) {
        orgsOverLimit++;
        break;
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<CreditCard />}
        eyebrow="Plataforma"
        title="Billing"
        description="Subscriptions, uso por meter no periodo atual e overage por organizacao."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<TrendingUp className="size-4" />}
          label="MRR estimado"
          value={`$${formatNumber(mrrUsd)}`}
          hint="Soma do priceUsd dos planos ativos."
        />
        <SummaryCard
          label="Orgs ativas"
          value={String(orgsActive)}
          hint="Status ACTIVE ou TRIALING."
        />
        <SummaryCard
          icon={<AlertTriangle className="size-4 text-warning" />}
          label="Inadimplentes"
          value={String(orgsPastDue)}
          hint="Status PAST_DUE ou UNPAID."
        />
        <SummaryCard
          icon={<AlertTriangle className="size-4 text-destructive" />}
          label="Excederam limite"
          value={String(orgsOverLimit)}
          hint="Pelo menos 1 meter acima do limite do plano."
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center">
          <CreditCard className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">
            Nenhuma organizacao com billing ainda
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscriptions sao criadas via Stripe webhook ou manualmente em
            cada organizacao.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Organizacao</th>
                <th className="px-4 py-3 text-left font-semibold">Plano</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                {meters.map((m) => (
                  <th
                    key={m.key}
                    className="px-4 py-3 text-right font-semibold"
                  >
                    {m.key.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold">Renova</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ org, usage }) => {
                const sub = org.subscription;
                const planKey = sub?.planKey ?? "free";
                const plan = getPlan(planKey);
                const overrides = (sub?.limitsOverride ?? null) as
                  | Record<MeterKey, number>
                  | null;
                const badge = STATUS_BADGE[sub?.status ?? "CANCELED"] ?? {
                  label: "—",
                  variant: "secondary" as const,
                };
                return (
                  <tr key={org.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {org.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {org.slug}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${plan.priceUsd}/mo
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          sem subscription
                        </span>
                      )}
                    </td>
                    {meters.map((m) => {
                      const used = Number(usage[m.key as MeterKey] ?? BigInt(0));
                      const limit = getEffectiveLimit(
                        planKey,
                        m.key as MeterKey,
                        overrides,
                      );
                      const percent = pct(used, limit);
                      const over = limit !== null && used > limit;
                      return (
                        <td
                          key={m.key}
                          className="px-4 py-3 text-right tabular-nums"
                        >
                          <div className="flex flex-col items-end">
                            <span
                              className={
                                over
                                  ? "font-semibold text-destructive"
                                  : "text-foreground"
                              }
                            >
                              {formatUsage(m.key as MeterKey, used)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {limit === null
                                ? "ilim."
                                : `de ${formatUsage(m.key as MeterKey, limit)}${
                                    percent !== null ? ` · ${percent}%` : ""
                                  }`}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {sub?.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString(
                            "pt-BR",
                          )
                        : "—"}
                      {sub?.cancelAtPeriodEnd ? (
                        <Badge variant="warning" className="ml-1">
                          cancela
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details className="rounded-xl border border-border bg-background p-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">
          Tabela de planos
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(PLANS).map((p) => (
            <div
              key={p.key}
              className="rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  ${p.priceUsd}/mo
                </span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {Object.entries(p.limits).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-medium text-foreground">
                      {k.replace(/_/g, " ")}
                    </span>
                    : {v === null ? "ilim." : formatUsage(k as MeterKey, v)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
