"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconPlus,
  IconRobot,
  IconStar,
  IconArrowLeft,
  IconDots,
  IconCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { PipelineSwitcher } from "@/features/pipeline-v2/extras";
import { usePipelines, useBoard } from "@/features/pipeline-v2/hooks";

// ─── Tipos locais ─────────────────────────────────────────────────

interface Automation {
  id: string;
  /** Título do gatilho, ex: "Negócio criado", "Etapa alterada" */
  title: string;
  /** Subtexto do quando, ex: "Quando criado nesta etapa" */
  when: string;
  /** Nome da ação/automação, ex: "Boas-vindas WhatsApp" */
  actionName: string;
}

interface StageConfig {
  id: string;
  name: string;
  color: string;
  position: number;
  probability?: number;
  automations: Automation[];
}

// ─── Mock de automações por estágio ──────────────────────────────

const MOCK_AUTOMATIONS: Automation[][] = [
  [
    { id: "a1", title: "Negócio criado", when: "Quando criado nesta etapa", actionName: "redireciona2310" },
    { id: "a2", title: "Negócio criado", when: "Quando criado nesta etapa", actionName: "Agente IA" },
  ],
  [
    { id: "b1", title: "Negócio criado", when: "Quando movido para esta etapa", actionName: "Boas-vindas WhatsApp" },
    { id: "b2", title: "Mensagem recebida", when: "Quando criado nesta etapa", actionName: "Agente IA" },
  ],
  [
    { id: "c1", title: "Etapa alterada", when: "Quando movido para esta etapa", actionName: "Follow-up proposta" },
  ],
  [],
  [
    { id: "e1", title: "Etapa alterada", when: "Quando criado nesta etapa", actionName: "Follow-up proposta" },
  ],
];

function buildStageAutomations(stageIndex: number): Automation[] {
  return MOCK_AUTOMATIONS[stageIndex % MOCK_AUTOMATIONS.length] ?? [];
}

// ─── AutomationCard — estilo protótipo v0 ────────────────────────

function AutomationCard({ automation }: { automation: Automation }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 shadow-[var(--glass-shadow-sm)] transition-colors hover:border-[var(--brand-primary)]/30 hover:bg-[var(--glass-bg-overlay)]">
      {/* Ícone robô */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
        <IconRobot size={14} className="text-[var(--brand-primary)]" />
      </div>

      {/* Textos */}
      <div className="min-w-0 flex-1">
        <p className="font-display text-[12.5px] font-bold text-[var(--text-primary)]">
          {automation.title}
        </p>
        <p className="mt-0.5 truncate font-display text-[11px] text-[var(--text-muted)]">
          {automation.when}
        </p>
        <p className="mt-0.5 truncate font-display text-[11.5px] font-semibold text-[var(--brand-primary)]">
          {automation.actionName}
        </p>
      </div>
    </div>
  );
}

// ─── StageColumn ──────────────────────────────────────────────────

interface StageColumnProps {
  stage: StageConfig;
  onAddAutomation: (stageId: string) => void;
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
          title="Opções do estágio"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
        >
          <IconDots size={16} />
        </button>
      </div>

      {/* Probabilidade / subtítulo */}
      {stage.probability !== undefined && (
        <div className="mb-3 border-b border-[var(--glass-border-subtle)] px-1 pb-2.5 font-display text-xs font-semibold text-[var(--text-secondary)]">
          {stage.probability}% chance de ganho
        </div>
      )}
      {stage.probability === undefined && (
        <div className="mb-3 border-b border-[var(--glass-border-subtle)] px-1 pb-2.5 font-display text-xs font-semibold text-[var(--text-secondary)]">
          {stage.automations.length === 0 ? "Sem automações" : `${stage.automations.length} automação${stage.automations.length > 1 ? "ões" : ""}`}
        </div>
      )}

      {/* Lista de cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {stage.automations.map((auto) => (
          <AutomationCard key={auto.id} automation={auto} />
        ))}

        {/* "+ Adicionar automação" */}
        <button
          type="button"
          onClick={() => onAddAutomation(stage.id)}
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

// ─── Modal inline "Novo pipeline" ────────────────────────────────

function NewPipelineModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[0_16px_48px_rgba(15,20,40,0.20)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-display text-[15px] font-bold text-[var(--text-primary)]">
          Novo pipeline
        </h2>
        <p className="mb-4 font-display text-[12.5px] text-[var(--text-muted)]">
          Crie um novo funil de vendas para sua equipe.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
            if (e.key === "Escape") onClose();
          }}
          placeholder="Nome do pipeline..."
          className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 font-display text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--glass-border)] bg-transparent px-4 py-2 font-display text-[12px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => value.trim() && onConfirm(value.trim())}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.30)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
          >
            <IconCheck size={13} />
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TabsOverride da tela de settings ────────────────────────────

interface TabsOverrideProps {
  onNewPipeline: () => void;
  onSetDefault: () => void;
  onBack: () => void;
}

function PipelineSettingsTabs({ onNewPipeline, onSetDefault, onBack }: TabsOverrideProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <button
        type="button"
        onClick={onNewPipeline}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-1.5 font-display text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.30)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
      >
        <IconPlus size={14} />
        Novo pipeline
      </button>

      <button
        type="button"
        onClick={onSetDefault}
        title="Definir como pipeline padrão"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[var(--color-enterprise-bg)] hover:text-amber-500"
      >
        <IconStar size={15} />
      </button>

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
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);

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

  const stages: StageConfig[] = board.map((s, idx) => ({
    id: s.id,
    name: s.name,
    color: s.color ?? "var(--brand-primary)",
    position: s.position,
    probability: idx === 0 ? undefined : Math.round(((idx) / board.length) * 100),
    automations: buildStageAutomations(idx),
  }));

  const handleAddAutomation = useCallback((_stageId: string) => {
    // TODO: abrir construtor de automação
    alert("Em breve: construtor visual de automações por estágio.");
  }, []);

  const handleNewPipeline = useCallback((name: string) => {
    setNewPipelineOpen(false);
    // TODO: chamar POST /api/pipelines e invalidar cache
    alert(`Pipeline "${name}" será criado em breve.`);
  }, []);

  const handleSetDefault = useCallback(() => {
    // TODO: chamar PATCH /api/pipelines/:id { isDefault: true }
    alert("Funcionalidade em desenvolvimento.");
  }, []);

  return (
    <>
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
                onNewPipeline={() => setNewPipelineOpen(true)}
                onSetDefault={handleSetDefault}
                onBack={() => router.push("/pipeline")}
              />
            }
            search=""
            onSearchChange={() => undefined}
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

      <NewPipelineModal
        open={newPipelineOpen}
        onClose={() => setNewPipelineOpen(false)}
        onConfirm={handleNewPipeline}
      />
    </>
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
          Pipeline ativo não retornou estágios. Verifique a configuração no painel de administração.
        </p>
      </div>
    </div>
  );
}
