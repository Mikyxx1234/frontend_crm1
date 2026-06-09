"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Radio, Shield, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useEffectivePermissions } from "./hooks";

interface UserPermissionsViewProps {
  userId: string;
  userName?: string;
  userEmail?: string;
}

export function UserPermissionsView({ userId, userName, userEmail }: UserPermissionsViewProps) {
  const { data, isLoading, error } = useEffectivePermissions(userId);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-4 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Não foi possível carregar as permissões.
      </p>
    );
  }

  const hasFullAccess = data.permissions.includes("*");

  // Agrupar permissions por resource
  const grouped = new Map<string, string[]>();
  if (hasFullAccess) {
    grouped.set("acesso", ["total (*)"]);
  } else {
    for (const key of data.permissions) {
      const [resource, action] = key.split(":");
      if (!grouped.has(resource)) grouped.set(resource, []);
      grouped.get(resource)!.push(action);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Usuário */}
      {(userName ?? userEmail) && (
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {userName}
          </p>
          {userEmail && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{userEmail}</p>
          )}
        </div>
      )}

      {/* Roles diretas */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Shield className="size-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Roles
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.roles.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhum role atribuído</span>
          ) : (
            data.roles.map((r) => (
              <Badge key={r.id} variant="outline" className="text-xs">
                {r.name}
                {r.systemPreset && (
                  <span className="ml-1 opacity-60">· sistema</span>
                )}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Grupos */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Grupos
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.groups.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sem grupos</span>
          ) : (
            data.groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="text-xs">
                {g.name}
                {(g.channelGrants.length > 0 || g.stageGrants.length > 0) && (
                  <span className="ml-1.5 opacity-70">
                    {[
                      g.channelGrants.length > 0 && g.channelGrants.join(", "),
                      g.stageGrants.length > 0 && `${g.stageGrants.length} fase(s)`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Canais efetivos */}
      {data.channelGrants.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Radio className="size-3.5" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Canais permitidos
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.channelGrants.map((c) => (
              <Badge key={c} variant="outline" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Permissões efetivas (colapsável) */}
      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <button
          type="button"
          onClick={() => setPermissionsOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--glass-bg-overlay)]"
        >
          {permissionsOpen ? (
            <ChevronDown className="size-3.5" style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight className="size-3.5" style={{ color: "var(--text-muted)" }} />
          )}
          <span className="flex-1 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Permissões efetivas ({data.permissions.length})
          </span>
        </button>

        {permissionsOpen && (
          <div className="border-t px-4 pb-3 pt-2" style={{ borderColor: "var(--glass-border-subtle)" }}>
            {grouped.size === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Nenhuma permissão</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Array.from(grouped.entries()).map(([resource, actions]) => (
                  <div key={resource} className="flex gap-2">
                    <span
                      className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {resource}
                    </span>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {actions.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
