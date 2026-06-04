"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconPlus,
  IconRobot,
  IconStar,
  IconArrowLeft,
  IconZap,
  IconClock,
  IconMail,
  IconTag,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { PipelineSwitcher } from "@/features/pipeline-v2/extras";
import { usePipelines, useBoard } from "@/features/pipeline-v2/hooks";

// ─── Tipos locais ─────────────────────────────────────────────────

interface Automation {
  id: string;
  name: string;
  trigger: string;
  triggerColor: string;
  triggerIcon: React.ReactNode;
}

interface StageConfig {
  id: string;
  name: string;
  color: string;
  position: number;
  automations: Automation[];
}

// ─── Mock de automações por estágio ──────────────────────────────
// Em produção, substituir por chamada à API de automações.

const TRIGGER_PRESETS: Omit<Automation, "id" | "name">[] = [
  {
    trigger: "Ao entrar",
    triggerColor: "#10b981",
    triggerIcon: <IconZap size={11} />,
  },
  {
    trigger: "Após 2 dias",
    triggerColor: "#f59e0b",
    triggerIcon: <IconClock size={11} />,
  },
  {
    trigger: "Ao sair",
    triggerColor: "#ef4444",
    triggerIcon: <IconArrowLeft size={11} />,
  },
  {
    trigger: "Por e-mail",
    triggerColor: "#5b6ff5",
    triggerIcon: <IconMail size={11} />,
  },
  {
    trigger: "Por tag",
    triggerColor: "#a78bfa",
    triggerIcon: <IconTag size={11} />,
  },
];

function buildMockAutomations(stageId: string): Automation[] {
  // Gera 0–2 automações de mock por estágio com base no id.
  const seed = stageId.charCodeAt(0) % 3;
  return Array.from({ length: seed }, (_, i) => {
    const preset = TRIGGER_PRESETS[(stageId.charCodeAt(i) + i) % TRIGGER_PRESETS.length];
    return {
      id: `${stageId}-auto-${i}`,
      name: `Automação ${i + 1}`,
      ...preset,
    };
  });
}

// ─── AutomationCard ───────────────────────────────────────────────

function AutomationCard({ automation }: { automation: Automation }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 shadow-[var(--glass-shadow-sm)] transition-colors hover:border-[var(--brand-primary)]/30 hover:bg-[var(--glass-bg-overlay)]">
      {/* Trigger chip */}
      <span
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-bold"
        style={{
          background: `${automation.triggerColor}1a`,
          color: automation.triggerColor,
          border: `1px solid ${automation.triggerColor}33`,
        }}
      >
        {automation.triggerIcon}
        {automation.trigger}
      </span>

      {/* Ícone robô */}
      <IconRobot
        size={14}
        className="shrink-0 text-[var(--text-muted)]"
      />

      {/* Nome */}
      <span className="min-w-0 flex-1 truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
        {automation.name}
      </span>
    </div>
  );
}

// ─── StageColumn ──────────────────────────────────────────────────
// Espelha KanbanColumn 1:1, substituindo DealCard por AutomationCard.

interface StageColumnProps {
  stage: StageConfig;
  onAddAutomation?: (stageId: string) => void;
}

