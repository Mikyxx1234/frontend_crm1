"use client";

import {
  IconArrowBackUp,
  IconArrowUpRight,
  IconBellRinging,
  IconChartBar,
  IconCircleCheck,
  IconClockPlay,
  IconHandStop,
  IconInbox,
  IconMessages,
  IconPlugConnected,
  IconRobot,
  IconSchool,
  IconSend,
  IconSitemap,
  IconUserCheck,
} from "@tabler/icons-react";

import { KpiCard } from "@/components/crm/kpi-card";

import type {
  AcademicFunil,
  AcademicHandoff,
  AcademicResolucao,
  AcademicSaude,
  NamedCount,
} from "./types";
import { CockpitZeroNote, formatSeconds, KpiGrid, MetricBars } from "./ui";

/** Mensagem padrão das listas sem linhas — igual em todas as abas. */
const SEM_DADOS = "Sem dados no período.";

/** Remove linhas zeradas mas devolve a lista original quando tudo é zero. */
function withoutZeros(items: NamedCount[]): NamedCount[] {
  return items.filter((i) => i.n > 0);
}

export function SaudePanel({ data }: { data: AcademicSaude }) {
  const desfecho = withoutZeros([
    { name: "Resolveu sozinha", n: data.resolvedSoloToday },
    { name: "Passou a humano", n: data.handoffToday },
    { name: "Ainda com a IA", n: data.attendingNow },
  ]);

  const zerado =
    data.spokeToday === 0 &&
    data.attendingNow === 0 &&
    data.resolvedSoloToday === 0 &&
    data.handoffToday === 0 &&
    data.sendFailedToday === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {zerado && (
        <CockpitZeroNote>
          O agente acadêmico ainda não registrou atendimentos hoje.
        </CockpitZeroNote>
      )}

      <KpiGrid>
        <KpiCard
          label="Status do agente"
          value={data.agentActive ? "Ativo" : "Inativo"}
          hint={data.agentName ?? "—"}
          icon={<IconPlugConnected size={20} />}
          tone={data.agentActive ? "success" : "neutral"}
        />
        <KpiCard
          label="Falou hoje"
          value={data.spokeToday}
          hint="conversas"
          icon={<IconMessages size={20} />}
        />
        <KpiCard
          label="Resolveu sozinha"
          value={data.resolvedSoloToday}
          hint="sem humano"
          icon={<IconCircleCheck size={20} />}
          tone="success"
        />
        <KpiCard
          label="Passou a humano"
          value={data.handoffToday}
          hint="handoff IA"
          icon={<IconArrowUpRight size={20} />}
          tone="violet"
        />
        <KpiCard
          label="Ainda com a IA"
          value={data.attendingNow}
          hint="em atendimento"
          icon={<IconRobot size={20} />}
        />
        <KpiCard
          label="Falhas de envio"
          value={data.sendFailedToday}
          icon={<IconSend size={20} />}
          tone={data.sendFailedToday > 0 ? "warning" : "neutral"}
        />
        <KpiCard
          label="1ª resposta (mediana)"
          value={formatSeconds(data.firstResponseMedianSec)}
          icon={<IconClockPlay size={20} />}
          tone="neutral"
        />
      </KpiGrid>

      <MetricBars
        title="Desfecho do dia"
        subtitle="Sozinha vs handoff vs ainda em atendimento"
        items={desfecho}
        emptyLabel={SEM_DADOS}
      />
    </div>
  );
}

