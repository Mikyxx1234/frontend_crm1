"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Flame,
  Snowflake,
  Sun,
  Tag,
} from "lucide-react";
import { SortableSidebar } from "@/components/ui/sortable-sidebar";
import { SidebarField } from "@/components/ui/sidebar-field";
import { useFieldLayout } from "@/hooks/use-field-layout";
import type { SectionConfig } from "@/lib/field-layout";
import { dt } from "@/lib/design-tokens";
import { cn, tagPillStyle } from "@/lib/utils";

type InboxLeadPanelField = {
  fieldId: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  value: string | null;
};

type ContactDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  leadScore: number | null;
  lifecycleStage: string;
  company: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
  deals: {
    id: string; number?: number | null; title: string; value: string; status: string;
    stage: { id: string; name: string; color: string | null };
    owner?: { id: string; name: string } | null;
  }[];
  inboxLeadPanelFields?: InboxLeadPanelField[];
  dealInboxPanelFields?: Record<string, InboxLeadPanelField[]>;
};

type Props = {
  contactId: string;
  contactName: string;
  contactPhone?: string | null;
  lastInboundAt?: string | null;
  conversationId?: string | null;
  channel?: string | null;
  onBack: () => void;
  onCreateDeal: () => void;
  side?: "left" | "right";
  onCollapse?: () => void;
};

const LIFECYCLE_LABELS: Record<string, string> = {
  SUBSCRIBER: "Assinante", LEAD: "Lead", MQL: "MQL", SQL: "SQL",
  OPPORTUNITY: "Oportunidade", CUSTOMER: "Cliente", EVANGELIST: "Evangelista", OTHER: "Outro",
};

function getEngagement(lastInboundAt?: string | null) {
  if (!lastInboundAt) return { label: "Sem interação", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-50" } as const;
  const hours = (Date.now() - new Date(lastInboundAt).getTime()) / 3_600_000;
  if (hours < 1) return { label: "Alto", icon: Flame, color: "text-red-500", bg: "bg-red-50" } as const;
  if (hours < 24) return { label: "Médio", icon: Sun, color: "text-amber-500", bg: "bg-amber-50" } as const;
  return { label: "Baixo", icon: Snowflake, color: "text-blue-400", bg: "bg-blue-50" } as const;
}

function parseStoredBoolean(raw: string | null): boolean | null {
  if (raw == null || raw.trim() === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "sim") return true;
  if (v === "false" || v === "0" || v === "no" || v === "não" || v === "nao") return false;
  return null;
}

function formatInboxPanelValue(field: InboxLeadPanelField): string {
  const v = field.value;
  if (v == null || v.trim() === "") return "—";
  switch (field.type) {
    case "BOOLEAN": {
      const b = parseStoredBoolean(v);
      if (b === true) return "Sim";
      if (b === false) return "Não";
      return v;
    }
    case "MULTI_SELECT":
      return v.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
    case "DATE": {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR");
    }
    default:
      return v;
  }
}

const EMPTY_PANEL_FIELDS: InboxLeadPanelField[] = [];

/** Barra de progresso do negócio ativo (API não envia índice do estágio no pipeline). */
const LIFECYCLE_DEAL_BAR_PCT: Record<string, number> = {
  SUBSCRIBER: 12,
  LEAD: 22,
  MQL: 38,
  SQL: 52,
  OPPORTUNITY: 72,
  CUSTOMER: 92,
  EVANGELIST: 96,
  OTHER: 28,
};

function EngagementBadge({ value }: { value: string }) {
  const tone =
    value === "Alto"
      ? "bg-emerald-100 text-emerald-800"
      : value === "Médio"
        ? "bg-amber-100 text-amber-900"
        : value === "Baixo"
          ? "bg-blue-50 text-blue-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center rounded-[4px] px-2 py-0.5 text-[10px] font-semibold leading-tight", tone)}>
      {value}
    </span>
  );
}

