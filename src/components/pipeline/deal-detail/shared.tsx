"use client";

import * as React from "react";

import { Building2, ExternalLink, Mail, Phone, User } from "lucide-react";

import { cn } from "@/lib/utils";

export type DealDetailUser = { id: string; name: string; email: string | null };

export type DealDetailNote = {
  id: string;
  content: string;
  createdAt: string;
  user: DealDetailUser;
};

export type DealDetailActivity = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  completed: boolean;
  scheduledAt: string | null;
  createdAt: string;
  user: DealDetailUser;
};

export type DealDetailData = {
  id: string;
  title: string;
  value: number | string;
  status: "OPEN" | "WON" | "LOST";
  expectedClose: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
  contact: { id: string; name: string; email: string | null; phone: string | null } | null;
  stage: { id: string; name: string; color?: string | null; pipeline: { id: string; name: string } };
  owner: DealDetailUser | null;
  tags?: { tag: { id: string; name: string; color: string } }[];
  activities: DealDetailActivity[];
  notes: DealDetailNote[];
};

export type DealTimelineEvent = {
  id: string;
  type: string;
  meta: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null } | null;
};

export type ConversationRow = {
  id: string;
  externalId: string | null;
  channel: string;
  status: string;
  inboxName: string | null;
  createdAt: string;
  updatedAt: string;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; email?: string | null } | null;
  tags?: { tag: { id: string; name: string; color: string } }[] | null;
};

export type ContactDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  leadScore: number;
  lifecycleStage: string;
  source: string | null;
  company: { id: string; name: string; domain: string | null } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  deals: {
    id: string;
    title: string;
    value: string | number;
    status: string;
    stage: { id: string; name: string; color: string };
  }[];
  activities: DealDetailActivity[];
  notes: DealDetailNote[];
  conversations: ConversationRow[];
  createdAt: string;
  updatedAt: string;
};

export type UserOption = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  agentStatus?: {
    status: "ONLINE" | "OFFLINE" | "AWAY";
    availableForVoiceCalls?: boolean;
    updatedAt?: string;
  } | null;
};

export type DealProductItem = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  unit: string;
  productType?: "PRODUCT" | "SERVICE";
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
};

export type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: number | string;
  unit: string;
  type?: "PRODUCT" | "SERVICE";
};

export const ACTIVITY_TYPES = [
  { value: "CALL", label: "Ligação", icon: "📞" },
  { value: "EMAIL", label: "E-mail", icon: "📧" },
  { value: "MEETING", label: "Reunião", icon: "🤝" },
  { value: "TASK", label: "Tarefa", icon: "✅" },
  { value: "NOTE", label: "Nota", icon: "📝" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "💬" },
  { value: "OTHER", label: "Outro", icon: "📌" },
];

export const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Assinante", color: "bg-gray-400" },
  { value: "LEAD", label: "Lead", color: "bg-blue-500" },
  { value: "MQL", label: "MQL", color: "bg-amber-500" },
  { value: "SQL", label: "SQL", color: "bg-orange-500" },
  { value: "OPPORTUNITY", label: "Oportunidade", color: "bg-purple-500" },
  { value: "CUSTOMER", label: "Cliente", color: "bg-emerald-500" },
  { value: "EVANGELIST", label: "Evangelista", color: "bg-pink-500" },
  { value: "OTHER", label: "Outro", color: "bg-gray-400" },
] as const;

export const LIFECYCLE_COLORS: Record<string, string> = {
  SUBSCRIBER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  LEAD: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  MQL: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  SQL: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  OPPORTUNITY: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  CUSTOMER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  EVANGELIST: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberto",
  RESOLVED: "Resolvido",
  PENDING: "Pendente",
  SNOOZED: "Adiado",
};

export function SidebarSection({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("border-b border-slate-200/90 pb-4", className)}>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function MiniInfoCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 shadow-sm",
        tone === "success" && "border-emerald-100 bg-emerald-50/70",
        tone === "warning" && "border-amber-100 bg-amber-50/70",
        tone === "default" && "border-slate-200 bg-slate-50/80",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-1 text-[15px] font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function CompactRow({
  icon,
  value,
  copyable,
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
  copyable?: boolean;
}) {
  const text = value || "—";
  return (
    <div className="group/row flex items-center gap-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span
        className={cn(
          "truncate text-foreground",
          copyable && text !== "—" && "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400",
        )}
        onClick={() => {
          if (copyable && text !== "—") navigator.clipboard.writeText(text);
        }}
        title={copyable && text !== "—" ? "Clique para copiar" : undefined}
      >
        {text}
      </span>
    </div>
  );
}

export function ContactInfoRows({ contact }: { contact: ContactDetail }) {
  return (
    <div className="grid gap-2 text-sm">
      <CompactRow icon={<User className="size-4" />} value={contact.name} />
      <CompactRow icon={<Mail className="size-4" />} value={contact.email} copyable />
      <CompactRow icon={<Phone className="size-4" />} value={contact.phone} copyable />
      {contact.company && <CompactRow icon={<Building2 className="size-4" />} value={contact.company.name} />}
      {contact.source && <CompactRow icon={<ExternalLink className="size-4" />} value={contact.source} />}
      {contact.assignedTo && <CompactRow icon={<User className="size-4" />} value={contact.assignedTo.name} />}
    </div>
  );
}
