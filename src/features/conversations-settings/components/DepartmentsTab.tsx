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
  IconArrowLeft,
  IconShieldLock,
  IconInfoCircle,
  IconAdjustmentsHorizontal,
  IconRotateClockwise,
  IconUserCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { InputGlass } from "@/components/crm/input-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";
import { PageActionsMenu } from "@/components/crm/page-toolbar";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { FormSheet } from "@/components/ui/form-sheet";
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
    <FormSheet
      open={open}
      onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}
      busy={createMutation.isPending}
      icon={<DeptIcon name={iconName} size={20} color={color} />}
      title="Novo departamento"
      description={name.trim() || undefined}
      footer={
        <>
          <button type="button" onClick={() => { reset(); onClose(); }}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
            Cancelar
          </button>
          <ButtonGlass type="submit" form="new-dept-form" variant="primary" disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending ? "Criando…" : "Criar"}
          </ButtonGlass>
        </>
      }
    >
      <form id="new-dept-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
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
      </form>
    </FormSheet>
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
  //
  // IMPORTANTE: dependemos de uma CHAVE STRING estável (ids ordenados),
  // não do array `currentMembers`. Como `useDepartmentMembers` retorna
  // `data` = undefined enquanto a query está desabilitada (dept=null) ou
  // carregando, o fallback `= []` cria uma NOVA referência a cada render.
  // Depender do array faria o efeito rodar em todo render → setState →
  // re-render → loop infinito (congela a tela toda). A chave string só
  // muda quando o conjunto de membros realmente muda.
  const membersKey = currentMembers.map((m) => m.user.id).sort().join(",");
  React.useEffect(() => {
    setMemberIds(new Set(membersKey ? membersKey.split(",") : []));
  }, [membersKey]);

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
    <FormSheet
      open={!!dept}
      onOpenChange={(v) => { if (!v) onClose(); }}
      busy={saving}
      icon={dept ? <DeptIcon name={icon} size={20} color={color} /> : undefined}
      title="Editar departamento"
      description={dept?.name}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] px-4 py-1.5 font-display text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)]">
            Cancelar
          </button>
          <ButtonGlass type="button" variant="primary" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? "Salvando…" : "Salvar"}
          </ButtonGlass>
        </>
      }
    >
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
    </FormSheet>
  );
}

// ─── List row (master) ─────────────────────────────────────────────────────────

function DeptListRow({ dept, active, onSelect }: { dept: Department; active: boolean; onSelect: () => void }) {
  const members = dept._count?.members;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-2.5 text-left transition-all",
        active
          ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8 shadow-[0_2px_8px_rgba(100,130,180,0.12)]"
          : "border-transparent hover:bg-white/60",
      )}
    >
      <DeptIconBadge dept={dept} size={38} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[13.5px] font-bold text-[var(--text-primary)]">{dept.name}</p>
        <p className="truncate font-body text-[12px] text-[var(--text-muted)]">
          {typeof members === "number" ? `${members} ${members === 1 ? "membro" : "membros"}` : "Sem membros"}
        </p>
      </div>
      <IconChevronRight
        size={15}
        className={cn(
          "shrink-0 text-[var(--brand-primary)] transition-opacity",
          active ? "opacity-80" : "opacity-0 group-hover:opacity-50",
        )}
      />
    </button>
  );
}

// ─── Detail (master-detail right pane) ─────────────────────────────────────────

