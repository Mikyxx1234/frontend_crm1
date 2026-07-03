"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconAntennaBars5,
  IconBan,
  IconBox,
  IconBuilding,
  IconChecklist,
  IconChevronRight,
  IconColumns,
  IconDeviceFloppy,
  IconEye,
  IconFilter,
  IconLayoutSidebar,
  IconLoader2,
  IconMail,
  IconMessagePlus,
  IconPhoto,
  IconPlus,
  IconSend,
  IconSettings,
  IconShieldCheck,
  IconTargetArrow,
  IconTrash,
  IconUser,
  IconUsers,
  IconX,
} from "@tabler/icons-react";

import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DropdownGlass } from "@/components/crm/dropdown-glass";

import {
  useAddGroupMember,
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useGroupScopeGrants,
  usePermissionsCatalog,
  useRemoveGroupMember,
  useScopeChannelOptions,
  useUpdateGroup,
  useUpdateGroupScopeGrants,
} from "./hooks";
import type {
  GroupFieldGrantEntry,
  GroupScopeLevel,
  GroupStageGrantEntry,
} from "./types";
import { ScopeMultiSelect, normalizeScope } from "./user-permissions-view";

// ─── Config da matriz ────────────────────────────────────────────────────────

/**
 * Recursos "escopáveis" — registros com responsável (owner), onde faz
 * sentido o nível SELF (só os próprios) vs ALL (todos). Os demais recursos
 * do catálogo são booleanos (Negado/Liberado) porque são ações org-wide.
 */
const SCOPABLE_RESOURCES = new Set<string>([
  "deal",
  "contact",
  "company",
  "task",
  "conversation",
]);

/**
 * Recursos ocultos no editor de grupo: `nav` é controlado pela
 * personalização de menu lateral (sidebarRoutes), não pela matriz.
 */
const HIDDEN_RESOURCES = new Set<string>(["nav"]);

/** Ícone por recurso do catálogo (fallback: IconColumns). */
const RESOURCE_ICON: Record<string, typeof IconUser> = {
  deal: IconTargetArrow,
  contact: IconUser,
  company: IconBuilding,
  task: IconChecklist,
  product: IconBox,
};

const LEVELS: {
  k: GroupScopeLevel;
  label: string;
  dot: string;
  on: string;
  disabled?: boolean;
  hint?: string;
}[] = [
  { k: "NONE", label: "Negado", dot: "#cbd5e1", on: "#94a3b8" },
  { k: "SELF", label: "Resp.", dot: "var(--color-warn)", on: "var(--color-warn)" },
  {
    k: "TEAM",
    label: "Equipe",
    dot: "var(--brand-primary-light)",
    on: "var(--brand-primary-light)",
    disabled: true,
    hint: "Em breve — depende de estrutura de times",
  },
  { k: "ALL", label: "Todos", dot: "var(--brand-primary)", on: "var(--brand-primary)" },
];

const FIELD_ENTITIES = ["deal", "contact", "company", "product"] as const;
const FIELD_ENTITY_LABEL: Record<string, string> = {
  deal: "Negócio",
  contact: "Contato",
  company: "Empresa",
  product: "Produto",
};

const AVATAR_BG = ["var(--brand-primary)", "var(--color-online)", "var(--brand-secondary)"];

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

type OrgUser = { id: string; name: string; email: string; avatarUrl?: string | null };
type PipelineWithStages = { id: string; name: string; stages: { id: string; name: string }[] };
type CustomFieldDef = { id: string; name: string; label: string };

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path));
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json() as Promise<T>;
}

function useOrgUsers() {
  return useQuery<OrgUser[]>({
    queryKey: ["users-list"],
    queryFn: () => getJson<OrgUser[]>("/api/users"),
  });
}

function usePipelinesWithStages() {
  return useQuery<PipelineWithStages[]>({
    queryKey: ["pipelines-stages"],
    queryFn: () => getJson<PipelineWithStages[]>("/api/pipelines"),
    staleTime: 60_000,
  });
}

