"use client";

import { useState, useEffect, useMemo } from "react";
import {
  IconAlertTriangle,
  IconAntennaBars5,
  IconBan,
  IconEye,
  IconKey,
  IconLayoutSidebar,
  IconLoader2,
  IconMessagePlus,
  IconSend,
  IconSettings,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  useCreateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useRole,
  useRoleScopeGrants,
  useScopeChannelOptions,
  useUpdateRole,
  useUpdateRoleScopeGrants,
} from "./hooks";
import type { RoleSidebarItem } from "./types";
import {
  RolePermissionsEditor,
  type PermissionsEditorMode,
} from "./role-permissions-editor";
import { ScopeMultiSelect, normalizeScope } from "./user-permissions-view";
import {
  SidebarItemsEditor,
  toEditorItems,
  toPersistItems,
  type SidebarEditorItem,
} from "@/features/sidebar/sidebar-customization";

interface RoleEditorProps {
  roleId: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function RoleEditor({ roleId, onClose, onSaved }: RoleEditorProps) {
  const isNew = roleId === null;

  const { data: role, isLoading: roleLoading } = useRole(roleId);
  const { data: catalog, isLoading: catalogLoading } = usePermissionsCatalog();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<PermissionsEditorMode>("levels");
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Menu lateral do papel — controlado localmente e enviado no save. Quando
  // o admin nunca mexeu, `sidebarOverride` fica false: nao envia `sidebarItems`
  // no payload (backend mantem `null` = usa catalogo padrao). Ao habilitar o
  // toggle "Personalizar", carregamos o catalogo completo como ponto de partida.
  const [sidebarOverride, setSidebarOverride] = useState(false);
  const [sidebarItems, setSidebarItems] = useState<SidebarEditorItem[]>(() => toEditorItems(null));

  const allCatalogKeys = useMemo(
    () =>
      (catalog?.resources ?? []).flatMap((r) =>
        r.actions.map((a) => `${r.resource}:${a.action}`),
      ),
    [catalog?.resources],
  );

  // Editor unificado: exibe TODAS as permissões do catálogo, incluindo
  // mensageria (conversas, canais, templates, campanhas). A gestão de
  // mensageria foi consolidada aqui — em /settings/conversations sobrou
  // apenas um atalho.
  const editorResources = catalog?.resources ?? [];

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
      if (role.permissions.includes("*")) {
        setChecked(new Set(allCatalogKeys));
      } else {
        setChecked(new Set(role.permissions));
      }
      // Sidebar: se o papel ja tem override, pre-carrega os items no editor;
      // senao, deixa desligado (envia null no save == "usa catalogo padrao").
      const hasOverride = Array.isArray(role.sidebarItems) && role.sidebarItems.length > 0;
      setSidebarOverride(hasOverride);
      setSidebarItems(toEditorItems(hasOverride ? role.sidebarItems : null));
    }
  }, [role, allCatalogKeys]);

  const isSystem = role?.isSystem ?? false;
  const isAdminPreset = role?.systemPreset === "ADMIN";
  const loading = roleLoading || catalogLoading;
  const saving = createRole.isPending || updateRole.isPending;
  const deleting = deleteRole.isPending;

  // Contadores do resumo (coluna de identidade). `nav:*` são derivadas,
  // então não entram na contagem de "permissões ativas".
  const permsCount = Array.from(checked).filter(
    (k) => !k.startsWith("nav:"),
  ).length;
  const usersCount = role?._count?.assignments ?? 0;

  async function handleSave() {
    setError(null);
    const permissions = isAdminPreset
      ? ["*"]
      : Array.from(checked);
    // sidebarItems: null = "sem override" (backend usa catalogo padrao).
    // Quando o admin ligou o toggle, enviamos a lista serializada.
    const sidebarPayload: RoleSidebarItem[] | null = sidebarOverride
      ? toPersistItems(sidebarItems)
      : null;
    try {
      if (isNew) {
        const created = await createRole.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          permissions,
          sidebarItems: sidebarPayload,
        });
        onSaved?.(created.id);
      } else if (roleId) {
        await updateRole.mutateAsync({
          id: roleId,
          ...(isSystem ? {} : { name: name.trim(), description: description.trim() }),
          permissions,
          sidebarItems: sidebarPayload,
        });
        onSaved?.(roleId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    }
  }

  async function handleDelete() {
    if (!roleId || !deleteConfirm) { setDeleteConfirm(true); return; }
    setError(null);
    try {
      await deleteRole.mutateAsync(roleId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao deletar.");
      setDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <IconLoader2 className="size-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const fieldsDisabled = isSystem && !isNew;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      {/* ── COLUNA ESQUERDA: identidade do role (fixa) ─────────────────── */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-2">
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow-sm)]">
          {/* Cabeçalho: ícone + nome + badge de preset */}
          <div className="flex flex-col items-center gap-2.5 border-b border-[var(--glass-border-subtle)] px-6 py-5 text-center">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
              <IconShield size={22} />
            </div>
            <h2 className="font-display text-[14px] font-bold leading-tight text-[var(--text-primary)]">
              {isNew ? "Novo role" : (role?.name ?? "")}
            </h2>
            {isSystem && (
              <Badge variant="outline" className="text-[10px]">
                Preset do sistema
              </Badge>
            )}
          </div>

          {/* Campos editáveis + resumo */}
          <div className="flex flex-col gap-3.5 px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={fieldsDisabled}
                placeholder="Ex.: Supervisor SP"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={fieldsDisabled}
                placeholder="Opcional"
                className="h-8 text-xs"
              />
            </div>

            {/* Resumo */}
            <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] p-3">
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <IconKey size={13} className="shrink-0 text-[var(--brand-primary)]" />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    {isAdminPreset ? "Todas" : permsCount}
                  </strong>{" "}
                  {isAdminPreset ? "as permissões" : "permissões ativas"}
                </span>
              </div>
              {!isNew && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                  <IconUsers size={13} className="shrink-0 text-[var(--text-muted)]" />
                  <span>
                    <strong className="text-[var(--text-primary)]">{usersCount}</strong>{" "}
                    usuário(s) com este role
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 border-t border-[var(--glass-border-subtle)] px-5 py-4">
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || (!isNew && !name.trim())}
              className="h-9 w-full justify-center text-xs"
            >
              {saving && <IconLoader2 className="mr-1.5 size-3 animate-spin" />}
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-9 w-full justify-center text-xs"
            >
              Cancelar
            </Button>
            {!isNew && !isSystem && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className={cn(
                  "mt-1 h-9 w-full justify-center text-xs",
                  deleteConfirm
                    ? "border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] text-[var(--color-destructive)]"
                    : "text-[var(--color-destructive)]",
                )}
              >
                {deleting ? <IconLoader2 className="mr-1.5 size-3 animate-spin" /> : null}
                {deleteConfirm ? "Confirmar exclusão" : "Deletar role"}
              </Button>
            )}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] px-3 py-2 text-xs text-[var(--color-destructive)]">
            <IconAlertTriangle className="size-3.5 shrink-0" />
            {error}
          </div>
        )}
      </aside>

      {/* ── COLUNA DIREITA: matriz de permissões (painéis soltos, DS v2) ── */}
      <div className="flex min-w-0 flex-col gap-4">
        <RolePermissionsEditor
          resources={editorResources}
          checked={checked}
          onChange={setChecked}
          mode={mode}
          onModeChange={setMode}
          disabled={isAdminPreset || saving}
        />
        {isAdminPreset && (
          <p className="text-[11px] text-[var(--text-muted)]">
            O preset Admin sempre possui acesso total (
            <code className="font-mono">*</code>) — as permissões não são editáveis.
          </p>
        )}

        {/* Canais por papel: só faz sentido para papéis não-admin já criados
            (precisa de roleId para persistir o grant). */}
        {!isNew && !isAdminPreset && roleId && <RoleChannelScope roleId={roleId} />}

        {/* Menu lateral do papel — decisão 14/jul/26 (ver AGENT.md). Salvo
            no mesmo submit do papel; usuários com este papel veem esta config
            (união com outros papéis que o usuário tiver). */}
        <RoleSidebarSection
          override={sidebarOverride}
          onOverrideChange={setSidebarOverride}
          items={sidebarItems}
          onItemsChange={setSidebarItems}
          disabled={saving}
        />
      </div>
    </div>
  );
}