export function ResolucaoPanel({ data }: { data: AcademicResolucao }) {
  const motivos = withoutZeros([
    { name: "Por silêncio / 30 min", n: data.closedByIdle },
    { name: "Pedido do aluno", n: data.closedByStudentAsk },
    {
      name: "Outros motivos",
      n: Math.max(0, data.closedByAiToday - data.closedByIdle - data.closedByStudentAsk),
    },
  ]);

  const zerado =
    data.closedByAiToday === 0 &&
    data.idleNudgesToday === 0 &&
    data.returnedAfterAiClose === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {zerado && (
        <CockpitZeroNote>
          Nenhuma conversa foi encerrada pela IA hoje.
        </CockpitZeroNote>
      )}

      <KpiGrid>
        <KpiCard
          label="Encerradas pela IA"
          value={data.closedByAiToday}
          hint="hoje"
          icon={<IconCircleCheck size={20} />}
          tone="success"
        />
        <KpiCard
          label="Por silêncio / 30 min"
          value={data.closedByIdle}
          hint="check-in sem retorno"
          icon={<IconClockPlay size={20} />}
        />
        <KpiCard
          label="Pedido do aluno"
          value={data.closedByStudentAsk}
          hint="“encerrar” / “só isso”"
          icon={<IconHandStop size={20} />}
          tone="violet"
        />
        <KpiCard
          label="Check-ins enviados"
          value={data.idleNudgesToday}
          hint="“faz uns 30 minutos…”"
          icon={<IconBellRinging size={20} />}
        />
        <KpiCard
          label="Voltaram depois"
          value={data.returnedAfterAiClose}
          hint="novo ticket após close"
          icon={<IconArrowBackUp size={20} />}
          tone={data.returnedAfterAiClose > 0 ? "warning" : "neutral"}
        />
      </KpiGrid>

      <MetricBars
        title="Por que a IA encerrou"
        subtitle="Silêncio do aluno vs pedido explícito"
        items={motivos}
        emptyLabel={SEM_DADOS}
      />
    </div>
  );
}

export function HandoffPanel({ data }: { data: AcademicHandoff }) {
  const zerado =
    data.totalToday === 0 && !data.byDepartment.length && !data.byKind.length;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {zerado && (
        <CockpitZeroNote>
          A IA não passou nenhum atendimento para humano hoje.
        </CockpitZeroNote>
      )}

      <KpiGrid>
        <KpiCard
          label="Handoffs hoje"
          value={data.totalToday}
          hint="origem IA"
          icon={<IconArrowUpRight size={20} />}
          tone="violet"
        />
        <KpiCard
          label="Departamentos acionados"
          value={data.byDepartment.length}
          icon={<IconSitemap size={20} />}
          tone="neutral"
        />
        <KpiCard
          label="Atribuídos"
          value={data.byKind.find((k) => k.name === "Atribuído")?.n ?? 0}
          hint="com consultor"
          icon={<IconUserCheck size={20} />}
          tone="success"
        />
      </KpiGrid>

      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
        <MetricBars
          title="Destino"
          subtitle="Departamento para o qual a IA passou"
          items={data.byDepartment}
          emptyLabel={SEM_DADOS}
        />
        <MetricBars
          title="Resultado da distribuição"
          subtitle="Atribuído vs sem consultor elegível"
          items={data.byKind}
          emptyLabel={SEM_DADOS}
        />
      </div>
    </div>
  );
}

export function FunilPanel({ data }: { data: AcademicFunil }) {
  const zerado =
    data.academicChannelSpoke === 0 &&
    data.otherChannelSpoke === 0 &&
    data.leadDeEntradaOpen === 0 &&
    data.byStage.length === 0;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {zerado && (
        <CockpitZeroNote>
          Ainda não há negócios abertos ligados a conversas da IA hoje.
        </CockpitZeroNote>
      )}

      <KpiGrid>
        <KpiCard
          label="Canal Acadêmico"
          value={data.academicChannelSpoke}
          hint="conversas com IA"
          icon={<IconSchool size={20} />}
        />
        <KpiCard
          label="Outros canais"
          value={data.otherChannelSpoke}
          hint="IA fora do Acadêmico"
          icon={<IconInbox size={20} />}
          tone="neutral"
        />
        <KpiCard
          label="Lead de Entrada abertos"
          value={data.leadDeEntradaOpen}
          hint={`com a IA: ${data.leadDeEntradaWithAi}`}
          icon={<IconChartBar size={20} />}
          tone="violet"
        />
      </KpiGrid>

      <MetricBars
        title="Etapa do negócio"
        subtitle="Aluno com negócio aberto com quem a IA falou hoje"
        items={data.byStage}
        emptyLabel={SEM_DADOS}
      />
    </div>
  );
}
