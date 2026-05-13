"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Check,
  ChevronDown,
  Mail,
  Package,
  Pencil,
  Phone,
  Plus,
  X,
} from "lucide-react";

import { useConfirm } from "@/hooks/use-confirm";
import { CustomFieldsSection } from "@/components/contacts/custom-fields-section";
import { DealCustomFieldsSection } from "@/components/pipeline/deal-custom-fields-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipHost } from "@/components/ui/tooltip";
import { ds } from "@/lib/design-system";
import {
  cn,
  dealNumericValue,
  formatCurrency,
  getInitials,
} from "@/lib/utils";

import type {
  CatalogProduct,
  ContactDetail,
  DealDetailData,
  DealProductItem,
  UserOption,
} from "./shared";

// ─────────────────────────────────────────────────────────────────────────────
// WorkspaceSidebar — coluna esquerda dados/input
//
// Alinhado ao DNA visual do Sales Hub (`deal-queue.tsx` + `ds.*`):
//  - cards flat hairline (`ds.card.base` — rounded-2xl border-black/6 bg-white,
//    SEM shadow no idle); shadow só em popovers
//  - labels engineering canônicos do DS: `text-[11px] font-medium uppercase
//    tracking-wide text-slate-400` — peso 500, não 900 (o "carregado" do
//    tracking-widest 900 destoava da leveza do saleshub)
//  - dropdowns (etapa, responsável) seguem o mesmo padrão dos pickers do
//    `deal-queue` — ícone à esquerda, label centralizada, chevron à direita,
//    surface idêntica aos cards flat
//  - valores monetários `font-black tabular-nums` (mantido — é parte da
//    identidade do produto)
//  - reaproveita `DealCustomFieldsSection` e `CustomFieldsSection` externos
// ─────────────────────────────────────────────────────────────────────────────

const TAG_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#f97316", "#16a34a", "#0891b2", "#dc2626", "#475569"];

type StageOption = { id: string; name: string; color?: string };

type WorkspaceSidebarProps = {
  deal: DealDetailData;
  contact: ContactDetail;
  users: UserOption[];
  stageOptions: StageOption[];
  onStageChange: (stageId: string) => void;
  stagePending: boolean;
  onOwnerChange: (ownerId: string | null) => void;
  ownerPending: boolean;
  onContactUpdate: (data: Record<string, unknown>) => void;
  isUpdating: boolean;
};

