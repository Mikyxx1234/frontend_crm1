"use client";

import * as React from "react";
import {
  IconBuilding,
  IconHeadset,
  IconPhone,
  IconBriefcase,
  IconCurrencyDollar,
  IconUsers,
  IconDeviceLaptop,
  IconSpeakerphone,
  IconTruck,
  IconScale,
  IconShoppingCart,
  IconLifebuoy,
  IconClipboardList,
  IconStar,
  IconSettings,
  IconChartBar,
  IconMail,
  IconMessageCircle,
  IconTool,
  IconSchool,
  IconGlobe,
  IconHome,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconChevronRight,
  IconTable,
  IconLayoutGrid,
  IconLayoutList,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { InputGlass } from "@/components/crm/input-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { PageSearchBar, PageSegmentedControl, PagePrimaryButton } from "@/components/crm/page-toolbar";
import { listTableHeadRowClass, ListColumnLabel } from "@/components/crm/sortable-header";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  type Department,
} from "../hooks/use-departments";
import {
  useDepartmentMembers,
  useSetDepartmentMembers,
} from "../hooks/use-department-members";
import { useTeamUsers } from "@/features/pipeline-v2/hooks/use-deal-mutations";

// ─── Icon registry ────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

const ICON_REGISTRY: Record<string, IconComponent> = {
  IconBuilding, IconHeadset, IconPhone, IconBriefcase, IconCurrencyDollar,
  IconUsers, IconDeviceLaptop, IconSpeakerphone, IconTruck, IconScale,
  IconShoppingCart, IconLifebuoy, IconClipboardList, IconStar, IconSettings,
  IconChartBar, IconMail, IconMessageCircle, IconTool, IconSchool,
  IconGlobe, IconHome,
};

const DEPT_ICONS: { name: string; label: string }[] = [
  { name: "IconHeadset",        label: "Atendimento" },
  { name: "IconPhone",          label: "SAC" },
  { name: "IconBriefcase",      label: "Comercial" },
  { name: "IconCurrencyDollar", label: "Financeiro" },
  { name: "IconUsers",          label: "RH" },
  { name: "IconDeviceLaptop",   label: "TI" },
  { name: "IconSpeakerphone",   label: "Marketing" },
  { name: "IconTruck",          label: "Logística" },
  { name: "IconScale",          label: "Jurídico" },
  { name: "IconShoppingCart",   label: "Compras" },
  { name: "IconLifebuoy",       label: "Suporte" },
  { name: "IconClipboardList",  label: "Projetos" },
  { name: "IconStar",           label: "Qualidade" },
  { name: "IconSettings",       label: "Operações" },
  { name: "IconBuilding",       label: "Geral" },
  { name: "IconChartBar",       label: "Análise" },
  { name: "IconMail",           label: "E-mail" },
  { name: "IconMessageCircle",  label: "Chat" },
  { name: "IconTool",           label: "Manutenção" },
  { name: "IconSchool",         label: "Treinamento" },
  { name: "IconGlobe",          label: "Internacional" },
  { name: "IconHome",           label: "Administrativo" },
];

