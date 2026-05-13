"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardList,
  Eye,
  EyeOff,
  Flame,
  GitBranch,
  Handshake,
  Mail,
  Phone,
  Plus,
  Settings2,
  Snowflake,
  Sun,
  Trophy,
  User,
  XCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TooltipHost } from "@/components/ui/tooltip";
import { ds } from "@/lib/design-system";

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

type DealProductItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit: string;
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

const DEAL_STATUS_LABEL: Record<string, string> = { OPEN: "Aberto", WON: "Ganho", LOST: "Perdido" };
const DEAL_STATUS_COLOR: Record<string, string> = {
  OPEN: "text-blue-700 bg-blue-50 border-blue-200",
  WON: "text-emerald-700 bg-emerald-50 border-emerald-200",
  LOST: "text-slate-600 bg-slate-50 border-slate-200",
};

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

// ── Field visibility settings ──

const SECTION_KEYS = [
  { key: "engagement", label: "Engajamento e Fase" },
  { key: "tags", label: "Tags" },
  { key: "allDeals", label: "Todos os negócios" },
] as const;

type SectionKey = (typeof SECTION_KEYS)[number]["key"];

type SidebarVisibility = {
  sections: Record<string, boolean>;
  hiddenFields: string[];
};

const SECTION_DEFAULTS: Record<string, boolean> = {
  engagement: true,
  tags: true,
  allDeals: true,
};

const STORAGE_KEY = "inbox-sidebar-fields-v2";

function useSidebarVisibility() {
  const [vis, setVis] = React.useState<SidebarVisibility>({
    sections: { ...SECTION_DEFAULTS },
    hiddenFields: [],
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SidebarVisibility>;
        setVis({
          sections: { ...SECTION_DEFAULTS, ...(parsed.sections ?? {}) },
          hiddenFields: Array.isArray(parsed.hiddenFields) ? parsed.hiddenFields : [],
        });
      }
    } catch { /* ignore */ }
  }, []);

  const save = React.useCallback((next: SidebarVisibility) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const toggleSection = React.useCallback((key: string) => {
    setVis((prev) => {
      const next = { ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } };
      save(next);
      return next;
    });
  }, [save]);

  const toggleField = React.useCallback((fieldId: string) => {
    setVis((prev) => {
      const hidden = prev.hiddenFields.includes(fieldId)
        ? prev.hiddenFields.filter((id) => id !== fieldId)
        : [...prev.hiddenFields, fieldId];
      const next = { ...prev, hiddenFields: hidden };
      save(next);
      return next;
    });
  }, [save]);

  const isFieldVisible = React.useCallback((fieldId: string) => {
    return !vis.hiddenFields.includes(fieldId);
  }, [vis.hiddenFields]);

  return { sections: vis.sections, toggleSection, toggleField, isFieldVisible };
}

// ── Main component ──

