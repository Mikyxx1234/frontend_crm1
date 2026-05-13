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

import type { ActionStepType } from "@/lib/automation-workflow";

import { ActionNode } from "./action-node";
import { AddStepNode } from "./add-step-node";
import { BusinessHoursNode } from "./business-hours-node";
import { StepPickerModal } from "./step-picker-modal";
import { ConditionNode } from "./condition-node";
import { DelayNode } from "./delay-node";
import { FinishNode } from "./finish-node";
import { GotoNode } from "./goto-node";
import { InteractiveNode } from "./interactive-node";
import { NodePalette, readPaletteDragType } from "./node-palette";
import { QuestionNode } from "./question-node";
import { WaitNode } from "./wait-node";
import { StepConfigPanel } from "./step-config-panel";
import { TriggerNode } from "./trigger-node";
import { VariableNode } from "./variable-node";

const TRIGGER_ID = "trigger";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  businessHours: BusinessHoursNode,
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
const GAP_X = 300;

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

function buildEdges(steps: AutomationStep[]): Edge[] {
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

  out.push({
    id: `${TRIGGER_ID}-${steps[0].id}`,
    source: TRIGGER_ID,
    target: steps[0].id,
    animated: false,
    data: EDGE_DATA_DEFAULT,
    type: EDGE_TYPE,
    interactionWidth: INTERACT_W,
  });

  for (let i = 0; i < steps.length; i++) {
    const a = steps[i];
    const cfg = a.config as Record<string, unknown>;
    const nextArrayStep = steps[i + 1];

    if (isInteractiveStep(a.type)) {
      const buttons = Array.isArray(cfg.buttons)
        ? (cfg.buttons as { gotoStepId?: string }[])
        : [];

      buttons.forEach((btn, idx) => {
        if (!btn.gotoStepId || !stepIds.has(btn.gotoStepId)) return;
        out.push({
          id: `${a.id}-btn_${idx}-${btn.gotoStepId}`,
          source: a.id, target: btn.gotoStepId,
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
  className?: string;
};

function WorkflowCanvasInner({
  steps,
  onStepsChange,
  triggerType,
  triggerConfig,
  stats,
  onStepLogsOpen,
  className,
}: InnerProps) {
  const { screenToFlowPosition, getNodes } = useReactFlow();
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<AutomationStep | null>(null);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

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
      const pipelines = (await res.json()) as { stages: { id: string; name: string }[] }[];
      const map: Record<string, string> = {};
      for (const p of pipelines) {
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
      const triggerSummary = summarizeTriggerConfig(triggerType, triggerConfig);
      const ts = stats?.trigger ?? {};
      const triggerNode: Node = {
        id: TRIGGER_ID,
        type: "trigger",
        position: { x: 32, y: NODE_Y },
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
        draggable: false,
      };

      const stepIndexById = new Map<string, number>();
      list.forEach((s, i) => stepIndexById.set(s.id, i + 1));

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
        };

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
          draggable: false,
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
          draggable: false,
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
    setNodes(buildNodes(steps, removeStep, addStepAfter));
  }, [steps, buildNodes, removeStep, addStepAfter, setNodes]);

  const edges = useMemo(() => buildEdges(steps), [steps]);

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

        if (sourceHandle === "false" && srcStep.type === "business_hours") {
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
      if (node.id === TRIGGER_ID || isAddStepNodeId(node.id)) return;
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
    [onStepsChange]
  );

  const onNodeClick = useCallback((_e: unknown, node: Node) => {
    if (node.id === TRIGGER_ID || isAddStepNodeId(node.id)) return;
    const st = stepsRef.current.find((s) => s.id === node.id);
    if (st) {
      setSelectedStep(st);
      setConfigOpen(true);
    }
  }, []);

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      if (isAddStepEdgeId(edge.id)) return;
      if (isAddStepNodeId(edge.target)) return;
      const edgeData = edge.data as AnimatedEdgeData | undefined;
      if (edgeData?.variant === "add") return;
      const sourceHandle = edge.sourceHandle;
      const sourceId = edge.source;
      if (!sourceId || sourceId === TRIGGER_ID) return;

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

      if (sourceHandle === "false" && srcStep.type === "business_hours") {
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

  const handleSaveStep = useCallback(
    (updated: AutomationStep) => {
      const next = stepsRef.current.map((s) =>
        s.id === updated.id ? updated : s
      );
      onStepsChange(next);
      setSelectedStep(updated);
    },
    [onStepsChange]
  );

  return (
    <div className={cn("flex w-full", className)}>
      {/* Canvas area — radial gradients no fundo dão profundidade
          "engenharia premium" sem competir com os nodes. */}
      <div
        className="relative min-h-0 min-w-0 flex-1 bg-white bg-[radial-gradient(ellipse_at_top_left,rgba(80,125,241,0.07)_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.06)_0%,transparent_55%)]"
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
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ style: { cursor: "pointer" } }}
        >
          <Background
            id="auto-dots"
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.4}
            color="#cbd5e1"
          />
          <Controls
            className="m-4! overflow-hidden rounded-2xl! border! border-white/60! bg-white/85! shadow-premium! backdrop-blur-xl! [&>button]:border-0! [&>button]:bg-transparent! [&>button]:text-slate-600! [&>button:hover]:bg-brand-blue/10! [&>button:hover]:text-brand-blue!"
          />
          <MiniMap
            className="m-4! overflow-hidden rounded-2xl! border! border-white/60! bg-white/70! shadow-premium! backdrop-blur-xl!"
            maskColor="rgba(13,27,62,0.06)"
            nodeColor={(n) => {
              if (isAddStepNodeId(n.id)) return "transparent";
              if (n.id === TRIGGER_ID) return "#507df1";
              return "#94a3b8";
            }}
            nodeStrokeColor="rgba(255,255,255,0.7)"
            nodeStrokeWidth={2}
            nodeBorderRadius={6}
          />
        </ReactFlow>

        <StepPickerModal
          open={!!pendingConn}
          onSelect={handlePendingStepSelect}
          onClose={() => setPendingConn(null)}
        />
      </div>

      {/* Palette */}
      <NodePalette className="w-[240px] shrink-0" />

      {/* Step config */}
      <StepConfigPanel
        open={configOpen}
        onOpenChange={setConfigOpen}
        step={selectedStep}
        onSave={handleSaveStep}
        allSteps={steps}
      />
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
