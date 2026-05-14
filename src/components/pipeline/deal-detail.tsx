"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, User } from "lucide-react";

import { useConfirm } from "@/hooks/use-confirm";
import { DealForm } from "@/components/pipeline/deal-form";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { DealHeader } from "@/components/pipeline/deal-detail/header";
import { ActivitiesPanel, ConversationsPanel, DealTabs, NotesPanel, type RightTabValue } from "@/components/pipeline/deal-detail/panels";
import { TimelinePanel } from "@/components/pipeline/deal-detail/timeline-panel";
import { ContactDetail, ConversationRow, DealDetailData, UserOption } from "@/components/pipeline/deal-detail/shared";
import { DealSidebar } from "@/components/pipeline/deal-detail/sidebar";
import { dealNumericValue } from "@/lib/utils";

// ── Fetchers ──────────────────────────────────

async function fetchDeal(id: string): Promise<DealDetailData> {
  const res = await fetch(apiUrl(`/api/deals/${id}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao carregar negócio");
  return data;
}

async function fetchContact(id: string): Promise<ContactDetail> {
  const res = await fetch(apiUrl(`/api/contacts/${id}`));
  if (!res.ok) throw new Error("Erro ao carregar contato");
  return res.json();
}

async function fetchUsers(): Promise<UserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? data) as UserOption[];
}

// ── Main Component ────────────────────────────

const boardKey = (pipelineId: string) => ["pipeline-board", pipelineId] as const;
const dealKey = (id: string) => ["deal", id] as const;

type DealDetailProps = {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  boardStages: BoardStage[];
};

export function DealDetail({ dealId, open, onOpenChange, pipelineId, boardStages }: DealDetailProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState(false);
  const [lostOpen, setLostOpen] = React.useState(false);
  const [lostReason, setLostReason] = React.useState("");
  const [rightTab, setRightTab] = React.useState<RightTabValue>("conversations");
  const [selectedConv, setSelectedConv] = React.useState<ConversationRow | null>(null);
  const [convStatus, setConvStatus] = React.useState("");

  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: dealId ? dealKey(dealId) : ["deal", "none"],
    queryFn: () => fetchDeal(dealId!),
    enabled: open && !!dealId,
  });

  const contactId = deal?.contact?.id;
  const { data: contact, isLoading: contactLoading } = useQuery({
    queryKey: contactId ? ["contact", contactId] : ["contact", "none"],
    queryFn: () => fetchContact(contactId!),
    enabled: open && !!contactId,
  });

  const [autoLoaded, setAutoLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEditing(false);
      setLostOpen(false);
      setLostReason("");
      setSelectedConv(null);
      setConvStatus("");
      setRightTab("conversations");
      setAutoLoaded(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (contact && !autoLoaded && contact.conversations.length > 0 && !selectedConv) {
      const latest = contact.conversations[0];
      setSelectedConv(latest);
      setConvStatus(latest.status);
      setAutoLoaded(true);
    }
  }, [contact, autoLoaded, selectedConv]);

  const invalidateAll = () => {
    if (dealId) queryClient.invalidateQueries({ queryKey: dealKey(dealId) });
    if (contactId) queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
    queryClient.invalidateQueries({ queryKey: boardKey(pipelineId) });
  };

  const statusMutation = useMutation({
    mutationFn: async (input: { status: "WON" | "LOST" | "OPEN"; lostReason?: string }) => {
      if (!dealId) throw new Error("Sem negócio");
      const res = await fetch(apiUrl(`/api/deals/${dealId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.status === "LOST" ? { status: "LOST", lostReason: input.lostReason } : { status: input.status }),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setLostOpen(false); setLostReason(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!dealId) throw new Error("Sem negócio");
      const res = await fetch(apiUrl(`/api/deals/${dealId}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: boardKey(pipelineId) }); onOpenChange(false); },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const ownerMutation = useMutation({
    mutationFn: async (ownerId: string | null) => {
      if (!dealId) throw new Error("Sem negócio");
      const res = await fetch(apiUrl(`/api/deals/${dealId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) throw new Error("Erro ao atribuir responsavel");
    },
    onSuccess: invalidateAll,
  });

  const stageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      if (!dealId) throw new Error("Sem negócio");
      const res = await fetch(apiUrl(`/api/deals/${dealId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      if (!res.ok) throw new Error("Erro ao alterar etapa");
    },
    onSuccess: invalidateAll,
  });

  const contactUpdateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (!contactId) throw new Error("Sem contato");
      const res = await fetch(apiUrl(`/api/contacts/${contactId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar contato");
      return res.json();
    },
    onSuccess: () => {
      if (contactId) queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
    },
  });

  const stageOptions = boardStages.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  const isLoading = dealLoading || (!!contactId && contactLoading);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="max-w-none! w-full! overflow-hidden p-0 md:w-[calc(100vw-60px)]!"
      >
        <SheetClose className="absolute right-4 top-4 z-20" />

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : !deal ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Negócio não encontrado.
          </div>
        ) : editing ? (
          <div className="flex h-full flex-col overflow-y-auto p-6">
            <h2 className="mb-4 text-xl font-semibold">Editar negócio</h2>
            <DealForm
              mode="edit"
              dealId={deal.id}
              stages={stageOptions}
              initialContactName={deal.contact?.name}
              defaultValues={{
                title: deal.title,
                value: dealNumericValue(deal.value),
                stageId: deal.stage.id,
                contactId: deal.contact?.id ?? null,
                expectedClose: deal.expectedClose,
              }}
              onSuccess={() => {
                setEditing(false);
                invalidateAll();
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {/* ── Header ── */}
            <DealHeader
              deal={deal}
              onEdit={() => setEditing(true)}
              onWon={() => statusMutation.mutate({ status: "WON" })}
              onLostOpen={() => setLostOpen(true)}
              onReopen={() => statusMutation.mutate({ status: "OPEN" })}
              onDelete={async () => {
                const ok = await confirm({
                  title: "Excluir negócio",
                  description: "Excluir este negócio? Esta ação não pode ser desfeita.",
                  confirmLabel: "Excluir",
                  variant: "destructive",
                });
                if (ok) deleteMutation.mutate();
              }}
              lostOpen={lostOpen}
              onLostConfirm={(reason: string) => statusMutation.mutate({ status: "LOST", lostReason: reason })}
              onLostCancel={() => setLostOpen(false)}
              statusBusy={statusMutation.isPending}
              contact={contact}
            />

            {/* ── Two-column body ──
                DNA Chat: shell branco, divisor hairline (border-slate-100)
                em vez de cinza-bloco. Sidebar perde o fundo cinza para
                ficar flat e respirável; só o divisor vertical separa as
                colunas. */}
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-white md:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[460px_minmax(0,1fr)]">
              <div className="hidden min-h-0 border-slate-100 md:block md:border-r">
                <div className="scrollbar-thin h-full overflow-y-auto overscroll-contain px-5 py-5">
                  {contact ? (
                    <DealSidebar
                      contact={contact}
                      deal={deal}
                      users={users}
                      stageOptions={boardStages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
                      onStageChange={(stageId) => stageMutation.mutate(stageId)}
                      stagePending={stageMutation.isPending}
                      onOwnerChange={(ownerId) => ownerMutation.mutate(ownerId)}
                      ownerPending={ownerMutation.isPending}
                      onContactUpdate={(d) => contactUpdateMutation.mutate(d)}
                      isUpdating={contactUpdateMutation.isPending}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-[13px] text-[var(--color-ink-muted)]">
                      <User className="mb-3 size-10 opacity-30" strokeWidth={1.5} />
                      <p>Nenhum contato vinculado a este negócio.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
                <DealTabs
                  rightTab={rightTab}
                  setRightTab={(tab) => {
                    setRightTab(tab);
                    if (tab !== "conversations") setSelectedConv(null);
                  }}
                  conversationsCount={contact?.conversations.length ?? 0}
                  activitiesCount={deal.activities.length}
                  notesCount={deal.notes.length}
                />

                <div className="flex min-h-0 flex-1 flex-col">
                  {rightTab === "conversations" && (
                    <ConversationsPanel
                      conversations={contact?.conversations ?? []}
                      selected={selectedConv}
                      onSelect={(c) => {
                        setSelectedConv(c);
                        setConvStatus(c?.status ?? "");
                      }}
                      convStatus={convStatus}
                      onStatusChange={setConvStatus}
                      contactId={contactId}
                      contactPhone={contact?.phone}
                      onConversationCreated={invalidateAll}
                    />
                  )}
                  {rightTab === "activities" && (
                    <ActivitiesPanel
                      activities={deal.activities}
                      dealId={deal.id}
                      onCreated={() => {
                        if (dealId) queryClient.invalidateQueries({ queryKey: dealKey(dealId) });
                        queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
                      }}
                    />
                  )}
                  {rightTab === "notes" && (
                    <NotesPanel
                      notes={deal.notes}
                      contactId={contactId}
                      dealId={deal.id}
                      onCreated={invalidateAll}
                    />
                  )}
                  {rightTab === "timeline" && (
                    <TimelinePanel dealId={deal.id} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
