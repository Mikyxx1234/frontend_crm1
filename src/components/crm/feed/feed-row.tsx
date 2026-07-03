"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IconRobot as Bot, IconHierarchy as Workflow, IconWebhook as Webhook, IconUser as UserIcon, IconSettings as Cog } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
  EVENT_CONFIG,
  FALLBACK_CONFIG,
  actorDisplay,
  eventDescription,
  type FeedEvent,
} from "./event-config";

type FeedRowProps = {
  event: FeedEvent;
  /// Quando true, desenha o "trilho" vertical conectando o icone ao
  /// proximo item (usado em listas agrupadas por dia).
  withRail?: boolean;
  /// Indica que o evento e o ultimo do grupo (sem trilho descendente).
  isLast?: boolean;
  /// Quando true, esconde o snippet do sujeito (entityLabel) — util
  /// quando o feed ja esta filtrado por uma entidade especifica
  /// (timeline de deal/contato).
  hideSubject?: boolean;
  /// Quando provido, transforma a linha em link clicavel (ex.: timeline
  /// global -> abrir o deal/contato relacionado).
  href?: string;
};

function ActorBadge({
  type,
}: {
  type: "HUMAN" | "AI" | "AUTOMATION" | "INTEGRATION" | "SYSTEM";
}) {
  const map = {
    HUMAN: { Icon: UserIcon, cls: "bg-[var(--glass-bg-base)] text-[var(--text-secondary)] dark:bg-[var(--glass-bg-base)] dark:text-slate-200" },
    AI: { Icon: Bot, cls: "bg-[var(--color-fuchsia-soft)] text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300" },
    AUTOMATION: {
      Icon: Workflow,
      cls: "bg-[var(--color-lavender-soft)] text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    },
    INTEGRATION: {
      Icon: Webhook,
      cls: "bg-[var(--color-cyan-soft)] text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
    },
    SYSTEM: { Icon: Cog, cls: "bg-[var(--glass-bg-base)] text-[var(--text-secondary)] dark:bg-gray-900 dark:text-[var(--text-muted)]" },
  } as const;
  const { Icon, cls } = map[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-medium",
        cls,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
    </span>
  );
}

export function FeedRow({
  event,
  withRail = true,
  isLast = false,
  hideSubject = false,
  href,
}: FeedRowProps) {
  const cfg = EVENT_CONFIG[event.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.Icon;
  const desc = eventDescription(event);
  const at = parseISO(event.occurredAt);
  const actor = actorDisplay(event);

  const body = (
    <>
      <div className="relative z-1 flex shrink-0 flex-col items-center">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background",
            cfg.bg,
            cfg.ring,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        {withRail && !isLast && (
          <span
            className="absolute top-9 left-1/2 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 bg-border"
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium">{cfg.label}</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {format(at, "HH:mm", { locale: ptBR })}
          </span>
        </div>
        {desc && (
          <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{desc}</p>
        )}
        {!hideSubject && event.entityLabel && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
            <span className="opacity-60">em </span>
            <span className="font-medium">{event.entityLabel}</span>
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <ActorBadge type={actor.type} />
          <span>por {actor.label}</span>
          {actor.sublabel && (
            <span className="text-muted-foreground/70">• {actor.sublabel}</span>
          )}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <li className="relative">
        <Link
          href={href}
          className="flex gap-3 pb-6 last:pb-0 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
        >
          {body}
        </Link>
      </li>
    );
  }

  return <li className="relative flex gap-3 pb-6 last:pb-0">{body}</li>;
}