export function ContactDealSidebar({
  contactId,
  contactName,
  lastInboundAt,
  conversationId,
  channel,
  onBack,
  onCreateDeal,
  side = "right",
}: Props) {
  const { sections, toggleSection, toggleField, isFieldVisible } = useSidebarVisibility();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const { data: contact } = useQuery<ContactDetail>({
    queryKey: ["contact-sidebar", contactId],
    queryFn: async () => { const r = await fetch(apiUrl(`/api/contacts/${contactId}`)); if (!r.ok) throw new Error("Erro"); return r.json(); },
    enabled: !!contactId,
    staleTime: 30_000,
  });

  const engagement = getEngagement(lastInboundAt);
  const EngIcon = engagement.icon;

  const activeDeal = contact?.deals?.find((d) => d.status === "OPEN");
  const allDeals = contact?.deals ?? [];
  const tags = contact?.tags ?? [];
  const lifecycle = contact?.lifecycleStage ? (LIFECYCLE_LABELS[contact.lifecycleStage] ?? contact.lifecycleStage) : null;
  const inboxFields = contact?.inboxLeadPanelFields ?? [];
  const booleanFields = inboxFields.filter((f) => f.type === "BOOLEAN");
  const otherInboxFields = inboxFields.filter((f) => f.type !== "BOOLEAN");
  const dealPanelFields = activeDeal ? (contact?.dealInboxPanelFields?.[activeDeal.id] ?? []) : [];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 max-h-full w-[min(100%,380px)] shrink-0 flex-col overflow-hidden bg-white",
        "sm:w-[380px]",
        side === "right" ? "border-l border-slate-100" : "border-r border-slate-100",
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-black tracking-tight text-slate-900">
            Painel CRM
          </h3>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Gestão de Lead
          </p>
        </div>
        <div className="relative">
          <TooltipHost label="Configurar campos visíveis" side="left">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label="Configurar campos visíveis"
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                settingsOpen
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Settings2 className="size-3.5" />
            </button>
          </TooltipHost>

          {settingsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)]">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Seções
                </p>
                <div className="space-y-1">
                  {SECTION_KEYS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSection(key)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
                    >
                      {sections[key] ? (
                        <Eye className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <EyeOff className="size-3.5 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={cn("flex-1", !sections[key] && "text-muted-foreground/60")}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
                {(inboxFields.length > 0 || dealPanelFields.length > 0) && (
                  <>
                    <div className="my-2 border-t border-border/60" />
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Campos personalizados
                    </p>
                    <div className="space-y-1">
                      {[...inboxFields, ...dealPanelFields].map((f) => {
                        const visible = isFieldVisible(f.fieldId);
                        return (
                          <button
                            key={f.fieldId}
                            type="button"
                            onClick={() => toggleField(f.fieldId)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
                          >
                            {visible ? (
                              <Eye className="size-3.5 shrink-0 text-primary" />
                            ) : (
                              <EyeOff className="size-3.5 shrink-0 text-muted-foreground/50" />
                            )}
                            <span className={cn("flex-1", !visible && "text-muted-foreground/60")}>
                              {f.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">

        {/* ═══ ACTIVE DEAL (always visible) ═══ */}
        <div className="p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Negócio Ativo
          </p>
          {activeDeal ? (
            <>
              <ActiveDealCard
                deal={activeDeal}
                contact={contact ?? null}
                contactName={contactName}
              />
              <DealPanelFields fields={dealPanelFields} isFieldVisible={isFieldVisible} />
            </>
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
              <p className="mb-3 text-xs text-slate-500">Nenhum negócio aberto</p>
              <button
                type="button"
                onClick={onCreateDeal}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md"
              >
                <Plus className="size-3.5" /> Criar negócio
              </button>
            </div>
          )}
        </div>

        {/* ═══ QUICK LINK TO CONTACT ═══ */}
        <div className="px-5 pb-3">
          <Link
            href={`/contacts/${contactId}`}
            className="group flex w-full items-center justify-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 transition-all hover:border-slate-200 hover:text-slate-900"
          >
            Abrir perfil completo <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* ═══ ENGAGEMENT & LIFECYCLE ═══ */}
        {sections.engagement && (
          <div className="px-5 pb-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Engajamento
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {lifecycle && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  <User className="size-2.5" /> {lifecycle}
                </span>
              )}
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                engagement.bg, engagement.color,
              )}>
                <EngIcon className="size-2.5" /> {engagement.label}
              </span>
            </div>
          </div>
        )}

        {/* ═══ TAGS ═══ */}
        {sections.tags && tags.length > 0 && (
          <div className="px-5 pb-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Interesses
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className={ds.tag.solid}
                  style={{ backgroundColor: tag.color || "#64748b" }}
                  title={tag.name}
                >
                  <span className="truncate">{tag.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CUSTOM FIELDS ═══ */}
        {(() => {
          const visibleBooleanFields = booleanFields.filter((f) => isFieldVisible(f.fieldId));
          const visibleOtherFields = otherInboxFields.filter((f) => isFieldVisible(f.fieldId));
          const hasVisible = visibleBooleanFields.length > 0 || visibleOtherFields.length > 0;

          if (!hasVisible && inboxFields.length === 0) {
            return (
              <div className="px-5 pb-4">
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-3.5 py-3 text-[11px] leading-snug text-slate-500">
                  Nenhum campo extra configurado. Em{" "}
                  <Link
                    href="/settings/custom-fields"
                    className="font-semibold text-brand-blue underline-offset-2 hover:underline"
                  >
                    Campos personalizados
                  </Link>
                  , marque &quot;Exibir no painel lateral&quot; nos campos desejados.
                </p>
              </div>
            );
          }

          if (!hasVisible) return null;

          return (
            <div className="px-5 pb-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Informações em destaque
                </p>
                <Link
                  href="/settings/custom-fields"
                  className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-900"
                >
                  Configurar
                </Link>
              </div>

              {visibleBooleanFields.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visibleBooleanFields.map((f) => {
                    const b = parseStoredBoolean(f.value);
                    const unset = b === null;
                    const positive = b === true;
                    return (
                      <span
                        key={f.fieldId}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm",
                          unset && "bg-slate-100 text-slate-500",
                          !unset && positive && "bg-emerald-500 text-white",
                          !unset && !positive && "bg-amber-500 text-white",
                        )}
                      >
                        <span className={cn(
                          "size-1.5 rounded-full",
                          unset && "bg-slate-400",
                          !unset && positive && "bg-white",
                          !unset && !positive && "bg-white",
                        )} />
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {visibleOtherFields.length > 0 && (
                <div className={cn(
                  "grid grid-cols-2 gap-2",
                  visibleBooleanFields.length > 0 && "mt-3",
                )}>
                  {visibleOtherFields.map((f) => {
                    const val = formatInboxPanelValue(f);
                    const isEmpty = val === "—";
                    const isLong = val.length > 14;
                    return (
                      <div
                        key={f.fieldId}
                        className={cn(
                          "rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm transition-shadow hover:shadow-md",
                          isLong && "col-span-2",
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          {f.label}
                        </p>
                        <p
                          className={cn(
                            "mt-1 wrap-break-word text-sm font-black tabular-nums leading-snug",
                            isEmpty ? "text-slate-300" : "text-slate-900",
                            (f.type === "TEXT" || f.type === "PHONE") && "font-mono tracking-tight",
                          )}
                        >
                          {val}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/*
          ═══ WHATSAPP CALL PANEL ═══
          Removido: o estado da sessão de voz (Call Permission da Meta)
          agora vive no chip compacto do header do chat
          (<WhatsappCallChip>). Evita duplicar UI e reduz o ruído visual
          da sidebar. Ver `src/components/inbox/whatsapp-call-chip.tsx`.
        */}

        {/* ═══ ALL DEALS ═══ */}
        {sections.allDeals && allDeals.length > 0 && (
          <div className="px-5 pb-6 pt-2">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              <Handshake className="size-3" /> Todos os negócios · {allDeals.length}
            </p>
            <div className="space-y-1">
              {allDeals.map((d) => {
                const val = Number.parseFloat(d.value);
                return (
                  <Link
                    key={d.id}
                    href={`/leads/${d.id}`}
                    className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-slate-50 hover:translate-x-0.5"
                  >
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide",
                        DEAL_STATUS_COLOR[d.status] ?? "text-slate-600 bg-slate-50 border border-slate-200",
                      )}
                    >
                      {DEAL_STATUS_LABEL[d.status] ?? d.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{d.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {d.stage.name}
                        {d.owner && <> · {d.owner.name}</>}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black tabular-nums text-slate-900">
                      {Number.isFinite(val) && val > 0 ? formatCurrency(val) : "—"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active Deal Card ──
// Espelha o DNA do `DealCard` do Sales Hub (src/components/sales-hub/
// deal-queue.tsx): barrinha de acento da etapa, LEAD ID no topo,
// nome bold 20px, tags inline, pílulas de contato (phone/email) e
// as info-rows "ETAPA ATUAL" / "INTERESSE" — com o valor do negócio
// trailing no INTERESSE (valor é derivado do produto).
//
// Aqui não temos `pipelineId` nem a lista completa de etapas à mão
// (o painel de inbox pode apontar para um deal de qualquer pipeline),
// então as rows ficam READ-ONLY. Mudanças de etapa/produto acontecem
// no Sales Hub ou no perfil completo do lead ("Abrir perfil completo").

function InboxContactPill({
  icon: Icon,
  value,
  mono,
}: {
  icon: typeof Phone;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon className="size-3" strokeWidth={2.5} />
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-[11px] font-bold tracking-tight text-slate-700",
          mono && "font-mono tabular-nums",
        )}
      >
        {value || (
          <span className="font-sans font-normal text-slate-400">—</span>
        )}
      </span>
    </span>
  );
}

function InboxInfoRow({
  icon: Icon,
  label,
  value,
  trailing,
  bullet,
}: {
  icon: typeof GitBranch;
  label: string;
  value: React.ReactNode;
  trailing?: React.ReactNode;
  bullet?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-lg px-1 py-1">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </div>
        <div className="flex items-center gap-2">
          {bullet && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: bullet }}
            />
          )}
          <span className="min-w-0 truncate text-[13px] font-bold tracking-tight text-slate-800">
            {value}
          </span>
        </div>
      </div>
      {trailing}
    </div>
  );
}

function ActiveDealCard({
  deal,
  contact,
  contactName,
}: {
  deal: {
    id: string; number?: number | null; title: string; value: string; status: string;
    stage: { id: string; name: string; color: string | null };
    owner?: { id: string; name: string } | null;
  };
  contact: ContactDetail | null;
  contactName: string;
}) {
  const val = Number.parseFloat(deal.value);
  const hasValue = Number.isFinite(val) && val > 0;

  const { data: products = [] } = useQuery({
    queryKey: ["deal-products-inline", deal.id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}/products`));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []) as DealProductItem[];
    },
  });

  const markDeal = async (status: "WON" | "LOST") => {
    const res = await fetch(apiUrl(`/api/deals/${deal.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) window.location.reload();
  };

  const stageColor = deal.stage.color || "#507df1";

  // Nome do produto mais relevante — prioriza `deal.title` quando
  // parece descrever o interesse; senão, primeiro item de produtos.
  const interestName = products.length > 0 ? products[0].productName : deal.title;
  const hasInterest = !!interestName;

  const displayName = contact?.name ?? contactName;
  const tags = contact?.tags ?? [];

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_15px_40px_-8px_rgba(15,23,42,0.08)]">
      {/* Barrinha de acento — cor da etapa (igual Sales Hub). */}
      <div
        className="h-1 w-full rounded-t-2xl"
        style={{ backgroundColor: stageColor }}
      />

      {/* Header com LEAD ID */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Lead ID: #{deal.number ?? "—"}
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Aberto
        </span>
      </div>

      {/* Nome grande */}
      <h3
        className="mt-0.5 truncate px-4 text-[20px] leading-tight tracking-tight text-slate-900"
        style={{ fontWeight: 800 }}
      >
        {displayName}
      </h3>

      {/* Tags no topo */}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 px-4">
          {tags.slice(0, 4).map(({ tag }) => (
            <span
              key={tag.id}
              className={ds.tag.solid}
              style={{ backgroundColor: tag.color || "#64748b" }}
              title={tag.name}
            >
              <span className="truncate">{tag.name}</span>
            </span>
          ))}
          {tags.length > 4 && (
            <span className={ds.tag.more}>+{tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Pílulas de contato */}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-4">
        <InboxContactPill icon={Phone} value={contact?.phone} mono />
        <InboxContactPill icon={Mail} value={contact?.email} />
      </div>

      {/* Bloco central — ETAPA ATUAL (read-only) + INTERESSE (valor trailing) */}
      <div className="mt-3 space-y-1 border-t border-slate-100 px-3 py-3">
        <InboxInfoRow
          icon={GitBranch}
          label="Etapa atual"
          value={deal.stage.name}
          bullet={stageColor}
        />
        <InboxInfoRow
          icon={ClipboardList}
          label="Interesse"
          value={
            hasInterest ? (
              interestName
            ) : (
              <span className="font-normal text-slate-400">—</span>
            )
          }
          trailing={
            hasValue ? (
              <span className="shrink-0 text-[12px] font-black tabular-nums tracking-tight text-slate-900">
                {formatCurrency(val)}
              </span>
            ) : null
          }
        />
      </div>

      {/* Linha de produtos adicionais (quando existem 2+) */}
      {products.length > 1 && (
        <div className="mx-4 mb-3 space-y-1 rounded-xl bg-slate-50/60 px-3 py-2">
          {products.slice(1).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="truncate text-slate-500">
                {item.quantity} {item.unit} × {item.productName}
                {item.discount > 0 && (
                  <span className="ml-0.5 text-amber-600">
                    -{item.discount}%
                  </span>
                )}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-slate-900">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer — Ganho / Perdido */}
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => markDeal("WON")}
          className="group inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white hover:shadow-sm"
        >
          <Trophy className="size-3.5" /> Ganho
        </button>
        <button
          type="button"
          onClick={() => markDeal("LOST")}
          className="group inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-rose-500 transition-all hover:bg-rose-500 hover:text-white hover:shadow-sm"
        >
          <XCircle className="size-3.5" /> Perdido
        </button>
      </div>
    </div>
  );
}

function DealPanelFields({
  fields,
  isFieldVisible,
}: {
  fields: InboxLeadPanelField[];
  isFieldVisible: (id: string) => boolean;
}) {
  const visibleBoolean = fields.filter((f) => f.type === "BOOLEAN" && isFieldVisible(f.fieldId));
  const visibleOther = fields.filter((f) => f.type !== "BOOLEAN" && isFieldVisible(f.fieldId));
  if (visibleBoolean.length === 0 && visibleOther.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Dados do cliente
      </p>

      {/* Status flags (boolean) como tags vivas horizontais */}
      {visibleBoolean.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {visibleBoolean.map((f) => {
            const b = parseStoredBoolean(f.value);
            const unset = b === null;
            const positive = b === true;
            return (
              <span
                key={f.fieldId}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm",
                  unset && "bg-slate-100 text-slate-500",
                  !unset && positive && "bg-emerald-500 text-white",
                  !unset && !positive && "bg-rose-500 text-white",
                )}
              >
                <span className="size-1.5 rounded-full bg-white/90" />
                {f.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Campos de texto em grid bento 2 colunas */}
      {visibleOther.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {visibleOther.map((f) => {
            const val = formatInboxPanelValue(f);
            const isEmpty = val === "—";
            const isLong = val.length > 14;
            return (
              <div
                key={f.fieldId}
                className={cn(
                  "rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm transition-shadow hover:shadow-md",
                  isLong && "col-span-2",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {f.label}
                </p>
                <p
                  className={cn(
                    "mt-1 wrap-break-word text-sm font-black tabular-nums leading-snug",
                    isEmpty ? "text-slate-300" : "text-slate-900",
                    (f.type === "TEXT" || f.type === "PHONE") && "font-mono tracking-tight",
                  )}
                >
                  {val}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