const DEPT_COLORS = [
  "#6366f1", "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0891b2",
  "#6b7280", "#334155",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DeptIcon({ name, size = 16, color, className }: { name: string; size?: number; color?: string; className?: string }) {
  const Comp = ICON_REGISTRY[name] ?? IconBuilding;
  return <Comp size={size} strokeWidth={1.75} className={className} style={color ? { color } : undefined} />;
}

function DeptIconBadge({ dept, size = 36 }: { dept: Department; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[var(--radius-md)]"
      style={{
        width: size, height: size,
        backgroundColor: dept.color + "18",
      }}
    >
      <DeptIcon name={dept.icon ?? "IconBuilding"} size={size * 0.45} color={dept.color} />
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso));
  } catch { return iso; }
}

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = "tabela" | "cards" | "compacta";

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateDepartmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(DEPT_COLORS[0]);
  const [iconName, setIconName] = React.useState(DEPT_ICONS[0].name);
  const createMutation = useCreateDepartment();

  function reset() { setName(""); setColor(DEPT_COLORS[0]); setIconName(DEPT_ICONS[0].name); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), color, icon: iconName }, {
      onSuccess: () => { toast.success("Departamento criado"); reset(); onClose(); },
      onError: (err: Error) => toast.error(err.message),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent size="sm" bodyClassName="p-0 gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]" style={{ backgroundColor: color + "22" }}>
            <DeptIcon name={iconName} size={20} color={color} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">Novo departamento</h3>
            {name.trim() && <p className="truncate font-body text-[12px] text-[var(--text-muted)]">{name.trim()}</p>}
          </div>
          <DialogClose />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5 px-5 py-5">
            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Nome</label>
              <InputGlass value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Suporte, Vendas, Financeiro…" autoFocus />
            </div>

            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Ícone</label>
              <div className="grid grid-cols-11 gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2">
                {DEPT_ICONS.map(({ name: ic, label }) => (
                  <button key={ic} type="button" title={label} onClick={() => setIconName(ic)}
                    className={cn("flex h-8 w-full items-center justify-center rounded-[var(--radius-sm)] transition-all",
                      iconName === ic ? "bg-[var(--brand-primary)]/12 ring-1 ring-[var(--brand-primary)]/40" : "hover:bg-[var(--glass-bg-strong)]")}>
                    <DeptIcon name={ic} size={17} color={iconName === ic ? color : undefined}
                      className={iconName === ic ? undefined : "text-[var(--text-muted)]"} />
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-center font-body text-[11px] text-[var(--text-muted)]">
                {DEPT_ICONS.find((i) => i.name === iconName)?.label}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Cor</label>
              <div className="flex flex-wrap gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
                {DEPT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={cn("relative size-6 rounded-full transition-all hover:scale-110", color === c && "scale-110 ring-2 ring-offset-2")}
                    style={{ backgroundColor: c, ...(color === c ? { ringColor: c } : {}) }}
                    aria-label={c}>
                    {color === c && <IconCheck size={12} strokeWidth={3} className="absolute inset-0 m-auto text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--glass-border-subtle)] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]" style={{ backgroundColor: color + "22" }}>
                <DeptIcon name={iconName} size={14} color={color} />
              </div>
              <span className="font-display text-[13px] font-semibold text-[var(--text-primary)]">{name.trim() || "Nome do departamento"}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { reset(); onClose(); }}
                className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
                Cancelar
              </button>
              <ButtonGlass type="submit" variant="primary" disabled={!name.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Criando…" : "Criar"}
              </ButtonGlass>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ dept, onConfirm, onCancel, isPending, errorMsg }: {
  dept: Department | null; onConfirm: () => void; onCancel: () => void; isPending: boolean; errorMsg?: string;
}) {
  return (
    <Dialog open={!!dept} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent size="sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <IconTrash size={18} className="text-red-500" />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">Excluir departamento</h3>
            <p className="mt-1 font-body text-[13px] text-[var(--text-muted)]">
              Tem certeza que deseja excluir <strong className="font-semibold text-[var(--text-primary)]">{dept?.name}</strong>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        {errorMsg && <div className="rounded-[var(--radius-md)] border border-red-100 bg-red-50 px-3 py-2.5 font-body text-[12.5px] text-red-600">{errorMsg}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending}
            className="rounded-[var(--radius-md)] bg-red-500 px-4 py-1.5 font-display text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {isPending ? "Excluindo…" : "Excluir"}
          </button>
        </div>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit modal ──────────────────────────────────────────────────────────────

function EditDepartmentModal({ dept, onClose }: { dept: Department | null; onClose: () => void }) {
  const [name, setName] = React.useState(dept?.name ?? "");
  const [icon, setIcon] = React.useState(dept?.icon ?? "IconBuilding");
  const [color, setColor] = React.useState(dept?.color ?? "#6366f1");
  const updateMutation = useUpdateDepartment();
  const setMembersMutation = useSetDepartmentMembers();

  const { data: orgUsers = [] } = useTeamUsers(!!dept);
  const { data: currentMembers = [] } = useDepartmentMembers(dept?.id ?? null);

  const [memberIds, setMemberIds] = React.useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = React.useState("");

  // Sync fields when dept changes
  React.useEffect(() => {
    if (dept) { setName(dept.name); setIcon(dept.icon); setColor(dept.color); setMemberSearch(""); }
  }, [dept?.id]);

  // Hidrata a seleção com os membros atuais quando carregam.
  React.useEffect(() => {
    setMemberIds(new Set(currentMembers.map((m) => m.user.id)));
  }, [currentMembers]);

  const filteredUsers = React.useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const list = [...orgUsers].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
    );
  }, [orgUsers, memberSearch]);

  function toggleMember(id: string) {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const saving = updateMutation.isPending || setMembersMutation.isPending;

  function handleSave() {
    if (!dept) return;
    const deptId = dept.id;
    updateMutation.mutate(
      { id: deptId, name: name.trim(), icon, color },
      {
        onSuccess: () => {
          setMembersMutation.mutate(
            { departmentId: deptId, userIds: [...memberIds] },
            { onSuccess: () => onClose(), onError: () => onClose() },
          );
        },
      },
    );
  }

  return (
    <Dialog open={!!dept} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent size="md">
        {/* Header */}
        <div className="flex items-center gap-3">
          {dept && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
              style={{ background: `${color}18`, border: `1.5px solid ${color}40` }}>
              <DeptIcon name={icon} size={18} color={color} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)]">Editar departamento</h3>
            <p className="font-body text-[12px] text-[var(--text-muted)]">{dept?.name}</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Nome */}
          <div>
            <label className="mb-1 block font-display text-[12px] font-semibold text-[var(--text-muted)]">Nome</label>
            <InputGlass value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do departamento" />
          </div>

          {/* Ícone */}
          <div>
            <label className="mb-2 block font-display text-[12px] font-semibold text-[var(--text-muted)]">Ícone</label>
            <div className="grid grid-cols-6 gap-1.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-2.5">
              {DEPT_ICONS.map(({ name: n, label }) => (
                <button key={n} type="button" title={label} onClick={() => setIcon(n)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[var(--radius-md)] px-1 py-2 transition-all",
                    icon === n ? "bg-[var(--brand-primary)]/10 ring-1 ring-[var(--brand-primary)]" : "hover:bg-[var(--glass-bg-strong)]",
                  )}>
                  <DeptIcon name={n} size={16} color={icon === n ? color : "var(--text-muted)"} />
                  <span className="text-center font-body text-[9px] leading-tight text-[var(--text-muted)]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="mb-2 block font-display text-[12px] font-semibold text-[var(--text-muted)]">Cor</label>
            <div className="flex flex-wrap gap-2">
              {DEPT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform hover:scale-110",
                    color === c && "ring-2 ring-offset-1 ring-[var(--brand-primary)] scale-110",
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Membros */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <label className="font-display text-[12px] font-semibold text-[var(--text-muted)]">Membros</label>
              {memberIds.size > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 px-1.5 font-display text-[10px] font-bold text-[var(--brand-primary)]">
                  {memberIds.size}
                </span>
              )}
            </div>

            <div className="mb-2">
              <InputGlass
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Buscar usuário por nome ou e-mail…"
                withSearch
              />
            </div>

            {orgUsers.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-4 text-center">
                <IconUsers size={16} className="mx-auto mb-1 text-[var(--text-muted)] opacity-40" />
                <p className="font-body text-[12px] text-[var(--text-muted)]">Nenhum usuário na organização.</p>
              </div>
            ) : (
              <div className="max-h-[240px] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]">
                <div className="flex flex-col divide-y divide-[var(--glass-border-subtle)]">
                  {filteredUsers.map((u) => {
                    const selected = memberIds.has(u.id);
                    const roleLabel =
                      u.role === "ADMIN" ? "Admin" : u.role === "MANAGER" ? "Gerente" : "Atendente";
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                          selected ? "bg-[var(--brand-primary)]/8" : "hover:bg-[var(--glass-bg-strong)]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border transition-colors",
                            selected
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                              : "border-[var(--glass-border)] bg-white",
                          )}
                        >
                          {selected && <IconCheck size={13} />}
                        </span>
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt={u.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 font-display text-[12px] font-bold text-[var(--brand-primary)]">
                            {u.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">{u.name}</span>
                          <span className="block truncate font-body text-[11px] text-[var(--text-muted)]">{u.email}</span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-semibold",
                            u.role === "ADMIN"
                              ? "bg-violet-100 text-violet-700"
                              : u.role === "MANAGER"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {roleLabel}
                        </span>
                      </button>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <div className="px-3 py-4 text-center font-body text-[12px] text-[var(--text-muted)]">
                      Nenhum usuário encontrado.
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="mt-1.5 font-body text-[11px] text-[var(--text-muted)]">
              O vínculo define a composição do time. Não altera o acesso à caixa de entrada (isso é
              configurado em Permissões).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
            Cancelar
          </button>
          <ButtonGlass type="button" variant="primary" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? "Salvando…" : "Salvar"}
          </ButtonGlass>
        </div>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}

// ─── Row views ────────────────────────────────────────────────────────────────

function CompactaRow({ dept, onDelete, onEdit }: { dept: Department; onDelete: () => void; onEdit: () => void }) {
  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_1px_3px_rgba(100,130,180,0.08)] backdrop-blur-sm transition-all hover:bg-white hover:shadow-[0_2px_8px_rgba(100,130,180,0.13)]"
      onClick={onEdit}
    >
      <DeptIconBadge dept={dept} size={40} />

      <div className="min-w-0 flex-1">
        <p className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">{dept.name}</p>
        <p className="font-body text-[12px] text-[var(--text-muted)]">
          {typeof dept._count?.members === "number"
            ? `${dept._count.members} ${dept._count.members === 1 ? "membro" : "membros"} · `
            : ""}
          Criado em {formatDate(dept.createdAt)}
        </p>
      </div>

      <span className="shrink-0 rounded-full bg-[var(--color-success)]/12 px-2.5 py-0.5 font-display text-[11.5px] font-semibold text-[var(--color-success)]">
        Ativo
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
          <IconTrash size={13} />
        </button>
      </div>

      <IconChevronRight size={14} className="shrink-0 text-[var(--brand-primary)] opacity-30 group-hover:opacity-80 transition-opacity" />
    </div>
  );
}

function TabelaRow({ dept, onDelete, onEdit, selected, onToggle }: { dept: Department; onDelete: () => void; onEdit: () => void; selected: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      "group grid grid-cols-[2rem_2.5rem_1fr_6rem_5.5rem_3.5rem] cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-white/60",
      selected && "bg-[var(--brand-primary)]/5",
    )}
    onClick={onEdit}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} className="size-4 rounded accent-[var(--brand-primary)]" />
      <DeptIconBadge dept={dept} size={32} />
      <div>
        <p className="font-display text-[13px] font-semibold text-[var(--text-primary)]">{dept.name}</p>
      </div>
      <span className="hidden font-body text-[12px] tabular-nums text-[var(--text-muted)] sm:block">{formatDate(dept.createdAt)}</span>
      <span className="hidden rounded-full bg-[var(--color-success)]/12 px-2 py-0.5 text-center font-display text-[11px] font-semibold text-[var(--color-success)] sm:block">
        Ativo
      </span>
      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}

function CardView({ dept, onDelete, onEdit }: { dept: Department; onDelete: () => void; onEdit: () => void }) {
  return (
    <div
      className="group relative flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-white/70 bg-white/80 p-5 text-center shadow-[0_1px_3px_rgba(100,130,180,0.08)] backdrop-blur-sm transition-all hover:bg-white hover:shadow-[0_2px_8px_rgba(100,130,180,0.13)]"
      onClick={onEdit}
    >
      <DeptIconBadge dept={dept} size={52} />
      <div>
        <p className="font-display text-[14px] font-bold text-[var(--text-primary)]">{dept.name}</p>
        <p className="mt-0.5 font-body text-[11.5px] text-[var(--text-muted)]">
          {typeof dept._count?.members === "number"
            ? `${dept._count.members} ${dept._count.members === 1 ? "membro" : "membros"}`
            : formatDate(dept.createdAt)}
        </p>
      </div>
      <span className="rounded-full bg-[var(--color-success)]/12 px-3 py-0.5 font-display text-[11px] font-semibold text-[var(--color-success)]">
        Ativo
      </span>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors">
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();

  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("compacta");
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | undefined>();
  const [editTarget, setEditTarget] = React.useState<Department | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? departments.filter((d) => d.name.toLowerCase().includes(q)) : departments;
  }, [departments, search]);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((d) => d.id)));
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Departamento excluído"); setDeleteTarget(null); setDeleteError(undefined); },
      onError: (err: unknown) => setDeleteError((err as Error).message),
    });
  }

  const VIEW_SEGMENT_ITEMS = [
    { value: "tabela",   label: <span className="flex items-center gap-1.5"><IconTable size={13} />Tabela</span> },
    { value: "cards",    label: <span className="flex items-center gap-1.5"><IconLayoutGrid size={13} />Cards</span> },
    { value: "compacta", label: <span className="flex items-center gap-1.5"><IconLayoutList size={13} />Compacta</span> },
  ] as const;

  return (
    <div className="min-w-0 w-full max-w-full">
      {/* ── Toolbar ── */}
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <PageSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar departamento…"
          variant="compact"
          className="w-full sm:min-w-[180px] sm:max-w-xs sm:flex-1"
        />

        <div className="toolbar-hscroll min-w-0 max-w-full sm:ml-auto sm:max-w-none sm:overflow-visible">
          <div className="flex w-max flex-nowrap items-center gap-2">
            <PageSegmentedControl
              items={VIEW_SEGMENT_ITEMS}
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
              aria-label="Modo de visualização"
              size="compact"
            />

            <PagePrimaryButton onClick={() => setShowCreate(true)} className="shrink-0 gap-1.5">
              <IconPlus size={14} />
              Criar
            </PagePrimaryButton>
          </div>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-lg)] border border-red-100 bg-red-50 px-4 py-2.5">
          <span className="flex-1 font-display text-[13px] text-red-600">
            {selected.size} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button type="button" className="flex items-center gap-1.5 font-display text-[12.5px] font-semibold text-red-600 hover:underline">
            <IconTrash size={13} /> Excluir selecionados
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[60px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
            <IconBuilding size={24} className="text-[var(--text-muted)] opacity-50" />
          </div>
          <div>
            <p className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
              {search ? "Nenhum departamento encontrado" : "Nenhum departamento cadastrado"}
            </p>
            <p className="mt-1 font-body text-[12.5px] text-[var(--text-muted)]">
              {search ? "Tente um termo diferente." : "Crie o primeiro departamento para começar."}
            </p>
          </div>
          {!search && (
            <ButtonGlass variant="primary" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 mt-1">
              <IconPlus size={13} /> Criar departamento
            </ButtonGlass>
          )}
        </div>
      ) : viewMode === "compacta" ? (
        /* ── Compacta ── */
        <div className="flex flex-col gap-2">
          {filtered.map((dept) => (
            <CompactaRow
              key={dept.id}
              dept={dept}
              onDelete={() => { setDeleteError(undefined); setDeleteTarget(dept); }}
              onEdit={() => setEditTarget(dept)}
            />
          ))}
        </div>
      ) : viewMode === "cards" ? (
        /* ── Cards ── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((dept) => (
            <CardView
              key={dept.id}
              dept={dept}
              onDelete={() => { setDeleteError(undefined); setDeleteTarget(dept); }}
              onEdit={() => setEditTarget(dept)}
            />
          ))}
        </div>
      ) : (
        /* ── Tabela ── */
        <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)]">
          <div className="min-w-[420px]">
            {/* Table header */}
            <div className={listTableHeadRowClass("grid grid-cols-[2rem_2.5rem_1fr_6rem_5.5rem_3.5rem] rounded-none border-b-0 border-x-0 border-t-0")}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleAll}
                className="size-4 rounded accent-[var(--brand-primary)]"
              />
              <span />
              <ListColumnLabel>Nome</ListColumnLabel>
              <ListColumnLabel className="hidden sm:block">Criado em</ListColumnLabel>
              <ListColumnLabel className="hidden sm:block">Status</ListColumnLabel>
              <span />
            </div>

            <div className="divide-y divide-[var(--glass-border-subtle)]">
              {filtered.map((dept) => (
                <TabelaRow
                  key={dept.id}
                  dept={dept}
                  selected={selected.has(dept.id)}
                  onToggle={() => toggleSelect(dept.id)}
                  onDelete={() => { setDeleteError(undefined); setDeleteTarget(dept); }}
                  onEdit={() => setEditTarget(dept)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer count ── */}
      {!isLoading && filtered.length > 0 && (
        <p className="mt-3 font-body text-[12px] text-[var(--text-muted)]">
          {filtered.length} departamento{filtered.length !== 1 ? "s" : ""}
          {selected.size > 0 && ` · ${selected.size} selecionado${selected.size !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* ── Modals ── */}
      <CreateDepartmentModal open={showCreate} onClose={() => setShowCreate(false)} />
      <DeleteConfirmModal
        dept={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(undefined); }}
        isPending={deleteMutation.isPending}
        errorMsg={deleteError}
      />
      <EditDepartmentModal dept={editTarget} onClose={() => setEditTarget(null)} />
    </div>
  );
}
