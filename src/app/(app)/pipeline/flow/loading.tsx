import { FlowPendingShell } from "@/components/pipeline/flow-pending-shell";

/** Hard refresh de `/pipeline/flow` — chrome do Flow, não o PageLoading de 4 cards. */
export default function PipelineFlowLoading() {
  return <FlowPendingShell />;
}
