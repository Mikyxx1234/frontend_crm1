"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconPalette,
  IconPencil,
  IconPlus,
  IconRobot,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { PipelineSwitcher } from "@/features/pipeline-v2/extras";
import { usePipelines, useBoard } from "@/features/pipeline-v2/hooks";
import { useAutomations } from "@/features/automations-v2/hooks";
import { AddAutomationDrawer } from "./add-automation-drawer";

// ─── Constantes ───────────────────────────────────────────────────

const STAGE_TRIGGER_LABELS: Record<string, string> = {
  STAGE_ENTERED: "Quando criado nesta etapa",
  STAGE_EXITED: "Quando sair desta etapa",
  DEAL_CREATED: "Quando negócio for criado",
  MESSAGE_RECEIVED: "Quando mensagem for recebida",
  DEAL_WON: "Quando negócio for ganho",
  DEAL_LOST: "Quando negócio for perdido",
};

const COLOR_PALETTE = [
  { label: "Azul", value: "#5B6FF5" },
  { label: "Roxo", value: "#8B5CF6" },
  { label: "Ciano", value: "#06B6D4" },
  { label: "Verde", value: "#10B981" },
  { label: "Lima", value: "#84CC16" },
  { label: "Âmbar", value: "#F59E0B" },
  { label: "Laranja", value: "#F97316" },
  { label: "Vermelho", value: "#EF4444" },
  { label: "Rosa", value: "#EC4899" },
  { label: "Cinza", value: "#64748B" },
];

// ─── Tipos locais ─────────────────────────────────────────────────

interface Automation {
  id: string;
  /** Chip no topo: quando executar no estágio */
  stageTrigger: string;
  /** Nome da automação */
  name: string;
  /** Descrição / ação secundária */
  description?: string;
}

interface StageConfig {
  id: string;
  name: string;
  color: string;
  position: number;
  automations: Automation[];
}

// ─── AutomationCard ───────────────────────────────────────────────

