import type { AutomationStep } from "@/lib/automation-workflow";

const NONE = "__none__";
const START_X = 200;
// Folga horizontal fixa ENTRE colunas (somada à largura real do nó mais
// largo de cada coluna). Mantém respiro pra edge/handles sem depender de
// um GAP_X único que ora sobra (nós recolhidos), ora falta (expandidos).
const COL_GAP = 140;
// 27/mai/26 — START_Y agora bate com `NODE_Y` em `workflow-canvas.tsx`
// (=300). Antes era 140, o que jogava todo o fluxo 160px acima do nó
// do gatilho (que fica fixo em y=300). Visualmente parecia que o
// auto-align "subia" o canvas todo.
const START_Y = 300;
// Espaçamento entre lanes — acomoda nodes altos (condition multi-branch,
// wait_for_reply + painel inline, interactive com muitos botões).
const GAP_Y = 280;

// Largura estimada (recolhida) por tipo de step — usada pra espaçar as
// colunas de forma responsiva. Bate com os `max-w`/`w` de cada *-node.tsx.
// A coluna usa o MAIOR nó nela; assim fluxos recolhidos ficam compactos e
// nós largos (interactive, business_hours) ganham espaço automaticamente.
const DEFAULT_NODE_W = 290;
function estStepWidth(type: string): number {
  switch (type) {
    case "condition":
      return 300;
    case "business_hours":
      return 340;
    case "execute_distribution":
      return 300;
    case "question":
    case "send_whatsapp_interactive":
      return 320;
    case "wait_for_reply":
      return 310;
    case "delay":
    case "set_variable":
    case "goto":
      return 270;
    case "finish":
    case "stop_automation":
      return 260;
    default:
      return DEFAULT_NODE_W;
  }
}

function isRealTarget(target: unknown, stepIds: Set<string>): target is string {
  return typeof target === "string" && target !== "" && target !== NONE && stepIds.has(target);
}

function outgoingTargets(step: AutomationStep, stepIds: Set<string>): string[] {
  const cfg = (step.config ?? {}) as Record<string, unknown>;
  const out: string[] = [];

  const push = (v: unknown) => {
    if (isRealTarget(v, stepIds) && !out.includes(v)) out.push(v);
  };

  if (step.type === "condition") {
    const branches = Array.isArray(cfg.branches) ? (cfg.branches as Record<string, unknown>[]) : [];
    for (const b of branches) push(b.nextStepId);
    push(cfg.elseStepId);
    return out;
  }

  if (step.type === "wait_for_reply") {
    push(cfg.receivedGotoStepId);
    push(cfg.timeoutGotoStepId);
    return out;
  }

  if (step.type === "business_hours") {
    push(cfg.elseStepId);
  }

  const buttons = Array.isArray(cfg.buttons) ? (cfg.buttons as Record<string, unknown>[]) : [];
  for (const b of buttons) push(b.gotoStepId);
  push(cfg.elseGotoStepId);
  push(cfg.timeoutGotoStepId);
  push(cfg.nextStepId);

  return out;
}

/**
 * Auto-organiza o fluxo preservando a lógica das conexões.
 *
 * Coordenadas:
 * - `X` por profundidade (distância máxima do nó raiz). Usar o
 *   caminho mais longo é importante em fluxos convergentes (diamond
 *   pattern A→B→D, A→C→D): o `D` precisa estar na coluna após o
 *   ramo mais longo, senão a edge volta pra trás.
 * - `Y` por lane: filhos herdam a lane do pai (linear vira linha
 *   horizontal), mas ramificações alocam lanes novas pras saídas
 *   adicionais. Orphans (steps desconectados) vão pra lanes próprias
 *   abaixo, na coluna após o `maxDepth`.
 */
