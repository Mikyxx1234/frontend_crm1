"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Check, ChevronDown, Package, Pencil, Plus, X } from "lucide-react";

import { useConfirm } from "@/hooks/use-confirm";
import { CustomFieldsSection } from "@/components/contacts/custom-fields-section";
import { DealCustomFieldsSection } from "@/components/pipeline/deal-custom-fields-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dt } from "@/lib/design-tokens";
import { cn, dealNumericValue, formatCurrency, formatDate, getInitials, tagPillStyle } from "@/lib/utils";

import {
  CatalogProduct,
  ContactDetail,
  ContactInfoRows,
  DealDetailData,
  DealProductItem,
  SidebarSection,
} from "./shared";

type DealSidebarProps = {
  contact: ContactDetail;
  deal: DealDetailData;
  users: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    agentStatus?: { status: "ONLINE" | "OFFLINE" | "AWAY"; availableForVoiceCalls?: boolean; updatedAt?: string } | null;
  }[];
  stageOptions: { id: string; name: string; color?: string }[];
  onStageChange: (stageId: string) => void;
  stagePending: boolean;
  onOwnerChange: (ownerId: string | null) => void;
  ownerPending: boolean;
  onContactUpdate: (data: Record<string, unknown>) => void;
  isUpdating: boolean;
};

export function DealSidebar({
  contact,
  deal,
  users,
  stageOptions,
  onStageChange,
  stagePending,
  onOwnerChange,
  ownerPending,
  onContactUpdate,
  isUpdating,
}: DealSidebarProps) {
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [editingBasic, setEditingBasic] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", email: "", phone: "", source: "" });
  const [tagInput, setTagInput] = React.useState("");
  const [tagColor, setTagColor] = React.useState("#6366f1");

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
      source: contact.source ?? "",
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

  return (
    <div className="space-y-3">
      <SidebarDealSummaryCard
        deal={deal}
        contact={contact}
        users={users}
        stageOptions={stageOptions}
        onStageChange={onStageChange}
        stagePending={stagePending}
        onOwnerChange={onOwnerChange}
        ownerPending={ownerPending}
        tagInput={tagInput}
        setTagInput={setTagInput}
        tagColor={tagColor}
        setTagColor={setTagColor}
        canCreateTag={canCreateTag}
        onAddTag={() => {
          if (tagInput.trim()) addTagMutation.mutate({ tagName: tagInput.trim(), color: tagColor });
        }}
        onSelectExistingTag={(tagId: string) => {
          addTagMutation.mutate({ tagId });
        }}
        addTagPending={addTagMutation.isPending}
        onRemoveTag={(tagId) => removeTagMutation.mutate(tagId)}
        removeTagPending={removeTagMutation.isPending}
      />

      <DealProductsSection dealId={deal.id} compact />
      <DealCustomFieldsSection dealId={deal.id} />
      <CustomFieldsSection contactId={contact.id} />

      <SidebarSection
        title="Contato"
        action={
          !editingBasic ? (
            <Button type="button" variant="ghost" size="icon" className="size-7 rounded-xl" onClick={startEdit}>
              <Pencil className="size-3" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-7 rounded-xl" onClick={() => setEditingBasic(false)}>
                <X className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-xl text-emerald-600"
                onClick={saveBasic}
                disabled={isUpdating}
              >
                <Check className="size-3" />
              </Button>
            </div>
          )
        }
      >
        {editingBasic ? (
          <div className="grid gap-1.5">
            {(
              [
                ["Nome", "name", "text"],
                ["E-mail", "email", "email"],
                ["Telefone", "phone", "tel"],
              ] as const
            ).map(([label, key, type]) => (
              <div key={key} className="grid gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</Label>
                <Input
                  type={type}
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-9 rounded-lg border-border bg-[var(--color-bg-subtle)] text-sm"
                />
              </div>
            ))}
            {contact.source && (
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Fonte</Label>
                <div className="flex h-9 items-center rounded-lg border border-border bg-slate-100 px-3 text-sm text-slate-500">
                  {contact.source}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-2">
              {contact.company ? (
                <Badge variant="outline" className="rounded-full border-border bg-white px-3 py-1 text-xs font-semibold text-[var(--color-ink-soft)]">
                  {contact.company.name}
                </Badge>
              ) : null}
              {contact.source ? (
                <Badge variant="outline" className="rounded-full border-border bg-white px-3 py-1 text-xs font-semibold text-[var(--color-ink-soft)]">
                  {contact.source}
                </Badge>
              ) : null}
            </div>
            <div className="rounded-lg border border-border bg-[var(--color-bg-subtle)] px-4 py-3">
              <ContactInfoRows contact={contact} />
            </div>
          </div>
        )}
      </SidebarSection>

      {contact.deals.length > 1 && (
        <SidebarSection
          title={`Relacionamento (${contact.deals.length - 1})`}
          description="Outros negócios conectados a este mesmo contato."
        >
          <div className="grid gap-1.5">
            {contact.deals
              .filter((d) => d.id !== deal.id)
              .map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-[var(--color-bg-subtle)] px-3.5 py-2.5 text-sm"
                >
                  <span className="truncate font-medium">{d.title}</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0.5 text-[10px]"
                    style={{ borderColor: `${d.stage.color}60`, color: d.stage.color }}
                  >
                    {d.stage.name}
                  </Badge>
                </div>
              ))}
          </div>
        </SidebarSection>
      )}
    </div>
  );
}

