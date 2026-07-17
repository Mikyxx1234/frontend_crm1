"use client";

import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import "./flow-editor.css";

import { AnimatedEdge, AnimatedEdgeDefs, type AnimatedEdgeData } from "./animated-edge";

import {
  type AutomationStep,
  defaultStepConfig,
  isStepIncomplete,
  newStepId,
  stepTypeLabel,
  summarizeStepConfig,
  summarizeTriggerConfig,
  triggerTypeLabel,
} from "@/lib/automation-workflow";
import {
  normalizeConditionConfig,
  type ConditionConfig,
} from "@/lib/automation-condition";
import { cn } from "@/lib/utils";
import { useThemeV2 } from "@/hooks/use-theme-v2";
import { IconCopy as Copy, IconTrash as Trash2 } from "@tabler/icons-react";

import type { ActionStepType } from "@/lib/automation-workflow";

import { ActionNode } from "./action-node";
import { AddStepNode } from "./add-step-node";
import { BusinessHoursNode } from "./business-hours-node";
import { DistributionNode } from "./distribution-node";
import { StepPickerModal } from "./step-picker-modal";
import { ConditionNode } from "./condition-node";
import { DelayNode } from "./delay-node";
import { FinishNode } from "./finish-node";
import { GotoNode } from "./goto-node";
import { InteractiveNode } from "./interactive-node";
import { NodePalette, readPaletteDragType } from "./node-palette";
import { QuestionNode } from "./question-node";
import { WaitNode } from "./wait-node";
import { TriggerNode } from "./trigger-node";
import { VariableNode } from "./variable-node";

const TRIGGER_ID = "trigger";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  businessHours: BusinessHoursNode,
  distribution: DistributionNode,
  delay: DelayNode,
  question: QuestionNode,
  interactive: InteractiveNode,
  wait: WaitNode,
  variable: VariableNode,
  goto: GotoNode,
  finish: FinishNode,
  addStep: AddStepNode,
};

const edgeTypes = {
  flow: AnimatedEdge,
};

type RfPos = { x: number; y: number };

const START_X = 200;
const NODE_Y = 300;
// Espelha `GAP_X` de `@/lib/automation-layout` — nós expandidos (~400px)
// precisam de folga maior que 300 pra não cobrir o próximo step.
const GAP_X = 480;

function readRfPos(config: unknown): RfPos | null {
  if (typeof config !== "object" || config === null) return null;
  const c = config as Record<string, unknown>;
  if (typeof c.__rfPos !== "object" || c.__rfPos === null) return null;
  const p = c.__rfPos as Record<string, unknown>;
  if (typeof p.x !== "number" || typeof p.y !== "number") return null;
  return { x: p.x, y: p.y };
}

function rfNodeType(stepType: string): keyof typeof nodeTypes {
  if (stepType === "condition") return "condition";
  if (stepType === "business_hours") return "businessHours";
  if (stepType === "execute_distribution") return "distribution";
  if (stepType === "delay") return "delay";
  if (stepType === "question") return "interactive";
  if (stepType === "send_whatsapp_interactive") return "interactive";
  if (stepType === "wait_for_reply") return "wait";
  if (stepType === "set_variable") return "variable";
  if (stepType === "goto") return "goto";
  if (stepType === "finish") return "finish";
  if (stepType === "stop_automation") return "finish";
  return "action";
}

function isInteractiveStep(type: string): boolean {
  return type === "question" || type === "send_whatsapp_interactive";
}

const ADD_STEP_ID = "__addStep__";

/**
 * Steps que NUNCA recebem o botão "+ Adicionar próximo passo" depois
 * deles porque encerram o fluxo.
 */
const TERMINAL_STEP_TYPES = new Set([
  "goto",
  "finish",
  "stop_automation",
  "transfer_automation",
]);

/**
 * Steps que ramificam — não usam `nextStepId` raiz. O operador conecta
 * cada saída pelos handles laterais (received/timeout/else/branch:X/btn_X).
 * Não pendurar addStepNode global aqui evita botão "+" fantasma sem
 * destino claro de qual ramo seria continuado.
 */
const BRANCHING_STEP_TYPES = new Set([
  "condition",
  "wait_for_reply",
  "business_hours",
  "question",
  "send_whatsapp_interactive",
]);

function isAddStepNodeId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === ADD_STEP_ID || id.startsWith(`${ADD_STEP_ID}:`);
}

function isAddStepEdgeId(id: string | null | undefined): boolean {
  if (!id) return false;
  return id === "addstep-edge" || id.startsWith("addstep-edge-");
}

/**
 * Folhas do grafo que precisam do botão "+ Adicionar próximo passo".
 * Critério: step linear (não-terminal, não-ramificador) cujo `nextStepId`
 * está vazio ou aponta pra step inexistente. Antes só dávamos o botão pro
 * último step do array linear, deixando ramos paralelos (ex: timeout do
 * wait_for_reply) órfãos visualmente — operadores sabiam soltar um drag
 * no canvas, mas nada na UI sugeria que dava pra continuar.
 */
function collectLeafStepIds(steps: AutomationStep[]): Set<string> {
  const stepIds = new Set(steps.map((s) => s.id));
  const leaves = new Set<string>();
  for (const step of steps) {
    if (TERMINAL_STEP_TYPES.has(step.type)) continue;
    if (isInteractiveStep(step.type)) {
      const cfg = step.config as Record<string, unknown>;
      const buttons = Array.isArray(cfg.buttons)
        ? (cfg.buttons as { gotoStepId?: string }[])
        : [];
      const hasAnyValidGoto = buttons.some(
        (b) => b.gotoStepId && b.gotoStepId !== "__none__" && stepIds.has(b.gotoStepId)
      );
      const elseGoto = typeof cfg.elseGotoStepId === "string"
        && cfg.elseGotoStepId
        && cfg.elseGotoStepId !== "__none__"
        && stepIds.has(cfg.elseGotoStepId);
      if (!hasAnyValidGoto && !elseGoto) leaves.add(step.id);
      continue;
    }
    if (BRANCHING_STEP_TYPES.has(step.type)) continue;
    const next = readNextStepId(step.config);
    const hasRealNext = next && next !== NONE && stepIds.has(next);
    if (!hasRealNext) leaves.add(step.id);
  }
  return leaves;
}

/**
 * EDGE_TYPE — todas as conexões usam o custom <AnimatedEdge> registrado
 * em `edgeTypes`. Substitui o `smoothstep` cinza chapado por curva
 * Bezier brand com pulso elétrico. Variantes ditadas via `data`.
 */
const EDGE_TYPE = "flow" as const;

const EDGE_DATA_DEFAULT: AnimatedEdgeData = { variant: "default", energized: true };
const EDGE_DATA_BUTTON: AnimatedEdgeData = { variant: "button", energized: true };
const EDGE_DATA_ELSE: AnimatedEdgeData = { variant: "else", energized: false };
const EDGE_DATA_TIMEOUT: AnimatedEdgeData = { variant: "timeout", energized: false };
const EDGE_DATA_ADD: AnimatedEdgeData = { variant: "add", energized: false };

const NONE = "__none__";
const INTERACT_W = 20;

/**
 * Label "✕" das edges agora é renderizada pelo próprio AnimatedEdge via
 * <EdgeLabelRenderer> (pílula clicável estilizada). Não precisamos mais
 * de labelStyle/labelBgStyle — só do `label` em si.
 */