function useEntityFields(entity: string) {
  return useQuery<CustomFieldDef[]>({
    queryKey: ["custom-fields", entity],
    queryFn: () => getJson<CustomFieldDef[]>(`/api/custom-fields?entity=${entity}`),
    staleTime: 60_000,
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// ─── Componente principal ────────────────────────────────────────────────────

interface GroupPermissionsEditorProps {
  groupId: string | null;
  /** Fecha o editor (volta à listagem). Default: no-op (compat com chamadas antigas). */
  onClose?: () => void;
  /** Disparado após salvar com sucesso (recebe o id, novo ou existente). */
  onSaved?: (id: string) => void;
  /** Disparado após exclusão bem-sucedida. */
  onDeleted?: () => void;
}

export function GroupPermissionsEditor({
  groupId,
  onClose,
  onSaved,
  onDeleted,
}: GroupPermissionsEditorProps) {
  const isNew = groupId === null;

  const { data: group, isLoading: groupLoading } = useGroup(groupId);
  const { data: catalog } = usePermissionsCatalog();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  // Identidade
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sharedInbox, setSharedInbox] = useState(true);
  const [mediaAccess, setMediaAccess] = useState(true);

  // Matriz: "resource:action" -> level
  const [scopes, setScopes] = useState<Record<string, GroupScopeLevel>>({});
  // Etapas: stageId -> {canView, canEdit}
  const [stageGrants, setStageGrants] = useState<Record<string, { canView: boolean; canEdit: boolean }>>({});
  // Campos: "entity.fieldKey" -> grant
  const [fieldGrants, setFieldGrants] = useState<Record<string, GroupFieldGrantEntry>>({});

  // Membros escolhidos ANTES de salvar (grupo novo). Enviados via `memberIds`
  // no create; em grupos existentes usamos as mutations add/remove direto.
  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Hidrata do backend
  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description ?? "");
    setSharedInbox(group.sharedInbox);
    setMediaAccess(group.mediaAccess);
    const s: Record<string, GroupScopeLevel> = {};
    for (const p of group.permissions) s[`${p.resource}:${p.action}`] = p.level;
    setScopes(s);
    const sg: Record<string, { canView: boolean; canEdit: boolean }> = {};
    for (const g of group.stageGrants) sg[g.stageId] = { canView: g.canView, canEdit: g.canEdit };
    setStageGrants(sg);
    const fg: Record<string, GroupFieldGrantEntry> = {};
    for (const f of group.fieldGrants) fg[`${f.entity}.${f.fieldKey}`] = f;
    setFieldGrants(fg);
  }, [group]);

  // Recursos do catálogo exibidos na matriz (exclui `nav`, controlado pelo
  // menu lateral). Mostra TODOS os módulos — paridade com o editor de role.
  const matrixResources = useMemo(
    () => (catalog?.resources ?? []).filter((r) => !HIDDEN_RESOURCES.has(r.resource)),
    [catalog],
  );

  const saving = createGroup.isPending || updateGroup.isPending;

  function buildPayload() {
    const permissions = Object.entries(scopes)
      .filter(([, level]) => level && level !== "NONE")
      .map(([key, level]) => {
        const [resource, action] = key.split(":");
        return { resource: resource!, action: action!, level };
      });
    const stage: GroupStageGrantEntry[] = Object.entries(stageGrants)
      .filter(([, v]) => v.canView || v.canEdit)
      .map(([stageId, v]) => ({ stageId, canView: v.canView, canEdit: v.canEdit }));
    const fields: GroupFieldGrantEntry[] = Object.values(fieldGrants);
    return {
      name: name.trim(),
      description: description.trim() || null,
      sharedInbox,
      mediaAccess,
      permissions,
      stageGrants: stage,
      fieldGrants: fields,
      ...(isNew && pendingMemberIds.length ? { memberIds: pendingMemberIds } : {}),
    };
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Dê um nome ao grupo.");
      return;
    }
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await createGroup.mutateAsync(payload);
        onSaved?.(created.id);
      } else if (groupId) {
        await updateGroup.mutateAsync({ id: groupId, ...payload });
        onSaved?.(groupId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar grupo.");
    }
  }

  async function handleDelete() {
    if (!groupId) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      await deleteGroup.mutateAsync(groupId);
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir grupo.");
      setDeleteConfirm(false);
    }
  }

  if (!isNew && groupLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <IconLoader2 className="size-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const displayName = (name.trim() || group?.name || "").trim();

  return (
    <div className="flex flex-col gap-4">
      {/* ACTION BAR — sticky header with Cancel/Save, mirroring the mockup */}
      <header className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow)] backdrop-blur-md">
        <span
          aria-hidden
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]"
        >
          <IconShieldCheck size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="truncate font-display text-[16px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]">
            {isNew ? "Novo grupo de permissões" : "Permissões do grupo"}
          </h2>
          <p className="truncate text-[12px] text-[var(--text-muted)]">
            Defina o que o grupo pode fazer — usuários herdam essas regras ao entrar no grupo.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={saving}
            className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2 font-display text-[12.5px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[12.5px] font-bold text-white shadow-[var(--shadow-brand)] transition-colors hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
          >
            {saving ? <IconLoader2 size={14} className="animate-spin" /> : <IconDeviceFloppy size={14} />}
            Salvar grupo
          </button>
        </div>
      </header>

      {/* BREADCRUMB */}
      <nav
        aria-label="Trilha"
        className="-mt-1 flex items-center gap-1.5 px-1 text-[12px] text-[var(--text-muted)]"
      >
        <span>Permissões</span>
        <IconChevronRight size={13} className="opacity-60" />
        <span>Grupos</span>
        <IconChevronRight size={13} className="opacity-60" />
        <span className="font-semibold text-[var(--text-secondary)]">
          {isNew ? "Novo grupo" : displayName || "Sem nome"}
        </span>
      </nav>

      {error && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-bg)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-danger)]">
          <IconAlertTriangle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col items-start gap-4 lg:flex-row">
        {/* SIDEBAR: identidade + membros */}
        <aside className="flex w-full shrink-0 flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-5 lg:sticky lg:top-2 lg:w-[300px]">
          <div className="flex flex-col items-center gap-2 border-b border-[var(--glass-border-subtle)] pb-4">
            <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
              <IconUsers size={28} />
            </div>
          </div>

          <Field label="Nome do grupo">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Operação Comercial"
              className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-3 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--input-border-focus)] focus:ring-[3px] focus:ring-[var(--input-ring-focus)]"
            />
          </Field>
          <Field label="Descrição">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Para que serve este grupo"
              className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white px-3 py-2.5 text-[13.5px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--input-border-focus)] focus:ring-[3px] focus:ring-[var(--input-ring-focus)]"
            />
          </Field>

          <MembersSection
            isNew={isNew}
            groupId={groupId}
            members={group?.members ?? []}
            pendingMemberIds={pendingMemberIds}
            onPendingChange={setPendingMemberIds}
            onAdd={(userId) => groupId && addMember.mutate({ groupId, userId })}
            onRemove={(userId) => groupId && removeMember.mutate({ groupId, userId })}
            busy={addMember.isPending || removeMember.isPending}
          />

          <div className="flex flex-col gap-2 border-t border-[var(--glass-border-subtle)] pt-4">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2.5 font-display text-[13px] font-bold text-white shadow-[var(--shadow-brand)] transition-all hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
            >
              {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconDeviceFloppy size={15} />}
              Salvar grupo
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2.5 font-display text-[13px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-strong)]"
            >
              Cancelar
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                className={cn(
                  "mt-1 w-full rounded-full px-4 py-2 font-display text-[12.5px] font-bold transition-colors",
                  deleteConfirm
                    ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                    : "text-[var(--text-muted)] hover:text-[var(--color-danger)]",
                )}
              >
                {deleteConfirm ? "Confirmar exclusão do grupo" : "Excluir grupo"}
              </button>
            )}
          </div>
        </aside>

        {/* CONTENT */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* MATRIZ — catálogo completo (paridade com roles) */}
          <Panel
            icon={<IconColumns size={18} />}
            title="Permissões por módulo"
            sub="escopo de cada ação"
          >
            <Legend />
            {matrixResources.map((res) => {
              const Icon = RESOURCE_ICON[res.resource] ?? IconColumns;
              const scopable = SCOPABLE_RESOURCES.has(res.resource);
              return (
                <div
                  key={res.resource}
                  className="flex flex-col gap-3 border-b border-[var(--glass-border-subtle)] px-[18px] py-4 last:border-b-0 hover:bg-black/[0.015]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">
                        {res.label}
                      </div>
                      {res.description && (
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {res.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-x-3.5 gap-y-3">
                    {res.actions.map((act) => {
                      const key = `${res.resource}:${act.action}`;
                      const level = scopes[key] ?? "NONE";
                      return (
                        <div key={key} className="flex min-w-0 flex-col gap-1.5">
                          <span className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.4px] text-[var(--text-secondary)]">
                            <span className="truncate">{act.label}</span>
                            {act.destructive && (
                              <span className="shrink-0 rounded-full bg-[var(--color-danger-bg)] px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-[var(--color-danger)]">
                                sensível
                              </span>
                            )}
                          </span>
                          {scopable ? (
                            <ScopeControl
                              value={level}
                              onChange={(lvl) => setScopes((p) => ({ ...p, [key]: lvl }))}
                            />
                          ) : (
                            <BoolControl
                              value={level !== "NONE"}
                              onChange={(on) =>
                                setScopes((p) => ({ ...p, [key]: on ? "ALL" : "NONE" }))
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Panel>

          {/* ETAPAS */}
          <StagePanel grants={stageGrants} setGrants={setStageGrants} />

          {/* CAMPOS */}
          <FieldPanel grants={fieldGrants} setGrants={setFieldGrants} />

          {/* CANAIS (scope-grants por grupo) — Bloco E (25/jun/26).
              Só faz sentido pra grupos já criados (precisa de groupId
              pra persistir o grant). */}
          {!isNew && groupId && <GroupChannelScope groupId={groupId} />}

          {/* EXTRAS */}
          <Panel icon={<IconFilter size={18} />} title="Acessos extras">
            <ExtraToggle
              icon={<IconMail size={18} />}
              title="Caixa de entrada compartilhada"
              desc="Permite ler e responder conversas não atribuídas a este grupo. Desmarque para restringir somente aos próprios atendimentos."
              checked={sharedInbox}
              onChange={setSharedInbox}
            />
            <ExtraToggle
              icon={<IconPhoto size={18} />}
              title="Acesso à mídia"
              desc="Baixar e visualizar arquivos, imagens e áudios anexados às conversas e negócios."
              checked={mediaAccess}
              onChange={setMediaAccess}
            />
            <div className="flex items-start gap-3 px-[18px] py-4">
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
                <IconLayoutSidebar size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">
                  Personalizar menu lateral
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  Define quais itens da barra lateral ficam visíveis para os usuários deste grupo.
                </div>
              </div>
              <button
                type="button"
                disabled
                title="Em breve — depende de catálogo de rotas"
                className="self-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--brand-primary)] opacity-60 transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed"
              >
                Configurar menu
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[12px] font-bold text-[var(--text-secondary)]">{label}</span>
      {children}
    </div>
  );
}

function Panel({
  icon,
  title,
  sub,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  /** Pílula opcional no canto direito do cabeçalho (ex.: "Pro"). */
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-white shadow-[var(--glass-shadow)] v2-dark:bg-[var(--glass-bg-modal)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--glass-border-subtle)] px-[18px] py-3.5">
        <span className="text-[var(--brand-primary)]">{icon}</span>
        <h2 className="font-display text-[14.5px] font-bold text-[var(--text-primary)]">{title}</h2>
        {sub && <span className="text-[12px] text-[var(--text-muted)]">{sub}</span>}
        {badge && <span className="ml-auto">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function ProBadge() {
  return (
    <span className="rounded-full bg-[var(--color-enterprise-bg)] px-2.5 py-0.5 font-display text-[10px] font-bold text-[var(--brand-primary-dark)]">
      Pro
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3.5 border-b border-[var(--glass-border-subtle)] bg-black/[0.015] px-[18px] py-3">
      {[
        { dot: "#cbd5e1", label: "Negado" },
        { dot: "var(--color-warn)", label: "Apenas responsável (próprios registros)" },
        { dot: "var(--brand-primary-light)", label: "Equipe (em breve)" },
        { dot: "var(--brand-primary)", label: "Todos" },
      ].map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-muted)]">
          <span className="size-2.5 rounded-full" style={{ background: it.dot }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

function ScopeControl({
  value,
  onChange,
}: {
  value: GroupScopeLevel;
  onChange: (lvl: GroupScopeLevel) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-0.5">
      {LEVELS.map((lvl) => {
        const on = value === lvl.k;
        return (
          <button
            key={lvl.k}
            type="button"
            title={lvl.hint}
            disabled={lvl.disabled}
            onClick={() => !lvl.disabled && onChange(lvl.k)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-1 truncate rounded-[var(--radius-sm)] px-1 py-1.5 font-display text-[11px] font-bold transition-colors",
              on ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              lvl.disabled && "cursor-not-allowed opacity-40",
            )}
            style={on ? { background: lvl.on } : undefined}
          >
            {lvl.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Controle booleano (Negado/Liberado) para recursos não-escopáveis,
 * mantendo a mesma estética do `ScopeControl`. Internamente mapeia para
 * os níveis `NONE`/`ALL` do modelo de grupo.
 */
function BoolControl({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-0.5">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center rounded-[var(--radius-sm)] px-1 py-1.5 font-display text-[11px] font-bold transition-colors",
          !value ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        )}
        style={!value ? { background: "#94a3b8" } : undefined}
      >
        Negado
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-center rounded-[var(--radius-sm)] px-1 py-1.5 font-display text-[11px] font-bold transition-colors",
          value ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        )}
        style={value ? { background: "var(--brand-primary)" } : undefined}
      >
        Liberado
      </button>
    </div>
  );
}

function MembersSection({
  isNew,
  members,
  pendingMemberIds,
  onPendingChange,
  onAdd,
  onRemove,
  busy,
}: {
  isNew: boolean;
  groupId: string | null;
  members: { id: string; user: OrgUser }[];
  pendingMemberIds: string[];
  onPendingChange: (ids: string[]) => void;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
  busy: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const { data: users = [] } = useOrgUsers();

  // ── Modo CRIAÇÃO: seleção local, persistida via `memberIds` no save ──
  if (isNew) {
    const pendingSet = new Set(pendingMemberIds);
    const pendingUsers = users.filter((u) => pendingSet.has(u.id));
    const availableNew = users.filter((u) => !pendingSet.has(u.id));
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-display text-[12px] font-bold text-[var(--text-secondary)]">
            Membros ({pendingUsers.length})
          </span>
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            className="flex items-center gap-1 font-display text-[12px] font-bold text-[var(--brand-primary)]"
          >
            <IconPlus size={13} />
            Atribuir
          </button>
        </div>

        {picking && (
          <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white p-2">
            {availableNew.length === 0 ? (
              <p className="px-1 py-2 text-[11.5px] text-[var(--text-muted)]">
                Todos os usuários já foram selecionados.
              </p>
            ) : (
              <div className="max-h-48 overflow-auto">
                {availableNew.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => onPendingChange([...pendingMemberIds, u.id])}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1.5 text-left transition-colors hover:bg-black/[0.04]"
                  >
                    <Avatar user={u} idx={0} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
                        {u.name}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">{u.email}</span>
                    </span>
                    <IconPlus size={14} className="text-[var(--brand-primary)]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          {pendingUsers.map((u, i) => (
            <div key={u.id} className="group flex items-center gap-2.5 rounded-[var(--radius-md)] p-1.5 hover:bg-black/[0.02]">
              <Avatar user={u} idx={i} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold leading-tight text-[var(--text-primary)]">
                  {u.name}
                </div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">{u.email}</div>
              </div>
              <button
                type="button"
                onClick={() => onPendingChange(pendingMemberIds.filter((id) => id !== u.id))}
                className="rounded p-1 text-[var(--text-muted)] opacity-0 transition-all hover:text-[var(--color-danger)] group-hover:opacity-100"
                title="Remover da seleção"
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
          {pendingUsers.length === 0 && (
            <p className="px-1 py-1 text-[11.5px] text-[var(--text-muted)]">
              Nenhum membro selecionado. Os escolhidos entram ao salvar.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Modo EDIÇÃO: mutations diretas (add/remove) ──
  const memberIds = new Set(members.map((m) => m.user.id));
  const available = users.filter((u) => !memberIds.has(u.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-display text-[12px] font-bold text-[var(--text-secondary)]">
          Membros ({members.length})
        </span>
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          className="flex items-center gap-1 font-display text-[12px] font-bold text-[var(--brand-primary)]"
        >
          <IconPlus size={13} />
          Atribuir
        </button>
      </div>

      {picking && (
        <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white p-2">
          {available.length === 0 ? (
            <p className="px-1 py-2 text-[11.5px] text-[var(--text-muted)]">
              Todos os usuários já estão neste grupo.
            </p>
          ) : (
            <div className="max-h-48 overflow-auto">
              {available.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onAdd(u.id)}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-1.5 py-1.5 text-left transition-colors hover:bg-black/[0.04]"
                >
                  <Avatar user={u} idx={0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
                      {u.name}
                    </span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">{u.email}</span>
                  </span>
                  <IconPlus size={14} className="text-[var(--brand-primary)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {members.map((m, i) => (
          <div key={m.id} className="group flex items-center gap-2.5 rounded-[var(--radius-md)] p-1.5 hover:bg-black/[0.02]">
            <Avatar user={m.user} idx={i} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight text-[var(--text-primary)]">
                {m.user.name}
              </div>
              <div className="truncate text-[11px] text-[var(--text-muted)]">{m.user.email}</div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(m.user.id)}
              disabled={busy}
              className="rounded p-1 text-[var(--text-muted)] opacity-0 transition-all hover:text-[var(--color-danger)] group-hover:opacity-100"
              title="Remover do grupo"
            >
              <IconX size={14} />
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="px-1 py-1 text-[11.5px] text-[var(--text-muted)]">Nenhum membro ainda.</p>
        )}
      </div>
    </div>
  );
}

function Avatar({ user, idx }: { user: OrgUser; idx: number }) {
  return (
    <span
      className="flex size-[30px] shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
      style={{ background: AVATAR_BG[idx % AVATAR_BG.length] }}
    >
      {initials(user.name)}
    </span>
  );
}

function StagePanel({
  grants,
  setGrants,
}: {
  grants: Record<string, { canView: boolean; canEdit: boolean }>;
  setGrants: React.Dispatch<React.SetStateAction<Record<string, { canView: boolean; canEdit: boolean }>>>;
}) {
  const { data: pipelines = [] } = usePipelinesWithStages();

  function set(stageId: string, patch: Partial<{ canView: boolean; canEdit: boolean }>) {
    setGrants((p) => {
      const cur = p[stageId] ?? { canView: true, canEdit: false };
      return { ...p, [stageId]: { ...cur, ...patch } };
    });
  }

  return (
    <Panel
      icon={<IconFilter size={18} />}
      title="Visibilidade por etapa do funil"
      sub="controle quais deals o grupo enxerga e edita"
    >
      {pipelines.length === 0 && (
        <p className="px-[18px] py-4 text-[12px] text-[var(--text-muted)]">Nenhum funil encontrado.</p>
      )}
      {pipelines.map((pl) =>
        pl.stages.map((st) => {
          const g = grants[st.id] ?? { canView: true, canEdit: false };
          return (
            <div
              key={st.id}
              className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-[18px] py-2.5 last:border-b-0 hover:bg-black/[0.015]"
            >
              <div className="min-w-0">
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--text-muted)]">
                  {pl.name}
                </span>
                <div className="truncate text-[13.5px] font-semibold text-[var(--text-primary)]">{st.name}</div>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <MiniToggle label="Ver" checked={g.canView} onChange={(v) => set(st.id, { canView: v })} />
                <MiniToggle label="Editar" checked={g.canEdit} onChange={(v) => set(st.id, { canEdit: v })} />
              </div>
            </div>
          );
        }),
      )}
    </Panel>
  );
}

function FieldPanel({
  grants,
  setGrants,
}: {
  grants: Record<string, GroupFieldGrantEntry>;
  setGrants: React.Dispatch<React.SetStateAction<Record<string, GroupFieldGrantEntry>>>;
}) {
  const [adding, setAdding] = useState(false);
  const entries = Object.values(grants);

  function set(key: string, patch: Partial<GroupFieldGrantEntry>) {
    setGrants((p) => ({ ...p, [key]: { ...p[key]!, ...patch } }));
  }
  function remove(key: string) {
    setGrants((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  }
  function add(entity: string, field: CustomFieldDef) {
    const key = `${entity}.${field.name}`;
    setGrants((p) => ({
      ...p,
      [key]: { entity, fieldKey: field.name, canView: true, canEdit: true },
    }));
    setAdding(false);
  }

  return (
    <Panel
      icon={<IconColumns size={18} />}
      title="Permissões por campo"
      sub="restrinja campos sensíveis de negócios e contatos"
      badge={<ProBadge />}
    >
      {entries.length === 0 && !adding && (
        <p className="px-[18px] py-4 text-[12px] text-[var(--text-muted)]">
          Nenhuma restrição de campo. Por padrão, o grupo vê e edita todos os campos permitidos.
        </p>
      )}
      {entries.map((f) => {
        const key = `${f.entity}.${f.fieldKey}`;
        return (
          <div
            key={key}
            className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-[18px] py-2.5 last:border-b-0 hover:bg-black/[0.015]"
          >
            <div className="min-w-0">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.4px] text-[var(--text-muted)]">
                {FIELD_ENTITY_LABEL[f.entity] ?? f.entity}
              </span>
              <div className="truncate text-[13.5px] font-semibold text-[var(--text-primary)]">
                {f.fieldKey}
              </div>
              <span className="block text-[11px] text-[var(--text-muted)]">
                {f.entity}.{f.fieldKey}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <MiniToggle label="Ver" checked={f.canView} onChange={(v) => set(key, { canView: v })} />
              <MiniToggle label="Editar" checked={f.canEdit} onChange={(v) => set(key, { canEdit: v })} />
              <button
                type="button"
                onClick={() => remove(key)}
                className="rounded p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--color-danger)]"
                title="Remover regra"
              >
                <IconTrash size={14} />
              </button>
            </div>
          </div>
        );
      })}

      {adding ? (
        <FieldPicker existing={new Set(Object.keys(grants))} onPick={add} onClose={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2.5 px-[18px] py-3 font-display text-[13px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-black/[0.015]"
        >
          <span className="flex size-6 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--glass-border)]">
            <IconPlus size={14} />
          </span>
          Definir permissões para outro campo
        </button>
      )}
    </Panel>
  );
}

function FieldPicker({
  existing,
  onPick,
  onClose,
}: {
  existing: Set<string>;
  onPick: (entity: string, field: CustomFieldDef) => void;
  onClose: () => void;
}) {
  const [entity, setEntity] = useState<(typeof FIELD_ENTITIES)[number]>("deal");
  const { data: fields = [], isLoading } = useEntityFields(entity);
  const available = fields.filter((f) => !existing.has(`${entity}.${f.name}`));

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--glass-border-subtle)] bg-black/[0.015] px-[18px] py-3">
      <div className="flex items-center gap-2">
        <DropdownGlass
          options={FIELD_ENTITIES.map((e) => ({ value: e, label: FIELD_ENTITY_LABEL[e] }))}
          value={entity}
          onValueChange={(v) => setEntity(v as (typeof FIELD_ENTITIES)[number])}
        />
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        >
          <IconX size={15} />
        </button>
      </div>
      <div className="max-h-40 overflow-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-white">
        {isLoading ? (
          <p className="px-2.5 py-2 text-[12px] text-[var(--text-muted)]">Carregando…</p>
        ) : available.length === 0 ? (
          <p className="px-2.5 py-2 text-[12px] text-[var(--text-muted)]">
            Nenhum campo personalizado disponível para {FIELD_ENTITY_LABEL[entity]}.
          </p>
        ) : (
          available.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onPick(entity, f)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-black/[0.04]"
            >
              <span className="font-semibold text-[var(--text-primary)]">{f.label}</span>
              <span className="text-[11px] text-[var(--text-muted)]">{entity}.{f.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function MiniToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span className="text-[11.5px] font-semibold text-[var(--text-secondary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-[var(--brand-primary)]" : "bg-[#cbd5e1]",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow-[var(--glass-shadow-sm)] transition-transform",
            checked ? "translate-x-[19px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </label>
  );
}

function ExtraToggle({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--glass-border-subtle)] px-[18px] py-4 last:border-b-0">
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">{title}</div>
        <div className="mt-0.5 max-w-[560px] text-[12px] text-[var(--text-muted)]">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-[var(--brand-primary)]" : "bg-[#cbd5e1]",
        )}
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow-[var(--glass-shadow-sm)] transition-transform",
            checked ? "translate-x-[19px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}

/**
 * Bloco E (25/jun/26) — Escopo de CANAIS por grupo. Eixo aditivo: o
 * usuário recebe acesso ao canal se o grupo dele permitir (junto com
 * grants de role e overrides pessoais). Deny bloqueia, exceto pra quem
 * tem `manage` no mesmo canal (anti-lockout). Persiste via
 * `PUT /api/groups/[id]/scope-grants`. Só efetivo com flag
 * `rbac_granular_scope_v1` ativa na org.
 */
function GroupChannelScope({ groupId }: { groupId: string }) {
  const { data, isLoading } = useGroupScopeGrants(groupId);
  const channels = useScopeChannelOptions();
  const update = useUpdateGroupScopeGrants(groupId);

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
    <Panel
      icon={<IconAntennaBars5 size={18} />}
      title="Acesso a canais"
      sub="Aplicado a todos os membros do grupo (eixo aditivo)"
    >
      <div className="flex flex-col gap-3 px-[18px] py-4">
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

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || update.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-display text-[12px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {update.isPending ? <IconLoader2 size={12} className="animate-spin" /> : null}
            Salvar canais
          </button>
          {saved && !dirty && (
            <span className="text-[11px] text-[var(--text-muted)]">Salvo</span>
          )}
          {err && <span className="text-[11px] text-[var(--color-destructive)]">{err}</span>}
        </div>
      </div>
    </Panel>
  );
}