/**
 * Seção do editor de Role que controla o menu lateral (sidebar) que os
 * usuários deste papel veem. Um toggle "Personalizar" define se o papel
 * override o catálogo padrão. O `SidebarItemsEditor` só aparece quando
 * o override está ligado.
 */
function RoleSidebarSection({
  override,
  onOverrideChange,
  items,
  onItemsChange,
  disabled,
}: {
  override: boolean;
  onOverrideChange: (v: boolean) => void;
  items: SidebarEditorItem[];
  onItemsChange: (items: SidebarEditorItem[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-1.5">
          <IconLayoutSidebar size={14} className="mt-0.5 text-[var(--text-muted)]" />
          <div className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Menu lateral
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
              Define quais atalhos aparecem na sidebar e a ordem — vale para todos os
              usuários com este papel. Sem personalização, o papel usa o catálogo padrão do CRM.
            </p>
          </div>
        </div>
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Personalizar
          </span>
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => onOverrideChange(e.target.checked)}
            disabled={disabled}
            className="size-4 cursor-pointer accent-[var(--brand-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
      </div>

      {override && (
        <SidebarItemsEditor
          items={items}
          onChange={onItemsChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

/**
 * Escopo de CANAIS por papel. Concede a todos os usuários com este papel acesso
 * a ver / enviar nos canais selecionados (eixo aditivo ao override por usuário).
 * Persiste em `permissions.scope.grants.v1` via
 * `PUT /api/roles/[id]/scope-grants`. Só tem efeito real com a flag
 * `rbac_granular_scope_v1` ativa.
 */
function RoleChannelScope({ roleId }: { roleId: string }) {
  const { data, isLoading } = useRoleScopeGrants(roleId);
  const channels = useScopeChannelOptions();
  const update = useUpdateRoleScopeGrants(roleId);

  const [channelViewIds, setChannelViewIds] = useState<string[] | null>(null);
  const [channelSendIds, setChannelSendIds] = useState<string[] | null>(null);
  const [channelInitiateIds, setChannelInitiateIds] = useState<string[] | null>(null);
  const [channelManageIds, setChannelManageIds] = useState<string[] | null>(null);
  const [channelDenyIds, setChannelDenyIds] = useState<string[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
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
    setErr(null);
    try {
      await update.mutateAsync({
        channelViewIds,
        channelSendIds,
        channelInitiateIds,
        channelManageIds,
        channelDenyIds,
      });
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar canais.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow)]">
      <div className="flex items-center gap-1.5">
        <IconAntennaBars5 size={14} className="text-[var(--text-muted)]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Canais deste papel
        </span>
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">
        Define quais canais os usuários com este papel podem ver/usar. Some-se ao
        que cada usuário já tenha liberado individualmente.
      </p>

      <ScopeMultiSelect
        label="Canais — ver mensagens"
        icon={<IconEye size={12} className="text-[var(--text-muted)]" />}
        options={channels.data ?? []}
        value={channelViewIds}
        onChange={markDirty(setChannelViewIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais — responder mensagens"
        icon={<IconSend size={12} className="text-[var(--text-muted)]" />}
        options={channels.data ?? []}
        value={channelSendIds}
        onChange={markDirty(setChannelSendIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais — iniciar nova conversa"
        icon={<IconMessagePlus size={12} className="text-[var(--text-muted)]" />}
        options={channels.data ?? []}
        value={channelInitiateIds}
        onChange={markDirty(setChannelInitiateIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais — administrar (configurar/conectar)"
        icon={<IconSettings size={12} className="text-[var(--text-muted)]" />}
        options={channels.data ?? []}
        value={channelManageIds}
        onChange={markDirty(setChannelManageIds)}
        loading={isLoading || channels.isLoading}
        allLabel="Todos os canais"
      />

      <ScopeMultiSelect
        label="Canais bloqueados (nega tudo, exceto se também administra o canal)"
        icon={<IconBan size={12} className="text-[var(--text-muted)]" />}
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
          {update.isPending ? <IconLoader2 className="size-3 animate-spin" /> : null}
          Salvar canais
        </Button>
        {saved && !dirty && (
          <span className="text-[11px] text-[var(--text-muted)]">Salvo</span>
        )}
        {err && <span className="text-[11px] text-[var(--color-destructive)]">{err}</span>}
      </div>
    </div>
  );
}
