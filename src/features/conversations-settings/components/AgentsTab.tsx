"use client";

import * as React from "react";
import { IconInfoCircle, IconUser } from "@tabler/icons-react";
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

// ─── Right panel: permissions editor ─────────────────────────────────────────

function PermissionsPanel({ agent }: { agent: AgentWithPermissions }) {
  const isAdmin = agent.role === "ADMIN";
  const saved = agent.permissions ?? DEFAULT_PERMISSIONS;

  const [draft, setDraft] = React.useState<AgentPermissions>({ ...DEFAULT_PERMISSIONS, ...saved });
  const [isDirty, setIsDirty] = React.useState(false);

  // Reset draft when agent changes
  React.useEffect(() => {
    const base = { ...DEFAULT_PERMISSIONS, ...saved };
    setDraft(base);
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id, agent.permissions]);

  const saveMutation = useSaveAgentPermissions(agent.id);

  function toggle(key: keyof AgentPermissions) {
    setDraft((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const baseResolved = { ...DEFAULT_PERMISSIONS, ...saved };
      const dirty = (Object.keys(updated) as (keyof AgentPermissions)[]).some(
        (k) => JSON.stringify(updated[k]) !== JSON.stringify(baseResolved[k]),
      );
      setIsDirty(dirty);
      return updated;
    });
  }

  function handleSave() {
    saveMutation.mutate(draft, {
      onSuccess: () => setIsDirty(false),
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
          <SectionHeader>Visualização</SectionHeader>
          <div className="divide-y divide-[var(--glass-border-subtle)]">
            <PermissionRow
              label="Ver conversas de outros atendentes"
              checked={draft.canViewOtherAgentsConversations}
              onChange={() => toggle("canViewOtherAgentsConversations")}
              disabled={isAdmin}
            />
            <PermissionRow
              label="Ocultar conversas sem atendente"
              checked={draft.disableConversationsWithoutAgent}
              onChange={() => toggle("disableConversationsWithoutAgent")}
              disabled={isAdmin}
            />
          </div>
        </div>

        {/* Ações permitidas */}
        <div>
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
