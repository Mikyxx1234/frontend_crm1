"use client";

import * as React from "react";
import { IconChevronDown, IconInfoCircle, IconLink, IconLayoutGrid, IconUser } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import { GlassCard } from "@/components/crm/glass-card";
import { InputGlass } from "@/components/crm/input-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
import {
  useAgentList,
  useSaveAgentPermissions,
  DEFAULT_PERMISSIONS,
  type AgentWithPermissions,
  type AgentPermissions,
} from "../hooks/use-agent-permissions";
import { useDepartments, type Department } from "../hooks/use-departments";

// ─── Channels hook (local) ────────────────────────────────────────────────────

type Channel = { id: string; name: string; type: string; provider: string };

function useChannels() {
  return useQuery<Channel[]>({
    queryKey: ["settings", "channels"],
    queryFn: async () => {
      const res = await fetch("/api/channels", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.channels) ? data.channels : [];
    },
    staleTime: 60_000,
  });
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 hover:bg-[var(--glass-bg-overlay)] transition-colors text-left"
      >
        {Icon && <Icon size={15} className="shrink-0 text-[var(--text-muted)]" />}
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">{title}</p>
          {subtitle && (
            <p className="font-body text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3.5 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function roleBadgeLabel(role: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "SUPERVISOR") return "Supervisor";
  return "Atendente";
}

// ─── Permission toggle row ────────────────────────────────────────────────────

function PermissionRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="mt-0.5 font-body text-[12px] text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      <SwitchGlass
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size="sm"
        aria-label={label}
      />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
    </p>
  );
}

// ─── Channel icon by type ─────────────────────────────────────────────────────

function ChannelTypeIcon({ type }: { type: string }) {
  const map: Record<string, string> = {
    WHATSAPP: "💬",
    INSTAGRAM: "📷",
    FACEBOOK: "📘",
    EMAIL: "✉️",
    WEBCHAT: "🌐",
  };
  return <span className="text-[13px]">{map[type] ?? "🔗"}</span>;
}

// ─── Checklist item ───────────────────────────────────────────────────────────

function ChecklistItem({
  label,
  sublabel,
  icon,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] py-1.5">
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        {sublabel && (
          <p className="truncate font-body text-[11px] text-[var(--text-muted)]">{sublabel}</p>
        )}
      </div>
      <SwitchGlass
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size="sm"
        aria-label={label}
      />
    </div>
  );
}

// ─── Right panel: permissions editor ─────────────────────────────────────────