function StageColumn({ stage, onAddAutomation }: StageColumnProps) {
  return (
    <section
      aria-label={`Estágio ${stage.name}`}
      className="flex h-full min-h-0 w-[300px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3.5 pb-3 pt-4 backdrop-blur-md shadow-[var(--glass-shadow)]"
    >
      {/* Header — idêntico ao KanbanColumn */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="h-[18px] w-[3px] rounded-full"
            style={{ background: stage.color }}
          />
          <h3 className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            {stage.name}
          </h3>
          <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--text-muted)]">
            {stage.automations.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onAddAutomation?.(stage.id)}
          title="Adicionar automação"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
        >
          <IconPlus size={16} />
        </button>
      </div>

      {/* Subtítulo — idêntico ao "Total" do KanbanColumn */}
      <div className="mb-3 border-b border-[var(--glass-border-subtle)] px-1 pb-2.5 font-display text-xs font-semibold text-[var(--text-secondary)]">
        {stage.automations.length === 0
          ? "Sem automações"
          : `${stage.automations.length} automação${stage.automations.length > 1 ? "ões" : ""}`}
      </div>

      {/* Lista de cards + botão no rodapé */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {stage.automations.map((auto) => (
          <AutomationCard key={auto.id} automation={auto} />
        ))}

        {/* "+ Adicionar automação" — idêntico ao "+ Adicionar negócio" */}
        <button
          type="button"
          onClick={() => onAddAutomation?.(stage.id)}
          className={cn(
            "mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-[var(--glass-border)] bg-transparent py-2.5 font-display text-xs font-semibold text-[var(--text-muted)] transition-all",
            "hover:border-[var(--brand-primary)] hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]",
          )}
        >
          <IconPlus size={14} />
          Adicionar automação
        </button>
      </div>
    </section>
  );
}

// ─── TabsOverride — barra secundária customizada ──────────────────

interface TabsOverrideProps {
  onNewPipeline: () => void;
  onSetDefault: () => void;
  onBack: () => void;
}

function PipelineSettingsTabs({
  onNewPipeline,
  onSetDefault,
  onBack,
}: TabsOverrideProps) {
  return (
    <div className="flex w-full items-center gap-2">
      {/* Novo pipeline */}
      <button
        type="button"
        onClick={onNewPipeline}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-1.5 font-display text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.30)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
      >
        <IconPlus size={14} />
        Novo pipeline
      </button>

      {/* Definir como padrão */}
      <button
        type="button"
        onClick={onSetDefault}
        title="Definir como pipeline padrão"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]"
      >
        <IconStar size={15} />
      </button>

      {/* Voltar — alinhado à direita */}
      <button
        type="button"
        onClick={onBack}
        className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-[12px] font-bold text-[var(--text-secondary)] shadow-[var(--glass-shadow-sm)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
      >
        <IconArrowLeft size={14} />
        Voltar
      </button>
    </div>
  );
}

// ─── Tela principal ───────────────────────────────────────────────

export default function PipelineSettingsClientPage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const { data: pipelines } = usePipelines(isAuthenticated);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (!pipelineId && pipelines?.length) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);

  const { data: board = [] } = useBoard({
    pipelineId,
    status: "OPEN",
    enabled: isAuthenticated,
  });

  // Constrói a lista de estágios com automações mock
  const stages: StageConfig[] = board.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? "var(--brand-primary)",
    position: s.position,
    automations: buildMockAutomations(s.id),
  }));

  const handleAddAutomation = useCallback((_stageId: string) => {
    // TODO: abrir modal de criação de automação
  }, []);

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 p-4">
      <NavRailV2 />

      <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
        <PipelineHeader
          pipelineNameSlot={
            <PipelineSwitcher
              selectedId={pipelineId}
              onChange={(id) => setPipelineId(id)}
            />
          }
          tabsOverride={
            <PipelineSettingsTabs
              onNewPipeline={() => {/* TODO */}}
              onSetDefault={() => {/* TODO */}}
              onBack={() => router.push("/pipeline")}
            />
          }
          search=""
          onSearchChange={() => {/* busca desabilitada nesta tela */}}
        />

        {/* Board de estágios */}
        <div className="flex min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-auto overflow-y-hidden pb-2">
          {stages.length > 0 ? (
            stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                onAddAutomation={handleAddAutomation}
              />
            ))
          ) : (
            <EmptyStages isAuthenticated={isAuthenticated} />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyStages({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="grid w-full place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-12 text-center backdrop-blur-md">
      <div>
        <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
          {isAuthenticated ? "Selecione um pipeline" : "Carregando..."}
        </h2>
        <p className="mt-1 max-w-sm text-[12.5px] text-[var(--text-muted)]">
          Pipeline ativo não retornou estágios. Verifique a configuração no painel
          de administração.
        </p>
      </div>
    </div>
  );
}