function StatBox({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-3">
      <p className="font-display text-[22px] font-extrabold leading-none text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 font-body text-[11.5px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function DepartmentDetail({
  dept,
  onEdit,
  onDelete,
  onBack,
}: {
  dept: Department | null;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const { data: members = [], isLoading } = useDepartmentMembers(dept?.id ?? null);

  if (!dept) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
          <IconBuilding size={24} className="text-[var(--text-muted)] opacity-50" />
        </div>
        <p className="font-display text-[14px] font-semibold text-[var(--text-primary)]">Selecione um departamento</p>
        <p className="max-w-[38ch] font-body text-[12.5px] text-[var(--text-muted)]">
          Escolha um departamento na lista para ver membros, isolamento de dados e ações.
        </p>
      </div>
    );
  }

  const memberCount = members.length || dept._count?.members || 0;
  const conversations = dept._count?.conversations ?? 0;

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow,0_8px_32px_rgba(100,130,180,0.18))]">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-[var(--glass-border-subtle)] p-5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] lg:hidden"
          aria-label="Voltar"
        >
          <IconArrowLeft size={18} />
        </button>
        <DeptIconBadge dept={dept} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">{dept.name}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/12 px-2.5 py-0.5 font-display text-[11px] font-bold text-[var(--color-success)]">
              <IconShieldLock size={12} /> Isolado
            </span>
          </div>
          <p className="mt-1 font-body text-[12.5px] text-[var(--text-muted)]">Criado em {formatDate(dept.createdAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ButtonGlass variant="glass" size="sm" onClick={onEdit} className="gap-1.5">
            <IconPencil size={13} /> Editar
          </ButtonGlass>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] text-[var(--text-muted)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            aria-label="Excluir"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox value={memberCount} label="Membros" />
          <StatBox value={conversations} label="Conversas" />
          <StatBox value={dept.requireTabulationOnClose ? "Sim" : "Não"} label="Tabular ao fechar" />
        </div>

        {/* Isolation note */}
        <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/6 px-4 py-3">
          <IconInfoCircle size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />
          <p className="font-body text-[12.5px] leading-relaxed text-[var(--text-secondary,var(--text-muted))]">
            <strong className="font-semibold text-[var(--text-primary)]">Isolamento de dados:</strong> atendentes escopados a este
            departamento só veem as conversas dele. O escopo de caixa de entrada é definido em{" "}
            <strong className="font-semibold text-[var(--text-primary)]">Conversas → Atendentes</strong> (departamentos permitidos).
            O vínculo de membros abaixo define a composição do time.
          </p>
        </div>

        {/* Members */}
        <div>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="font-display text-[13px] font-bold text-[var(--text-secondary)]">Membros</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--glass-bg-strong)] px-1.5 font-display text-[10.5px] font-bold text-[var(--text-muted)]">
              {memberCount}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[52px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-6 text-center">
              <IconUsers size={18} className="mx-auto mb-1.5 text-[var(--text-muted)] opacity-40" />
              <p className="font-body text-[12.5px] text-[var(--text-muted)]">Nenhum membro vinculado ainda.</p>
              <button
                type="button"
                onClick={onEdit}
                className="mt-2 font-display text-[12.5px] font-semibold text-[var(--brand-primary)] hover:underline"
              >
                Adicionar membros →
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
              <div className="flex flex-col divide-y divide-[var(--glass-border-subtle)]">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-[var(--glass-bg-overlay)] px-4 py-2.5">
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.user.avatarUrl} alt={m.user.name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 font-display text-[12px] font-bold text-[var(--brand-primary)]">
                        {m.user.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">{m.user.name}</p>
                      <p className="truncate font-body text-[11.5px] text-[var(--text-muted)]">{m.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component (master-detail) ─────────────────────────────────────────────

export function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "with" | "without">("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | undefined>();
  const [editTarget, setEditTarget] = React.useState<Department | null>(null);

  const stats = React.useMemo(() => {
    let members = 0;
    let conversations = 0;
    let withMembers = 0;
    for (const d of departments) {
      const m = d._count?.members ?? 0;
      members += m;
      conversations += d._count?.conversations ?? 0;
      if (m > 0) withMembers += 1;
    }
    return {
      total: departments.length,
      members,
      conversations,
      withMembers,
      withoutMembers: departments.length - withMembers,
    };
  }, [departments]);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return departments.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q)) return false;
      const m = d._count?.members ?? 0;
      if (filter === "with" && m === 0) return false;
      if (filter === "without" && m > 0) return false;
      return true;
    });
  }, [departments, search, filter]);

  // Auto-seleciona o primeiro no desktop; mantém seleção válida após filtro/exclusão.
  React.useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((d) => d.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((d) => d.id === selectedId) ?? null;

  const headerSlots = useSettingsHeaderSlots();

  const searchNode = React.useMemo(
    () => (
      <DepartmentsSearchFilterBar
        search={search}
        onSearch={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        counts={{ all: stats.total, with: stats.withMembers, without: stats.withoutMembers }}
        onClearAll={() => {
          setSearch("");
          setFilter("all");
        }}
      />
    ),
    [search, filter, stats.total, stats.withMembers, stats.withoutMembers],
  );

  const actionsNode = React.useMemo(
    () => <DepartmentsActionsMenu onCreate={() => setShowCreate(true)} />,
    [],
  );

  React.useEffect(() => {
    if (!headerSlots) return;
    headerSlots.setCenter(searchNode);
    headerSlots.setActions(actionsNode);
    return () => {
      headerSlots.setCenter(null);
      headerSlots.setActions(null);
    };
  }, [headerSlots, searchNode, actionsNode]);

  function selectDept(id: string) {
    setSelectedId(id);
    setMobileDetail(true);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Departamento excluído");
        setDeleteTarget(null);
        setDeleteError(undefined);
        setMobileDetail(false);
      },
      onError: (err: unknown) => setDeleteError((err as Error).message),
    });
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-4">
      <DepartmentsMiniDash stats={stats} className={cn(mobileDetail && "hidden lg:grid")} />

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── Master: lista ── */}
        <div className={cn("min-w-0 flex-col gap-3", mobileDetail ? "hidden lg:flex" : "flex")}>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[58px] animate-pulse rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
                <IconBuilding size={24} className="text-[var(--text-muted)] opacity-50" />
              </div>
              <div>
                <p className="font-display text-[14px] font-semibold text-[var(--text-primary)]">
                  {search ? "Nenhum resultado" : "Nenhum departamento"}
                </p>
                <p className="mt-1 font-body text-[12.5px] text-[var(--text-muted)]">
                  {search ? "Tente outro termo." : "Crie o primeiro para começar."}
                </p>
              </div>
              {!search && (
                <ButtonGlass variant="primary" size="sm" onClick={() => setShowCreate(true)} className="mt-1 gap-1.5">
                  <IconPlus size={13} /> Criar departamento
                </ButtonGlass>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filtered.map((dept) => (
                <DeptListRow
                  key={dept.id}
                  dept={dept}
                  active={dept.id === selectedId}
                  onSelect={() => selectDept(dept.id)}
                />
              ))}
              <p className="mt-1 px-1 font-body text-[12px] text-[var(--text-muted)]">
                {filtered.length} departamento{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {/* ── Detail ── */}
        <div className={cn("min-w-0", mobileDetail ? "block" : "hidden lg:block")}>
          <DepartmentDetail
            dept={selected}
            onBack={() => setMobileDetail(false)}
            onEdit={() => selected && setEditTarget(selected)}
            onDelete={() => {
              if (!selected) return;
              setDeleteError(undefined);
              setDeleteTarget(selected);
            }}
          />
        </div>
      </div>

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

// ─── Mini-dash (KPIs globais) ──────────────────────────────────────────────────

function DepartmentsMiniDash({
  stats,
  className,
}: {
  stats: { total: number; members: number; conversations: number; withMembers: number };
  className?: string;
}) {
  const coverage = stats.total > 0 ? Math.round((stats.withMembers / stats.total) * 100) : 0;
  const cards: {
    key: string;
    label: string;
    value: string;
    percent?: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "total",
      label: "Departamentos",
      value: stats.total.toLocaleString("pt-BR"),
      accent: "var(--brand-primary)",
      icon: <IconBuilding size={16} stroke={2.2} />,
    },
    {
      key: "members",
      label: "Membros vinculados",
      value: stats.members.toLocaleString("pt-BR"),
      accent: "var(--brand-secondary, #a78bfa)",
      icon: <IconUsers size={16} />,
    },
    {
      key: "conversations",
      label: "Conversas",
      value: stats.conversations.toLocaleString("pt-BR"),
      accent: "var(--color-success)",
      icon: <IconMessageCircle size={16} />,
    },
    {
      key: "withMembers",
      label: `Com membros · de ${stats.total}`,
      value: stats.withMembers.toLocaleString("pt-BR"),
      percent: coverage,
      accent: "var(--text-muted)",
      icon: <IconUserCheck size={16} />,
    },
  ];

  return (
    <section
      className={cn("grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}
      aria-label="Indicadores"
    >
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `color-mix(in srgb, ${c.accent} 14%, transparent)`,
              color: c.accent,
            }}
          >
            {c.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[11.5px] font-semibold tracking-[0.01em] text-[var(--text-muted)]">
              {c.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[22px] font-bold leading-none text-[var(--text-primary)] tabular-nums">
                {c.value}
              </span>
              {c.percent !== undefined && (
                <span
                  className="font-display text-[12px] font-bold tabular-nums"
                  style={{ color: c.accent }}
                >
                  {c.percent}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Busca + popover de filtros segmentados ─────────────────────────────────────

function DeptCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

const DEPT_FILTERS: { value: "all" | "with" | "without"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "with", label: "Com membros" },
  { value: "without", label: "Sem membros" },
];

function DepartmentsSearchFilterBar({
  search,
  onSearch,
  filter,
  onFilterChange,
  counts,
  onClearAll,
}: {
  search: string;
  onSearch: (v: string) => void;
  filter: "all" | "with" | "without";
  onFilterChange: (v: "all" | "with" | "without") => void;
  counts: { all: number; with: number; without: number };
  onClearAll: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const activeCount = filter !== "all" ? 1 : 0;
  const countFor = (v: "all" | "with" | "without") =>
    v === "all" ? counts.all : v === "with" ? counts.with : counts.without;

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]">
        <IconBuilding size={15} />
      </span>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Buscar departamento…"
        aria-label="Buscar e filtrar departamentos"
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtros"
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
          activeCount > 0 || open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
        )}
      >
        <IconAdjustmentsHorizontal size={15} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(100vw-2rem,380px)] flex-col overflow-visible rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-left shadow-[var(--glass-shadow-lg)] backdrop-blur-md">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                Filtrar por membros
              </span>
              <DeptCountBadge count={activeCount} />
            </div>
            <button
              type="button"
              onClick={onClearAll}
              disabled={activeCount === 0 && !search}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {DEPT_FILTERS.map((opt) => {
                const selected = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onFilterChange(opt.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                      selected
                        ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                    )}
                  >
                    {selected && <IconCheck size={12} stroke={2.4} />}
                    {opt.label}
                    <span
                      className={cn(
                        "min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-bold",
                        selected
                          ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]"
                          : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                      )}
                    >
                      {countFor(opt.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Menu hamburger (CTAs da página) ────────────────────────────────────────────

function DepartmentsActionsMenu({ onCreate }: { onCreate: () => void }) {
  return (
    <PageActionsMenu
      items={[
        {
          icon: <IconPlus size={14} stroke={2.6} />,
          label: "Criar departamento",
          onClick: onCreate,
          primary: true,
        },
      ]}
    />
  );
}