function DealProductsSection({ dealId, compact = false }: { dealId: string; compact?: boolean }) {
  const queryClient = useQueryClient();
  const confirmDialog = useConfirm();
  const [showAdd, setShowAdd] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [editingItem, setEditingItem] = React.useState<string | null>(null);
  const [editQty, setEditQty] = React.useState("");
  const [editDiscount, setEditDiscount] = React.useState("");

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
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setSearch("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products/${itemId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => {
      invalidate();
      setEditingItem(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products/${itemId}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: invalidate,
  });

  const totalValue = items.reduce((s, i) => s + i.total, 0);

  const startEdit = (item: DealProductItem) => {
    setEditingItem(item.id);
    setEditQty(String(item.quantity));
    setEditDiscount(String(item.discount));
  };

  const saveEdit = (itemId: string) => {
    updateMutation.mutate({
      itemId,
      data: { quantity: parseFloat(editQty) || 1, discount: parseFloat(editDiscount) || 0 },
    });
  };

  return (
    <SidebarSection
      title={`Produtos${items.length > 0 ? ` (${items.length})` : ""}`}
      description="Itens vinculados ao negócio."
      action={
        <Button type="button" variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="size-3" />
        </Button>
      }
    >
      {showAdd && (
        <div className="mb-3 space-y-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto…"
            className="h-9 rounded-xl border-border bg-[var(--color-bg-subtle)] text-sm"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-white shadow-sm">
            {catalog.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">Nenhum produto encontrado</p>
            ) : (
              catalog.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addMutation.mutate(p.id)}
                  disabled={addMutation.isPending}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{p.name}</span>
                    {p.sku && <span className="ml-1 text-muted-foreground">({p.sku})</span>}
                    {p.type === "SERVICE" && (
                      <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">Serviço</span>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-emerald-600">
                    {formatCurrency(Number(p.price))}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-0 py-1 text-xs text-muted-foreground/70">
          Nenhum produto vinculado
        </div>
      ) : (
        <div className={cn("space-y-2", compact && "space-y-1.5")}>
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 to-white px-4 py-3.5 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                compact && "py-3",
              )}
            >
              {editingItem === item.id && item.productType !== "SERVICE" ? (
                  <div className="space-y-2.5">
                  <div className="text-sm font-medium text-slate-800">{item.productName}</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Qtd</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="mt-1 h-8 rounded-lg border-border bg-white text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Desc %</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editDiscount}
                        onChange={(e) => setEditDiscount(e.target.value)}
                        className="mt-1 h-8 rounded-lg border-border bg-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" className="size-7 rounded-lg" onClick={() => setEditingItem(null)}>
                      <X className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 rounded-lg text-emerald-600"
                      onClick={() => saveEdit(item.id)}
                      disabled={updateMutation.isPending}
                    >
                      <Check className="size-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <Package className="size-4 shrink-0 text-blue-700" />
                      <span className="truncate font-medium">{item.productName}</span>
                      {item.productType === "SERVICE" && (
                        <span className="rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                          Serviço
                        </span>
                      )}
                    </div>
                    {item.productType === "SERVICE" ? (
                      <div className="mt-1 text-[var(--color-ink-soft)]">Valor fixo</div>
                    ) : (
                      <div className="mt-1 text-[var(--color-ink-soft)]">
                        {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                        {item.discount > 0 && <span className="ml-1 text-amber-600">-{item.discount}%</span>}
                      </div>
                    )}
                    <ProductCustomFieldsInline productId={item.productId} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums text-slate-950">{formatCurrency(item.total)}</span>
                    {item.productType !== "SERVICE" && (
                      <button type="button" onClick={() => startEdit(item)} className="rounded p-0.5 opacity-40 hover:opacity-100">
                        <Pencil className="size-2.5" />
                      </button>
                    )}
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
                      className="rounded p-0.5 opacity-40 hover:text-destructive hover:opacity-100"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="font-medium text-slate-500">Total</span>
            <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      )}
    </SidebarSection>
  );
}

function SidebarDealSummaryCard({
  deal,
  contact,
  users,
  stageOptions,
  onStageChange,
  stagePending,
  onOwnerChange,
  ownerPending,
  tagInput,
  setTagInput,
  tagColor,
  setTagColor,
  canCreateTag,
  onAddTag,
  onSelectExistingTag,
  addTagPending,
  onRemoveTag,
  removeTagPending,
}: {
  deal: DealDetailData;
  contact: ContactDetail;
  users: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    agentStatus?: { status: "ONLINE" | "OFFLINE" | "AWAY"; availableForVoiceCalls?: boolean; updatedAt?: string } | null;
  }[];
  stageOptions: { id: string; name: string; color?: string }[];
  onStageChange: (stageId: string) => void;
  stagePending: boolean;
  onOwnerChange: (ownerId: string | null) => void;
  ownerPending: boolean;
  tagInput: string;
  setTagInput: (value: string) => void;
  tagColor: string;
  setTagColor: (value: string) => void;
  canCreateTag: boolean;
  onAddTag: () => void;
  onSelectExistingTag: (tagId: string) => void;
  addTagPending: boolean;
  onRemoveTag: (tagId: string) => void;
  removeTagPending: boolean;
}) {
  const [showTagComposer, setShowTagComposer] = React.useState(false);
  const dealTags = deal.tags ?? [];

  return (
    <section className="border-b border-border/90 pb-4">
      <StageDropdown
        stages={stageOptions}
        currentStageId={deal.stage.id}
        pipelineName={deal.stage.pipeline.name}
        onChange={onStageChange}
        isPending={stagePending}
      />

      <div className="mt-3 border-t border-border/90 pt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Responsável</div>
        <CompactOwnerSelector
          currentOwner={deal.owner}
          users={users}
          onChange={onOwnerChange}
          isPending={ownerPending}
        />
      </div>

      <div className="mt-3 border-t border-border/90 pt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Tags</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {dealTags.length > 0 ? (
            dealTags.map(({ tag }) => (
              <TagPillSmall
                key={tag.id}
                tag={tag}
                onRemove={() => onRemoveTag(tag.id)}
                isPending={removeTagPending}
              />
            ))
          ) : (
            <span className="text-sm text-[var(--color-ink-muted)]">Sem tags</span>
          )}
          {!showTagComposer ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded-full border border-border bg-white text-[var(--color-ink-soft)] shadow-none hover:bg-[var(--color-bg-subtle)]"
              onClick={() => setShowTagComposer(true)}
              disabled={addTagPending}
              aria-label="Adicionar tag"
            >
              <Plus className="size-3.5" />
            </Button>
          ) : null}
        </div>
        <TagComposerInline
          draft={tagInput}
          setDraft={setTagInput}
          color={tagColor}
          setColor={setTagColor}
          isOpen={showTagComposer}
          onOpenChange={setShowTagComposer}
          canCreateTag={canCreateTag}
          dealId={deal.id}
          existingTagIds={new Set(dealTags.map((t) => t.tag.id))}
          onSubmit={() => {
            onAddTag();
            if (tagInput.trim()) setShowTagComposer(false);
          }}
          onSelectExisting={(tag: { id: string; name: string; color: string }) => {
            onSelectExistingTag(tag.id);
            setShowTagComposer(false);
          }}
          isPending={addTagPending}
        />
      </div>

    </section>
  );
}

