import type { AutomationStep } from "@/lib/automation-workflow";

const NONE = "__none__";
// O nó do gatilho fica fixo em x=32 e tem até ~280px de largura. A 1ª
// coluna de passos precisa começar DEPOIS dele (32 + 280 + folga), senão
// o primeiro passo fica por baixo do gatilho após o auto-alinhar.
const TRIGGER_X = 32;
const TRIGGER_W = 280;
// Folga horizontal fixa ENTRE colunas (somada à largura real do nó mais
// largo de cada coluna). Compacta o bastante pra um fluxo ~15 nós
// caber numa tela com fitView, sem colar handles.
const COL_GAP = 100;
const START_X = TRIGGER_X + TRIGGER_W + COL_GAP; // = 412
// 27/mai/26 — START_Y agora bate com `NODE_Y` em `workflow-canvas.tsx`
// (=300). Antes era 140, o que jogava todo o fluxo 160px acima do nó
// do gatilho (que fica fixo em y=300). Visualmente parecia que o
// auto-align "subia" o canvas todo.
const START_Y = 300;
// Espaçamento entre lanes do happy-path. 200px acomoda o card recolhido
// (~140–180) sem esticar o grafo pra fora da tela.
const GAP_Y = 200;
// Error/timeout/else compartilham uma faixa embaixo; empilhados na
// mesma coluna usam este gap menor.
const ERROR_STACK_Y = 120;

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
    case "check_agent_status":
      return 340;
    case "execute_distribution":
      return 300;
    case "question":
    case "send_whatsapp_interactive":
    case "send_whatsapp_list":
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

type Outgoing = { primary: string[]; error: string[] };

/**
 * Separa saídas do happy-path (definem colunas/lanes) das saídas de
 * erro. Timeout/failure/else NÃO podem cada um alocar uma lane nova —
 * num fluxo com wait/interactive/Meta send isso explodia o Y pra
 * milhares de px e o fitView (minZoom 0.35) mostrava um canvas vazio
 * com 2–3 edges diagonais longas.
 *
 * `nextStepId` vai primeiro no primary (antes era o último push, então
 * o timeout "roubava" a lane 0 e o fluxo principal ia pra baixo).
 */
function outgoingByKind(step: AutomationStep, stepIds: Set<string>): Outgoing {
  const cfg = (step.config ?? {}) as Record<string, unknown>;
  const primary: string[] = [];
  const error: string[] = [];

  const seen = new Set<string>();
  const push = (list: string[], v: unknown) => {
    if (!isRealTarget(v, stepIds) || seen.has(v)) return;
    seen.add(v);
    list.push(v);
  };

  if (step.type === "condition") {
    const branches = Array.isArray(cfg.branches) ? (cfg.branches as Record<string, unknown>[]) : [];
    for (const b of branches) push(primary, b.nextStepId);
    push(error, cfg.elseStepId);
    return { primary, error };
  }

  if (step.type === "wait_for_reply") {
    push(primary, cfg.receivedGotoStepId);
    push(error, cfg.timeoutGotoStepId);
    return { primary, error };
  }

  if (step.type === "round_robin") {
    const options = Array.isArray(cfg.options) ? (cfg.options as Record<string, unknown>[]) : [];
    for (const o of options) push(primary, o.nextStepId);
    return { primary, error };
  }

  if (step.type === "business_hours" || step.type === "check_agent_status") {
    push(primary, cfg.nextStepId);
    push(error, cfg.elseStepId);
    return { primary, error };
  }

  const choices = step.type === "send_whatsapp_list"
    ? (Array.isArray(cfg.rows) ? (cfg.rows as Record<string, unknown>[]) : [])
    : (Array.isArray(cfg.buttons) ? (cfg.buttons as Record<string, unknown>[]) : []);
  for (const b of choices) push(primary, b.gotoStepId);

  push(primary, cfg.nextStepId);
  push(error, cfg.elseGotoStepId);
  push(error, cfg.timeoutGotoStepId);
  if (cfg.failureAction === "goto") push(error, cfg.failureGotoStepId);

  return { primary, error };
}

function finitePos(x: number, y: number): { x: number; y: number } {
  return {
    x: Number.isFinite(x) ? x : START_X,
    y: Number.isFinite(y) ? y : START_Y,
  };
}

