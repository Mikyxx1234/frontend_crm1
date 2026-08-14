"use client";

import { useRouter } from "next/navigation";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { PipelineHeader } from "@/components/crm/pipeline-header";
import { StageRibbon } from "@/components/sales-hub/stage-ribbon";
import {
  pathForPipelineView,
  writePipelineViewPreference,
} from "@/lib/pipeline-view-preference";

function FlowSpinner({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[200px] flex-1 items-center justify-center py-8"
      aria-busy="true"
      aria-label={label}
    >
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * Chrome do Flow sem dados — ribbon + split com "…" e spinner.
 * Substitui o `PageLoading` genérico (4 cards) no hard refresh de
 * `/pipeline/flow`, no Suspense da page e no gate de sessão/board.
 */
export function FlowPendingShell() {
  const router = useRouter();

  return (
    <div
      className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4"
      style={{ gridTemplateRows: "1fr" }}
      aria-busy="true"
    >
      <NavRailSpacer />

      <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <PipelineHeader
          tabsOverride={<></>}
          activeView="flow"
          onViewChange={(view) => {
            writePipelineViewPreference(view);
            if (view === "flow") return;
            router.push(pathForPipelineView(view));
          }}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <StageRibbon
            stages={[]}
            totalDeals={0}
            selectedStageId={null}
            onSelectStage={() => {}}
            pending
          />

          <div className="grid min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3 md:grid-cols-[300px_minmax(0,1fr)_minmax(0px,0px)] md:grid-rows-1">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
              <header className="relative shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-strong)] px-3 py-2.5 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <h3 className="min-w-0 truncate font-display text-[14px] font-bold tracking-tight text-[var(--text-primary)]">
                      Todos
                    </h3>
                    <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1.5 font-display text-[11px] font-bold text-white">
                      …
                    </span>
                  </div>
                </div>
                <div
                  className="mt-1.5 h-[2px] w-full rounded-full bg-[var(--brand-primary)] opacity-90"
                  aria-hidden
                />
                <p className="mt-1.5 text-[11px] tabular-nums text-[var(--text-muted)]">
                  …
                </p>
              </header>
              <FlowSpinner label="Carregando fila" />
            </div>

            <div className="hidden min-h-0 min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md md:flex">
              <FlowSpinner label="Carregando conversa" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