export function WorkspaceSidebar({
  deal,
  contact,
  users,
  stageOptions,
  onStageChange,
  stagePending,
  onOwnerChange,
  ownerPending,
  onContactUpdate,
  isUpdating,
}: WorkspaceSidebarProps) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [editingBasic, setEditingBasic] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", email: "", phone: "" });
  const [tagInput, setTagInput] = React.useState("");
  const [tagColor, setTagColor] = React.useState("#6366f1");
  const [showTagComposer, setShowTagComposer] = React.useState(false);

  const addTagMutation = useMutation({
    mutationFn: async ({ tagId, tagName, color }: { tagId?: string; tagName?: string; color?: string }) => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}/tags`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagId ? { tagId } : { tagName, color }),
      });
      if (!res.ok) throw new Error("Erro ao adicionar tag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", deal.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
      setTagInput("");
      setShowTagComposer(false);
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}/tags`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error("Erro ao remover tag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", deal.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const startEdit = () => {
    setDraft({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });
    setEditingBasic(true);
  };

  const saveBasic = () => {
    const payload: Record<string, unknown> = {};
    if (draft.name.trim() !== contact.name) payload.name = draft.name.trim();
    if (draft.email.trim() !== (contact.email ?? "")) payload.email = draft.email.trim() || null;
    if (draft.phone.trim() !== (contact.phone ?? "")) payload.phone = draft.phone.trim() || null;
    if (Object.keys(payload).length > 0) onContactUpdate(payload);
    setEditingBasic(false);
  };

  const value = dealNumericValue(deal.value);
  const dealTags = deal.tags ?? [];

  return (
    <div className="space-y-3">
      {/* HERO — título do deal + valor + stage juntos
          Como o header agora segue o padrão do Inbox/SalesHub (foco no
          contato), o título do deal migrou para cá. Fica como linha
          label+nome-do-deal discreta acima do valor, preservando a
          hierarquia: valor continua sendo o elemento mais pesado, com
          o título como "o que" e a etapa como "onde". */}
      <WorkspaceCard>
        <WorkspaceLabel>Negócio</WorkspaceLabel>
        <p
          className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-900"
          title={deal.title}
        >
          {deal.title}
        </p>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <WorkspaceLabel>Valor do negocio</WorkspaceLabel>
          <p className="mt-1 text-[22px] font-extrabold tabular-nums tracking-tight text-slate-900">
            {formatCurrency(value)}
          </p>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <WorkspaceLabel>{deal.stage.pipeline.name}</WorkspaceLabel>
          <div className="mt-2">
            <StageDropdown
              stages={stageOptions}
              currentStageId={deal.stage.id}
              onChange={onStageChange}
              isPending={stagePending}
            />
          </div>
        </div>
      </WorkspaceCard>

      {/* RESPONSAVEL */}
      <WorkspaceCard>
        <WorkspaceLabel>Responsavel</WorkspaceLabel>
        <div className="mt-2">
          <OwnerSelector
            currentOwner={deal.owner}
            users={users}
            onChange={onOwnerChange}
            isPending={ownerPending}
          />
        </div>
      </WorkspaceCard>

      {/* TAGS */}
      <WorkspaceCard>
        <div className="flex items-center justify-between">
          <WorkspaceLabel>Tags</WorkspaceLabel>
          {!showTagComposer ? (
            <TooltipHost label="Adicionar tag" side="left">
              <button
                type="button"
                onClick={() => setShowTagComposer(true)}
                aria-label="Adicionar tag"
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full",
                  "text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 active:scale-95",
                )}
              >
                <Plus className="size-3.5" strokeWidth={2.4} />
              </button>
            </TooltipHost>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {dealTags.length > 0 ? (
            dealTags.map(({ tag }) => (
              <TagPill
                key={tag.id}
                tag={tag}
                onRemove={() => removeTagMutation.mutate(tag.id)}
                isPending={removeTagMutation.isPending}
              />
            ))
          ) : !showTagComposer ? (
            <span className="text-[13px] tracking-tight text-slate-400">Sem tags</span>
          ) : null}
        </div>
        <TagComposer
          open={showTagComposer}
          draft={tagInput}
          setDraft={setTagInput}
          color={tagColor}
          setColor={setTagColor}
          canCreateTag={canCreateTag}
          existingTagIds={new Set(dealTags.map((t) => t.tag.id))}
          onSubmit={() => {
            if (tagInput.trim()) addTagMutation.mutate({ tagName: tagInput.trim(), color: tagColor });
          }}
          onSelectExisting={(tag) => addTagMutation.mutate({ tagId: tag.id })}
          isPending={addTagMutation.isPending}
          onClose={() => setShowTagComposer(false)}
        />
      </WorkspaceCard>

      {/* PRODUTOS */}
      <ProductsCard dealId={deal.id} />

      {/* CUSTOM FIELDS — DEAL */}
      <WorkspaceCard padding="tight">
        <DealCustomFieldsSection dealId={deal.id} />
      </WorkspaceCard>

      {/* CUSTOM FIELDS — CONTATO */}
      <WorkspaceCard padding="tight">
        <CustomFieldsSection contactId={contact.id} />
      </WorkspaceCard>

      {/* CONTATO */}
      <WorkspaceCard>
        <div className="flex items-center justify-between">
          <WorkspaceLabel>Contato</WorkspaceLabel>
          {!editingBasic ? (
            <TooltipHost label="Editar contato" side="left">
              <button
                type="button"
                onClick={startEdit}
                aria-label="Editar contato"
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full",
                  "text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 active:scale-95",
                )}
              >
                <Pencil className="size-3.5" strokeWidth={2.2} />
              </button>
            </TooltipHost>
          ) : (
            <div className="flex gap-1">
              <TooltipHost label="Cancelar" side="left">
                <button
                  type="button"
                  onClick={() => setEditingBasic(false)}
                  aria-label="Cancelar"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <X className="size-3" />
                </button>
              </TooltipHost>
              <TooltipHost label="Salvar" side="left">
                <button
                  type="button"
                  onClick={saveBasic}
                  disabled={isUpdating}
                  aria-label="Salvar"
                  className="inline-flex size-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Check className="size-3" strokeWidth={2.4} />
                </button>
              </TooltipHost>
            </div>
          )}
        </div>

        {editingBasic ? (
          <div className="mt-2 space-y-2">
            {(
              [
                ["Nome", "name", "text"],
                ["E-mail", "email", "email"],
                ["Telefone", "phone", "tel"],
              ] as const
            ).map(([label, key, type]) => (
              <div key={key} className="grid gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {label}
                </label>
                <Input
                  type={type}
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-9 rounded-xl border-slate-200 bg-slate-50 text-sm"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-slate-900">
              <Avatar className="size-7 border border-slate-200 bg-slate-100">
                <AvatarFallback className="bg-slate-100 text-[10px] font-black text-slate-700">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{contact.name}</span>
            </div>
            {contact.email ? (
              <ContactRow icon={<Mail className="size-3.5" />} value={contact.email} copyable />
            ) : null}
            {contact.phone ? (
              <ContactRow icon={<Phone className="size-3.5" />} value={contact.phone} copyable />
            ) : null}
            {contact.company ? (
              <span
                className={cn(
                  "mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50",
                  "px-2 py-0.5 text-[11px] font-bold tracking-tight text-slate-600",
                )}
              >
                {contact.company.name}
              </span>
            ) : null}
          </div>
        )}
      </WorkspaceCard>

      {/* RELACIONAMENTO — outros deals */}
      {contact.deals.length > 1 ? (
        <WorkspaceCard>
          <WorkspaceLabel>{`Relacionamento (${contact.deals.length - 1})`}</WorkspaceLabel>
          <div className="mt-2 grid gap-1.5">
            {contact.deals
              .filter((d) => d.id !== deal.id)
              .map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60",
                    "px-3 py-2 text-[13px] tracking-tight",
                  )}
                >
                  <span className="truncate font-semibold text-slate-700">{d.title}</span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                    style={{
                      backgroundColor: `${d.stage.color}15`,
                      color: d.stage.color,
                      border: `1px solid ${d.stage.color}30`,
                    }}
                  >
                    {d.stage.name}
                  </span>
                </div>
              ))}
          </div>
        </WorkspaceCard>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Cards & labels canonicos do workspace
// ──────────────────────────────────────────────────────────────────────────

function WorkspaceCard({
  children,
  padding = "default",
  className,
}: {
  children: React.ReactNode;
  padding?: "default" | "tight";
  className?: string;
}) {
  return (
    <div
      className={cn(
        ds.card.base,
        padding === "default" ? "p-4" : "p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function WorkspaceLabel({ children }: { children: React.ReactNode }) {
  return <span className={ds.text.label}>{children}</span>;
}

function ContactRow({
  icon,
  value,
  copyable,
}: {
  icon: React.ReactNode;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-[13px] tracking-tight text-slate-600">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span
        className={cn("truncate", copyable && "cursor-pointer hover:text-[#507df1]")}
        onClick={() => { if (copyable) navigator.clipboard?.writeText(value); }}
      >
        {value}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Stage dropdown — pipeline progress + lista
// ──────────────────────────────────────────────────────────────────────────

function StageDropdown({
  stages,
  currentStageId,
  onChange,
  isPending,
}: {
  stages: StageOption[];
  currentStageId: string;
  onChange: (stageId: string) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const currentIdx = stages.findIndex((s) => s.id === currentStageId);
  const current = stages[currentIdx];

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const stageColor = current?.color ?? "#94a3b8";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-black/6 bg-white",
          "px-3 py-2 text-left transition-all hover:border-black/10",
          open && "border-blue-300 shadow-[0_0_0_3px_rgba(37,99,235,0.10)]",
          isPending && "cursor-wait opacity-70",
        )}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${stageColor}14`, color: stageColor }}
        >
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: stageColor }}
            aria-hidden
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-tight text-slate-800">
          {current?.name ?? "—"}
        </span>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400">
          {currentIdx + 1}/{stages.length}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600",
            open && "rotate-180 text-blue-600",
          )}
          strokeWidth={2.5}
        />
      </button>

      {/* Progress hairline — barra de progresso da etapa atual no funil.
          Mantida porque é informação útil ("você está no 3/7"); altura
          reduzida pra 1px (era 1.5) e gap removido pra ficar mais discreta. */}
      <div className="mt-2 flex h-[2px] w-full overflow-hidden rounded-full bg-slate-100">
        {stages.map((stage, i) => {
          const isPast = i <= currentIdx;
          return (
            <div
              key={stage.id}
              className="h-full transition-all"
              style={{
                flex: 1,
                backgroundColor: isPast ? (stage.color ?? "#cbd5e1") : "transparent",
                marginRight: i < stages.length - 1 ? 1 : 0,
              }}
            />
          );
        })}
      </div>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-50",
            ds.popover.base,
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className={ds.text.label}>Mover para</span>
            <span className="text-[10px] font-medium tabular-nums text-slate-400">
              {stages.length} etapas
            </span>
          </div>
          <ul role="listbox" className="max-h-[320px] overflow-y-auto py-1">
            {stages.map((stage) => {
              const isActive = stage.id === currentStageId;
              const color = stage.color ?? "#94a3b8";
              return (
                <li key={stage.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { onChange(stage.id); setOpen(false); }}
                    disabled={isPending || isActive}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-bold",
                      "tracking-tight text-slate-700 transition-colors hover:bg-slate-50",
                      isActive && "cursor-default bg-blue-50/60 text-blue-700",
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="truncate">{stage.name}</span>
                    {isActive && (
                      <Check
                        className="ml-auto size-3.5 shrink-0 text-blue-600"
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Owner selector
// ──────────────────────────────────────────────────────────────────────────

function OwnerSelector({
  currentOwner,
  users,
  onChange,
  isPending,
}: {
  currentOwner: DealDetailData["owner"];
  users: UserOption[];
  onChange: (ownerId: string | null) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const currentStatus = users.find((u) => u.id === currentOwner?.id)?.agentStatus?.status ?? "OFFLINE";

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-black/6 bg-white px-3 py-2",
          "text-left transition-all hover:border-black/10",
          open && "border-blue-300 shadow-[0_0_0_3px_rgba(37,99,235,0.10)]",
        )}
      >
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
          {currentOwner?.name ? getInitials(currentOwner.name) : "?"}
          {currentOwner?.name ? <PresenceDot status={currentStatus} /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold tracking-tight text-slate-800">
            {currentOwner?.name ?? "Sem responsável"}
          </div>
          {currentOwner?.name ? (
            <div className="text-[11px] text-slate-400">
              {presenceLabel(currentStatus)}
            </div>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600",
            open && "rotate-180 text-blue-600",
          )}
          strokeWidth={2.5}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto",
            ds.popover.base,
          )}
        >
          <div className="border-b border-slate-100 px-3 py-2">
            <span className={ds.text.label}>Responsável</span>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">?</span>
              Sem responsável
            </button>
            {users.map((u) => {
              const isCurrent = currentOwner?.id === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
                    isCurrent ? "bg-blue-50/60" : "hover:bg-slate-50",
                  )}
                >
                  <div className="relative flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                    {getInitials(u.name)}
                    <PresenceDot status={u.agentStatus?.status ?? "OFFLINE"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold tracking-tight text-slate-800">
                      {u.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {presenceLabel(u.agentStatus?.status ?? "OFFLINE")}
                    </span>
                  </div>
                  {isCurrent && (
                    <Check className="size-3.5 shrink-0 text-blue-600" strokeWidth={2.5} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PresenceDot({ status }: { status: "ONLINE" | "OFFLINE" | "AWAY" }) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 inline-flex size-2.5 rounded-full ring-2 ring-white",
        status === "ONLINE" && "bg-[#22c55e]",
        status === "AWAY" && "bg-amber-400",
        status === "OFFLINE" && "bg-slate-400",
      )}
      aria-hidden
    />
  );
}

function presenceLabel(status: "ONLINE" | "OFFLINE" | "AWAY") {
  if (status === "ONLINE") return "Online";
  if (status === "AWAY") return "Ausente";
  return "Offline";
}

// ──────────────────────────────────────────────────────────────────────────
// Tags
// ──────────────────────────────────────────────────────────────────────────

function TagPill({
  tag,
  onRemove,
  isPending,
}: {
  tag: { id: string; name: string; color: string };
  onRemove: () => void;
  isPending: boolean;
}) {
  const background = tag.color?.trim() || "#2563eb";
  return (
    <span
      className={ds.tag.solidEditable}
      style={{ backgroundColor: background }}
    >
      <span className="max-w-[120px] truncate">{tag.name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending}
        className="rounded-full p-0.5 opacity-70 transition hover:bg-white/15 hover:opacity-100 disabled:pointer-events-none"
        aria-label={`Remover tag ${tag.name}`}
      >
        <X className="size-2.5" />
      </button>
    </span>
  );
}

function TagComposer({
  open,
  draft,
  setDraft,
  color,
  setColor,
  canCreateTag,
  existingTagIds,
  onSubmit,
  onSelectExisting,
  isPending,
  onClose,
}: {
  open: boolean;
  draft: string;
  setDraft: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  canCreateTag: boolean;
  existingTagIds: Set<string>;
  onSubmit: () => void;
  onSelectExisting: (tag: { id: string; name: string; color: string }) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/tags"));
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
    enabled: open,
  });
  const suggestions = (allTags as { id: string; name: string; color: string }[]).filter(
    (t) => !existingTagIds.has(t.id) && t.name.toLowerCase().includes(draft.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreateTag) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={canCreateTag ? "Buscar ou criar tag" : "Buscar tag"}
          className="h-7 border-0 bg-transparent px-0 text-sm text-slate-700 shadow-none focus-visible:ring-0"
          autoFocus
        />
        {canCreateTag ? (
          <Button
            type="button"
            variant="ghost"
            className="h-7 rounded-md px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            onClick={onSubmit}
            disabled={!draft.trim() || isPending}
          >
            Criar
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 rounded-md text-slate-500 hover:bg-slate-100"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-3" />
        </Button>
      </div>
      {draft && suggestions.length > 0 ? (
        <div className="mt-1.5 max-h-28 overflow-y-auto rounded-md border border-slate-200 bg-white">
          {suggestions.slice(0, 8).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectExisting(t)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: t.color || "#6b7280" }} />
              {t.name}
            </button>
          ))}
        </div>
      ) : null}
      {canCreateTag ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "size-3.5 rounded-full border transition",
                color === c ? "scale-110 border-slate-500 ring-2 ring-slate-200" : "border-white",
              )}
              style={{ backgroundColor: c }}
              aria-label={`Selecionar cor ${c}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Produtos
// ──────────────────────────────────────────────────────────────────────────

function ProductsCard({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();
  const [showAdd, setShowAdd] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const itemsKey = ["deal-products", dealId] as const;

  const { data: items = [] } = useQuery({
    queryKey: itemsKey,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products`));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []) as DealProductItem[];
    },
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["products-catalog", search],
    queryFn: async () => {
      const params = new URLSearchParams({ perPage: "20" });
      if (search) params.set("search", search);
      const res = await fetch(apiUrl(`/api/products?${params}`));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.products ?? []) as CatalogProduct[];
    },
    enabled: showAdd,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: itemsKey });
    queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
    queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
  };

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => { invalidate(); setShowAdd(false); setSearch(""); },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products/${itemId}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: invalidate,
  });

  const total = items.reduce((s, i) => s + i.total, 0);

  return (
    <WorkspaceCard>
      <div className="flex items-center justify-between">
        <WorkspaceLabel>{`Produtos${items.length > 0 ? ` (${items.length})` : ""}`}</WorkspaceLabel>
        <TooltipHost label={showAdd ? "Fechar" : "Adicionar produto"} side="left">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            aria-label={showAdd ? "Fechar" : "Adicionar produto"}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-full",
              "text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 active:scale-95",
            )}
          >
            <Plus className={cn("size-3.5 transition-transform", showAdd && "rotate-45")} strokeWidth={2.4} />
          </button>
        </TooltipHost>
      </div>

      {showAdd ? (
        <div className="mt-2 space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="h-9 rounded-xl border-slate-200 bg-slate-50 text-sm"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {catalog.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-slate-400">Nenhum produto encontrado</p>
            ) : (
              catalog.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addMutation.mutate(p.id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold tracking-tight text-slate-700">
                    {p.name}
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-emerald-600">
                    {formatCurrency(Number(p.price))}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        !showAdd ? (
          <p className="mt-2 text-[13px] tracking-tight text-slate-400">Nenhum produto vinculado</p>
        ) : null
      ) : (
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl border border-black/6",
                "bg-slate-50/50 px-3 py-2 transition-colors hover:bg-slate-50",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500">
                <Package className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold tracking-tight text-slate-800">
                  {item.productName}
                </span>
                <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                  {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <span className="shrink-0 text-[13px] font-black tabular-nums tracking-tight text-slate-900">
                {formatCurrency(item.total)}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmDialog({
                    title: "Remover item",
                    description: "Remover este item?",
                    confirmLabel: "Remover",
                    variant: "destructive",
                  });
                  if (ok) removeMutation.mutate(item.id);
                }}
                className="rounded-full p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                aria-label="Remover"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
            <WorkspaceLabel>Total</WorkspaceLabel>
            <span className="text-[15px] font-black tabular-nums tracking-tight text-slate-900">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      )}
    </WorkspaceCard>
  );
}