/**
 * Auto-organiza o fluxo preservando a lógica das conexões.
 *
 * Coordenadas:
 * - `X` por profundidade (distância máxima do nó raiz) via happy-path.
 *   Caminho mais longo evita edge pra trás em diamonds (A→B→D, A→C→D).
 * - `Y` por lane só no primary: filho[0] herda a lane; ramos extras
 *   (branches/botões) ganham lane nova. Timeout/failure/else NÃO
 *   incrementam lane — nós só-erro compartilham uma faixa inferior.
 * - Orphans (steps desconectados) vão pra lanes próprias abaixo, na
 *   coluna após o `maxDepth`.
 */
export function autoAlignWorkflowSteps(steps: AutomationStep[]): AutomationStep[] {
  if (steps.length <= 1) return steps;

  const idsInOrder = steps.map((s) => s.id);
  const stepIds = new Set(idsInOrder);

  const primaryOf = new Map<string, string[]>();
  const errorOf = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of idsInOrder) indegree.set(id, 0);

  for (const step of steps) {
    const { primary, error } = outgoingByKind(step, stepIds);
    primaryOf.set(step.id, primary);
    errorOf.set(step.id, error);
    for (const tgt of primary) indegree.set(tgt, (indegree.get(tgt) ?? 0) + 1);
    for (const tgt of error) indegree.set(tgt, (indegree.get(tgt) ?? 0) + 1);
  }

  // Roots: primeiro step (entrada vinda do gatilho) + qualquer step
  // sem incoming. Em fluxos sãos só o primeiro é root; orphans (steps
  // criados via drop que nunca foram conectados) entram aqui também.
  const roots = idsInOrder.filter((id, i) => i === 0 || (indegree.get(id) ?? 0) === 0);

  // Depth via LONGEST path no happy-path. Error edges só posicionam
  // nós que o primary não alcançou (coluna = source+1, sem puxar o
  // grafo inteiro pra direita).
  const depth = new Map<string, number>();
  for (const r of roots) depth.set(r, 0);
  for (let iter = 0; iter < steps.length + 1; iter++) {
    let changed = false;
    for (const step of steps) {
      const d = depth.get(step.id);
      if (d == null) continue;
      for (const tgt of primaryOf.get(step.id) ?? []) {
        const cur = depth.get(tgt);
        if (cur == null || d + 1 > cur) {
          depth.set(tgt, d + 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  for (let iter = 0; iter < steps.length + 1; iter++) {
    let changed = false;
    for (const step of steps) {
      const d = depth.get(step.id);
      if (d == null) continue;
      for (const tgt of errorOf.get(step.id) ?? []) {
        if (depth.has(tgt)) continue;
        depth.set(tgt, d + 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Orphans não alcançáveis — coluna após o maxDepth do que já tem depth.
  const reachedMax = Math.max(0, ...Array.from(depth.values()));
  for (const id of idsInOrder) {
    if (!depth.has(id)) depth.set(id, reachedMax + 1);
  }

  // Lanes só no primary. Error targets já posicionados no happy-path
  // ficam onde estão; os demais vão pra faixa inferior compartilhada.
  const laneById = new Map<string, number>();
  let nextLane = 0;

  const assignLanes = (id: string, currentLane: number): void => {
    if (laneById.has(id)) return;
    laneById.set(id, currentLane);
    const out = primaryOf.get(id) ?? [];
    if (out.length === 0) return;
    assignLanes(out[0], currentLane);
    for (let i = 1; i < out.length; i++) {
      if (laneById.has(out[i])) continue;
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

  const maxPrimaryLane = Math.max(0, ...Array.from(laneById.values()), nextLane - 1);
  const errorBaseLane = maxPrimaryLane + 1;
  const errorStackInCol = new Map<number, number>();
  const yById = new Map<string, number>();

  for (const id of idsInOrder) {
    if (laneById.has(id)) {
      yById.set(id, START_Y + (laneById.get(id) ?? 0) * GAP_Y);
    }
  }

  for (const id of idsInOrder) {
    if (yById.has(id)) continue;
    const d = depth.get(id) ?? 0;
    const slot = errorStackInCol.get(d) ?? 0;
    errorStackInCol.set(d, slot + 1);
    yById.set(id, START_Y + errorBaseLane * GAP_Y + slot * ERROR_STACK_Y);
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
    nextCfg.__rfPos = finitePos(
      colX.get(d) ?? START_X,
      yById.get(step.id) ?? START_Y,
    );
    return { ...step, config: nextCfg };
  });
}
