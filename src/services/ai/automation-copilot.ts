/**
 * Stub no frontend. Tipos do Copilot de Automações usados pelo painel UI
 * (`src/components/automations/copilot-panel.tsx`) e pelo aplicador de
 * patches (`src/lib/automation-copilot-patch.ts`).
 *
 * A lógica real (chamadas Anthropic, ferramentas de auditoria) vive no
 * backend em `crm-backend/src/services/ai/automation-copilot.ts`.
 */

export type CopilotPatchOp =
  | {
      op: "add_step";
      step: { id?: string; type: string; config: Record<string, unknown> };
      after?: string;
      afterHandle?:
        | "next"
        | "received"
        | "timeout"
        | "else"
        | `branch:${string}`
        | `button:${number}`;
    }
  | {
      op: "remove_step";
      stepId: string;
    }
  | {
      op: "update_step_config";
      stepId: string;
      config: Record<string, unknown>;
      /** false = substitui o config; default merge. */
      merge?: boolean;
    }
  | {
      op: "connect";
      fromStepId: string;
      toStepId: string;
      handle?:
        | "next"
        | "received"
        | "timeout"
        | "else"
        | `branch:${string}`
        | `button:${number}`;
    }
  | {
      op: "disconnect";
      fromStepId: string;
      toStepId: string;
    };

export type CopilotPatch = {
  summary: string;
  reasoning: string;
  ops: CopilotPatchOp[];
};