function AutomationCard({ automation }: { automation: Automation }) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white/60 px-3 py-2.5 shadow-[var(--glass-shadow-sm)] transition-colors hover:border-[var(--brand-primary)]/30 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/8">
      {/* Chip do gatilho */}
      <span className="inline-flex w-fit items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[10.5px] font-semibold text-[var(--text-secondary)]">
        {automation.stageTrigger}
      </span>

      {/* Conteúdo: robô + nome */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/12">
          <IconRobot size={14} className="text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
            {automation.name}
          </p>
          {automation.description && (
            <p className="mt-0.5 truncate font-display text-[11px] text-[var(--text-muted)]">
              {automation.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StageOptionsMenu ─────────────────────────────────────────────

interface StageOptionsMenuProps {
  stageId: string;
  isFirst: boolean;
  isLast: boolean;
  currentColor: string;
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onRename: () => void;
  onChangeColor: (color: string) => void;
}

function StageOptionsMenu({
  stageId: _stageId,
  isFirst,
  isLast,
  currentColor,
  onMoveForward,
  onMoveBackward,
  onRename,
  onChangeColor,
}: StageOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowColors(false);
      }
    };
    document.addEventListener("pointerdown", fn);
    return () => document.removeEventListener("pointerdown", fn);
  }, [open]);

  const close = () => {
    setOpen(false);
    setShowColors(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Opções do estágio"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
      >
        <IconDots size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-[var(--radius-lg)] border border-slate-200 bg-white py-1 shadow-[0_8px_28px_rgba(15,23,42,0.14)]">
          {/* Mover posição */}
          <div className="px-2 py-1">
            <p className="px-2 pb-1 font-display text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Posição
            </p>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                disabled={isFirst}
                onClick={() => { onMoveForward(); close(); }}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-1.5 font-display text-[11.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconChevronLeft size={13} />
                <span className="whitespace-nowrap">Mover frente</span>
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => { onMoveBackward(); close(); }}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-1.5 font-display text-[11.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="whitespace-nowrap">Mover atrás</span>
                <IconChevronRight size={13} />
              </button>
            </div>
          </div>

          <div className="my-1 border-t border-slate-100" />

          {/* Renomear */}
          <button
            type="button"
            onClick={() => { onRename(); close(); }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 font-display text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <IconPencil size={14} className="text-slate-400" />
            Renomear estágio
          </button>

          {/* Alterar cor */}
          <button
            type="button"
            onClick={() => setShowColors((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between gap-2.5 px-3.5 py-2 font-display text-[12.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2.5">
              <IconPalette size={14} className="text-slate-400" />
              Alterar cor
            </span>
            <span
              className="h-4 w-4 rounded-full border border-white/30"
              style={{ background: currentColor }}
            />
          </button>

          {/* Swatches de cor */}
          {showColors && (
            <div className="border-t border-slate-100 px-3.5 py-2.5">
              <div className="grid grid-cols-5 gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => { onChangeColor(c.value); close(); }}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                      currentColor === c.value
                        ? "border-[var(--text-primary)]"
                        : "border-transparent",
                    )}
                    style={{ background: c.value }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal de renomear estágio ────────────────────────────────────

function RenameStageModal({
  open,
  initialName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [value, setValue] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(initialName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, initialName]);

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
            Renomear estágio
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)]"
          >
            <IconX size={16} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
            if (e.key === "Escape") onClose();
          }}
          placeholder="Nome do estágio..."
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
            disabled={!value.trim() || value.trim() === initialName}
            onClick={() => value.trim() && onConfirm(value.trim())}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.30)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:opacity-50"
          >
            <IconCheck size={13} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StageColumn ──────────────────────────────────────────────────

interface StageColumnProps {
  stage: StageConfig;
  isFirst: boolean;
  isLast: boolean;
  isDragOver: boolean;
  onAddAutomation: (stageId: string) => void;
  onMoveForward: (stageId: string) => void;
  onMoveBackward: (stageId: string) => void;
  onRename: (stageId: string) => void;
  onChangeColor: (stageId: string, color: string) => void;
  onDragStart: (stageId: string) => void;
  onDragOver: (stageId: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
}

function StageColumn({
  stage,
  isFirst,
  isLast,
  isDragOver,
  onAddAutomation,
  onMoveForward,
  onMoveBackward,
  onRename,
  onChangeColor,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: StageColumnProps) {
  return (
    <section
      aria-label={`Estágio ${stage.name}`}
      draggable
      onDragStart={() => onDragStart(stage.id)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(stage.id); }}
      onDrop={(e) => { e.preventDefault(); onDrop(stage.id); }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex h-full min-h-0 w-[300px] shrink-0 flex-col rounded-xl border bg-[var(--glass-bg-strong)] px-3.5 pb-3 pt-4 shadow-[var(--glass-shadow)] backdrop-blur-md transition-all duration-150",
        isDragOver
          ? "scale-[1.02] border-[var(--brand-primary)] shadow-[0_0_0_2px_rgba(91,111,245,0.25),var(--glass-shadow)]"
          : "border-[var(--glass-border)]",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2.5">
        <div className="flex items-center gap-2.5">
          {/* Handle de drag */}
          <span
            title="Arrastar para reordenar"
            className="flex cursor-grab flex-col gap-[3px] active:cursor-grabbing"
          >
            {[0,1,2].map((i) => (
              <span key={i} className="flex gap-[3px]">
                <span className="h-[3px] w-[3px] rounded-full bg-[var(--text-muted)]/40" />
                <span className="h-[3px] w-[3px] rounded-full bg-[var(--text-muted)]/40" />
              </span>
            ))}
          </span>
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
        <StageOptionsMenu
          stageId={stage.id}
          isFirst={isFirst}
          isLast={isLast}
          currentColor={stage.color}
          onMoveForward={() => onMoveForward(stage.id)}
          onMoveBackward={() => onMoveBackward(stage.id)}
          onRename={() => onRename(stage.id)}
          onChangeColor={(color) => onChangeColor(stage.id, color)}
        />
      </div>

      {/* Subtítulo */}
      <div className="mb-3 border-b border-[var(--glass-border-subtle)] px-1 pb-2.5 font-display text-xs font-semibold text-[var(--text-secondary)]">
        {stage.automations.length === 0
          ? "Sem automações"
          : `${stage.automations.length} automação${stage.automations.length !== 1 ? "ões" : ""}`}
      </div>

      {/* Lista de cards */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {stage.automations.map((auto) => (
          <AutomationCard key={auto.id} automation={auto} />
        ))}

        <button
          type="button"
          onClick={() => onAddAutomation(stage.id)}
          className={cn(
            "mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-[var(--glass-border)] bg-transparent py-2.5 font-display text-xs font-semibold text-[var(--text-muted)] transition-all",
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

// ─── Modal "Novo pipeline" ────────────────────────────────────────

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
        className="w-full max-w-sm rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[0_16px_48px_rgba(15,20,40,0.20)]"
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
          className="w-full rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 font-display text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
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

// ─── TabsOverride ─────────────────────────────────────────────────

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
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-amber-400/50 hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-500/10"
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

  // Automações por estágio (estado local)
  const [stageAutomationsMap, setStageAutomationsMap] = useState<Record<string, Automation[]>>({});

  // Drawer "Adicionar automação"
  const [addAutomationStageId, setAddAutomationStageId] = useState<string | null>(null);

  // Estado local de ordem, nomes e cores dos estágios
  const [stageOrder, setStageOrder] = useState<string[]>([]);
  const [stageNameOverrides, setStageNameOverrides] = useState<Record<string, string>>({});
  const [stageColorOverrides, setStageColorOverrides] = useState<Record<string, string>>({});

  // Drag-and-drop
  const dragSourceId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Modal de renomear
  const [renamingStageId, setRenamingStageId] = useState<string | null>(null);

  // Automações do backend para look-up
  const { data: automationsData } = useAutomations({ perPage: 200, enabled: isAuthenticated });

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

  // Inicializa a ordem quando o board carrega ou muda de pipeline
  useEffect(() => {
    if (board.length > 0) {
      setStageOrder(board.map((s) => s.id));
      setStageNameOverrides({});
      setStageColorOverrides({});
    }
  }, [board]);

  // Monta os estágios na ordem local, mesclando overrides
  const stages: StageConfig[] = useMemo(() => {
    const stageMap = new Map(board.map((s) => [s.id, s]));
    const order = stageOrder.length > 0 ? stageOrder : board.map((s) => s.id);
    return order
      .map((id) => {
        const s = stageMap.get(id);
        if (!s) return null;
        return {
          id: s.id,
          name: stageNameOverrides[s.id] ?? s.name,
          color: stageColorOverrides[s.id] ?? s.color ?? "#5B6FF5",
          position: s.position,
          automations: stageAutomationsMap[s.id] ?? [],
        } satisfies StageConfig;
      })
      .filter(Boolean) as StageConfig[];
  }, [board, stageOrder, stageNameOverrides, stageColorOverrides, stageAutomationsMap]);

  const addAutomationStageName = useMemo(() => {
    if (!addAutomationStageId) return "";
    return stages.find((s) => s.id === addAutomationStageId)?.name ?? "";
  }, [addAutomationStageId, stages]);

  const renamingStageCurrentName = useMemo(() => {
    if (!renamingStageId) return "";
    return stages.find((s) => s.id === renamingStageId)?.name ?? "";
  }, [renamingStageId, stages]);

  // ─── Handlers de estágio ────────────────────────────────────────

  const handleDragStart = useCallback((stageId: string) => {
    dragSourceId.current = stageId;
  }, []);

  const handleDragOver = useCallback((stageId: string) => {
    if (dragSourceId.current && dragSourceId.current !== stageId) {
      setDragOverId(stageId);
    }
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    const sourceId = dragSourceId.current;
    if (!sourceId || sourceId === targetId) return;
    setStageOrder((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(sourceId);
      const toIdx = arr.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, sourceId);
      return arr;
    });
    dragSourceId.current = null;
    setDragOverId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragSourceId.current = null;
    setDragOverId(null);
  }, []);

  const handleMoveForward = useCallback((stageId: string) => {
    setStageOrder((prev) => {
      const idx = prev.indexOf(stageId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const handleMoveBackward = useCallback((stageId: string) => {
    setStageOrder((prev) => {
      const idx = prev.indexOf(stageId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleRenameConfirm = useCallback((name: string) => {
    if (!renamingStageId) return;
    setStageNameOverrides((prev) => ({ ...prev, [renamingStageId]: name }));
    setRenamingStageId(null);
  }, [renamingStageId]);

  const handleChangeColor = useCallback((stageId: string, color: string) => {
    setStageColorOverrides((prev) => ({ ...prev, [stageId]: color }));
  }, []);

  // ─── Handlers de automação ──────────────────────────────────────

  const handleAddAutomation = useCallback((stageId: string) => {
    setAddAutomationStageId(stageId);
  }, []);

  const handleDrawerConfirm = useCallback(
    ({
      automationId,
      trigger,
    }: {
      automationId: string;
      trigger: string;
      applyToExisting: boolean;
    }) => {
      if (!addAutomationStageId) return;
      const autoDto = automationsData?.items.find((a) => a.id === automationId);
      if (!autoDto) return;

      const newAuto: Automation = {
        id: `${addAutomationStageId}-${automationId}-${Date.now()}`,
        stageTrigger: STAGE_TRIGGER_LABELS[trigger] ?? trigger,
        name: autoDto.name,
        description: autoDto.description ?? undefined,
      };

      setStageAutomationsMap((prev) => ({
        ...prev,
        [addAutomationStageId]: [...(prev[addAutomationStageId] ?? []), newAuto],
      }));
      setAddAutomationStageId(null);
    },
    [addAutomationStageId, automationsData?.items],
  );

  // ─── Outros handlers ────────────────────────────────────────────

  const handleNewPipeline = useCallback((name: string) => {
    setNewPipelineOpen(false);
    alert(`Pipeline "${name}" será criado em breve.`);
  }, []);

  const handleSetDefault = useCallback(() => {
    alert("Funcionalidade em desenvolvimento.");
  }, []);

  return (
    <>
      <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 p-4">
        <NavRailV2 />

        <div className="flex min-w-0 flex-col gap-3 overflow-hidden">
          <PipelineHeader
            hideActions
            pipelineNameSlot={
              <PipelineSwitcher
                selectedId={pipelineId}
                onChange={(id) => {
                  setPipelineId(id);
                  setStageOrder([]);
                  setStageNameOverrides({});
                  setStageColorOverrides({});
                  setStageAutomationsMap({});
                }}
              />
            }
            tabsOverride={
              <PipelineSettingsTabs
                onNewPipeline={() => setNewPipelineOpen(true)}
                onSetDefault={handleSetDefault}
                onBack={() => router.push("/pipeline")}
              />
            }
          />

          {/* Board de estágios */}
          <div className="flex min-h-0 min-w-0 flex-1 gap-3.5 overflow-x-auto overflow-y-hidden pb-2">
            {stages.length > 0 ? (
              stages.map((stage, idx) => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  isFirst={idx === 0}
                  isLast={idx === stages.length - 1}
                  isDragOver={dragOverId === stage.id}
                  onAddAutomation={handleAddAutomation}
                  onMoveForward={handleMoveForward}
                  onMoveBackward={handleMoveBackward}
                  onRename={setRenamingStageId}
                  onChangeColor={handleChangeColor}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
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

      <RenameStageModal
        open={!!renamingStageId}
        initialName={renamingStageCurrentName}
        onClose={() => setRenamingStageId(null)}
        onConfirm={handleRenameConfirm}
      />

      <AddAutomationDrawer
        open={!!addAutomationStageId}
        stageName={addAutomationStageName}
        onClose={() => setAddAutomationStageId(null)}
        onConfirm={handleDrawerConfirm}
      />
    </>
  );
}

function EmptyStages({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="grid w-full place-items-center rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg)] p-12 text-center backdrop-blur-md">
      <div>
        <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
          {isAuthenticated ? "Selecione um pipeline" : "Carregando..."}
        </h2>
        <p className="mt-1 max-w-sm font-display text-[12.5px] text-[var(--text-muted)]">
          Pipeline ativo não retornou estágios. Verifique a configuração no painel de administração.
        </p>
      </div>
    </div>
  );
}
