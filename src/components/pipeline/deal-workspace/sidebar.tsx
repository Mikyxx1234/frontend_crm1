"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
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
import { useFieldLayout } from "@/hooks/use-field-layout";
import { CustomFieldsSection } from "@/components/contacts/custom-fields-section";
import { DealCustomFieldsSection } from "@/components/pipeline/deal-custom-fields-section";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { SortableSidebar } from "@/components/ui/sortable-sidebar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { TooltipHost } from "@/components/ui/tooltip";
import { ds } from "@/lib/design-system";
import { dt } from "@/lib/design-tokens";
import type { SectionConfig } from "@/lib/field-layout";
import {
  cn,
  dealNumericValue,
  formatCurrency,
  formatDate,
  getInitials,
  tagPillStyle,
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
//    tracking-wide text-[var(--color-ink-muted)]` — peso 500, não 900 (o "carregado" do
//    tracking-widest 900 destoava da leveza do saleshub)
//  - dropdowns (etapa, responsável) seguem o mesmo padrão dos pickers do
//    `deal-queue` — ícone à esquerda, label centralizada, chevron à direita,
//    surface idêntica aos cards flat
//  - valores monetários `font-bold tabular-nums` (mantido — é parte da
//    identidade do produto)
//  - modo `density="compact"`: lista flat Kommo (label|valor); cabeçalho
//    petróleo em `WorkspaceCompactDealLeader` (index); campos custom `kompact`.
//  - reaproveita `DealCustomFieldsSection` e `CustomFieldsSection` externos
// ─────────────────────────────────────────────────────────────────────────────

const TAG_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#f97316", "#16a34a", "#0891b2", "#dc2626", "#475569"];

function SidebarSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pt-3 pb-1", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{children}</span>
    </div>
  );
}

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
  /** Atualização parcial do negócio (ex.: previsão de fechamento). */
  onDealUpdate?: (data: Record<string, unknown>) => void;
  dealUpdatePending?: boolean;
  /** Painel direito denso (layout 3 colunas Kommo-like). */
  density?: "default" | "compact";
};

