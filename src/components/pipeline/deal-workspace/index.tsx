"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, X } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/hooks/use-confirm";
import { DealForm } from "@/components/pipeline/deal-form";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import type { TransferControlUser } from "@/components/inbox/transfer-control";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn, dealNumericValue } from "@/lib/utils";

import { WorkspaceShell } from "./shell";
import { WorkspaceHeader } from "./header";
import { WorkspaceTabs, type RightTabValue } from "./tabs";
import { WorkspaceSidebar } from "./sidebar";
import { ConversationsPanel } from "./panels/conversations";
import { ActivitiesPanel } from "./panels/activities";
import { NotesPanel } from "./panels/notes";
import { TimelinePanel } from "./panels/timeline";
import type {
  ContactDetail,
  ConversationRow,
  DealDetailData,
  UserOption,
} from "./shared";

// ── Fetchers ────────────────────────────────────────────────────────────────

async function fetchDeal(id: string): Promise<DealDetailData> {
  const res = await fetch(apiUrl(`/api/deals/${id}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message ?? "Erro ao carregar negocio");
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

// ── Main ────────────────────────────────────────────────────────────────────

const boardKey = (pipelineId: string) => ["pipeline-board", pipelineId] as const;
const dealKey = (id: string) => ["deal", id] as const;

type DealWorkspaceProps = {
  dealId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  boardStages: BoardStage[];
};

export function DealWorkspace({
  dealId,
  open,
  onOpenChange,
  pipelineId,
  boardStages,
}: DealWorkspaceProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = React.useState(false);
  const [lostOpen, setLostOpen] = React.useState(false);
  const [rightTab, setRightTab] = React.useState<RightTabValue>("conversations");
  const [selectedConv, setSelectedConv] = React.useState<ConversationRow | null>(null);
  const [convStatus, setConvStatus] = React.useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

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
      setSelectedConv(null);
      setConvStatus("");
      setRightTab("conversations");
      setAutoLoaded(false);
      setMobileSidebarOpen(false);
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
      if (!dealId) throw new Error("Sem negocio");
      const res = await fetch(apiUrl(`/api/deals/${dealId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          input.status === "LOST"
            ? { status: "LOST", lostReason: input.lostReason }
            : { status: input.status },
        ),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setLostOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!dealId) throw new Error("Sem negocio");
      const res = await fetch(apiUrl(`/api/deals/${dealId}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKey(pipelineId) });
      onOpenChange(false);
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 5 * 60_000,
    enabled: open,
  });

  // ── Atribuição de conversa (mesma API do Inbox/SalesHub) ──
  const { data: sessionData } = useSession();
  const myUserId = (sessionData?.user as { id?: string } | undefined)?.id;
  const myRole = (sessionData?.user as { role?: "ADMIN" | "MANAGER" | "MEMBER" } | undefined)?.role;
  const canManageAssignee = myRole === "ADMIN" || myRole === "MANAGER";

  const { data: teamUsers = [] } = useQuery<TransferControlUser[]>({
    queryKey: ["users", "assign-picker"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error("Erro ao carregar equipe");
      return Array.isArray(data) ? data : [];
    },
    enabled: open && canManageAssignee && !!selectedConv,
    staleTime: 60_000,
  });

  const [assignLoading, setAssignLoading] = React.useState(false);
  const assignConversation = React.useCallback(
    async (assignedToId: string | null) => {
      if (!selectedConv) return;
      const convId = selectedConv.id;
      setAssignLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/conversations/${convId}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignedToId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message ?? "Erro ao transferir");
        toast.success(assignedToId ? "Conversa transferida" : "Conversa liberada");
        if (contactId) queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao transferir");
      } finally {
        setAssignLoading(false);
      }
    },
    [selectedConv, contactId, queryClient],
  );

  const ownerMutation = useMutation({
    mutationFn: async (ownerId: string | null) => {
      if (!dealId) throw new Error("Sem negocio");
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
      if (!dealId) throw new Error("Sem negocio");
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
    <WorkspaceShell open={open} onClose={() => onOpenChange(false)}>
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </div>
      ) : !deal ? (
        <div className="flex h-full items-center justify-center text-[14px] tracking-tight text-slate-500">
          Negocio nao encontrado.
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <WorkspaceHeader
            deal={deal}
            contact={contact}
            onEdit={() => setEditing(true)}
            onWon={() => statusMutation.mutate({ status: "WON" })}
            onLostOpen={() => setLostOpen(true)}
            onReopen={() => statusMutation.mutate({ status: "OPEN" })}
            onDelete={async () => {
              const ok = await confirm({
                title: "Excluir negocio",
                description: "Excluir este negocio? Esta acao nao pode ser desfeita.",
                confirmLabel: "Excluir",
                variant: "destructive",
              });
              if (ok) deleteMutation.mutate();
            }}
            lostOpen={lostOpen}
            onLostConfirm={(reason) => statusMutation.mutate({ status: "LOST", lostReason: reason })}
            onLostCancel={() => setLostOpen(false)}
            statusBusy={statusMutation.isPending}
            onToggleSidebar={() => setMobileSidebarOpen(true)}
            conversation={selectedConv}
            conversationTags={
              selectedConv?.tags
                ? selectedConv.tags.map((t) => ({ name: t.tag.name, color: t.tag.color }))
                : null
            }
            myUserId={myUserId}
            canManageAssignee={canManageAssignee}
            currentAssigneeId={selectedConv?.assignedToId ?? null}
            teamUsers={teamUsers}
            assignLoading={assignLoading}
            onAssign={(uid) => void assignConversation(uid)}
            onTagsUpdated={() => {
              if (contactId) queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
            }}
          />

          {/* Two-column body */}
          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-1 overflow-hidden",
              "md:grid-cols-[440px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]",
            )}
          >
            {/* Sidebar — desktop
                Background `slate-50` (DS canônico) em vez do `#f4f7fa` (que
                é DNA do scroller de chat — `ui-fidelity §0`). Isso cria a
                separação visual clara: sidebar = neutro CRM, painel
                direito = chat scroller quando o tab "Conversas" estiver
                ativo. Padding levemente compacto (4 sm:5) pra dar mais
                ar pros cards flat. */}
            <aside className="hidden min-h-0 border-r border-slate-100 bg-slate-50 md:block">
              <div className="scrollbar-thin h-full overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
                {contact ? (
                  <WorkspaceSidebar
                    deal={deal}
                    contact={contact}
                    users={users}
                    stageOptions={stageOptions}
                    onStageChange={(stageId) => stageMutation.mutate(stageId)}
                    stagePending={stageMutation.isPending}
                    onOwnerChange={(ownerId) => ownerMutation.mutate(ownerId)}
                    ownerPending={ownerMutation.isPending}
                    onContactUpdate={(d) => contactUpdateMutation.mutate(d)}
                    isUpdating={contactUpdateMutation.isPending}
                  />
                ) : (
                  <EmptySidebar />
                )}
              </div>
            </aside>

            {/* Right column — tabs + painéis
                Header das tabs flat (sem `backdrop-blur-md` + bg-white/80
                glassy que competia com a pílula azul das tabs). Padding
                vertical reduzido (py-2.5) — a pílula h-10 já tem peso. */}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
              <div
                className={cn(
                  "flex shrink-0 items-center gap-3 border-b border-slate-100",
                  "bg-white px-5 py-2.5 sm:px-6",
                )}
              >
                <WorkspaceTabs
                  value={rightTab}
                  onChange={(tab) => {
                    setRightTab(tab);
                    if (tab !== "conversations") setSelectedConv(null);
                  }}
                  conversationsCount={contact?.conversations.length ?? 0}
                  activitiesCount={deal.activities.length}
                  notesCount={deal.notes.length}
                />
              </div>

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
                {rightTab === "timeline" && <TimelinePanel dealId={deal.id} />}
              </div>
            </section>
          </div>

          {/* Mobile sidebar — bottom-sheet-ish drawer pela esquerda */}
          <AnimatePresence>
            {mobileSidebarOpen && contact ? (
              <>
                <motion.div
                  key="ms-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setMobileSidebarOpen(false)}
                  className="fixed inset-0 z-[65] bg-slate-900/30 backdrop-blur-sm md:hidden"
                />
                <motion.aside
                  key="ms-panel"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className={cn(
                    "fixed inset-y-0 left-0 z-[66] flex w-[88vw] max-w-md flex-col",
                    "bg-slate-50 shadow-premium md:hidden",
                  )}
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Dados do negócio
                    </span>
                    <TooltipHost label="Fechar" side="left">
                      <button
                        type="button"
                        onClick={() => setMobileSidebarOpen(false)}
                        aria-label="Fechar"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-black/6 bg-white text-slate-500 hover:bg-slate-100 active:scale-95"
                      >
                        <X className="size-4" />
                      </button>
                    </TooltipHost>
                  </div>
                  <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
                    <WorkspaceSidebar
                      deal={deal}
                      contact={contact}
                      users={users}
                      stageOptions={stageOptions}
                      onStageChange={(stageId) => stageMutation.mutate(stageId)}
                      stagePending={stageMutation.isPending}
                      onOwnerChange={(ownerId) => ownerMutation.mutate(ownerId)}
                      ownerPending={ownerMutation.isPending}
                      onContactUpdate={(d) => contactUpdateMutation.mutate(d)}
                      isUpdating={contactUpdateMutation.isPending}
                    />
                  </div>
                </motion.aside>
              </>
            ) : null}
          </AnimatePresence>

          {/* Edit mode — overlay glass interno */}
          <AnimatePresence>
            {editing ? (
              <motion.div
                key="edit-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-slate-900/15 px-4 py-10 backdrop-blur-sm"
                onClick={(e: React.MouseEvent) => { if (e.target === e.currentTarget) setEditing(false); }}
              >
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 8, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className={cn(
                    "w-full max-w-xl rounded-[28px] border border-slate-100 bg-white p-6 sm:p-8",
                    "shadow-premium",
                  )}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-[18px] font-black tracking-tight text-slate-900">
                      Editar negócio
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      aria-label="Fechar edição"
                      className="inline-flex size-8 items-center justify-center rounded-full border border-black/6 bg-white text-slate-500 hover:bg-slate-50 active:scale-95"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
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
                    onSuccess={() => { setEditing(false); invalidateAll(); }}
                    onCancel={() => setEditing(false)}
                  />
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </WorkspaceShell>
  );
}

function EmptySidebar() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-[13px] tracking-tight text-slate-400">
      <User className="mb-3 size-10 opacity-30" strokeWidth={1.5} />
      <p>Nenhum contato vinculado a este negocio.</p>
    </div>
  );
}
