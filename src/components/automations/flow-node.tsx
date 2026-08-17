"use client";

/**
 * FlowNode · referência Suave adaptada ao editor (@xyflow).
 * A produção usa FlowNodeShell + nós tipados; este módulo exporta
 * tipos e o rodapé/anatomia compartilhados.
 */
export type {
  FlowNodeType,
  FlowNodeAccent,
  FlowNodeShellProps,
  FlowNodeHeaderProps,
} from "./flow-node-shell";

export {
  FlowNodeShell as FlowNode,
  FlowNodeHeader,
  FlowNodeDeleteButton,
  FlowNodeStats,
} from "./flow-node-shell";

/** Tipo da saída: define a cor da porta e da conexão. */
export type OutputKind = "flow" | "error" | "cond";

export function portClass(kind: OutputKind): string {
  return `fx-port fx-port--${kind}`;
}

export function edgeClass(kind: OutputKind): string {
  return `fx-edge fx-edge--${kind}`;
}
