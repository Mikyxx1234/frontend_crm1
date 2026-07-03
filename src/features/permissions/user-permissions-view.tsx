"use client";

import { useEffect, useMemo, useState } from "react";
import { IconBan as Ban, IconChevronDown as ChevronDown, IconChevronRight as ChevronRight, IconEye as Eye, IconLoader2 as Loader2, IconMessagePlus as MessageSquarePlus, IconPlus as Plus, IconRadio as Radio, IconSend as Send, IconSettings as Settings, IconShield as Shield, IconUsers as Users, IconHierarchy as Workflow, IconX as X } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { cn } from "@/lib/utils";

import {
  useAddRoleAssignment,
  useEffectivePermissions,
  useRemoveRoleAssignment,
  useRoles,
  useScopeChannelOptions,
  useScopePipelineOptions,
  useUpdateUserScopeGrants,
  useUserScopeGrants,
  type ScopeEntityOption,
} from "./hooks";

interface UserPermissionsViewProps {
  userId: string;
  userName?: string;
  userEmail?: string;
  /**
   * Quando true, exibe o editor inline de roles (botão remover ao lado de
   * cada role + dropdown pra adicionar nova). Quando false (default),
   * a sheet fica somente leitura — preserva o uso histórico do componente.
   * O backend (`POST/DELETE /api/roles/[id]/assignments`) só exige
   * `settings:permissions`, então quem tem acesso a `/settings/permissions`
   * já tem acesso ao editor.
   */
  editable?: boolean;
}

export function UserPermissionsView({
  userId,
  userName,
  userEmail,
  editable = false,
}: UserPermissionsViewProps) {
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

      {/* Roles diretas — read-only ou com editor inline conforme `editable` */}
      {editable ? (
        <UserRolesEditor
          userId={userId}
          currentRoles={data.roles}
        />
      ) : (
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
      )}

      {/* Acesso a funis e canais (escopo por usuário) */}
      {editable && <UserScopeEditor userId={userId} />}

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

/* ── UserRolesEditor ─────────────────────────────────────────────────────── */

/**
 * Editor inline das roles atribuídas ao usuário. Renderizado dentro da
 * `UserPermissionsView` quando `editable=true`.
 *
 * Modelo: lista as roles atuais como `Badge`s removíveis (× ao lado de
 * cada uma) e oferece um `<select>` com as roles ainda não atribuídas +
 * botão "Adicionar". Cada mutação invalida `effective-permissions` e
 * `my-permissions` no React Query (ver hooks) — UI reflete sem F5.
 *
 * Erros: capturados localmente e exibidos como linha curta vermelha
 * abaixo do editor (sem toast — sheet é compacta, evita ruído).
 */
function UserRolesEditor({
  userId,
  currentRoles,
}: {
  userId: string;
  currentRoles: { id: string; name: string; systemPreset: string | null }[];
}) {
  const { data: allRoles = [], isLoading: rolesLoading } = useRoles();
  const addAssignment = useAddRoleAssignment();
  const removeAssignment = useRemoveRoleAssignment();

  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentRoleIds = useMemo(
    () => new Set(currentRoles.map((r) => r.id)),
    [currentRoles],
  );
  const availableRoles = useMemo(
    () => allRoles.filter((r) => !currentRoleIds.has(r.id)),
    [allRoles, currentRoleIds],
  );

  async function handleAdd() {
    if (!selectedToAdd) return;
    setError(null);
    try {
      await addAssignment.mutateAsync({ roleId: selectedToAdd, userId });
      setSelectedToAdd("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atribuir role.");
    }
  }

  async function handleRemove(roleId: string) {
    setError(null);
    try {
      await removeAssignment.mutateAsync({ roleId, userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover role.");
    }
  }

  const adding = addAssignment.isPending;
  const removingRoleId = removeAssignment.isPending
    ? removeAssignment.variables?.roleId
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Shield className="size-3.5" style={{ color: "var(--text-muted)" }} />
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          Roles
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {currentRoles.length === 0 ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Nenhuma role atribuída
          </span>
        ) : (
          currentRoles.map((r) => {
            const isRemoving = removingRoleId === r.id;
            return (
              <Badge
                key={r.id}
                variant="outline"
                className="gap-1 pr-1 text-xs"
              >
                <span>{r.name}</span>
                {r.systemPreset && (
                  <span className="opacity-60">· sistema</span>
                )}
                <button
                  type="button"
                  onClick={() => void handleRemove(r.id)}
                  disabled={isRemoving}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--glass-bg-strong)] disabled:opacity-50"
                  title={`Remover role "${r.name}"`}
                  aria-label={`Remover role ${r.name}`}
                >
                  {isRemoving ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <X className="size-3" />
                  )}
                </button>
              </Badge>
            );
          })
        )}
      </div>

      {/* Adicionar role nova */}
      <div className="mt-1 flex items-center gap-2">
        <DropdownGlass
          options={availableRoles.map((r) => ({
            value: r.id,
            label: `${r.name}${r.systemPreset ? " · sistema" : ""}`,
          }))}
          value={selectedToAdd || undefined}
          onValueChange={setSelectedToAdd}
          placeholder={
            rolesLoading
              ? "Carregando roles..."
              : availableRoles.length === 0
                ? "Todas as roles já atribuídas"
                : "Atribuir role..."
          }
          disabled={rolesLoading || availableRoles.length === 0 || adding}
          triggerClassName="h-7 flex-1 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleAdd()}
          disabled={!selectedToAdd || adding}
          className="h-7 shrink-0 gap-1 text-[11px]"
        >
          {adding ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          Adicionar
        </Button>
      </div>

      {error && (
        <p className="text-[11px] text-red-600">{error}</p>
      )}
    </div>
  );
}