export function autoAlignWorkflowSteps(steps: AutomationStep[]): AutomationStep[] {
  if (steps.length <= 1) return steps;

  const idsInOrder = steps.map((s) => s.id);
  const stepIds = new Set(idsInOrder);

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of idsInOrder) indegree.set(id, 0);

  for (const step of steps) {
    const out = outgoingTargets(step, stepIds);
    outgoing.set(step.id, out);
    for (const tgt of out) indegree.set(tgt, (indegree.get(tgt) ?? 0) + 1);
  }

  // Roots: primeiro step (entrada vinda do gatilho) + qualquer step
  // sem incoming. Em fluxos sãos só o primeiro é root; orphans (steps
  // criados via drop que nunca foram conectados) entram aqui também.
  const roots = idsInOrder.filter((id, i) => i === 0 || (indegree.get(id) ?? 0) === 0);

  // Depth via LONGEST path. Iteramos até estabilizar. Limite =
  // steps.length+1 pra evitar loop infinito em ciclos (raros, mas
  // possíveis via `goto`).
  const depth = new Map<string, number>();
  for (const r of roots) depth.set(r, 0);
  for (let iter = 0; iter < steps.length + 1; iter++) {
    let changed = false;
    for (const step of steps) {
      const d = depth.get(step.id);
      if (d == null) continue;
      const out = outgoing.get(step.id) ?? [];
      for (const tgt of out) {
        const cur = depth.get(tgt);
        if (cur == null || d + 1 > cur) {
          depth.set(tgt, d + 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // Orphans não alcançáveis a partir dos roots — colocamos na coluna
  // após o `maxDepth` (todos juntos, cada um numa lane diferente).
  const reachedMax = Math.max(0, ...Array.from(depth.values()));
  const orphans: string[] = [];
  for (const id of idsInOrder) {
    if (!depth.has(id)) {
      depth.set(id, reachedMax + 1);
      orphans.push(id);
    }
  }

  // Atribuição de lanes: filho herda lane do pai (cadeia linear =
  // linha horizontal), ramificações alocam lanes novas. Uma branch
  // que converge num nó já posicionado não realoca — fica com a
  // lane atribuída no primeiro alcance.
  const laneById = new Map<string, number>();
  let nextLane = 0;

  const assignLanes = (id: string, currentLane: number): void => {
    if (laneById.has(id)) return;
    laneById.set(id, currentLane);
    const out = outgoing.get(id) ?? [];
    if (out.length === 0) return;
    assignLanes(out[0], currentLane);
    for (let i = 1; i < out.length; i++) {
      nextLane++;
      assignLanes(out[i], nextLane);
    }
  };

  for (const root of roots) {
    if (!laneById.has(root)) {
      assignLanes(root, nextLane);
      nextLane++;
    }
  }

  // Orphans isolados (sem children) podem ter caído fora do
  // `assignLanes` acima quando o root deles é eles mesmos — já
  // tratados. Mas se algum step não tiver lane por bug de grafo,
  // garante uma.
  for (const id of idsInOrder) {
    if (!laneById.has(id)) {
      laneById.set(id, nextLane);
      nextLane++;
    }
  }

  // Largura máxima de cada coluna (profundidade) → X responsivo. Colunas
  // com nós largos afastam a próxima; colunas estreitas ficam compactas.
  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const colWidth = new Map<number, number>();
  for (const step of steps) {
    const d = depth.get(step.id) ?? 0;
    const w = estStepWidth(step.type);
    if (w > (colWidth.get(d) ?? 0)) colWidth.set(d, w);
  }
  const colX = new Map<number, number>();
  let cursorX = START_X;
  for (let d = 0; d <= maxDepth; d++) {
    colX.set(d, cursorX);
    cursorX += (colWidth.get(d) ?? DEFAULT_NODE_W) + COL_GAP;
  }

  return steps.map((step) => {
    const cfg = (step.config ?? {}) as Record<string, unknown>;
    const nextCfg = { ...cfg };
    const d = depth.get(step.id) ?? 0;
    nextCfg.__rfPos = {
      x: colX.get(d) ?? START_X,
      y: START_Y + (laneById.get(step.id) ?? 0) * GAP_Y,
    };
    return { ...step, config: nextCfg };
  });
}