function PermissionsPanel({ agent }: { agent: AgentWithPermissions }) {
  const isAdmin = agent.role === "ADMIN";
  const saved = agent.permissions ?? DEFAULT_PERMISSIONS;

  const [draft, setDraft] = React.useState<AgentPermissions>({ ...DEFAULT_PERMISSIONS, ...saved });

  const { data: channels = [] } = useChannels();
  const { data: departments = [] } = useDepartments();

  // Reset draft when agent changes
  React.useEffect(() => {
    setDraft({ ...DEFAULT_PERMISSIONS, ...saved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, agent.permissions]);

  const isDirty = React.useMemo(() => {
    const base = { ...DEFAULT_PERMISSIONS, ...saved };
    return JSON.stringify(draft) !== JSON.stringify(base);
  }, [draft, saved]);

  const saveMutation = useSaveAgentPermissions(agent.id);

  // ── Boolean toggle ──
  function toggle(key: keyof AgentPermissions) {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Connection scope helpers ──
  const limitConnections = draft.allowedConnectionIds.length > 0;

  function toggleLimitConnections() {
    if (limitConnections) {
      setDraft((prev) => ({ ...prev, allowedConnectionIds: [] }));
    } else {
      setDraft((prev) => ({ ...prev, allowedConnectionIds: channels.map((c) => c.id) }));
    }
  }

  function toggleConnectionId(id: string) {
    setDraft((prev) => {
      const ids = prev.allowedConnectionIds;
      const next = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
      return { ...prev, allowedConnectionIds: next };
    });
  }

  // ── Department scope helpers ──
  const limitDepartments = draft.allowedDepartmentIds.length > 0;

  function toggleLimitDepartments() {
    if (limitDepartments) {
      setDraft((prev) => ({ ...prev, allowedDepartmentIds: [] }));
    } else {
      setDraft((prev) => ({ ...prev, allowedDepartmentIds: departments.map((d: Department) => d.id) }));
    }
  }

  function toggleDepartmentId(id: string) {
    setDraft((prev) => {
      const ids = prev.allowedDepartmentIds;
      const next = ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
      return { ...prev, allowedDepartmentIds: next };
    });
  }

  function handleSave() {
    saveMutation.mutate(draft, {
      onSuccess: () => { /* isDirty auto-updates via useEffect */ },
    });
  }

  return (
    <GlassCard variant="panel" className="flex h-full flex-col overflow-hidden">
      {/* Agent header */}
      <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)]/12 font-display text-[14px] font-bold text-[var(--brand-primary)]">
            {getInitials(agent.name)}
          </div>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--glass-bg-panel)]",
              agent.isOnline ? "bg-[var(--color-success,#22c55e)]" : "bg-[var(--text-muted)]",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
            {agent.name}
          </p>
          <p className="truncate font-body text-[12px] text-[var(--text-muted)]">{agent.email}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2 py-0.5 font-display text-[11px] font-semibold text-[var(--text-secondary)]">
          {roleBadgeLabel(agent.role)}
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Admin alert */}
        {isAdmin && (
          <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/8 px-3.5 py-3">
            <IconInfoCircle size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />
            <p className="font-body text-[12.5px] text-[var(--brand-primary)]">
              Permissões não são aplicadas a administradores
            </p>
          </div>
        )}

        {/* Visualização */}
        <div className="mb-4">
          <SectionHeader>Visualização do atendente</SectionHeader>
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            <PermissionRow
              label="Ver conversas de outros atendentes"
              description="Permite visualizar conversas atribuídas a outros"
              checked={draft.canViewOtherAgentsConversations}
              onChange={() => toggle("canViewOtherAgentsConversations")}
              disabled={isAdmin}
            />
            <PermissionRow
              label="Ocultar conversas sem atendente"
              description="Não permite ver conversas que não possuem atendente"
              checked={draft.disableConversationsWithoutAgent}
              onChange={() => toggle("disableConversationsWithoutAgent")}
              disabled={isAdmin}
            />
          </div>
        </div>

        {/* Ações permitidas */}
        <div className="mb-4">
          <SectionHeader>Ações permitidas</SectionHeader>
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            <PermissionRow
              label="Transferir conversa"
              checked={draft.canTransferConversation}
              onChange={() => toggle("canTransferConversation")}
              disabled={isAdmin}
            />
            <PermissionRow
              label="Fechar / resolver conversa"
              checked={draft.canCloseConversation}
              onChange={() => toggle("canCloseConversation")}
              disabled={isAdmin}
            />
            <PermissionRow
              label="Excluir conversa"
              checked={draft.canDeleteConversation}
              onChange={() => toggle("canDeleteConversation")}
              disabled={isAdmin}
            />
            <PermissionRow
              label="Gerenciar mensagens rápidas"
              checked={draft.canManageQuickMessages}
              onChange={() => toggle("canManageQuickMessages")}
              disabled={isAdmin}
            />
          </div>
        </div>

        {/* Conexões */}
        <div className="mb-4">
          <SectionHeader>Conexões</SectionHeader>
          <CollapsibleSection
            title="Veja as permissões por conexão"
            subtitle={limitConnections ? `${draft.allowedConnectionIds.length} de ${channels.length} ativas` : "Acesso a todas as conexões"}
            icon={IconLink}
            defaultOpen={limitConnections}
          >
            <div className="mb-3">
              <ChecklistItem
                label="Limitar acesso por conexões específicas"
                sublabel="O atendente terá acesso apenas às conexões habilitadas"
                checked={limitConnections}
                onChange={toggleLimitConnections}
                disabled={isAdmin}
              />
            </div>
            {limitConnections && channels.length > 0 && (
              <div className="divide-y divide-[var(--glass-border-subtle)]">
                {channels.map((ch) => (
                  <ChecklistItem
                    key={ch.id}
                    label={ch.name}
                    sublabel={ch.type}
                    icon={<ChannelTypeIcon type={ch.type} />}
                    checked={draft.allowedConnectionIds.includes(ch.id)}
                    onChange={() => toggleConnectionId(ch.id)}
                    disabled={isAdmin}
                  />
                ))}
              </div>
            )}
            {limitConnections && channels.length === 0 && (
              <p className="pt-1 font-body text-[12px] text-[var(--text-muted)]">
                Nenhuma conexão disponível.
              </p>
            )}
          </CollapsibleSection>
        </div>

        {/* Departamentos */}
        <div>
          <SectionHeader>Departamentos</SectionHeader>
          <CollapsibleSection
            title="Veja os departamentos que o atendente tem acesso"
            subtitle={limitDepartments ? `${draft.allowedDepartmentIds.length} de ${departments.length} ativos` : "Acesso a todos os departamentos"}
            icon={IconLayoutGrid}
            defaultOpen={limitDepartments}
          >
            <div className="mb-3">
              <ChecklistItem
                label="Limitar acesso por departamentos específicos"
                sublabel="O atendente terá acesso apenas aos departamentos habilitados"
                checked={limitDepartments}
                onChange={toggleLimitDepartments}
                disabled={isAdmin}
              />
            </div>
            {limitDepartments && departments.length > 0 && (
              <div className="divide-y divide-[var(--glass-border-subtle)]">
                {departments.map((dept: Department) => (
                  <ChecklistItem
                    key={dept.id}
                    label={dept.name}
                    icon={
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[11px]"
                        style={{ backgroundColor: dept.color + "33" }}
                      >
                        {dept.icon ?? "🏢"}
                      </span>
                    }
                    checked={draft.allowedDepartmentIds.includes(dept.id)}
                    onChange={() => toggleDepartmentId(dept.id)}
                    disabled={isAdmin}
                  />
                ))}
              </div>
            )}
            {limitDepartments && departments.length === 0 && (
              <p className="pt-1 font-body text-[12px] text-[var(--text-muted)]">
                Nenhum departamento cadastrado.
              </p>
            )}
          </CollapsibleSection>
        </div>
      </div>

      {/* Save button */}
      <div className="border-t border-[var(--glass-border-subtle)] px-5 py-3">
        <ButtonGlass
          variant="primary"
          disabled={!isDirty || saveMutation.isPending || isAdmin}
          onClick={handleSave}
          className="w-full justify-center"
        >
          {saveMutation.isPending ? "Salvando…" : "Salvar permissões"}
        </ButtonGlass>
      </div>
    </GlassCard>
  );
}