function StageDropdown({
  stages,
  currentStageId,
  pipelineName,
  onChange,
  isPending,
}: {
  stages: { id: string; name: string; color?: string }[];
  currentStageId: string;
  pipelineName: string;
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

  const progressPct = stages.length > 1 ? ((currentIdx + 1) / stages.length) * 100 : 100;

  return (
    <div ref={ref} className="relative">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {pipelineName}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-colors",
          "border border-border bg-white hover:border-slate-300",
          isPending && "cursor-wait opacity-70",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: current?.color ?? "#cbd5e1" }}
            aria-hidden
          />
          <span className="truncate text-sm font-semibold text-slate-900">
            {current?.name ?? "—"}
          </span>
          <span className="text-xs text-[var(--color-ink-muted)]">
            {currentIdx + 1}/{stages.length}
          </span>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-[var(--color-ink-muted)] transition-transform", open && "rotate-180")} />
      </button>

      <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%-4px)] z-50 mt-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {pipelineName}
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {stages.map((stage) => {
              const isActive = stage.id === currentStageId;
              const color = stage.color ?? "#cbd5e1";
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    onChange(stage.id);
                    setOpen(false);
                  }}
                  disabled={isPending}
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-medium transition-colors hover:brightness-95"
                  style={{
                    backgroundColor: `${color}30`,
                    borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent",
                  }}
                >
                  {isActive ? (
                    <Check className="size-4 shrink-0 text-slate-800" strokeWidth={2.5} />
                  ) : (
                    <span className="size-4 shrink-0" />
                  )}
                  <span
                    className="truncate"
                    style={{ color: isActive ? "#0f172a" : "#475569" }}
                  >
                    {stage.name}
                  </span>
                  <span
                    className="ml-auto size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TagPillSmall({
  tag,
  onRemove,
  isPending,
}: {
  tag: { id: string; name: string; color: string };
  onRemove: () => void;
  isPending: boolean;
}) {
  return (
    <span
      className={cn(dt.pill.base, "max-w-full gap-1")}
      style={tagPillStyle(tag.name, tag.color)}
      title={tag.name}
    >
      <span className="max-w-[120px] truncate">{tag.name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={isPending}
        className="rounded-[4px] p-0.5 opacity-70 transition hover:opacity-100 disabled:pointer-events-none"
        aria-label={`Remover tag ${tag.name}`}
      >
        <X className="size-2.5" />
      </button>
    </span>
  );
}
function TagComposerInline({
  draft,
  setDraft,
  color,
  setColor,
  isOpen,
  onOpenChange,
  canCreateTag,
  dealId,
  existingTagIds,
  onSubmit,
  onSelectExisting,
  isPending,
}: {
  draft: string;
  setDraft: (value: string) => void;
  color: string;
  setColor: (value: string) => void;
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
  canCreateTag: boolean;
  dealId: string;
  existingTagIds: Set<string>;
  onSubmit: () => void;
  onSelectExisting: (tag: { id: string; name: string; color: string }) => void;
  isPending: boolean;
}) {
  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => { const r = await fetch(apiUrl("/api/tags")); return r.ok ? r.json() : []; },
    staleTime: 60_000,
    enabled: isOpen,
  });
  const suggestions = (allTags as { id: string; name: string; color: string }[]).filter(
    (t) => !existingTagIds.has(t.id) && t.name.toLowerCase().includes(draft.toLowerCase()),
  );

  return (
    <div className={cn("mt-1.5", !isOpen && "hidden")}>
      {isOpen ? (
        <div className="min-w-0 rounded-xl border border-border bg-white px-2.5 py-2">
          <div className="flex items-center gap-2">
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
            />
            {canCreateTag && (
              <Button
                type="button"
                variant="ghost"
                className="h-7 rounded-md px-2.5 text-xs font-medium text-[var(--color-ink-soft)] hover:bg-slate-100"
                onClick={onSubmit}
                disabled={!draft.trim() || isPending}
              >
                Criar
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
            >
              <X className="size-3" />
            </Button>
          </div>
          {draft && suggestions.length > 0 && (
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
          )}
          {canCreateTag && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {TAG_COLORS.map((paletteColor) => (
                <button
                  key={paletteColor}
                  type="button"
                  onClick={() => setColor(paletteColor)}
                  className={cn(
                    "size-3.5 rounded-full border transition",
                    color === paletteColor ? "scale-110 border-slate-500 ring-2 ring-slate-200" : "border-white",
                  )}
                  style={{ backgroundColor: paletteColor }}
                  aria-label={`Selecionar cor ${paletteColor}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const TAG_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#f97316", "#16a34a", "#0891b2", "#dc2626", "#475569"];

function CompactOwnerSelector({
  currentOwner,
  users,
  onChange,
  isPending,
}: {
  currentOwner: DealDetailData["owner"];
  users: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    agentStatus?: { status: "ONLINE" | "OFFLINE" | "AWAY"; availableForVoiceCalls?: boolean; updatedAt?: string } | null;
  }[];
  onChange: (ownerId: string | null) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const currentOwnerStatus = users.find((user) => user.id === currentOwner?.id)?.agentStatus?.status ?? "OFFLINE";

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
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-3 text-left shadow-none transition-colors hover:border-slate-300 hover:bg-[var(--color-bg-subtle)]"
      >
        <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-foreground">
          {currentOwner?.name ? getInitials(currentOwner.name) : "?"}
          {currentOwner?.name ? <PresenceDot status={currentOwnerStatus} className="absolute -bottom-0.5 -right-0.5" /> : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-800">{currentOwner?.name ?? "Sem responsável"}</span>
          {currentOwner?.name ? (
            <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">· {presenceLabel(currentOwnerStatus)}</span>
          ) : null}
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3.5 py-2.5 text-left text-sm hover:bg-[var(--color-bg-subtle)]"
          >
            <span className="text-slate-500">Sem responsável</span>
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(u.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-sm hover:bg-[var(--color-bg-subtle)]",
                currentOwner?.id === u.id && "bg-[var(--color-bg-subtle)]",
              )}
            >
              <div className="flex size-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {getInitials(u.name)}
              </div>
              <div className="min-w-0">
                <span className="block truncate font-medium text-foreground">{u.name}</span>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <PresenceDot status={u.agentStatus?.status ?? "OFFLINE"} />
                  <span>{presenceLabel(u.agentStatus?.status ?? "OFFLINE")}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PresenceDot({
  status,
  className,
}: {
  status: "ONLINE" | "OFFLINE" | "AWAY";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-2.5 rounded-full ring-2 ring-white",
        status === "ONLINE" && "bg-emerald-500",
        status === "AWAY" && "bg-amber-400",
        status === "OFFLINE" && "bg-slate-400",
        className,
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

function ProductCustomFieldsInline({ productId }: { productId: string }) {
  const { data: cfValues = [] } = useQuery({
    queryKey: ["product-cf-values", productId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/products/${productId}/custom-fields`));
      if (!res.ok) return [];
      return res.json() as Promise<{ fieldId: string; label: string; value: string }[]>;
    },
    staleTime: 60_000,
  });

  const filled = cfValues.filter((v) => v.value?.trim());
  if (filled.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
      {filled.map((v) => (
        <span key={v.fieldId}>
          <span className="font-medium text-[var(--color-ink-soft)]">{v.label}:</span> {v.value}
        </span>
      ))}
    </div>
  );
}
