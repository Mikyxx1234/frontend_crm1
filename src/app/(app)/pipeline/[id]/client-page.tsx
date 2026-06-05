"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { IconArrowLeft, IconMessageCircle } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import {
  DealDetailsPanel,
  type DealField,
  type DealFieldGroup,
  type DealRecord,
  type FunnelSegment,
} from "@/components/crm/deal-details-panel";

import { useBoard, useDealDetail } from "@/features/pipeline-v2/hooks";

/**
 * /v2/pipeline/[id] — detalhe do negócio (página inteira).
 *
 * Cabeada em:
 *  - `GET /api/deals/:id`           → useDealDetail
 *  - `GET /api/pipelines/:id/board` → useBoard (apenas para extrair
 *    a lista de stages do pipeline e desenhar o funil segmentado)
 *
 * O chat real (mensagens da conversa do contato) fica como
 * placeholder por enquanto — o `deal-chat-binding` existente está
 * acoplado ao slide-over do Kanban; ligá-lo aqui exige mais um passe
 * de refactor. Deixei o slot pronto para a próxima iteração.
 */

interface V2DealDetailClientPageProps {
  dealId: string;
}

function brl(value: number | string | null | undefined): string {
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

/**
 * Shape "estendido" do payload de `/api/deals/:id` — o tipo de retorno
 * exportado em `features/pipeline-v2/api` (BoardDealDto) ainda não
 * descreve `stage`/`stageId`/`createdAt`. Aqui declaramos só o que esta
 * página precisa para evitar `any` espalhado e cast em cascata.
 */
interface DealDetailExtra {
  stageId?: string;
  stage?: { id?: string; name?: string; color?: string; pipelineId?: string };
  createdAt?: string;
  expectedClose?: string | null;
  value?: number | string | null;
  number?: number;
}

export default function V2DealDetailClientPage({ dealId }: V2DealDetailClientPageProps) {
  const router = useRouter();
  const dealQuery = useDealDetail(dealId);
  const deal = dealQuery.data as (typeof dealQuery.data & DealDetailExtra) | undefined;

  // Para desenhar o funil precisamos da lista de stages do pipeline.
  // O endpoint /api/deals/:id já devolve `stage.pipelineId`.
  const pipelineId = deal?.stage?.pipelineId;
  const boardQuery = useBoard({
    pipelineId: pipelineId ?? null,
    status: "OPEN",
    enabled: !!pipelineId,
  });

  const record: DealRecord | null = useMemo(() => {
    if (!deal) return null;

    const stages = boardQuery.data ?? [];
    const currentStageId = deal.stageId;
    const currentStagePos =
      stages.find((s) => s.id === currentStageId)?.position ?? 0;
    const segments: FunnelSegment[] = stages
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        color: s.color || "var(--brand-primary)",
        reached: s.position <= currentStagePos,
      }));

    const stageObj = deal.stage;
    const contact = deal.contact;
    const owner = deal.owner;

    // Grupo 1 — informações do negócio
    const dealFields: DealField[] = [
      { label: "Valor", value: brl(deal.value), type: "money" },
      { label: "Etapa", value: stageObj?.name, type: "chip" },
      {
        label: "Status",
        value:
          deal.status === "WON"
            ? "Ganho"
            : deal.status === "LOST"
              ? "Perdido"
              : "Aberto",
      },
      {
        label: "Responsável",
        value: owner?.name ?? undefined,
      },
      {
        label: "Previsão de fechamento",
        value: fmtDateBR(deal.expectedClose),
      },
      {
        label: "Criado em",
        value: fmtDateBR(deal.createdAt),
      },
    ];

    const contactFields: DealField[] = [
      { label: "Nome", value: contact?.name ?? undefined },
      { label: "E-mail", value: contact?.email ?? undefined },
      { label: "Telefone", value: contact?.phone ?? undefined },
    ];

    // Campos personalizados — se houver
    const cfRaw = deal.customFields;
    const customFields: DealField[] = cfRaw
      ? Object.entries(cfRaw).map(([k, v]) => ({
          label: k,
          value: v == null ? undefined : String(v),
        }))
      : [];

    const groups: DealFieldGroup[] = [
      { title: "Informações do negócio", fields: dealFields },
      { title: "Contato", fields: contactFields },
    ];
    if (customFields.length) {
      groups.push({ title: "Campos personalizados", fields: customFields });
    }

    const dealNumber = deal.number;
    return {
      leadNumber:
        dealNumber != null ? `Lead #${dealNumber}` : `Lead #${deal.id.slice(0, 6)}`,
      tag: deal.title || "Sem título",
      funnelStage: stageObj?.name ?? "—",
      segments: segments.length
        ? segments
        : [
            { color: stageObj?.color || "var(--brand-primary)", reached: true },
          ],
      groups,
    };
  }, [deal, boardQuery.data]);

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <div className="grid min-h-0 grid-cols-[380px_1fr] gap-4 overflow-hidden">
        {dealQuery.isLoading && !record ? (
          <aside className="animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : dealQuery.error ? (
          <DealErrorPanel
            message={
              dealQuery.error instanceof Error
                ? dealQuery.error.message
                : "Erro ao carregar negócio."
            }
          />
        ) : record ? (
          <DealDetailsPanel
            record={record}
            productCount={0}
            onBack={() => router.push("/pipeline")}
          />
        ) : (
          <DealErrorPanel message="Negócio não encontrado." />
        )}

        <ChatPlaceholder dealTitle={deal?.title ?? "Negócio"} />
      </div>
    </div>
  );
}

function DealErrorPanel({ message }: { message: string }) {
  return (
    <aside className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-6 text-center backdrop-blur-md shadow-[var(--glass-shadow)]">
      <p className="font-display text-sm font-bold text-[var(--text-secondary)]">
        {message}
      </p>
      <Link
        href="/pipeline/list"
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-sm font-bold text-white"
      >
        <IconArrowLeft size={16} />
        Voltar à lista
      </Link>
    </aside>
  );
}

function ChatPlaceholder({ dealTitle }: { dealTitle: string }) {
  return (
    <main className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-10 text-center backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="grid size-16 place-items-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
        <IconMessageCircle size={28} />
      </div>
      <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
        Conversas de {dealTitle}
      </h2>
      <p className="max-w-md text-[13px] text-[var(--text-muted)]">
        O chat completo deste negócio é acessado pela Inbox (`/v2/inbox`).
        Próxima iteração vai embedar as mensagens aqui usando o mesmo binding
        do Kanban.
      </p>
      <Link
        href="/v2/inbox"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2 font-display text-sm font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-strong)]"
      >
        <IconMessageCircle size={16} />
        Abrir Inbox
      </Link>
    </main>
  );
}
