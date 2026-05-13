/** Tipos do painel Copilot de automações (sem runner no cliente). */

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
      op: "update_step_config";
      stepId: string;
      config: Record<string, unknown>;
      merge?: boolean;
    }
  | { op: "remove_step"; stepId: string }
  | {
      op: "connect";
      fromStepId: string;
      toStepId: string;
      handle:
        | "next"
        | "received"
        | "timeout"
        | "else"
        | `branch:${string}`
        | `button:${number}`;
    };

export type CopilotPatch = {
  summary: string;
  reasoning: string;
  ops: CopilotPatchOp[];
};