export function ContactDealSidebar(props: Props) {
  const {
    contactId,
    contactName,
    contactPhone,
    lastInboundAt,
    onCreateDeal,
    side = "right",
    onCollapse,
  } = props;

  const [editMode, setEditMode] = React.useState(false);
  const [extraFieldsOpen, setExtraFieldsOpen] = React.useState(false);
  const { sections, isAdmin, hasAgentOverride, saveAdmin, saveAdminPending, saveAgent, resetAgent } =
    useFieldLayout("inbox_crm");

  const { data: contact } = useQuery<ContactDetail>({
    queryKey: ["contact-sidebar", contactId],
    queryFn: async () => { const r = await fetch(apiUrl(`/api/contacts/${contactId}`)); if (!r.ok) throw new Error("Erro"); return r.json(); },
    enabled: !!contactId,
    staleTime: 30_000,
  });

  const engagement = getEngagement(lastInboundAt);

  const activeDeal = contact?.deals?.find((d) => d.status === "OPEN");
  const allDeals = contact?.deals ?? [];
  const tags = contact?.tags ?? [];
  const lifecycle = contact?.lifecycleStage ? (LIFECYCLE_LABELS[contact.lifecycleStage] ?? contact.lifecycleStage) : null;
  const inboxFieldsList = contact?.inboxLeadPanelFields ?? EMPTY_PANEL_FIELDS;
  const dealPanelFieldsList = activeDeal
    ? (contact?.dealInboxPanelFields?.[activeDeal.id] ?? EMPTY_PANEL_FIELDS)
    : EMPTY_PANEL_FIELDS;
  const visibleCustomFields = React.useMemo(() => {
    const merged = [...inboxFieldsList, ...dealPanelFieldsList];
    const seen = new Set<string>();
    const out: InboxLeadPanelField[] = [];
    for (const f of merged) {
      if (seen.has(f.fieldId)) continue;
      seen.add(f.fieldId);
      out.push(f);
    }
    return out;
  }, [inboxFieldsList, dealPanelFieldsList]);

  const displayName = contact?.name ?? contactName;
  const displayPhone = contact?.phone ?? contactPhone ?? null;
  const displayEmail = contact?.email ?? null;

  const dealBarPct = activeDeal
    ? LIFECYCLE_DEAL_BAR_PCT[contact?.lifecycleStage ?? ""] ?? 40
    : 0;
  const dealBarColor = activeDeal?.stage?.color ?? "var(--color-primary)";

  const renderSection = (section: SectionConfig) => {
    switch (section.id) {
      case "negocio":
        return (
          <div key="negocio">
            <div className="px-4 pb-1 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Negócio</span>
            </div>
            {activeDeal ? (
              <>
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="mb-1.5 text-[10px] font-bold text-slate-900">Negócio ativo</p>
                  <Link href={`/leads/${activeDeal.id}`} className="mb-1.5 block w-full truncate text-left text-[12px] font-medium text-blue-600 hover:underline">{activeDeal.title}</Link>
                  <div className="flex items-center gap-2">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${dealBarPct}%`, backgroundColor: dealBarColor }} />
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-medium text-blue-600">{activeDeal.stage?.name}</span>
                  </div>
                </div>
                {activeDeal.owner ? (
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                    <span className="text-[12px] text-slate-400">Responsável</span>
                    <span className="text-[12px] font-medium text-slate-700">{activeDeal.owner.name}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                  <span className="text-[12px] text-slate-400">Estágio</span>
                  <span
                    className="rounded-[4px] px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      background: (activeDeal.stage?.color ?? "#2563eb") + "14",
                      color: activeDeal.stage?.color ?? "#2563eb",
                      border: `1px solid ${(activeDeal.stage?.color ?? "#2563eb")}4D`,
                    }}
                  >
                    {activeDeal.stage?.name}
                  </span>
                </div>
              </>
            ) : (
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold text-slate-900">Negócio ativo</p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-400">Nenhum negócio</span>
                  <button type="button" onClick={onCreateDeal} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100">+ Criar</button>
                </div>
              </div>
            )}
          </div>
        );
      case "contato":
        return (
          <div key="contato">
            <div className="px-4 pb-1 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Contato</span>
            </div>
            {displayPhone ? <SidebarField label="Telefone" icon="Phone" value={displayPhone} href={`tel:${displayPhone.replace(/\s/g, "")}`} /> : null}
            {displayEmail ? <SidebarField label="E-mail" icon="Mail" value={displayEmail} href={`mailto:${displayEmail}`} /> : null}
            {lifecycle ? <SidebarField label="Fase" icon="User" value={lifecycle} editable /> : null}
            <SidebarField label="Engajamento" icon="Activity"><EngagementBadge value={engagement.label} /></SidebarField>
            {tags.length > 0 ? (
              <SidebarField label="Interesses" icon="Heart">
                <div className="flex flex-wrap justify-end gap-1">
                  {tags.map(({ tag }) => (
                    <span key={tag.id} className={dt.pill.sm} style={tagPillStyle(tag.name, tag.color)}>{tag.name}</span>
                  ))}
                </div>
              </SidebarField>
            ) : null}
          </div>
        );
      case "campos_contato":
        return (
          <div key="campos_contato">
            {visibleCustomFields.length > 0 ? (
              <>
                <div className="mt-1 border-t border-slate-100 px-4 pb-1 pt-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Campos do contato</span>
                </div>
                {(extraFieldsOpen ? visibleCustomFields : visibleCustomFields.slice(0, 3)).map((f) => {
                  const fieldDisplay = formatInboxPanelValue(f);
                  if (fieldDisplay === "—" || !fieldDisplay.trim()) return null;
                  return <SidebarField key={f.fieldId} icon="Tag" label={f.label} value={fieldDisplay} />;
                })}
                {visibleCustomFields.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setExtraFieldsOpen((v) => !v)}
                    className="px-4 py-2 text-left text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    {extraFieldsOpen ? "Mostrar menos" : `+ ${visibleCustomFields.length - 3} campos ocultos`}
                  </button>
                ) : null}
              </>
            ) : (
              <div className="px-4 py-4 text-center">
                <Tag className="mx-auto mb-1.5 size-4 text-slate-200" />
                <p className="text-[12px] text-slate-300">Nenhum campo configurado</p>
              </div>
            )}
          </div>
        );
      case "todos_negocios":
        return (
          <div key="todos_negocios">
            {allDeals.length > 0 ? (
              <>
                <div className="mt-1 border-t border-slate-100 px-4 pb-1 pt-3">
                  <p className="text-[10px] font-bold text-slate-900">Todos os negócios</p>
                </div>
                {allDeals.map((d) => (
                  <Link key={d.id} href={`/leads/${d.id}`} className={cn(dt.card.row, "block w-full cursor-pointer text-left")}>
                    <span className={cn(dt.text.value, "truncate")}>{d.title}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-slate-400">{d.stage.name}</span>
                  </Link>
                ))}
              </>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 max-h-full w-[min(100%,280px)] shrink-0 flex-col overflow-hidden bg-white",
        "sm:w-[280px] xl:w-[300px]",
        side === "right" ? "border-l border-slate-100" : "border-r border-slate-100",
      )}
    >
      <div className="relative flex h-8 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3">
        <span className="text-[11px] font-medium text-slate-400">CRM</span>
        <div className="flex items-center gap-0.5">
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="inline-flex size-6 items-center justify-center rounded text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500"
              aria-label="Recolher"
            >
              {side === "right" ? (
                <ChevronsRight className="size-3.5" />
              ) : (
                <ChevronsLeft className="size-3.5" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[14px] font-semibold text-slate-900">{displayName}</p>
          {contact?.company?.name ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{contact.company.name}</p>
          ) : null}
          {displayPhone ? <p className="mt-0.5 text-[11px] text-slate-400">{displayPhone}</p> : null}
        </div>
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

        <Link
          href={`/contacts/${contactId}`}
          className={cn(
            "mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[12px] font-medium transition-colors hover:text-blue-700",
            dt.text.link,
          )}
        >
          Abrir perfil completo
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
