"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CircleCheck,
  LogIn,
  LogOut,
  Sparkles,
  Tag,
  UserPlus,
} from "lucide-react";

import { useTeamUsersQuery } from "@/features/shared/queries/team-users";
import { cn } from "@/lib/utils";

import {
  isGenericHumanEventActor,
  resolveEventActorLabel,
} from "./event-actor";
import type { ConversationEventAction } from "./types";

const ACTION_ICON: Record<ConversationEventAction, LucideIcon> = {
  distribuicao: UserPlus,
  transferencia: ArrowRightLeft,
  status: CircleCheck,
  tag: Tag,
  entrada: LogIn,
  saida: LogOut,
  ia: Sparkles,
};

export type EventRowProps = {
  action: ConversationEventAction;
  text: string;
  actor: string;
  /** User.id do agente — usado quando `actor` veio genérico ("Agente"). */
  actorId?: string | null;
  time: string;
  className?: string;
};

export function EventRow({
  action,
  text,
  actor,
  actorId,
  time,
  className,
}: EventRowProps) {
  const needsLookup = isGenericHumanEventActor(actor) && Boolean(actorId);
  const { data: teamUsers } = useTeamUsersQuery(needsLookup);
  const displayActor = useMemo(() => {
    const fromUser = actorId
      ? teamUsers?.find((u) => u.id === actorId)
      : undefined;
    return resolveEventActorLabel(actor, {
      name: fromUser?.name,
      email: fromUser?.email,
    });
  }, [actor, actorId, teamUsers]);
  const Icon = ACTION_ICON[action] ?? Sparkles;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 py-1.5 sm:gap-3",
        className,
      )}
    >
      <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
      <p
        className="flex min-w-0 max-w-[min(100%,36rem)] flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-xs text-muted-foreground"
        aria-label={text}
      >
        <Icon
          className="size-3.5 shrink-0 text-primary"
          strokeWidth={2}
          aria-hidden
        />
        <span className="text-foreground/80">{text}</span>
        {displayActor ? (
          <span className="text-muted-foreground">· {displayActor}</span>
        ) : null}
        {time ? (
          <time className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {time}
          </time>
        ) : null}
      </p>
      <span className="h-px min-w-4 flex-1 bg-border" aria-hidden />
    </div>
  );
}
