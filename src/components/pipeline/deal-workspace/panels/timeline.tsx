"use client";

import { TimelinePanel as LegacyTimelinePanel } from "@/components/pipeline/deal-detail/timeline-panel";
import { cn } from "@/lib/utils";

// Wrapper visual sobre o <TimelinePanel> existente (mantem a query +
// EVENT_CONFIG, troca apenas o frame externo pra combinar com o workspace).

type TimelinePanelProps = {
  dealId: string;
};

export function TimelinePanel({ dealId }: TimelinePanelProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-[var(--color-chat-bg)]", "[&>*]:bg-transparent")}>
      <LegacyTimelinePanel dealId={dealId} />
    </div>
  );
}