/** Cabeçalho petróleo + progresso — renderizado acima das tabs no `DealWorkspace`. */
export function WorkspaceCompactDealLeader({
  deal,
  stageOptions,
  onStageChange,
  stagePending,
}: {
  deal: DealDetailData;
  stageOptions: StageOption[];
  onStageChange: (stageId: string) => void;
  stagePending: boolean;
}) {
  const stageIdx = stageOptions.findIndex((s) => s.id === deal.stage.id);
  const nStages = Math.max(1, stageOptions.length);
  const pos = Math.max(1, (stageIdx >= 0 ? stageIdx : 0) + 1);
  const progressWidth = Math.max(4, Math.round((pos / nStages) * 100));
  const numVal = dealNumericValue(deal.value);

  return (
    <div className={cn(dt.workspace.leader)}>
      <div className="px-4 pb-3 pt-3">
        <p className={dt.workspace.leaderLabel}>Negócio</p>
        <TooltipHost label={deal.title} side="top">
          <p className={dt.workspace.leaderTitle}>
            {deal.title}
          </p>
        </TooltipHost>
        <div className="flex items-center justify-between gap-2">
          <StageDropdown
            stages={stageOptions}
            currentStageId={deal.stage.id}
            onChange={onStageChange}
            isPending={stagePending}
            petroleumHeader
            chevronClassName="text-sky-400/60"
            className="text-[12px] font-semibold text-sky-300 transition-colors hover:text-sky-200"
          />
          {numVal > 0 ? (
            <span className={dt.workspace.leaderValue}>{formatCurrency(numVal)}</span>
          ) : null}
        </div>
        <div className="mt-2.5">
          <div className={dt.workspace.leaderBarTrack}>
            <div className={dt.workspace.leaderBarFill} style={{ width: `${progressWidth}%` }} />
          </div>
          <p className={dt.workspace.leaderMeta}>
            {stageIdx >= 0 ? stageIdx + 1 : "—"} de {stageOptions.length} estágios
          </p>
        </div>
      </div>
    </div>
  );
}

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
  onDealUpdate,
  dealUpdatePending = false,
  density = "default",
}: WorkspaceSidebarProps) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [editingBasic, setEditingBasic] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", email: "", phone: "" });
  const [tagInput, setTagInput] = React.useState("");
  const [tagColor, setTagColor] = React.useState(TAG_COLORS[0]!);
  const [showTagComposer, setShowTagComposer] = React.useState(false);
  const [compactProductsAddOpen, setCompactProductsAddOpen] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState(false);
  const [draftSource, setDraftSource] = React.useState(contact.source ?? "");
  const [editingExpectedClose, setEditingExpectedClose] = React.useState(false);
  const [draftExpectedClose, setDraftExpectedClose] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);
  const { sections, isAdmin, hasAgentOverride, saveAdmin, saveAdminPending, saveAgent, resetAgent } =
    useFieldLayout("deal_workspace");

  React.useEffect(() => {
    setDraftSource(contact.source ?? "");
  }, [contact.source]);

  React.useEffect(() => {
    if (!editingExpectedClose) {
      setDraftExpectedClose(deal.expectedClose ? String(deal.expectedClose) : "");
    }
  }, [deal.expectedClose, editingExpectedClose]);

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

  const saveCompactSource = () => {
    const next = draftSource.trim();
    const prev = (contact.source ?? "").trim();
    if (next !== prev) onContactUpdate({ source: next || null });
    setEditingSource(false);
  };

  const normalizeExpectedClosePayload = (raw: string): string | null => {
    const t = raw.trim();
    if (!t) return null;
    if (t.length <= 10 && /^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T12:00:00.000Z`;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  const saveCompactExpectedClose = () => {
    if (!onDealUpdate) {
      setEditingExpectedClose(false);
      return;
    }
    const nextIso = normalizeExpectedClosePayload(draftExpectedClose);
    const prevIso = deal.expectedClose
      ? new Date(deal.expectedClose).toISOString()
      : null;
    if (nextIso !== prevIso) onDealUpdate({ expectedClose: nextIso });
    setEditingExpectedClose(false);
  };

  const value = dealNumericValue(deal.value);
  const dealTags = deal.tags ?? [];

  const compact = density === "compact";

  if (compact) {
    const telHref = contact.phone
      ? `tel:${String(contact.phone).replace(/\s/g, "")}`
      : undefined;

    const kommoRow =
      "flex items-center justify-between border-b border-border px-4 py-2.5 transition-colors hover:bg-slate-50";

    const renderSection = (section: SectionConfig) => {
      switch (section.id) {
        case "negocio":
          return (
            <div key="negocio">
              <SidebarSectionHeading>Negócio</SidebarSectionHeading>
              <div className={kommoRow}>
                <span className="text-[12px] text-[var(--color-ink-muted)]">Responsável</span>
                <OwnerSelector currentOwner={deal.owner} users={users} onChange={onOwnerChange} isPending={ownerPending} inlineMinimal />
              </div>
              <div className={kommoRow}>
                <span className="text-[12px] text-[var(--color-ink-muted)]">Origem</span>
                <div className="flex min-w-0 max-w-[70%] flex-1 items-center justify-end gap-1.5">
                  {editingSource ? (
                    <Input value={draftSource} onChange={(e) => setDraftSource(e.target.value)} placeholder="Origem do lead" className="h-7 min-w-0 flex-1 rounded-md border-border text-[12px]" />
                  ) : (
                    <span className={cn("truncate text-[12px] font-medium", contact.source ? "text-[var(--color-ink-soft)]" : dt.text.muted)}>{contact.source ?? "—"}</span>
                  )}
                  <button type="button" onClick={editingSource ? saveCompactSource : () => setEditingSource(true)} disabled={isUpdating} className="shrink-0 text-[var(--color-ink-muted)] hover:text-primary disabled:opacity-50">
                    {editingSource ? <Check className="size-3" /> : <Pencil className="size-3" />}
                  </button>
                </div>
              </div>
              <div className={kommoRow}>
                <span className="text-[12px] text-[var(--color-ink-muted)]">Previsão</span>
                <div className="flex min-w-0 max-w-[70%] flex-1 items-center justify-end gap-1.5">
                  {editingExpectedClose && onDealUpdate ? (
                    <div className="min-w-0 flex-1">
                      <DatePicker value={draftExpectedClose || null} onChange={(v) => setDraftExpectedClose(v)} placeholder="Data" className="w-full min-w-0 text-[12px]" disabled={dealUpdatePending} />
                    </div>
                  ) : (
                    <span className={cn("truncate text-[12px] font-medium", deal.expectedClose ? "text-[var(--color-ink-soft)]" : dt.text.muted)}>
                      {deal.expectedClose ? formatDate(deal.expectedClose) : "Indefinida"}
                    </span>
                  )}
                </div>
              </div>
              <div className={kommoRow}>
                <span className="text-[12px] text-[var(--color-ink-muted)]">Tags</span>
                <div className="flex max-w-[72%] flex-wrap items-center justify-end gap-1">
                  {dealTags.slice(0, 3).map(({ tag }) => (
                    <span key={tag.id} className={cn(dt.pill.sm, "max-w-full gap-1")} style={tagPillStyle(tag.name, tag.color)}>
                      {tag.name}
                    </span>
                  ))}
                  <button type="button" onClick={() => setShowTagComposer(true)} className="ml-0.5 text-base leading-none text-[var(--color-ink-muted)] transition-colors hover:text-primary">
                    +
                  </button>
                </div>
              </div>
              <TagComposer
                open={showTagComposer}
                draft={tagInput}
                setDraft={setTagInput}
                color={tagColor}
                setColor={setTagColor}
                canCreateTag={canCreateTag}
                existingTagIds={new Set(dealTags.map((t) => t.tag.id))}
                embedded
                onSubmit={() => {
                  if (tagInput.trim()) addTagMutation.mutate({ tagName: tagInput.trim(), color: tagColor });
                }}
                onSelectExisting={(tag) => addTagMutation.mutate({ tagId: tag.id })}
                isPending={addTagMutation.isPending}
                onClose={() => setShowTagComposer(false)}
              />
            </div>
          );
        case "produtos":
          return (
            <div key="produtos" className="border-b border-border">
              <div className="flex items-center justify-between px-4 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Produtos</span>
                <TooltipHost label={compactProductsAddOpen ? "Fechar" : "Adicionar produto"} side="left">
                  <button type="button" onClick={() => setCompactProductsAddOpen((v) => !v)} className="text-base leading-none text-[var(--color-ink-muted)] transition-colors hover:text-primary">
                    +
                  </button>
                </TooltipHost>
              </div>
              <div className="px-4 pb-2.5 pt-1">
                <ProductsCard dealId={deal.id} compact naked dense addPanelOpen={compactProductsAddOpen} onAddPanelOpenChange={setCompactProductsAddOpen} />
              </div>
            </div>
          );
        case "contato":
          return (
            <div key="contato">
              <div className="mt-1 border-t border-border">
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Contato</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); editingBasic ? saveBasic() : startEdit(); }} className="text-[var(--color-ink-muted)] transition-colors hover:text-primary">
                    {editingBasic ? <Check className="size-3" /> : <Pencil className="size-3" />}
                  </button>
                </div>
              </div>
              {editingBasic ? (
                <div className="flex flex-col gap-2 px-4 pb-3 pt-1">
                  <Input type="tel" value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} className="h-8 rounded-lg border-border text-[12px]" placeholder="Telefone" />
                  <Input type="email" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} className="h-8 rounded-lg border-border text-[12px]" placeholder="E-mail" />
                </div>
              ) : (
                <>
                  {contact.phone && telHref ? <div className={kommoRow}><span className="text-[12px] text-[var(--color-ink-muted)]">Telefone</span><a href={telHref} onClick={(e) => e.stopPropagation()} className="max-w-[60%] truncate text-[12px] font-medium text-primary hover:underline">{contact.phone}</a></div> : null}
                  {contact.email ? <div className={kommoRow}><span className="text-[12px] text-[var(--color-ink-muted)]">E-mail</span><a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()} className="max-w-[60%] truncate text-[12px] font-medium text-primary hover:underline">{contact.email}</a></div> : null}
                  {contact.company ? <div className={kommoRow}><span className="text-[12px] text-[var(--color-ink-muted)]">Empresa</span><span className="truncate text-[12px] font-medium text-[var(--color-ink-soft)]">{contact.company.name}</span></div> : null}
                </>
              )}
            </div>
          );
        case "campos_deal":
          return (
            <div key="campos_deal">
              <SidebarSectionHeading>Campos do negócio</SidebarSectionHeading>
              <DealCustomFieldsSection dealId={deal.id} variant="kompact" />
            </div>
          );
        case "campos_contato":
          return (
            <div key="campos_contato">
              <SidebarSectionHeading className="mt-1 border-t border-border">Campos do contato</SidebarSectionHeading>
              <CustomFieldsSection contactId={contact.id} variant="kompact" />
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
        <SortableSidebar
          sections={sections}
          isAdmin={isAdmin}
          hasAgentOverride={hasAgentOverride}
          editMode={editMode}
          onToggleEditMode={() => setEditMode((v) => !v)}
          onSaveAdmin={saveAdmin}
          onSaveAgent={saveAgent}
          onResetAgent={resetAgent}
          savePending={saveAdminPending}
          renderSection={renderSection}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <WorkspaceCard compact={false}>
        <div className="mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Negócio</span>
        </div>
        <TooltipHost label={deal.title} side="top">
          <p className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-slate-900">
            {deal.title}
          </p>
        </TooltipHost>
        {value > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <WorkspaceLabel>Valor do negocio</WorkspaceLabel>
          <p className="mt-1 text-[22px] font-extrabold tabular-nums tracking-tight text-slate-900">
            {formatCurrency(value)}
          </p>
        </div>
        ) : null}
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

      <WorkspaceCard compact={false}>
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

      <WorkspaceCard compact={false}>
        <div className="flex items-center justify-between">
          <WorkspaceLabel>Tags</WorkspaceLabel>
          {!showTagComposer ? (
            <TooltipHost label="Adicionar tag" side="left">
              <button
                type="button"
                onClick={() => setShowTagComposer(true)}
                aria-label="Adicionar tag"
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-md",
                  "text-[var(--color-ink-muted)] transition-colors hover:bg-slate-50 hover:text-foreground active:scale-95",
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
            <span className="text-[13px] tracking-tight text-[var(--color-ink-muted)]">Sem tags</span>
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

      <ProductsCard dealId={deal.id} compact={false} />

      <SidebarSectionHeading>Campos do negócio</SidebarSectionHeading>
      <WorkspaceCard compact={false} padding="tight">
        <DealCustomFieldsSection dealId={deal.id} />
      </WorkspaceCard>

      <SidebarSectionHeading>Campos do contato</SidebarSectionHeading>
      <WorkspaceCard compact={false} padding="tight">
        <CustomFieldsSection contactId={contact.id} />
      </WorkspaceCard>

      <SidebarSectionHeading>Contato</SidebarSectionHeading>
      <WorkspaceCard compact={false}>
        <div className="mb-2 flex items-center justify-end">
          {!editingBasic ? (
            <TooltipHost label="Editar contato" side="left">
              <button
                type="button"
                onClick={startEdit}
                aria-label="Editar contato"
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-md",
                  "text-[var(--color-ink-muted)] transition-colors hover:bg-slate-50 hover:text-foreground active:scale-95",
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
                  className="inline-flex size-6 items-center justify-center rounded-md border border-border bg-white text-slate-500 hover:bg-slate-50"
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
                  className="inline-flex size-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
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
                <label className="text-[10px] font-medium text-slate-400">
                  {label}
                </label>
                <Input
                  type={type}
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-9 rounded-xl border-border bg-[var(--color-bg-subtle)] text-sm"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-slate-900">
              <ChatAvatar
                user={{ id: contact.id, name: contact.name, imageUrl: contact.avatarUrl ?? null }}
                phone={contact.phone ?? undefined}
                size={28}
                channel="whatsapp"
                hideCartoon
              />
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
                  "mt-1 inline-flex items-center rounded-[4px] border border-border bg-[var(--color-bg-subtle)]",
                  "px-2 py-0.5 text-[12px] font-bold tracking-tight text-[var(--color-ink-soft)]",
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
        <WorkspaceCard compact={false}>
          <WorkspaceLabel>{`Relacionamento (${contact.deals.length - 1})`}</WorkspaceLabel>
          <div className="mt-2 grid gap-1.5">
            {contact.deals
              .filter((d) => d.id !== deal.id)
              .map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-slate-100 bg-[var(--color-bg-subtle)]/60",
                    "px-3 py-2 tracking-tight",
                  )}
                >
                  <span className="truncate text-[14px] font-semibold text-foreground">{d.title}</span>
                  <div className="flex min-w-0 max-w-[45%] shrink-0 items-center gap-1.5">
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: d.stage.color ?? "var(--color-ink-muted)" }}
                      aria-hidden
                    />
                    <span
                      className="truncate text-[12px] font-semibold"
                      style={{ color: d.stage.color ?? "var(--color-ink-soft)" }}
                    >
                      {d.stage.name}
                    </span>
                  </div>
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
  compact = false,
  naked = false,
  emphasized = false,
  className,
}: {
  children: React.ReactNode;
  padding?: "default" | "tight";
  /** Raio menor no painel denso (evita variantes arbitrárias `&_` no Tailwind). */
  compact?: boolean;
  /** Sem card — só borda inferior + padding fixo (painel Kommo). */
  naked?: boolean;
  /** Com `naked`: fundo branco no bloco (cabeçalho do negócio). */
  emphasized?: boolean;
  className?: string;
}) {
  if (naked) {
    return (
      <div
        className={cn(
          "border-b border-border px-3 py-2.5",
          emphasized ? "bg-white" : "bg-transparent",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  const pad =
    padding === "default" ? (compact ? "p-3" : "p-4") : "p-3";
  return (
    <div
      className={cn(
        compact
          ? "rounded-xl border border-black/6 bg-white shadow-[var(--shadow-card)] transition-colors hover:border-black/10"
          : "rounded-xl border border-slate-100 bg-white shadow-[var(--shadow-card)] transition-colors hover:border-slate-200",
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}

function WorkspaceLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[12px] font-medium text-slate-400">
      {children}
    </p>
  );
}

function ContactRow({
  icon,
  value,
  copyable,
  compact: dense,
}: {
  icon: React.ReactNode;
  value: string;
  copyable?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 tracking-tight text-[var(--color-ink-soft)]",
        dense ? "text-[13px]" : "text-[14px]",
      )}
    >
      <span className="shrink-0 text-[var(--color-ink-muted)]">{icon}</span>
      <span
        className={cn("truncate", copyable && "cursor-pointer hover:text-primary")}
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
  className,
  suffixLabel,
  inlineMinimal,
  petroleumHeader,
  chevronClassName,
}: {
  stages: StageOption[];
  currentStageId: string;
  onChange: (stageId: string) => void;
  isPending: boolean;
  className?: string;
  /** Ex.: posição no pipeline; default `índice/total` quando omitido. */
  suffixLabel?: string;
  /** Trigger só texto + chevron, sem caixa/borda (sidebar compact elegante). */
  inlineMinimal?: boolean;
  /** Cabeçalho petróleo: nome da etapa em sky, sem chip. */
  petroleumHeader?: boolean;
  chevronClassName?: string;
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

  const stageColor = current?.color ?? "var(--color-primary)";
  const resolvedSuffix =
    suffixLabel ??
    (stages.length > 0 && currentIdx >= 0 ? `${currentIdx + 1}/${stages.length}` : null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex h-full min-w-0 w-full items-center gap-1.5 text-left text-[13px] transition-all",
          petroleumHeader &&
            "max-w-[min(100%,14rem)] justify-start border-0 bg-transparent p-0 shadow-none hover:border-transparent",
          inlineMinimal && !petroleumHeader
            ? "border-0 bg-transparent p-0 shadow-none hover:border-transparent max-w-[min(100%,14rem)] justify-end"
            : !petroleumHeader
              ? "rounded-lg border border-black/6 bg-white px-2 py-1.5 hover:border-black/10"
              : "",
          !inlineMinimal && !petroleumHeader && open && "border-blue-300 shadow-[0_0_0_3px_rgba(37,99,235,0.10)]",
          inlineMinimal && open && !petroleumHeader && "text-blue-700",
          isPending && "cursor-wait opacity-70",
          className,
        )}
      >
        {petroleumHeader ? (
          <>
            <span className="min-w-0 truncate text-[12px] font-semibold">
              {current?.name ?? "—"}
            </span>
            <ChevronDown
              className={cn(
                "size-3 shrink-0 transition-transform",
                chevronClassName ?? "text-sky-400/60",
                open && "rotate-180",
              )}
              strokeWidth={2.5}
            />
          </>
        ) : inlineMinimal ? (
          <>
            {current ? (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-[9px] font-bold text-emerald-700">
                {getInitials(current.name ?? "")}
              </span>
            ) : null}
            <span className="min-w-0 truncate text-[13px] font-medium text-slate-700">
              {current?.name ?? "—"}
            </span>
            <ChevronDown
              className={cn(
                "size-3 shrink-0 text-slate-300 transition-transform group-hover:text-slate-400",
                open && "rotate-180 text-blue-600",
              )}
              strokeWidth={2.5}
            />
          </>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-[var(--color-chat-sent-border)]",
                "bg-[var(--color-primary-soft)] px-2 py-0.5 text-[13px] font-medium text-[var(--color-primary-dark)]",
                "dark:border-[var(--color-chat-sent-border)] dark:bg-[var(--color-bg-muted)] dark:text-[var(--color-chat-sent-foreground)]",
              )}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: stageColor }}
                aria-hidden
              />
              <span className="min-w-0 truncate">{current?.name ?? "—"}</span>
            </span>
            {resolvedSuffix ? (
              <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-ink-muted)]">
                {resolvedSuffix}
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "ml-auto size-3 shrink-0 text-[var(--color-ink-muted)] transition-transform group-hover:text-[var(--color-ink-soft)]",
                open && "rotate-180 text-[var(--color-primary)]",
              )}
              strokeWidth={2.5}
            />
          </>
        )}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+6px)] z-[100] min-w-[220px] w-max max-w-[min(100vw-2rem,320px)]",
            ds.popover.base,
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className={ds.text.label}>Mover para</span>
            <span className="text-[10px] font-medium tabular-nums text-[var(--color-ink-muted)]">
              {stages.length} etapas
            </span>
          </div>
          <ul role="listbox" className="max-h-[320px] min-w-[220px] overflow-y-auto py-1">
            {stages.map((stage) => {
              const isActive = stage.id === currentStageId;
              const color = stage.color ?? "#94a3b8";
              return (
                <li key={stage.id} className="min-w-0">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { onChange(stage.id); setOpen(false); }}
                    disabled={isPending || isActive}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-[13px] font-bold",
                      "tracking-tight text-foreground transition-colors hover:bg-[var(--color-bg-subtle)]",
                      isActive && "cursor-default bg-blue-50/60 text-blue-700",
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{stage.name}</span>
                    {isActive ? (
                      <Check
                        className="size-3.5 shrink-0 text-blue-600"
                        strokeWidth={2.5}
                      />
                    ) : null}
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
  className,
  inlineMinimal,
}: {
  currentOwner: DealDetailData["owner"];
  users: UserOption[];
  onChange: (ownerId: string | null) => void;
  isPending: boolean;
  className?: string;
  inlineMinimal?: boolean;
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
          "group flex w-full items-center gap-1.5 text-left text-[13px] transition-all",
          inlineMinimal
            ? "max-w-none border-0 bg-transparent p-0 shadow-none hover:border-transparent justify-end"
            : "max-w-[200px] gap-2 rounded-lg border border-black/6 bg-white px-2 py-1 hover:border-black/10",
          !inlineMinimal && open && "border-blue-300 shadow-[0_0_0_3px_rgba(37,99,235,0.10)]",
          className,
        )}
      >
        {inlineMinimal ? (
          <div className="flex w-full min-w-0 flex-1 items-center justify-end gap-1.5">
            {currentOwner ? (
              <>
                <ChatAvatar
                  user={{
                    id: currentOwner.id,
                    name: currentOwner.name,
                    imageUrl: users.find((u) => u.id === currentOwner.id)?.avatarUrl ?? null,
                  }}
                  size={20}
                  channel={null}
                  hideCartoon
                />
                <span className="truncate text-[13px] font-medium text-slate-700">{currentOwner.name}</span>
              </>
            ) : (
              <span className="text-[12px] italic text-slate-300">Sem responsável</span>
            )}
            <ChevronDown
              className={cn(
                "size-3 shrink-0 text-slate-300 transition-transform group-hover:text-slate-400",
                open && "rotate-180 text-blue-600",
              )}
              strokeWidth={2.5}
            />
          </div>
        ) : (
          <>
            <div className="relative shrink-0">
              {currentOwner?.name ? (
                <>
                  <ChatAvatar
                    user={{
                      id: currentOwner.id,
                      name: currentOwner.name,
                      imageUrl: users.find((u) => u.id === currentOwner.id)?.avatarUrl ?? null,
                    }}
                    size={20}
                    channel={null}
                    hideCartoon
                  />
                  <PresenceDot status={currentStatus} size="sm" />
                </>
              ) : (
                <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-muted-foreground">
                  ?
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <span className="truncate text-[14px] font-bold tracking-tight text-slate-800">
                {currentOwner?.name ?? "Sem responsável"}
              </span>
              {currentOwner?.name ? (
                <span className="shrink-0 text-[12px] text-[var(--color-ink-muted)]">
                  · {presenceLabel(currentStatus)}
                </span>
              ) : null}
            </div>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-[var(--color-ink-muted)] transition-transform group-hover:text-[var(--color-ink-soft)]",
                open && "rotate-180 text-blue-600",
              )}
              strokeWidth={2.5}
            />
          </>
        )}
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
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-slate-500 transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-[var(--color-ink-muted)]">?</span>
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
                    isCurrent ? "bg-blue-50/60" : "hover:bg-[var(--color-bg-subtle)]",
                  )}
                >
                  <div className="relative shrink-0">
                    <ChatAvatar
                      user={{ id: u.id, name: u.name, imageUrl: u.avatarUrl ?? null }}
                      size={24}
                      channel={null}
                      hideCartoon
                    />
                    <PresenceDot status={u.agentStatus?.status ?? "OFFLINE"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold tracking-tight text-slate-800">
                      {u.name}
                    </span>
                    <span className="text-[12px] text-[var(--color-ink-muted)]">
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

function PresenceDot({
  status,
  size = "md",
}: {
  status: "ONLINE" | "OFFLINE" | "AWAY";
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 inline-flex rounded-full ring-white",
        size === "sm" ? "size-1.5 ring-[1.5px]" : "size-2.5 ring-2",
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
  size = "sm",
}: {
  tag: { id: string; name: string; color: string };
  onRemove: () => void;
  isPending: boolean;
  size?: "sm" | "xs";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 px-2 py-0.5 text-[10px] font-semibold leading-tight",
        size === "xs" && "px-1.5 py-px text-[9px]",
      )}
      style={tagPillStyle(tag.name, tag.color)}
    >
      <span className="max-w-[120px] truncate">{tag.name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending}
        className="leading-none opacity-50 transition-opacity hover:opacity-100 disabled:pointer-events-none"
        aria-label={`Remover tag ${tag.name}`}
      >
        ×
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
  embedded,
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
  /** Sem margem superior — uso colado ao header compacto. */
  embedded?: boolean;
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
    <div className={cn("rounded-xl border border-border bg-white px-2.5 py-2", embedded ? "mt-0" : "mt-2")}>
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
          className="h-7 border-0 bg-transparent px-0 text-sm text-foreground shadow-none focus-visible:ring-0"
          autoFocus
        />
        {canCreateTag ? (
          <Button
            type="button"
            variant="ghost"
            className="h-7 rounded-md px-2.5 text-xs font-bold text-[var(--color-ink-soft)] hover:bg-slate-100"
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
        <div className="mt-1.5 max-h-28 overflow-y-auto rounded-md border border-border bg-white">
          {suggestions.slice(0, 8).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectExisting(t)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-subtle)]"
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

function ProductsCard({
  dealId,
  compact = false,
  naked = false,
  dense = false,
  addPanelOpen,
  onAddPanelOpenChange,
}: {
  dealId: string;
  compact?: boolean;
  /** Sem wrapper de card — uso dentro de `WorkspaceCard naked`. */
  naked?: boolean;
  /** Ajusta espaçamentos para encaixe em células de tabela compacta. */
  dense?: boolean;
  /** Painel "adicionar" controlado pelo pai (ex.: botão + no `<dt>` da sidebar compacta). */
  addPanelOpen?: boolean;
  onAddPanelOpenChange?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();
  const [internalShowAdd, setInternalShowAdd] = React.useState(false);
  const addControlled =
    addPanelOpen !== undefined && onAddPanelOpenChange !== undefined;
  const showAdd = addControlled ? addPanelOpen : internalShowAdd;
  const setShowAdd = React.useCallback(
    (next: boolean) => {
      if (addControlled) onAddPanelOpenChange!(next);
      else setInternalShowAdd(next);
    },
    [addControlled, onAddPanelOpenChange],
  );
  const toggleShowAdd = React.useCallback(() => {
    if (addControlled) onAddPanelOpenChange!(!addPanelOpen);
    else setInternalShowAdd((v) => !v);
  }, [addControlled, onAddPanelOpenChange, addPanelOpen]);
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

  const hideInlineAddToolbar = addControlled && naked && dense;

  const inner = (
    <>
      {!hideInlineAddToolbar ? (
        <div
          className={cn(
            "flex items-center",
            naked && dense ? "justify-end" : "justify-between",
          )}
        >
          {!(naked && dense) ? (
            <SidebarSectionHeading className="px-0 pt-0 pb-2">{`Produtos${items.length > 0 ? ` (${items.length})` : ""}`}</SidebarSectionHeading>
          ) : null}
          <TooltipHost label={showAdd ? "Fechar" : "Adicionar produto"} side="left">
            <button
              type="button"
              onClick={toggleShowAdd}
              aria-label={showAdd ? "Fechar" : "Adicionar produto"}
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-md",
                  "text-[var(--color-ink-muted)] transition-colors hover:bg-slate-50 hover:text-foreground active:scale-95",
                )}
              >
                <Plus className={cn("size-3.5 transition-transform", showAdd && "rotate-45")} strokeWidth={2.4} />
            </button>
          </TooltipHost>
        </div>
      ) : null}

      {showAdd ? (
        <div className={cn("mt-2 space-y-2", dense && "mt-1.5 space-y-1.5")}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className={cn(
              "h-9 rounded-xl border-border bg-[var(--color-bg-subtle)] text-sm",
              dense && "h-8 rounded-md text-[13px]",
            )}
            autoFocus
          />
          <div className={cn(
            "max-h-40 overflow-y-auto rounded-xl border border-border bg-white",
            dense && "max-h-32 rounded-md",
          )}>
            {catalog.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-[var(--color-ink-muted)]">Nenhum produto encontrado</p>
            ) : (
              catalog.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addMutation.mutate(p.id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold tracking-tight text-foreground">
                    {p.name}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-emerald-600">
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
          <p
            className={cn(
              "text-[13px] tracking-tight text-[var(--color-ink-muted)]",
              dense && naked
                ? "py-1 text-[13px] leading-tight"
                : cn("mt-2", dense && "mt-1 text-[13px]"),
            )}
          >
            Nenhum produto vinculado
          </p>
        ) : null
      ) : (
        <div className={cn("mt-2 space-y-1.5", dense && "mt-1.5 space-y-1")}>
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-start gap-2.5 rounded-xl border border-black/6",
                "bg-[var(--color-bg-subtle)]/50 px-3 py-2 transition-colors hover:bg-[var(--color-bg-subtle)]",
                dense && "gap-2 rounded-md px-2 py-1.5",
              )}
            >
              <span className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500",
                dense && "size-6 rounded-md",
              )}>
                <Package className="size-4" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 text-[13px]",
                    dense && "text-[13px]",
                  )}
                >
                  <span className="truncate font-bold tracking-tight text-slate-800">
                    {item.productName}
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--color-ink-soft)]">
                    {formatCurrency(item.total)}
                  </span>
                </div>
                {item.quantity > 1 ? (
                  <p
                    className={cn(
                      "mt-0.5 text-[12px] tabular-nums text-[var(--color-ink-muted)]",
                      dense && "mt-0 text-[10px]",
                    )}
                  >
                    {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                  </p>
                ) : null}
              </div>
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
                className="mt-0.5 shrink-0 self-start rounded-md p-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                aria-label="Remover"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (naked) {
    return <div className={cn("space-y-0", dense && "text-[13px]")}>{inner}</div>;
  }

  return (
    <WorkspaceCard compact={compact}>
      {inner}
    </WorkspaceCard>
  );
}