const DELETE_LABEL_PROPS = { label: "✕" };

function readNextStepId(config: unknown): string | null {
  if (typeof config !== "object" || config === null) return null;
  const c = config as Record<string, unknown>;
  return typeof c.nextStepId === "string" ? c.nextStepId : null;
}

function buildEdges(steps: AutomationStep[], triggerDisconnected = false): Edge[] {
  const out: Edge[] = [];

  if (steps.length === 0) {
    out.push({
      id: `${TRIGGER_ID}-${ADD_STEP_ID}`,
      source: TRIGGER_ID,
      target: ADD_STEP_ID,
      animated: false,
      data: EDGE_DATA_ADD,
      type: EDGE_TYPE,
    });
    return out;
  }

  const stepIds = new Set(steps.map((s) => s.id));

  // Conector gatilho→1º passo. Agora com "✕" (DELETE_LABEL_PROPS) pra
  // poder apagar; ao apagar, marcamos triggerConfig.__entryDisconnected
  // e este edge deixa de ser emitido (até reconectar arrastando do gatilho).
  if (!triggerDisconnected) {
    out.push({
      id: `${TRIGGER_ID}-${steps[0].id}`,
      source: TRIGGER_ID,
      target: steps[0].id,
      animated: false,
      data: EDGE_DATA_DEFAULT,
      type: EDGE_TYPE,
      interactionWidth: INTERACT_W,
      ...DELETE_LABEL_PROPS,
    });
  }

  for (let i = 0; i < steps.length; i++) {
    const a = steps[i];
    const cfg = a.config as Record<string, unknown>;

    if (isInteractiveStep(a.type)) {
      const buttons = Array.isArray(cfg.buttons)
        ? (cfg.buttons as { gotoStepId?: string }[])
        : [];

      buttons.forEach((btn, idx) => {
        const gotoId = btn.gotoStepId && btn.gotoStepId !== "__none__"
          ? btn.gotoStepId
          : undefined;
        if (!gotoId || !stepIds.has(gotoId)) return;
        out.push({
          id: `${a.id}-btn_${idx}-${gotoId}`,
          source: a.id, target: gotoId,
          sourceHandle: `btn_${idx}`,
          animated: false, data: EDGE_DATA_BUTTON, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      });

      if (typeof cfg.elseGotoStepId === "string" && cfg.elseGotoStepId && stepIds.has(cfg.elseGotoStepId)) {
        out.push({
          id: `${a.id}-else-${cfg.elseGotoStepId}`,
          source: a.id, target: cfg.elseGotoStepId,
          sourceHandle: "else",
          animated: false, data: EDGE_DATA_ELSE, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      }

      if (typeof cfg.timeoutGotoStepId === "string" && cfg.timeoutGotoStepId && stepIds.has(cfg.timeoutGotoStepId)) {
        out.push({
          id: `${a.id}-timeout-${cfg.timeoutGotoStepId}`,
          source: a.id, target: cfg.timeoutGotoStepId,
          sourceHandle: "timeout",
          animated: false, data: EDGE_DATA_TIMEOUT, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      }
    }

    if (a.type === "condition") {
      const condCfg = normalizeConditionConfig(cfg);
      condCfg.branches.forEach((branch) => {
        if (branch.nextStepId && stepIds.has(branch.nextStepId)) {
          out.push({
            id: `${a.id}-branch:${branch.id}-${branch.nextStepId}`,
            source: a.id,
            target: branch.nextStepId,
            sourceHandle: `branch:${branch.id}`,
            animated: false,
            data: EDGE_DATA_BUTTON,
            type: EDGE_TYPE,
            interactionWidth: INTERACT_W,
            ...DELETE_LABEL_PROPS,
          });
        }
      });
      if (condCfg.elseStepId && stepIds.has(condCfg.elseStepId)) {
        out.push({
          id: `${a.id}-else-${condCfg.elseStepId}`,
          source: a.id,
          target: condCfg.elseStepId,
          sourceHandle: "else",
          animated: false,
          data: EDGE_DATA_ELSE,
          type: EDGE_TYPE,
          interactionWidth: INTERACT_W,
          ...DELETE_LABEL_PROPS,
        });
      }
    }

    // execute_distribution = IF de 2 saídas (estilo n8n):
    //   • SIM (handle "true") = fluxo linear via nextStepId (bloco genérico abaixo).
    //   • NÃO (handle "false") = ramo `elseStepId` (sem agente elegível).
    if (a.type === "execute_distribution") {
      if (typeof cfg.elseStepId === "string" && cfg.elseStepId && stepIds.has(cfg.elseStepId)) {
        out.push({
          id: `${a.id}-else-${cfg.elseStepId}`,
          source: a.id, target: cfg.elseStepId,
          sourceHandle: "false",
          animated: false, data: EDGE_DATA_ELSE, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      }
    }

    if (a.type === "business_hours") {
      if (typeof cfg.elseStepId === "string" && cfg.elseStepId && stepIds.has(cfg.elseStepId)) {
        out.push({
          id: `${a.id}-else-${cfg.elseStepId}`,
          source: a.id, target: cfg.elseStepId,
          sourceHandle: "false",
          animated: false, data: EDGE_DATA_ELSE, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      }
    }

    if (a.type === "wait_for_reply") {
      if (typeof cfg.receivedGotoStepId === "string" && cfg.receivedGotoStepId && stepIds.has(cfg.receivedGotoStepId)) {
        out.push({
          id: `${a.id}-received-${cfg.receivedGotoStepId}`,
          source: a.id, target: cfg.receivedGotoStepId,
          sourceHandle: "received",
          animated: false, data: EDGE_DATA_BUTTON, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      }

      if (typeof cfg.timeoutGotoStepId === "string" && cfg.timeoutGotoStepId && stepIds.has(cfg.timeoutGotoStepId)) {
        out.push({
          id: `${a.id}-timeout-${cfg.timeoutGotoStepId}`,
          source: a.id, target: cfg.timeoutGotoStepId,
          sourceHandle: "timeout",
          animated: false, data: EDGE_DATA_TIMEOUT, type: EDGE_TYPE,
          interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
        });
      }
    }

    // O condition (multi-branch) NÃO usa nextStepId raiz — cada
    // branch tem o seu. Pular pra não criar edge fantasma no handle
    // "false" do losango antigo.
    if (a.type === "condition") continue;

    const explicit = readNextStepId(cfg);

    if (explicit === NONE || !explicit) continue;

    if (stepIds.has(explicit)) {
      out.push({
        id: `${a.id}-next-${explicit}`,
        source: a.id, target: explicit,
        animated: false, data: EDGE_DATA_DEFAULT, type: EDGE_TYPE,
        interactionWidth: INTERACT_W, ...DELETE_LABEL_PROPS,
      });
    }
  }

  // Edge "+ Adicionar próximo passo" pra TODA folha não-terminal/não-ramificadora,
  // não só pro último step do array. Antes só o ramo principal (cadeia linear)
  // tinha a pílula; ramos paralelos (ex: timeout do wait_for_reply) ficavam
  // sem indicação visual de que dá pra continuar.
  const leaves = collectLeafStepIds(steps);
  for (const leafId of leaves) {
    out.push({
      id: `addstep-edge-${leafId}`,
      source: leafId,
      target: `${ADD_STEP_ID}:${leafId}`,
      animated: false,
      data: EDGE_DATA_ADD,
      type: EDGE_TYPE,
    });
  }

  return out;
}

export type { StepStats, AutomationStats } from "@/lib/automation-stats-types";
import type { AutomationStats } from "@/lib/automation-stats-types";

type InnerProps = {
  steps: AutomationStep[];
  onStepsChange: (steps: AutomationStep[]) => void;
  triggerType: string;
  triggerConfig: unknown;
  stats?: AutomationStats | null;
  onStepLogsOpen?: (stepId: string) => void;
  // 27/mai/26 — Callback opcional disparado quando o operador clica no nó
  // do gatilho no canvas. As pages (/new wizard, /[id] detail) usam pra
  // abrir o diálogo de configuração do trigger — antes o nó era inerte
  // e os usuários não descobriam que dava pra editar.
  onTriggerClick?: () => void;
  // 27/mai/26 — Patch parcial do triggerConfig (usado pelo canvas pra
  // persistir a posição do nó do gatilho após arrastar). A page é
  // responsável por aplicar o `__rfPos` no estado do triggerConfig
  // e setar `dirty`. Sem este callback, drag continua funcionando
  // visualmente mas a posição não persiste entre saves.
  onTriggerConfigChange?: (next: Record<string, unknown>) => void;
  // 27/mai/26 — Contador incremental: cada vez que muda, o canvas
  // executa `fitView` pra recentrar o viewport. Usado depois do
  // auto-alinhar, senão o operador clica o botão e o canvas continua
  // mostrando a área antiga (que pode ter ficado vazia).
  autoAlignVersion?: number;
  className?: string;
};

function WorkflowCanvasInner({
  steps,
  onStepsChange,
  triggerType,
  triggerConfig,
  stats,
  onStepLogsOpen,
  onTriggerClick,
  onTriggerConfigChange,
  autoAlignVersion,
  className,
}: InnerProps) {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const { theme } = useThemeV2();
  const isDark = theme === "dark";
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  // Quando a edição inline altera só a config, patchamos o node in-place
  // e pulamos o rebuild completo (senão o React Flow remonta o input e
  // o foco some a cada tecla — "só edita se clicar e segurar").
  const skipStepsSyncRef = useRef(false);
  const patchStepConfigRef = useRef<
    (stepId: string, next: Record<string, unknown>) => void
  >(() => {});

  // Posição inicial do nó ao começar um arraste — usada pra distinguir
  // clique (sem movimento) de arraste real na pílula "+ adicionar passo".
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Refs pra ler triggerConfig / callback dentro dos handlers sem recriar
  // os useCallback a cada mudança de config.
  const triggerConfigRef = useRef(triggerConfig);
  triggerConfigRef.current = triggerConfig;
  const onTriggerConfigChangeRef = useRef(onTriggerConfigChange);
  onTriggerConfigChangeRef.current = onTriggerConfigChange;

  // Entrada do gatilho desconectada? (flag em triggerConfig.__entryDisconnected)
  // Quando true, suprimimos a edge gatilho→1º passo e o operador pode
  // re-arrastar do gatilho pra qualquer bloco.
  const triggerDisconnected =
    typeof triggerConfig === "object" &&
    triggerConfig !== null &&
    (triggerConfig as Record<string, unknown>).__entryDisconnected === true;

  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current || steps.length === 0) return;
    const alreadyMigrated = steps.some((s) => {
      const c = s.config as Record<string, unknown> | null;
      return c && c.__hasExplicitEdges === true;
    });
    if (alreadyMigrated) {
      migratedRef.current = true;
      return;
    }
    migratedRef.current = true;
    const migrated = steps.map((s, i) => {
      const cfg = { ...(s.config as Record<string, unknown>) };
      // Condition multi-branch controla destino nas branches — não
      // inventa nextStepId raiz pra ele.
      if (s.type !== "condition") {
        const next = steps[i + 1];
        cfg.nextStepId = next ? next.id : NONE;
      }
      cfg.__hasExplicitEdges = true;
      return { ...s, config: cfg };
    });
    onStepsChange(migrated);
  }, [steps, onStepsChange]);

  const onStepLogsOpenRef = useRef(onStepLogsOpen);
  onStepLogsOpenRef.current = onStepLogsOpen;

  type PendingConnection = {
    sourceId: string;
    sourceHandle: string;
    position: { x: number; y: number };
  };
  const [pendingConn, setPendingConn] = useState<PendingConnection | null>(null);
  const connectStartRef = useRef<{ sourceId: string; sourceHandle: string } | null>(null);

  const stageNamesQuery = useQuery({
    queryKey: ["pipeline-stage-names"],
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return {} as Record<string, string>;
      const pipelines = (await res.json()) as {
        id: string;
        name: string;
        stages: { id: string; name: string }[];
      }[];
      const map: Record<string, string> = {};
      for (const p of pipelines) {
        // Incluímos o pipeline também — o resumo do gatilho (ex.: deal_created
        // filtrado por pipeline + estágio) usa o mesmo `lookup` pra
        // converter id→nome de qualquer um dos dois.
        map[p.id] = p.name;
        for (const s of p.stages) {
          map[s.id] = s.name;
        }
      }
      return map;
    },
  });
  const EMPTY_STAGE_MAP: Record<string, string> = useMemo(() => ({}), []);
  const stageNameLookup = stageNamesQuery.data ?? EMPTY_STAGE_MAP;

  const onAddStepRef = useRef<(type: ActionStepType, afterId: string | null) => void>(null!);

  const buildNodes = useCallback(
    (
      list: AutomationStep[],
      onDelete: (id: string) => void,
      onAddStep: (type: ActionStepType, afterStepId: string | null) => void
    ): Node[] => {
      const triggerSummary = summarizeTriggerConfig(
        triggerType,
        triggerConfig,
        stageNameLookup,
      );
      const ts = stats?.trigger ?? {};
      // 27/mai/26 — Posição do nó do gatilho agora vem de
      // `triggerConfig.__rfPos` (se setado). Mesmo padrão dos passos —
      // antes era hard-coded em `{ x: 32, y: NODE_Y }` e o nó ficava
      // travado pra arrastar. Agora `draggable: true` + persist da
      // posição via `onNodeDragStop` (canvas avisa a page por
      // `onTriggerConfigChange`).
      const triggerSavedPos = readRfPos(triggerConfig);
      const triggerNode: Node = {
        id: TRIGGER_ID,
        type: "trigger",
        position: triggerSavedPos ?? { x: 32, y: NODE_Y },
        data: {
          label: triggerTypeLabel(triggerType),
          summary: triggerSummary,
          stats: {
            success: (ts["STARTED"] ?? 0) + (ts["COMPLETED"] ?? 0) + (ts["COMPLETED_WITH_ERRORS"] ?? 0),
            failed: ts["FAILED"] ?? 0,
            skipped: ts["SKIPPED"] ?? 0,
          },
          onStatsClick: () => onStepLogsOpenRef.current?.("trigger"),
        },
        draggable: true,
      };

      const stepIndexById = new Map<string, number>();
      list.forEach((s, i) => stepIndexById.set(s.id, i + 1));

      // stepOptions p/ campos `kind: "step"` do editor inline —
      // exclui o próprio nó pra evitar auto-referência acidental.
      const buildStepOptions = (currentId: string) =>
        list
          .filter((s) => s.id !== currentId)
          .map((s, i) => ({ value: s.id, label: `${i + 1}. ${stepTypeLabel(s.type)}` }));

      const stepNodes: Node[] = list.map((step, index) => {
        const saved = readRfPos(step.config);
        const pos = saved ?? { x: START_X + index * GAP_X, y: NODE_Y };
        const ss = stats?.steps?.[step.id];

        let summary = summarizeStepConfig(step.type, step.config, stageNameLookup);
        if (step.type === "goto") {
          const cfg = step.config as Record<string, unknown>;
          const tgt = typeof cfg.targetStepId === "string" ? cfg.targetStepId : "";
          const tgtIdx = tgt ? stepIndexById.get(tgt) : undefined;
          summary = tgtIdx != null ? `Ir para: passo ${tgtIdx}` : summary;
        }

        const baseData = {
          label: stepTypeLabel(step.type),
          summary,
          stepType: step.type,
          stepIndex: index + 1,
          incomplete: isStepIncomplete(step.type, step.config),
          onDelete: () => onDelete(step.id),
          stats: ss ? { success: ss.success, failed: ss.failed, skipped: ss.skipped } : undefined,
          onStatsClick: () => onStepLogsOpenRef.current?.(step.id),
          // Edição inline — o slot NodeInlineConfig dentro de cada
          // node component consome estes props quando `selected`.
          config: (step.config ?? {}) as Record<string, unknown>,
          stepOptions: buildStepOptions(step.id),
          onConfigChange: (next: Record<string, unknown>) =>
            patchStepConfigRef.current(step.id, next),
        };

        // Card inteiro arrasta (sem dragHandle) — os campos do editor
        // inline têm `nodrag`/stopPropagation, então digitar/clicar em
        // inputs não move o node. `nodeDragThreshold` no <ReactFlow>
        // garante que o clique de seleção não vire micro-drag.
        if (isInteractiveStep(step.type)) {
          const cfg = step.config as Record<string, unknown>;
          const buttons = Array.isArray(cfg.buttons) ? cfg.buttons : [];
          return {
            id: step.id,
            type: "interactive" as const,
            position: pos,
            data: {
              ...baseData,
              buttons,
              hasElse: true,
              hasTimeout: step.type === "question",
            },
          };
        }

        if (step.type === "condition") {
          const condCfg = normalizeConditionConfig(step.config);
          return {
            id: step.id,
            type: "condition" as const,
            position: pos,
            data: {
              ...baseData,
              branches: condCfg.branches,
            },
          };
        }

        if (step.type === "wait_for_reply") {
          const cfg = step.config as Record<string, unknown>;
          const tMs = Number(cfg.timeoutMs ?? 0);
          let timeoutLabel = "Cronômetro";
          if (tMs > 0) {
            const h = Math.floor(tMs / 3_600_000);
            const m = Math.floor((tMs % 3_600_000) / 60_000);
            const s = Math.floor((tMs % 60_000) / 1000);
            const parts: string[] = [];
            if (h > 0) parts.push(`${h} horas`);
            if (m > 0) parts.push(`${m} min`);
            if (s > 0) parts.push(`${s} seg`);
            timeoutLabel = `Cronômetro: ${parts.join(" ")}`;
          }
          return {
            id: step.id,
            type: "wait" as const,
            position: pos,
            data: {
              ...baseData,
              hasReceivedGoto: !!(cfg.receivedGotoStepId),
              hasTimeoutGoto: !!(cfg.timeoutGotoStepId),
              timeoutLabel,
            },
          };
        }

        return {
          id: step.id,
          type: rfNodeType(step.type),
          position: pos,
          data: baseData,
        } as Node;
      });

      // Lista vazia: pílula "Adicionar próximo passo" sai do trigger.
      if (list.length === 0) {
        const addStepNode: Node = {
          id: ADD_STEP_ID,
          type: "addStep",
          position: { x: START_X, y: NODE_Y + 20 },
          // Arrastável: ao soltar, o canvas abre o seletor de tipo na
          // posição final (ver onNodeDragStop). Clique continua abrindo
          // o seletor "no lugar padrão".
          draggable: true,
          selectable: false,
          data: {
            afterStepId: null,
            onSelectType: onAddStep,
          },
        };
        return [triggerNode, addStepNode];
      }

      // Um addStepNode por FOLHA (step linear sem nextStepId real).
      // Cada um sabe seu `afterStepId` pra que o picker conecte ao step certo.
      const leaves = collectLeafStepIds(list);
      const addStepNodes: Node[] = [];
      for (const step of list) {
        if (!leaves.has(step.id)) continue;
        const pos = readRfPos(step.config);
        const idx = list.indexOf(step);
        const x = pos ? pos.x + GAP_X : START_X + (idx + 1) * GAP_X;
        const y = pos ? pos.y + 20 : NODE_Y + 20;
        addStepNodes.push({
          id: `${ADD_STEP_ID}:${step.id}`,
          type: "addStep",
          position: { x, y },
          draggable: true,
          selectable: false,
          data: {
            afterStepId: step.id,
            onSelectType: onAddStep,
          },
        });
      }

      return [triggerNode, ...stepNodes, ...addStepNodes];
    },
    [triggerConfig, triggerType, stats, stageNameLookup]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  const patchStepConfig = useCallback(
    (stepId: string, next: Record<string, unknown>) => {
      const cur = stepsRef.current;
      const step = cur.find((s) => s.id === stepId);
      if (!step) return;
      const updated = cur.map((s) =>
        s.id === stepId ? { ...s, config: next } : s
      );
      stepsRef.current = updated;
      skipStepsSyncRef.current = true;
      onStepsChange(updated);

      const stepIndexById = new Map<string, number>();
      updated.forEach((s, i) => stepIndexById.set(s.id, i + 1));

      let summary = summarizeStepConfig(step.type, next, stageNameLookup);
      if (step.type === "goto") {
        const tgt = typeof next.targetStepId === "string" ? next.targetStepId : "";
        const tgtIdx = tgt ? stepIndexById.get(tgt) : undefined;
        summary = tgtIdx != null ? `Ir para: passo ${tgtIdx}` : summary;
      }

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== stepId) return n;
          const data: Record<string, unknown> = {
            ...(n.data as Record<string, unknown>),
            config: next,
            summary,
            incomplete: isStepIncomplete(step.type, next),
          };
          if (isInteractiveStep(step.type)) {
            data.buttons = Array.isArray(next.buttons) ? next.buttons : [];
          }
          if (step.type === "condition") {
            data.branches = normalizeConditionConfig(next).branches;
          }
          if (step.type === "wait_for_reply") {
            const tMs = Number(next.timeoutMs ?? 0);
            let timeoutLabel = "Cronômetro";
            if (tMs > 0) {
              const h = Math.floor(tMs / 3_600_000);
              const m = Math.floor((tMs % 3_600_000) / 60_000);
              const s = Math.floor((tMs % 60_000) / 1000);
              const parts: string[] = [];
              if (h > 0) parts.push(`${h} horas`);
              if (m > 0) parts.push(`${m} min`);
              if (s > 0) parts.push(`${s} seg`);
              timeoutLabel = `Cronômetro: ${parts.join(" ")}`;
            }
            data.hasReceivedGoto = !!next.receivedGotoStepId;
            data.hasTimeoutGoto = !!next.timeoutGotoStepId;
            data.timeoutLabel = timeoutLabel;
          }
          return { ...n, data };
        })
      );
    },
    [onStepsChange, setNodes, stageNameLookup]
  );
  patchStepConfigRef.current = patchStepConfig;

  const removeStep = useCallback(
    (id: string) => {
      const remaining = stepsRef.current.filter((s) => s.id !== id);

      const cleaned = remaining.map((s) => {
        const cfg = { ...(s.config as Record<string, unknown>) };
        let changed = false;

        if (cfg.nextStepId === id) { cfg.nextStepId = NONE; changed = true; }
        if (cfg.elseGotoStepId === id) { delete cfg.elseGotoStepId; changed = true; }
        if (cfg.elseStepId === id) { delete cfg.elseStepId; changed = true; }
        if (cfg.timeoutGotoStepId === id) { delete cfg.timeoutGotoStepId; changed = true; }
        if (cfg.receivedGotoStepId === id) { delete cfg.receivedGotoStepId; changed = true; }

        if (Array.isArray(cfg.buttons)) {
          const btns = (cfg.buttons as Record<string, unknown>[]).map((b) => {
            if (b.gotoStepId === id) return { ...b, gotoStepId: undefined };
            return b;
          });
          cfg.buttons = btns;
          changed = true;
        }

        if (s.type === "condition" && Array.isArray(cfg.branches)) {
          const nextBranches = (cfg.branches as Record<string, unknown>[]).map((b) => {
            if (b.nextStepId === id) return { ...b, nextStepId: undefined };
            return b;
          });
          cfg.branches = nextBranches;
          changed = true;
        }

        return changed ? { ...s, config: cfg } : s;
      });

      onStepsChange(cleaned);
    },
    [onStepsChange]
  );

  // Duplica um passo como nó INDEPENDENTE: copia a config (textos,
  // opções, etc.) mas zera todas as saídas (nextStepId/else/timeout/
  // received/buttons/branches) pra não recriar as conexões do original.
  // Posiciona o clone deslocado pra não ficar exatamente sobreposto.
  const duplicateStep = useCallback(
    (id: string) => {
      const cur = stepsRef.current;
      const orig = cur.find((s) => s.id === id);
      if (!orig) return;
      const newId = newStepId();
      const cfg = { ...(orig.config as Record<string, unknown>) };

      if (orig.type !== "condition") cfg.nextStepId = NONE;
      delete cfg.elseGotoStepId;
      delete cfg.elseStepId;
      delete cfg.timeoutGotoStepId;
      delete cfg.receivedGotoStepId;
      if (Array.isArray(cfg.buttons)) {
        cfg.buttons = (cfg.buttons as Record<string, unknown>[]).map((b) => ({
          ...b,
          gotoStepId: undefined,
        }));
      }
      if (orig.type === "condition" && Array.isArray(cfg.branches)) {
        cfg.branches = (cfg.branches as Record<string, unknown>[]).map((b) => ({
          ...b,
          nextStepId: undefined,
        }));
      }

      const pos = readRfPos(orig.config);
      cfg.__rfPos = { x: (pos?.x ?? START_X) + 48, y: (pos?.y ?? NODE_Y) + 72 };
      cfg.__hasExplicitEdges = true;

      const clone: AutomationStep = { id: newId, type: orig.type, config: cfg };
      onStepsChange([...cur, clone]);
    },
    [onStepsChange]
  );

  const addStepAfter = useCallback(
    (stepType: ActionStepType, afterStepId: string | null) => {
      const id = newStepId();
      const cur = stepsRef.current;
      const config = defaultStepConfig(stepType) as Record<string, unknown>;
      config.__hasExplicitEdges = true;
      // Step novo é folha — marca explicitamente como "fim de ramo"
      // (ver comentário em handlePendingStepSelect).
      if (stepType !== "condition") config.nextStepId = NONE;

      if (!afterStepId) {
        const lastStep = cur[cur.length - 1];
        const lastPos = lastStep ? readRfPos(lastStep.config) : null;
        const x = lastPos ? lastPos.x + GAP_X : START_X + cur.length * GAP_X;
        config.__rfPos = { x, y: NODE_Y };
        const step: AutomationStep = { id, type: stepType, config };

        if (lastStep && lastStep.type !== "condition") {
          const prevCfg = { ...(lastStep.config as Record<string, unknown>), nextStepId: id };
          const updated = cur.map((s) => s.id === lastStep.id ? { ...s, config: prevCfg } : s);
          onStepsChange([...updated, step]);
        } else {
          onStepsChange([...cur, step]);
        }
      } else {
        const idx = cur.findIndex((s) => s.id === afterStepId);
        const afterStep = cur[idx];
        const afterPos = afterStep ? readRfPos(afterStep.config) : null;
        const x = afterPos ? afterPos.x + GAP_X : START_X + (idx + 1) * GAP_X;
        config.__rfPos = { x, y: NODE_Y };
        const step: AutomationStep = { id, type: stepType, config };

        if (idx < 0) {
          onStepsChange([...cur, step]);
        } else if (afterStep.type === "condition") {
          onStepsChange([...cur.slice(0, idx + 1), step, ...cur.slice(idx + 1)]);
        } else {
          const prevCfg = { ...(afterStep.config as Record<string, unknown>), nextStepId: id };
          const updated = cur.map((s) => s.id === afterStepId ? { ...s, config: prevCfg } : s);
          onStepsChange([...updated.slice(0, idx + 1), step, ...updated.slice(idx + 1)]);
        }
      }
    },
    [onStepsChange]
  );

  onAddStepRef.current = addStepAfter;

  useEffect(() => {
    // Edição inline já patchou o node — não rebuildar (preserva foco).
    if (skipStepsSyncRef.current) {
      skipStepsSyncRef.current = false;
      return;
    }
    // Rebuild preservando `selected` (React Flow guarda seleção no
    // próprio node object; se recriamos os nós do zero, a seleção do
    // card editado some ao soltar o mouse quando algum re-render
    // dispara este effect).
    setNodes((prev) => {
      const selectedIds = new Set(
        prev.filter((n) => n.selected).map((n) => n.id)
      );
      const next = buildNodes(steps, removeStep, addStepAfter);
      if (selectedIds.size === 0) return next;
      return next.map((n) =>
        selectedIds.has(n.id) ? { ...n, selected: true } : n
      );
    });
  }, [steps, buildNodes, removeStep, addStepAfter, setNodes]);

  // Recentraliza o viewport após "Auto alinhar". Espera o React Flow
  // aplicar as novas posições (setNodes é assíncrono). `maxZoom: 1`
  // evita zoom-in excessivo em fluxos curtos (empurrava o fluxo pra
  // baixo da tela no shell v2 com CSS zoom).
  useEffect(() => {
    if (!autoAlignVersion) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void fitView({ duration: 380, padding: 0.22, maxZoom: 1, minZoom: 0.35 });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [autoAlignVersion, fitView]);

  const edges = useMemo(
    () => buildEdges(steps, triggerDisconnected),
    [steps, triggerDisconnected]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const { source, target, sourceHandle } = params;
      if (!target || target === TRIGGER_ID || isAddStepNodeId(target)) return;
      const cur = stepsRef.current;
      const tgt = cur.find((s) => s.id === target);
      if (!tgt) return;

      if (source === TRIGGER_ID) {
        const without = cur.filter((s) => s.id !== target);
        onStepsChange([tgt, ...without]);
        // Reconectou o gatilho → limpa o flag de "entrada desconectada".
        const cb = onTriggerConfigChangeRef.current;
        if (cb) {
          const tc =
            typeof triggerConfigRef.current === "object" && triggerConfigRef.current !== null
              ? { ...(triggerConfigRef.current as Record<string, unknown>) }
              : {};
          if (tc.__entryDisconnected) {
            delete tc.__entryDisconnected;
            cb(tc);
          }
        }
        return;
      }

      if (!source) return;
      const srcStep = cur.find((s) => s.id === source);
      if (!srcStep) return;

      if (sourceHandle) {
        const btnMatch = sourceHandle.match(/^btn_(\d+)$/);

        if (btnMatch && isInteractiveStep(srcStep.type)) {
          const idx = Number(btnMatch[1]);
          const cfg = { ...srcStep.config } as Record<string, unknown>;
          const buttons = Array.isArray(cfg.buttons)
            ? [...(cfg.buttons as Record<string, unknown>[])]
            : [];
          if (buttons[idx]) {
            buttons[idx] = { ...buttons[idx], gotoStepId: target };
            cfg.buttons = buttons;
            onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
            return;
          }
        }

        // Handle `branch:<id>` → atribui destino a uma branch do condition
        const branchMatch = sourceHandle.match(/^branch:(.+)$/);
        if (branchMatch && srcStep.type === "condition") {
          const branchId = branchMatch[1];
          const condCfg = normalizeConditionConfig(srcStep.config);
          const nextCfg: ConditionConfig = {
            ...condCfg,
            branches: condCfg.branches.map((b) =>
              b.id === branchId ? { ...b, nextStepId: target } : b
            ),
          };
          const cfg = nextCfg as unknown as Record<string, unknown>;
          onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
          return;
        }

        // Handle `else` no condition multi-branch → fallback
        if (sourceHandle === "else" && srcStep.type === "condition") {
          const condCfg = normalizeConditionConfig(srcStep.config);
          const nextCfg: ConditionConfig = { ...condCfg, elseStepId: target };
          const cfg = nextCfg as unknown as Record<string, unknown>;
          onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
          return;
        }

        if (sourceHandle === "else") {
          const cfg = { ...srcStep.config, elseGotoStepId: target };
          onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
          return;
        }

        if (sourceHandle === "false" && (srcStep.type === "business_hours" || srcStep.type === "execute_distribution")) {
          const cfg = { ...srcStep.config, elseStepId: target };
          onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
          return;
        }

        if (sourceHandle === "timeout") {
          const cfg = { ...srcStep.config, timeoutGotoStepId: target };
          onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
          return;
        }

        if (sourceHandle === "received" && srcStep.type === "wait_for_reply") {
          const cfg = { ...srcStep.config, receivedGotoStepId: target };
          onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
          return;
        }
      }

      // Condition multi-branch não aceita `nextStepId` raiz — os
      // destinos saem pelos handles `branch:<id>` ou `else` acima.
      if (srcStep.type === "condition") return;

      const cfg = { ...srcStep.config } as Record<string, unknown>;
      cfg.nextStepId = target;
      onStepsChange(cur.map((s) => s.id === source ? { ...s, config: cfg } : s));
    },
    [onStepsChange]
  );

  const onConnectStart = useCallback(
    (_: unknown, params: { nodeId: string | null; handleId: string | null }) => {
      if (params.nodeId && params.handleId) {
        connectStartRef.current = { sourceId: params.nodeId, sourceHandle: params.handleId };
      }
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const start = connectStartRef.current;
      connectStartRef.current = null;
      if (!start) return;

      // Heurística robusta pra decidir se soltou em "espaço vazio" do
      // canvas: ignora apenas quando caiu em cima de um node ou handle
      // (aí o próprio React Flow trata como conexão válida/invalida).
      // Antes checávamos só `classList.contains("react-flow__pane")` —
      // mas o target pode ser o Background (dots SVG), o viewport, ou
      // qualquer filho — causando o bug "às vezes abre, às vezes não".
      const targetEl = (event as MouseEvent).target as HTMLElement | null;
      if (targetEl) {
        const hitNode = targetEl.closest(".react-flow__node");
        const hitHandle = targetEl.closest(".react-flow__handle");
        if (hitNode || hitHandle) return;
      }

      const clientX = "clientX" in event ? event.clientX : (event as TouchEvent).touches?.[0]?.clientX ?? 0;
      const clientY = "clientY" in event ? event.clientY : (event as TouchEvent).touches?.[0]?.clientY ?? 0;

      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setPendingConn({
        sourceId: start.sourceId,
        sourceHandle: start.sourceHandle,
        position: flowPos,
      });
    },
    [screenToFlowPosition]
  );

  const handlePendingStepSelect = useCallback(
    (stepType: ActionStepType) => {
      if (!pendingConn) return;
      const { sourceId, sourceHandle, position: connPos } = pendingConn;
      setPendingConn(null);

      const id = newStepId();
      const config = defaultStepConfig(stepType) as Record<string, unknown>;
      config.__rfPos = { x: connPos.x - 100, y: connPos.y };
      config.__hasExplicitEdges = true;
      // Step recém-criado é folha por default — marca explicitamente como
      // "fim de ramo" pra não cair no fallback linear da array (que
      // disparava passo do ramo vizinho por engano).
      if (stepType !== "condition") config.nextStepId = NONE;
      const step: AutomationStep = { id, type: stepType, config };
      const cur = stepsRef.current;

      // Origem = GATILHO: o novo bloco vira a ENTRADA (1º passo) e
      // reconecta o gatilho (limpa __entryDisconnected). Cobre tanto o
      // fluxo vazio quanto "apaguei o conector do gatilho e arrastei".
      if (sourceId === TRIGGER_ID) {
        onStepsChange([step, ...cur]);
        const cb = onTriggerConfigChangeRef.current;
        if (cb) {
          const tc =
            typeof triggerConfigRef.current === "object" && triggerConfigRef.current !== null
              ? { ...(triggerConfigRef.current as Record<string, unknown>) }
              : {};
          if (tc.__entryDisconnected) {
            delete tc.__entryDisconnected;
            cb(tc);
          }
        }
        return;
      }

      const srcStep = cur.find((s) => s.id === sourceId);
      if (srcStep) {
        const btnMatch = sourceHandle.match(/^btn_(\d+)$/);

        if (btnMatch && isInteractiveStep(srcStep.type)) {
          const idx = Number(btnMatch[1]);
          const cfg = { ...srcStep.config } as Record<string, unknown>;
          const buttons = Array.isArray(cfg.buttons)
            ? [...(cfg.buttons as Record<string, unknown>[])]
            : [];
          if (buttons[idx]) {
            buttons[idx] = { ...buttons[idx], gotoStepId: id };
            cfg.buttons = buttons;
            const updated = cur.map((s) =>
              s.id === sourceId ? { ...s, config: cfg } : s
            );
            onStepsChange([...updated, step]);
            return;
          }
        }

        // Condition multi-branch: handle branch:<id> ou else
        const branchMatch = sourceHandle.match(/^branch:(.+)$/);
        if (branchMatch && srcStep.type === "condition") {
          const branchId = branchMatch[1];
          const condCfg = normalizeConditionConfig(srcStep.config);
          const nextCfg: ConditionConfig = {
            ...condCfg,
            branches: condCfg.branches.map((b) =>
              b.id === branchId ? { ...b, nextStepId: id } : b
            ),
          };
          const cfg = nextCfg as unknown as Record<string, unknown>;
          const updated = cur.map((s) =>
            s.id === sourceId ? { ...s, config: cfg } : s
          );
          onStepsChange([...updated, step]);
          return;
        }

        if (sourceHandle === "else" && srcStep.type === "condition") {
          const condCfg = normalizeConditionConfig(srcStep.config);
          const nextCfg: ConditionConfig = { ...condCfg, elseStepId: id };
          const cfg = nextCfg as unknown as Record<string, unknown>;
          const updated = cur.map((s) =>
            s.id === sourceId ? { ...s, config: cfg } : s
          );
          onStepsChange([...updated, step]);
          return;
        }

        if (sourceHandle === "else") {
          const cfg = { ...srcStep.config, elseGotoStepId: id };
          const updated = cur.map((s) =>
            s.id === sourceId ? { ...s, config: cfg } : s
          );
          onStepsChange([...updated, step]);
          return;
        }

        if (sourceHandle === "false" && srcStep.type === "business_hours") {
          const cfg = { ...srcStep.config, elseStepId: id };
          const updated = cur.map((s) =>
            s.id === sourceId ? { ...s, config: cfg } : s
          );
          onStepsChange([...updated, step]);
          return;
        }

        if (sourceHandle === "timeout") {
          const cfg = { ...srcStep.config, timeoutGotoStepId: id };
          const updated = cur.map((s) =>
            s.id === sourceId ? { ...s, config: cfg } : s
          );
          onStepsChange([...updated, step]);
          return;
        }

        if (sourceHandle === "received" && srcStep.type === "wait_for_reply") {
          const cfg = { ...srcStep.config, receivedGotoStepId: id };
          const updated = cur.map((s) =>
            s.id === sourceId ? { ...s, config: cfg } : s
          );
          onStepsChange([...updated, step]);
          return;
        }
      }

      const srcStepForNext = cur.find((s) => s.id === sourceId);
      if (srcStepForNext && srcStepForNext.type !== "condition") {
        const srcCfg = { ...srcStepForNext.config } as Record<string, unknown>;
        srcCfg.nextStepId = id;
        const updated = cur.map((s) => s.id === sourceId ? { ...s, config: srcCfg } : s);
        onStepsChange([...updated, step]);
      } else {
        onStepsChange([...cur, step]);
      }
    },
    [pendingConn, onStepsChange]
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      if (isAddStepNodeId(node.id)) {
        // Distingue clique (sem movimento → o onClick do botão abre o
        // seletor no lugar) de arraste real (abre o seletor na posição
        // solta). Sem isso, o clique dispararia os dois seletores.
        const start = dragStartPosRef.current;
        const moved = start
          ? Math.hypot(node.position.x - start.x, node.position.y - start.y)
          : 999;
        dragStartPosRef.current = null;
        if (moved < 6) return;

        // Arrastou a pílula "+ Adicionar próximo passo": abre o seletor
        // de tipo na posição solta e conecta ao passo de origem (reusa o
        // fluxo de `pendingConn`). Id `__addStep__:<stepId>` carrega o
        // afterStepId; `__addStep__` puro = sair do gatilho (fluxo vazio).
        const afterStepId =
          node.id === ADD_STEP_ID ? null : node.id.slice(ADD_STEP_ID.length + 1);
        setPendingConn({
          sourceId: afterStepId ?? TRIGGER_ID,
          sourceHandle: "",
          position: node.position,
        });
        return;
      }
      if (node.id === TRIGGER_ID) {
        // Persist da nova posição do trigger no próprio triggerConfig
        // (mesmo lugar onde já guardamos channel/pipelineId/stageId).
        // Sem o callback configurado, drag continua funcionando
        // visualmente mas não persiste — modo "view-only" pra usos
        // futuros do canvas em contextos read-only.
        const cb = onTriggerConfigChangeRef.current;
        if (!cb) return;
        const cur = typeof triggerConfig === "object" && triggerConfig !== null
          ? { ...(triggerConfig as Record<string, unknown>) }
          : {} as Record<string, unknown>;
        cur.__rfPos = { x: node.position.x, y: node.position.y };
        cb(cur);
        return;
      }
      const cur = stepsRef.current;
      const updated = cur.map((s) => {
        if (s.id !== node.id) return s;
        const cfg = typeof s.config === "object" && s.config !== null
          ? { ...(s.config as Record<string, unknown>) }
          : {} as Record<string, unknown>;
        cfg.__rfPos = { x: node.position.x, y: node.position.y };
        return { ...s, config: cfg };
      });
      onStepsChange(updated);
    },
    [onStepsChange, triggerConfig]
  );

  const onTriggerClickRef = useRef(onTriggerClick);
  onTriggerClickRef.current = onTriggerClick;

  // Menu de contexto (clique-direito) por nó — "Duplicar"/"Remover".
  // Padrão do exemplo Context Menu do React Flow. Gatilho e nós
  // "+ adicionar" não entram (trigger é único; addStep não é um passo).
  const [nodeMenu, setNodeMenu] = useState<{ id: string; x: number; y: number } | null>(
    null
  );
  const closeNodeMenu = useCallback(() => setNodeMenu(null), []);
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    if (isAddStepNodeId(node.id) || node.id === TRIGGER_ID) return;
    e.preventDefault();
    setNodeMenu({ id: node.id, x: e.clientX, y: e.clientY });
  }, []);

  const onNodeDragStart = useCallback(
    (_: unknown, node: Node) => {
      setNodeMenu(null);
      dragStartPosRef.current = { x: node.position.x, y: node.position.y };
    },
    []
  );

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    if (isAddStepNodeId(node.id)) return;
    if (node.id === TRIGGER_ID) {
      onTriggerClickRef.current?.();
      return;
    }
    // Edição inline: o clique só seleciona; o próprio node expande o
    // NodeConfigEditor quando `selected === true` (React Flow gerencia
    // a seleção internamente via onNodesChange).
  }, []);

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      if (isAddStepEdgeId(edge.id)) return;
      if (isAddStepNodeId(edge.target)) return;
      const edgeData = edge.data as AnimatedEdgeData | undefined;
      if (edgeData?.variant === "add") return;
      const sourceHandle = edge.sourceHandle;
      const sourceId = edge.source;
      // Apagar o conector do GATILHO: marca a entrada como desconectada
      // (triggerConfig.__entryDisconnected). Reaparece ao re-arrastar do
      // gatilho pra um bloco (ver onConnect).
      if (sourceId === TRIGGER_ID) {
        const cb = onTriggerConfigChangeRef.current;
        if (!cb) return;
        const tc =
          typeof triggerConfigRef.current === "object" && triggerConfigRef.current !== null
            ? { ...(triggerConfigRef.current as Record<string, unknown>) }
            : {};
        tc.__entryDisconnected = true;
        cb(tc);
        return;
      }
      if (!sourceId) return;

      const cur = stepsRef.current;
      const srcStep = cur.find((s) => s.id === sourceId);
      if (!srcStep) return;

      const btnMatch = sourceHandle?.match(/^btn_(\d+)$/);
      if (btnMatch && isInteractiveStep(srcStep.type)) {
        const idx = Number(btnMatch[1]);
        const cfg = { ...srcStep.config } as Record<string, unknown>;
        const buttons = Array.isArray(cfg.buttons)
          ? [...(cfg.buttons as Record<string, unknown>[])]
          : [];
        if (buttons[idx]) {
          buttons[idx] = { ...buttons[idx], gotoStepId: undefined };
          cfg.buttons = buttons;
          onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
          return;
        }
      }

      // Condition multi-branch: handle `branch:<id>` ou `else`
      const branchMatch = sourceHandle?.match(/^branch:(.+)$/);
      if (branchMatch && srcStep.type === "condition") {
        const branchId = branchMatch[1];
        const condCfg = normalizeConditionConfig(srcStep.config);
        const nextCfg: ConditionConfig = {
          ...condCfg,
          branches: condCfg.branches.map((b) =>
            b.id === branchId ? { ...b, nextStepId: undefined } : b
          ),
        };
        const cfg = nextCfg as unknown as Record<string, unknown>;
        onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
        return;
      }

      if (sourceHandle === "else" && srcStep.type === "condition") {
        const condCfg = normalizeConditionConfig(srcStep.config);
        const nextCfg: ConditionConfig = { ...condCfg, elseStepId: undefined };
        const cfg = nextCfg as unknown as Record<string, unknown>;
        onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
        return;
      }

      if (sourceHandle === "else") {
        const cfg = { ...srcStep.config } as Record<string, unknown>;
        delete cfg.elseGotoStepId;
        onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
        return;
      }

      if (sourceHandle === "false" && (srcStep.type === "business_hours" || srcStep.type === "execute_distribution")) {
        const cfg = { ...srcStep.config } as Record<string, unknown>;
        delete cfg.elseStepId;
        onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
        return;
      }

      if (sourceHandle === "timeout") {
        const cfg = { ...srcStep.config } as Record<string, unknown>;
        delete cfg.timeoutGotoStepId;
        onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
        return;
      }

      if (sourceHandle === "received" && srcStep.type === "wait_for_reply") {
        const cfg = { ...srcStep.config } as Record<string, unknown>;
        delete cfg.receivedGotoStepId;
        onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
        return;
      }

      const cfg = { ...srcStep.config } as Record<string, unknown>;
      cfg.nextStepId = NONE;
      onStepsChange(cur.map((s) => s.id === sourceId ? { ...s, config: cfg } : s));
    },
    [onStepsChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const stepType = readPaletteDragType(e.dataTransfer);
      if (!stepType) return;
      const dropPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = newStepId();
      const config = defaultStepConfig(stepType) as Record<string, unknown>;
      config.__rfPos = { x: dropPos.x, y: dropPos.y };
      config.__hasExplicitEdges = true;
      const step: AutomationStep = { id, type: stepType, config };

      const cur = stepsRef.current;
      const lastStep = cur[cur.length - 1];

      // Terminal steps (goto/finish/stop/transfer) não têm saída, então
      // não podem ser encadeados antes de novos steps vindos do palette.
      // Também não auto-encadeamos se o step anterior já tem um nextStepId
      // explícito apontando pra outro step (preserva grafos não-lineares).
      const terminalTypes = new Set([
        "goto",
        "finish",
        "stop_automation",
        "transfer_automation",
        "condition",
      ]);
      const prevNext = lastStep
        ? readNextStepId(lastStep.config)
        : null;
      const prevIsTerminal = lastStep ? terminalTypes.has(lastStep.type) : true;
      const prevHasRealNext =
        prevNext && prevNext !== NONE && cur.some((s) => s.id === prevNext);

      if (lastStep && !prevIsTerminal && !prevHasRealNext) {
        const prevCfg = {
          ...(lastStep.config as Record<string, unknown>),
          nextStepId: id,
        };
        const updated = cur.map((s) =>
          s.id === lastStep.id ? { ...s, config: prevCfg } : s
        );
        onStepsChange([...updated, step]);
      } else {
        onStepsChange([...cur, step]);
      }
    },
    [onStepsChange, screenToFlowPosition]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className={cn("automation-editor flex w-full", className)}>
      {/* Palette — esquerda (antes do canvas) */}
      <NodePalette className="w-[240px] shrink-0" />

      {/* Canvas area */}
      <div
        className="automation-canvas relative min-h-0 min-w-0 flex-1 bg-[var(--bg-base)]"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {/* Defs SVG globais (gradientes nomeados das edges) — uma vez
            só por canvas, não por edge, pra performance. */}
        <AnimatedEdgeDefs />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd as unknown as (event: MouseEvent | TouchEvent) => void}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onNodeDragStart={onNodeDragStart}
          onPaneClick={closeNodeMenu}
          onMoveStart={closeNodeMenu}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          // Card inteiro arrasta; o threshold evita que o clique de
          // seleção (com 1-2px de tremida) vire um micro-drag.
          nodeDragThreshold={4}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ style: { cursor: "pointer" } }}
        >
          <Background
            id="auto-dots"
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.4}
            color={isDark ? "#33405c" : "#cbd5e1"}
          />
          <Controls
            className="m-4! overflow-hidden rounded-2xl! border! border-[var(--glass-border)]! bg-[var(--glass-bg-base)]! shadow-[var(--shadow-lg)]! backdrop-blur-xl! [&>button]:border-0! [&>button]:bg-transparent! [&>button]:text-[var(--color-ink-soft)]! [&>button:hover]:bg-primary/10! [&>button:hover]:text-primary!"
          />
          <MiniMap
            className="m-4! overflow-hidden rounded-2xl! border! border-[var(--glass-border)]! bg-[var(--glass-bg-overlay)]! shadow-[var(--shadow-lg)]! backdrop-blur-xl!"
            maskColor={isDark ? "rgba(0,0,0,0.30)" : "rgba(13,27,62,0.06)"}
            nodeColor={(n) => {
              if (isAddStepNodeId(n.id)) return "transparent";
              if (n.id === TRIGGER_ID) return "var(--color-primary)";
              return isDark ? "#64748b" : "#94a3b8";
            }}
            nodeStrokeColor={isDark ? "rgba(15,22,35,0.8)" : "rgba(255,255,255,0.7)"}
            nodeStrokeWidth={2}
            nodeBorderRadius={6}
          />
        </ReactFlow>

        <StepPickerModal
          open={!!pendingConn}
          onSelect={handlePendingStepSelect}
          onClose={() => {
            setPendingConn(null);
            // Recoloca a pílula arrastada na posição padrão se o operador
            // cancelar (senão ela fica "solta" onde foi largada).
            setNodes(buildNodes(stepsRef.current, removeStep, addStepAfter));
          }}
        />

        {/* Menu de contexto do nó (clique-direito) */}
        {nodeMenu && (
          <>
            <div
              className="fixed inset-0 z-(--z-overlay)"
              onClick={closeNodeMenu}
              onContextMenu={(e) => {
                e.preventDefault();
                closeNodeMenu();
              }}
            />
            <div
              className="fixed z-(--z-sheet) min-w-[168px] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] py-1 shadow-[var(--glass-shadow)] backdrop-blur-md"
              style={{ top: nodeMenu.y, left: nodeMenu.x }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--brand-primary)]/12"
                onClick={() => {
                  duplicateStep(nodeMenu.id);
                  closeNodeMenu();
                }}
              >
                <Copy className="size-4 text-[var(--text-secondary)]" strokeWidth={2.2} />
                Duplicar
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/12"
                onClick={() => {
                  removeStep(nodeMenu.id);
                  closeNodeMenu();
                }}
              >
                <Trash2 className="size-4" strokeWidth={2.2} />
                Remover
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function WorkflowCanvas(props: InnerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
