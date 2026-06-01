"use client";

import OldPipelinePage from "@/app/old/settings/pipeline/client-page";
import { SettingsV2Shell } from "../_v2-shell";

export default function PipelineV2ClientPage() {
  return (
    <SettingsV2Shell
      title="Pipeline"
      description="Estágios do funil e regras de transição"
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-1 backdrop-blur-md">
        <OldPipelinePage />
      </div>
    </SettingsV2Shell>
  );
}
