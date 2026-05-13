"use client";

import * as React from "react";
import {
  Responsive as ResponsiveReactGridLayout,
  WidthProvider,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import {
  useDashboardStore,
  WIDGET_REGISTRY,
  type GridItem,
  type WidgetId,
} from "@/stores/dashboard-store";
import { WidgetCard } from "./widget-card";

import { RevenueWidget } from "./widgets/revenue-widget";
import { ConversionWidget } from "./widgets/conversion-widget";
import { FunnelWidget } from "./widgets/funnel-widget";
import { LossesWidget } from "./widgets/losses-widget";
import { ActivitiesWidget } from "./widgets/activities-widget";
import { PipelineWidget } from "./widgets/pipeline-widget";
import { SourcesWidget } from "./widgets/sources-widget";
import { StageRankingWidget } from "./widgets/stage-ranking-widget";
import { TeamWidget } from "./widgets/team-widget";
import { QueueByChannelWidget } from "./widgets/queue-by-channel-widget";
import { SlaBreachesWidget } from "./widgets/sla-breaches-widget";
import { AvgResponseTimeWidget } from "./widgets/avg-response-time-widget";
import { MessageVolumeWidget } from "./widgets/message-volume-widget";
import { ConversationsByStatusWidget } from "./widgets/conversations-by-status-widget";
import { ChannelHealthWidget } from "./widgets/channel-health-widget";
import { AgentsOnlineWidget } from "./widgets/agents-online-widget";

// A partir do RGL 2.x, `WidthProvider` e o wrapper legado `Responsive`
// vivem em `react-grid-layout/legacy`. O entrypoint raiz agora expõe um
// hook (`useContainerWidth`), então continuar importando de lá gera
// `WidthProvider is not a function` em runtime.
const ResponsiveGrid = WidthProvider(ResponsiveReactGridLayout);

const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType> = {
  revenue: RevenueWidget,
  conversion: ConversionWidget,
  funnel: FunnelWidget,
  stageRanking: StageRankingWidget,
  losses: LossesWidget,
  activities: ActivitiesWidget,
  pipeline: PipelineWidget,
  sources: SourcesWidget,
  team: TeamWidget,
  queueByChannel: QueueByChannelWidget,
  slaBreaches: SlaBreachesWidget,
  avgResponseTime: AvgResponseTimeWidget,
  messageVolume: MessageVolumeWidget,
  conversationsByStatus: ConversationsByStatusWidget,
  channelHealth: ChannelHealthWidget,
  agentsOnline: AgentsOnlineWidget,
};

function layoutToGridItems(items: Layout): GridItem[] {
  const out: GridItem[] = [];
  for (const it of items) {
    if (!(it.i in WIDGET_REGISTRY)) continue;
    out.push({
      i: it.i as WidgetId,
      x: it.x,
      y: it.y,
      w: it.w,
      h: it.h,
    });
  }
  return out;
}

type Props = {
  /** Modo edição liga drag/resize + handles visuais; desligado vira só display. */
  editing?: boolean;
  /** Altura de cada linha da grade. Padrão 72; mais denso = menor. */
  rowHeight?: number;
  className?: string;
};

export function WidgetGrid({ editing = false, rowHeight = 72, className }: Props) {
  const layout = useDashboardStore((s) => s.layout);
  const visibleWidgets = useDashboardStore((s) => s.visibleWidgets);
  const applyGridLayout = useDashboardStore((s) => s.applyGridLayout);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);

  const gridItems = React.useMemo(() => {
    const out: GridItem[] = [];
    for (const id of visibleWidgets) {
      const item = layout[id];
      if (!item) continue;
      out.push(item);
    }
    return out;
  }, [layout, visibleWidgets]);

  const rglLayouts = React.useMemo<ResponsiveLayouts>(() => {
    const items: LayoutItem[] = gridItems.map((g) => ({
      i: g.i,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      minW: g.minW,
      minH: g.minH,
      maxW: g.maxW,
      maxH: g.maxH,
    }));
    return { lg: items, md: items, sm: items, xs: items, xxs: items };
  }, [gridItems]);

  const handleLayoutChange = React.useCallback(
    (current: Layout, allLayouts: ResponsiveLayouts) => {
      // Usa o breakpoint "lg" como canônico — as posições que o usuário
      // ajusta em telas grandes replicam nos demais.
      const canonical = allLayouts.lg ?? current;
      const next = layoutToGridItems(canonical);
      if (next.length === 0) return;
      applyGridLayout(next);
    },
    [applyGridLayout],
  );

  if (gridItems.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Nenhum widget ativo</p>
          <p className="text-xs text-muted-foreground">
            Use o botão “+ Widget” para adicionar métricas ao seu dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveGrid
        className={editing ? "rgl-editing" : ""}
        layouts={rglLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 2 }}
        rowHeight={rowHeight}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".widget-drag-handle"
        onLayoutChange={handleLayoutChange}
        compactType="vertical"
        preventCollision={false}
      >
        {gridItems.map((g) => {
          const Component = WIDGET_COMPONENTS[g.i];
          const def = WIDGET_REGISTRY[g.i];
          if (!Component || !def) return <div key={g.i} />;
          return (
            <div key={g.i} className="h-full">
              <WidgetCard
                title={def.label}
                editing={editing}
                onRemove={() => toggleWidget(g.i)}
                className="h-full"
              >
                <Component />
              </WidgetCard>
            </div>
          );
        })}
      </ResponsiveGrid>
    </div>
  );
}