// ─── Agent list item ──────────────────────────────────────────────────────────

function AgentListItem({
  agent,
  isSelected,
  onClick,
}: {
  agent: AgentWithPermissions;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors",
        isSelected
          ? "bg-[var(--brand-primary)]/12 ring-1 ring-[var(--brand-primary)]/30"
          : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full font-display text-[12px] font-bold",
            isSelected
              ? "bg-[var(--brand-primary)] text-white"
              : "bg-[var(--glass-bg-strong)] text-[var(--text-secondary)]",
          )}
        >
          {getInitials(agent.name)}
        </div>
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[var(--glass-bg-panel)]",
            agent.isOnline ? "bg-[var(--color-success,#22c55e)]" : "bg-[var(--text-muted)]",
          )}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-display text-[13px] font-semibold",
            isSelected ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]",
          )}
        >
          {agent.name}
        </p>
        <p className="truncate font-body text-[11.5px] text-[var(--text-muted)]">{agent.email}</p>
      </div>

      {/* Role badge */}
      <span className="shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-1.5 py-0.5 font-display text-[10px] font-semibold text-[var(--text-muted)]">
        {roleBadgeLabel(agent.role)}
      </span>
    </button>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)]"
        />
      ))}
    </div>
  );
}

function SkeletonPanel() {
  return (
    <GlassCard variant="panel" className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--glass-bg-strong)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--glass-bg-strong)]" />
          <div className="h-3 w-48 animate-pulse rounded bg-[var(--glass-bg-strong)]" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-strong)]"
          />
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentsTab() {
  const { data: agents = [], isLoading, isError, error } = useAgentList();
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return agents;
    return agents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );
  }, [agents, search]);

  const selectedAgent = React.useMemo(
    () => agents.find((a) => a.id === selectedId) ?? null,
    [agents, selectedId],
  );

  if (isError) {
    return (
      <GlassCard variant="panel" className="flex flex-col items-center gap-3 py-16 text-center">
        <IconUser size={36} className="text-[var(--text-muted)] opacity-40" />
        <p className="font-display text-sm font-semibold text-[var(--text-muted)]">
          Erro ao carregar atendentes
        </p>
        <p className="max-w-xs font-body text-[12.5px] text-[var(--text-muted)]">
          {(error as Error)?.message ?? "Tente novamente mais tarde."}
        </p>
      </GlassCard>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
      {/* ── Left panel: agent list ── */}
      <GlassCard variant="panel" className="flex flex-col overflow-hidden">
        {/* Search */}
        <div className="border-b border-[var(--glass-border-subtle)] p-3">
          <InputGlass
            withSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar atendente…"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <IconUser size={28} className="text-[var(--text-muted)] opacity-40" />
            <p className="font-display text-[12.5px] font-semibold text-[var(--text-muted)]">
              {search ? "Nenhum atendente encontrado" : "Nenhum atendente cadastrado"}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-0.5">
              {filtered.map((agent) => (
                <AgentListItem
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedId === agent.id}
                  onClick={() => setSelectedId(agent.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Count */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-[var(--glass-border-subtle)] px-4 py-2">
            <p className="font-display text-[11px] text-[var(--text-muted)]">
              {filtered.length} atendente{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </GlassCard>

      {/* ── Right panel: permissions ── */}
      {isLoading ? (
        <SkeletonPanel />
      ) : selectedAgent ? (
        <PermissionsPanel key={selectedAgent.id} agent={selectedAgent} />
      ) : (
        <GlassCard
          variant="panel"
          className="flex flex-col items-center justify-center gap-2 py-16 text-center"
        >
          <IconUser size={36} className="text-[var(--text-muted)] opacity-40" />
          <p className="font-body text-[13px] text-[var(--text-muted)]">
            Selecione um atendente para configurar suas permissões.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
