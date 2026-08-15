"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";

import { listTableHeadRowClass, ListColumnLabel } from "@/components/crm/sortable-header";
import { useTeamUsersQuery } from "@/features/shared/queries/team-users";
import { TelephonyToggle } from "@/features/telephony/telephony-toggle";

import { listExtensions } from "../api/extensions";
import type { SipExtension } from "../api/types";

const GRID = "grid-cols-[minmax(0,1.6fr)_minmax(72px,0.8fr)_minmax(88px,0.7fr)_minmax(88px,auto)]";

function statusLabel(ext?: SipExtension) {
  if (!ext) return { text: "Não criado", cls: "text-[var(--text-muted)]" };
  if (ext.provisioningStep === "ACTIVE" && ext.telephonyEnabled) {
    return { text: "Ativo", cls: "text-[var(--color-success)]/80" };
  }
  if (ext.provisioningStep === "FAILED") {
    return { text: "Falhou", cls: "text-[var(--color-danger)]" };
  }
  if (ext.provisioningStep === "DISABLED" || ext.telephonyEnabled === false) {
    return { text: "Inativo", cls: "text-[var(--text-muted)]" };
  }
  if (ext.provisioningStep && ext.provisioningStep !== "IDLE") {
    return { text: "Provisionando", cls: "text-[var(--color-warning)]/80" };
  }
  return { text: "Sem ramal", cls: "text-[var(--text-muted)]" };
}

export function Api4ComUsersList() {
  const { data: users = [], isLoading: usersLoading } = useTeamUsersQuery<{
    id: string;
    name: string;
    email: string;
  }>();
  const { data: extensions, isLoading: extLoading } = useQuery({
    queryKey: ["sip-extensions"],
    queryFn: listExtensions,
  });

  const byUserId = useMemo(() => {
    const map = new Map<string, SipExtension>();
    for (const ext of extensions ?? []) map.set(ext.userId, ext);
    return map;
  }, [extensions]);

  if (usersLoading || extLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <IconLoader2 size={14} className="animate-spin" />
        Carregando usuários…
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        Nenhum usuário na organização. Crie a equipe em Configurações → Equipe.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className={listTableHeadRowClass(GRID)}>
        <ListColumnLabel>Usuário</ListColumnLabel>
        <ListColumnLabel>Ramal</ListColumnLabel>
        <ListColumnLabel>Status</ListColumnLabel>
        <ListColumnLabel>Telefonia</ListColumnLabel>
      </div>

      {users.map((user) => {
        const ext = byUserId.get(user.id);
        const st = statusLabel(ext);
        const ramal = ext?.authUser || ext?.sipUri || "—";
        return (
          <div
            key={user.id}
            className={`grid ${GRID} items-center gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3.5 py-2.5`}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{user.name}</p>
              <p className="truncate text-[11px] text-[var(--text-muted)]">{user.email}</p>
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[12px] text-[var(--text-primary)]">{ramal}</p>
              {ext?.sipUri && ext.authUser ? (
                <p className="truncate text-[11px] text-[var(--text-muted)]">{ext.sipUri}</p>
              ) : null}
            </div>
            <span className={`text-xs ${st.cls}`} title={ext?.provisioningError ?? undefined}>
              {st.text}
            </span>
            <div className="flex min-w-[88px] shrink-0 items-center">
              <TelephonyToggle userId={user.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