/* ── UserScopeEditor ─────────────────────────────────────────────────────── */

/** `["*"]` salvo no backend equivale a "todos" → tratamos como `null` na UI. */
export function normalizeScope(value: string[] | null | undefined): string[] | null {
  if (!value) return null;
  if (value.includes("*")) return null;
  return value;
}

/**
 * Editor de escopo por usuário: define a quais funis o usuário tem acesso e
 * em quais canais pode ver / enviar mensagens. Persiste em
 * `permissions.scope.grants.v1` via `PUT /api/users/[id]/scope-grants`.
 *
 * `null` = sem restrição (todos). Só tem efeito real quando a flag
 * `rbac_granular_scope_v1` está ativa na org (enforcement no backend).
 */
function UserScopeEditor({ userId }: { userId: string }) {
  const { data, isLoading } = useUserScopeGrants(userId);
  const pipelines = useScopePipelineOptions();
  const channels = useScopeChannelOptions();
  const update = useUpdateUserScopeGrants(userId);

  const [pipelineIds, setPipelineIds] = useState<string[] | null>(null);
  const [channelViewIds, setChannelViewIds] = useState<string[] | null>(null);
  const [channelSendIds, setChannelSendIds] = useState<string[] | null>(null);
  const [channelInitiateIds, setChannelInitiateIds] = useState<string[] | null>(null);
  const [channelManageIds, setChannelManageIds] = useState<string[] | null>(null);
  const [channelDenyIds, setChannelDenyIds] = useState<string[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPipelineIds(normalizeScope(data.pipelineIds));
    setChannelViewIds(normalizeScope(data.channelViewIds));
    setChannelSendIds(normalizeScope(data.channelSendIds));
    setChannelInitiateIds(normalizeScope(data.channelInitiateIds));
    setChannelManageIds(normalizeScope(data.channelManageIds));
    setChannelDenyIds(normalizeScope(data.channelDenyIds));
    setDirty(false);
  }, [data]);

  const markDirty = (setter: (v: string[] | null) => void) => (v: string[] | null) => {
    setter(v);
    setDirty(true);
    setSaved(false);
  };

  async function handleSave() {
    setError(null);
    try {
      await update.mutateAsync({
        pipelineIds,
        channelViewIds,
        channelSendIds,
        channelInitiateIds,
        channelManageIds,
        channelDenyIds,
      });
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar acesso.");
    }
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border p-3"
      style={{ borderColor: "var(--glass-border)" }}
    >
      <div className="flex items-center gap-1.5">
        <Workflow className="size-3.5" style={{ color: "var(--text-muted)" }} />
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          Acesso a funis e canais
        </span>
      </div>

      <ScopeMultiSelect
        label="Funis com acesso"
        icon={<Workflow className="size-3" style={{ color: "var(--text-muted)" }} />}
        options={pipelines.data ?? []}
        value={pipelineIds}
        onChange={markDirty(setPipelineIds)}
        loading={isLoading || pipelines.isLoading}
        allLabel="Todos os funis"
      />

      <ScopeMultiSelect
        label="Canais — ver mensagens"
        icon={<Eye className="size-3" style={{ color: "var(--text-muted)" }} />}
        options={channels.data ?? []}
        value={channelViewIds}
        onChange={markDirty(setChannelViewIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais — responder mensagens"
        icon={<Send className="size-3" style={{ color: "var(--text-muted)" }} />}
        options={channels.data ?? []}
        value={channelSendIds}
        onChange={markDirty(setChannelSendIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais — iniciar nova conversa"
        icon={<MessageSquarePlus className="size-3" style={{ color: "var(--text-muted)" }} />}
        options={channels.data ?? []}
        value={channelInitiateIds}
        onChange={markDirty(setChannelInitiateIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais — administrar (configurar/conectar)"
        icon={<Settings className="size-3" style={{ color: "var(--text-muted)" }} />}
        options={channels.data ?? []}
        value={channelManageIds}
        onChange={markDirty(setChannelManageIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais bloqueados (nega tudo, exceto se o usuário administra o canal)"
        icon={<Ban className="size-3" style={{ color: "var(--text-muted)" }} />}
        options={channels.data ?? []}
        value={channelDenyIds}
        onChange={markDirty(setChannelDenyIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Nenhum canal bloqueado"
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleSave()}
          disabled={!dirty || update.isPending}
          className="h-7 shrink-0 gap-1 text-[11px]"
        >
          {update.isPending ? <Loader2 className="size-3 animate-spin" /> : null}
          Salvar acesso
        </Button>
        {saved && !dirty && (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Salvo
          </span>
        )}
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Seletor "Todos" + lista de checkboxes. `value === null` significa sem
 * restrição (todos); um array (mesmo vazio) restringe aos itens marcados.
 */
export function ScopeMultiSelect({
  label,
  icon,
  options,
  value,
  onChange,
  loading,
  allLabel,
}: {
  label: string;
  icon: React.ReactNode;
  options: ScopeEntityOption[];
  value: string[] | null;
  onChange: (next: string[] | null) => void;
  loading?: boolean;
  allLabel: string;
}) {
  const all = value === null;
  const selected = useMemo(() => new Set(value ?? []), [value]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </span>
      </div>

      <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => onChange(e.target.checked ? null : [])}
          className="size-3.5 accent-[var(--brand-600)]"
        />
        {allLabel}
      </label>

      {!all && (
        <div
          className="flex max-h-40 flex-col gap-0.5 overflow-auto rounded-[var(--radius-md)] border p-1"
          style={{ borderColor: "var(--glass-border)" }}
        >
          {loading ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Loader2 className="size-3 animate-spin" style={{ color: "var(--text-muted)" }} />
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Carregando...
              </span>
            </div>
          ) : options.length === 0 ? (
            <span className="px-2 py-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
              Nenhum item disponível
            </span>
          ) : (
            options.map((o) => {
              const on = selected.has(o.id);
              return (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1 text-xs hover:bg-black/[0.04]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(o.id)}
                    className="size-3.5 accent-[var(--brand-600)]"
                  />
                  <span className="truncate">{o.name}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
