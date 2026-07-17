"use client";

/**
 * NodeInlineConfig — slot plugável que expande a edição inline dentro
 * dos cards de nodes do canvas de produção (workflow-canvas). Só
 * renderiza quando o node está `selected` e o `stepType` tem esquema
 * declarativo em STEP_FIELDS. Substitui o modal StepConfigPanel para
 * os tipos cobertos por editor-fields.
 */

import { NodeConfigEditor } from "./inline-editor";
import { STEP_FIELDS } from "./editor-fields";

type StepOpt = { value: string; label: string };

export function hasInlineEditor(stepType: string): boolean {
  return Boolean(STEP_FIELDS[stepType]);
}

export function NodeInlineConfig({
  selected,
  stepType,
  config,
  stepOptions,
  onChange,
}: {
  selected: boolean | undefined;
  stepType: string;
  config: Record<string, unknown> | undefined;
  stepOptions: StepOpt[];
  onChange: (next: Record<string, unknown>) => void;
}) {
  if (!selected) return null;
  if (!STEP_FIELDS[stepType]) return null;
  // Escopo `.ds-flow` isola os estilos `.n-config` / `.cfg-*` definidos
  // em flow-editor.css sem depender do wrapper externo (o canvas de
  // produção usa `.automation-editor`, não `.ds-flow`).
  return (
    <div className="ds-flow contents">
      <NodeConfigEditor
        stepType={stepType}
        config={config ?? {}}
        steps={stepOptions}
        onChange={onChange}
      />
    </div>
  );
}
