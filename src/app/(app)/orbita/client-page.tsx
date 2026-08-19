"use client";

import type { ReactNode } from "react";
import { IconMessages } from "@tabler/icons-react";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { PageHeader } from "@/components/crm/page-header";
import { TeamChatApp } from "@/features/team-chat/team-chat-app";

export default function OrbitaClientPage({
  navRail,
}: {
  navRail?: ReactNode;
} = {}) {
  return (
    <div className="v2-screen grid h-full min-h-0 min-w-0 grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRailSpacer />}
      <main className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconMessages size={22} stroke={2.2} />}
          title="Órbita"
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow)] backdrop-blur-md">
          <TeamChatApp />
        </div>
      </main>
    </div>
  );
}
