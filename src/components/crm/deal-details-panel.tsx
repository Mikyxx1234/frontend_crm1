"use client";

import { useState } from "react";

import {
  IconChevronDown,
  IconChevronLeft,
  IconDotsVertical,
  IconPencil,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { Chip } from "./chip";
import { TooltipGlass } from "./tooltip-glass";

/**
 * `DealDetailsPanel` — coluna fixa (380px) com identidade do negócio,
 * funil segmentado e grupos de campos (estilo Kommo).
 *
 * Não confundir com `DealDetailPanel` (singular), que é o slide-over
 * usado dentro do kanban-v2 quando o usuário clica num card.
 */

export type FieldType = "text" | "select" | "toggle" | "money" | "chip";

export interface DealField {
  label: string;
  value?: string;
  type?: FieldType;
  /** Valor inicial do toggle. */
  on?: boolean;
}

export interface DealFieldGroup {
  title?: string;
  fields: DealField[];
}

export interface FunnelSegment {
  color: string;
  /** Etapa concluída/atual recebe cor cheia; futuras ficam esmaecidas. */
  reached: boolean;
}

export interface DealRecord {
  leadNumber: string;
  tag: string;
  funnelStage: string;
  funnelSubtitle?: string;
  segments: FunnelSegment[];
  groups: DealFieldGroup[];
}

const TABS = ["Principal", "Estatísticas", "Produtos", "Log", "Configurações"] as const;
type Tab = (typeof TABS)[number];

interface DealDetailsPanelProps {
  record: DealRecord;
  productCount?: number;
  onBack?: () => void;
  className?: string;
}

export function DealDetailsPanel({
  record,
  productCount = 1,
  onBack,
  className,
}: DealDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Principal");

  return (
    <aside
      aria-label="Detalhes do negócio"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <header className="shrink-0 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-[22px] pb-4 pt-[18px]">
        <div className="flex items-center gap-2">
          {onBack && (
            <TooltipGlass label="Voltar ao pipeline" side="bottom">
              <button
                type="button"
                aria-label="Voltar ao pipeline"
                onClick={onBack}
                className="-ml-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white hover:text-[var(--brand-primary)]"
              >
                <IconChevronLeft size={18} />
              </button>
            </TooltipGlass>
          )}
          <h1 className="flex-1 font-display text-[19px] font-bold tracking-tight text-[var(--text-primary)]">
            {record.leadNumber}
          </h1>
          <TooltipGlass label="Mais ações" side="bottom">
            <button
              type="button"
              aria-label="Mais ações"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white hover:text-[var(--text-primary)]"
            >
              <IconDotsVertical size={18} />
            </button>
          </TooltipGlass>
        </div>

        <div className="mt-2.5">
          <Chip variant="brand">{record.tag}</Chip>
        </div>

        <div className="mt-4">
          <div className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Funil de vendas
          </div>
          <button
            type="button"
            className="mt-1 flex w-full cursor-pointer items-center gap-1.5 bg-transparent text-left"
          >
            <span className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              {record.funnelStage}
            </span>
            {record.funnelSubtitle && (
              <span className="font-display text-xs font-semibold text-[var(--text-muted)]">
                {record.funnelSubtitle}
              </span>
            )}
            <IconChevronDown size={15} className="ml-auto text-[var(--text-muted)]" />
          </button>

          <div className="mt-2.5 flex gap-1">
            {record.segments.map((seg, i) => (
              <span
                key={i}
                className="h-[6px] flex-1 rounded-full transition-opacity"
                style={{
                  background: seg.color,
                  opacity: seg.reached ? 1 : 0.18,
                }}
              />
            ))}
          </div>
        </div>
      </header>

      <nav
        aria-label="Seções do negócio"
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-[var(--glass-border-subtle)] px-3.5"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 bg-transparent px-3 py-3 font-display text-[13px] font-bold transition-colors",
                isActive
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {tab}
              {tab === "Produtos" && productCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-enterprise-bg)] px-1 font-display text-[10px] font-bold text-[var(--brand-primary)]">
                  {productCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-4">
        {activeTab === "Principal" ? (
          <div className="flex flex-col gap-5">
            {record.groups.map((group, gi) => (
              <section key={gi}>
                {group.title && <SubLabel>{group.title}</SubLabel>}
                <div className="rounded-[var(--radius-lg)] border border-black/[0.04] bg-white px-4">
                  {group.fields.map((field, fi) => (
                    <FieldRow
                      key={field.label}
                      field={field}
                      isLast={fi === group.fields.length - 1}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyTab tab={activeTab} />
        )}
      </div>
    </aside>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      {children}
    </div>
  );
}

function FieldRow({ field, isLast }: { field: DealField; isLast?: boolean }) {
  const [on, setOn] = useState(field.on ?? false);
  const type = field.type ?? "text";
  const empty = !field.value;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-3",
        !isLast && "border-b border-black/[0.05]",
      )}
    >
      <span className="shrink-0 font-medium text-[12.5px] text-[var(--text-muted)]">
        {field.label}
      </span>

      {type === "toggle" ? (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn((v) => !v)}
          className={cn(
            "relative h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full transition-colors",
            on ? "bg-[var(--brand-primary)]" : "bg-black/[0.14]",
          )}
        >
          <span
            className={cn(
              "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all",
              on ? "left-[20px]" : "left-[2px]",
            )}
          />
        </button>
      ) : type === "chip" && field.value ? (
        <Chip variant="brand">{field.value}</Chip>
      ) : type === "select" ? (
        <button
          type="button"
          className={cn(
            "group inline-flex max-w-[60%] cursor-pointer items-center gap-1 bg-transparent text-right font-display text-[13px] font-bold",
            empty ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
          )}
        >
          <span className="truncate">{field.value || "Selecione"}</span>
          <IconChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" />
        </button>
      ) : (
        <span
          className={cn(
            "group flex max-w-[60%] items-center justify-end gap-1.5 text-right font-display text-[13px] font-bold",
            empty ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]",
            type === "money" && !empty && "text-[var(--color-success-text)]",
          )}
        >
          <span className="truncate">{field.value || "—"}</span>
          <IconPencil
            size={13}
            className="shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
          />
        </span>
      )}
    </div>
  );
}

function EmptyTab({ tab }: { tab: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <p className="font-display text-sm font-bold text-[var(--text-secondary)]">{tab}</p>
      <p className="max-w-[200px] text-[12.5px] leading-relaxed text-[var(--text-muted)]">
        Nenhum conteúdo disponível nesta seção ainda.
      </p>
    </div>
  );
}
