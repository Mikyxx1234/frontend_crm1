"use client";

import { useState } from "react";

import {
  IconBriefcase,
  IconChevronDown,
  IconChevronLeft,
  IconDotsVertical,
  IconPencil,
  IconTag,
  IconUser,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { Chip } from "./chip";
import { TooltipGlass } from "./tooltip-glass";

/**
 * `DealDetailsPanel` — coluna fixa (380px) com identidade do negócio,
 * funil segmentado e grupos de campos.
 *
 * Visual alinhado ao redesign de referência (Stitch): header card escuro
 * `#2e3b6e`, abas pill e cards brancos `rounded-2xl` nas seções.
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
  /** Destaque visual (ref. Stitch): "name" = indigo bold com fundo indigo-50;
   *  "link" = indigo semibold (telefone). */
  emphasis?: "name" | "link";
}

export interface DealFieldGroup {
  title?: string;
  fields: DealField[];
  /** Sufixo do cabeçalho da seção, ex. "#17360" (opacity-60). */
  meta?: string;
  /** Ícone do cabeçalho da seção. */
  icon?: "deal" | "contact" | "tag";
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
  /** Nome real do pipeline. Quando ausente exibe "Funil de vendas". */
  pipelineName?: string | null;
  segments: FunnelSegment[];
  groups: DealFieldGroup[];
  /** Número sequencial do negócio, exibido como "#17360" ao lado do título. */
  dealNumber?: string | null;
  /** Cor da etapa atual (dot da pill de etapa). */
  stageColor?: string | null;
  /** Responsável atual — quando ausente, o botão branco mostra "+Responsável". */
  ownerName?: string | null;
  /** Origem do lead (grid de infos rápidas do header). */
  origin?: string | null;
  /** Canal da conversa (grid de infos rápidas do header). */
  channelLabel?: string | null;
  /** Tags do negócio (grid de infos rápidas do header). */
  tags?: { id: string; name: string; color?: string | null }[];
}

const TABS = ["Principal", "Estatísticas", "Produtos", "Log", "Configurações"] as const;
type Tab = (typeof TABS)[number];

interface DealDetailsPanelProps {
  record: DealRecord;
  productCount?: number;
  onBack?: () => void;
  className?: string;
}

const GROUP_ICONS = {
  deal: IconBriefcase,
  contact: IconUser,
  tag: IconTag,
} as const;

export function DealDetailsPanel({
  record,
  productCount = 1,
  onBack,
  className,
}: DealDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Principal");

  const stageCount = record.segments.length;
  const reachedCount = record.segments.filter((s) => s.reached).length;
  const stagePos = Math.max(1, reachedCount);

  return (
    <aside
      aria-label="Detalhes do negócio"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      {/* ── Header card escuro (ref. Stitch) ── */}
      <header className="shrink-0 rounded-b-3xl bg-[#2e3b6e] p-5 text-white shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1">
            {onBack && (
              <TooltipGlass label="Voltar ao pipeline" side="bottom">
                <button
                  type="button"
                  aria-label="Voltar ao pipeline"
                  onClick={onBack}
                  className="-ml-1.5 mt-0.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <IconChevronLeft size={16} />
                </button>
              </TooltipGlass>
            )}
            <h1 className="min-w-0 text-lg font-bold leading-snug text-white">
              <span className="line-clamp-2">
                {record.tag}
                {record.dealNumber ? (
                  <span className="ml-1.5 text-sm font-normal text-slate-400">
                    {record.dealNumber}
                  </span>
                ) : null}
              </span>
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: record.stageColor ?? "#fb923c" }}
              />
              <span className="max-w-[9rem] truncate">{record.funnelStage}</span>
              <IconChevronDown size={12} className="shrink-0" />
            </button>
            <TooltipGlass label="Mais ações" side="bottom">
              <button
                type="button"
                aria-label="Mais ações"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <IconDotsVertical size={16} />
              </button>
            </TooltipGlass>
          </div>
        </div>

        {/* Anel de progresso + funil + responsável */}
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-orange-500 bg-white/10">
            <span className="text-xs font-bold">
              {stageCount > 0 ? `${stagePos}/${stageCount}` : "—"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {record.pipelineName ?? "Funil de vendas"}
            </p>
            <p className="truncate text-xs text-slate-300">
              {stageCount > 0
                ? `Etapa ${stagePos} de ${stageCount}`
                : record.funnelSubtitle ?? record.funnelStage}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md bg-white px-3 py-2 text-xs font-bold text-[#2e3b6e] shadow-sm transition-colors hover:bg-slate-100"
          >
            {record.ownerName ?? "+Responsável"}
          </button>
        </div>

        {/* Barra de etapas: 2px, ativo #f59e0b, inativo white/20 */}
        <div className="mb-4 flex items-center gap-1">
          {record.segments.map((seg, i) => (
            <span
              key={i}
              className="h-[2px] flex-1 rounded-full transition-colors"
              style={{
                backgroundColor: seg.reached ? "#f59e0b" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>

        {/* Grid 2 colunas de infos rápidas */}
        {(record.origin || record.channelLabel || (record.tags?.length ?? 0) > 0) && (
          <div className="grid grid-cols-2 gap-y-2 border-t border-white/10 pt-4 text-xs">
            {record.origin ? (
              <>
                <span className="text-slate-400">Origem</span>
                <span className="truncate text-right font-medium">{record.origin}</span>
              </>
            ) : null}
            {record.channelLabel ? (
              <>
                <span className="text-slate-400">Canal</span>
                <span className="truncate text-right font-medium">{record.channelLabel}</span>
              </>
            ) : null}
            {(record.tags?.length ?? 0) > 0 ? (
              <>
                <span className="text-slate-400">Tags</span>
                <span className="flex flex-wrap items-center justify-end gap-1">
                  {record.tags!.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="max-w-full truncate rounded-full border border-white/20 bg-white/15 px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {t.name}
                    </span>
                  ))}
                </span>
              </>
            ) : null}
          </div>
        )}
      </header>

      {/* ── Abas (ref. Stitch): ativo branco + indigo, inativo slate ── */}
      <nav
        aria-label="Seções do negócio"
        className="flex shrink-0 gap-2 overflow-x-auto p-4"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors",
                isActive
                  ? "border border-slate-200 bg-white text-indigo-600 shadow-sm"
                  : "bg-slate-200/50 text-slate-600 hover:bg-slate-200",
              )}
            >
              {tab}
              {tab === "Produtos" && productCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-50 px-1 text-[10px] font-bold text-indigo-600">
                  {productCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="aside-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {activeTab === "Principal" ? (
          <div className="flex flex-col gap-6">
            {record.groups.map((group, gi) => {
              const Icon = GROUP_ICONS[group.icon ?? "deal"];
              return (
                <section key={gi}>
                  {group.title && (
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Icon size={16} className="shrink-0" />
                        <h2 className="text-sm font-bold">
                          {group.title}
                          {group.meta ? (
                            <span className="ml-1.5 font-normal opacity-60">{group.meta}</span>
                          ) : null}
                        </h2>
                        <IconChevronDown size={12} className="shrink-0" />
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    {group.fields.map((field, fi) => (
                      <FieldRow key={field.label} field={field} isFirst={fi === 0} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <EmptyTab tab={activeTab} />
        )}
      </div>
    </aside>
  );
}

function FieldRow({ field, isFirst }: { field: DealField; isFirst?: boolean }) {
  const [on, setOn] = useState(field.on ?? false);
  const type = field.type ?? "text";
  const empty = !field.value;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2 text-sm",
        !isFirst && "border-t border-slate-50",
      )}
    >
      <span className="shrink-0 font-medium text-slate-500">{field.label}</span>

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
            empty ? "italic text-slate-400 hover:text-blue-500" : "text-[var(--text-primary)]",
          )}
        >
          <span className="truncate">{field.value || "Selecione"}</span>
          <IconChevronDown size={14} className="shrink-0 text-slate-400" />
        </button>
      ) : empty ? (
        <span className="italic text-slate-400 transition-colors hover:text-blue-500">
          + Adicionar
        </span>
      ) : field.emphasis === "name" ? (
        <span className="max-w-[60%] truncate rounded bg-indigo-50 px-2 py-0.5 text-right font-bold text-indigo-600">
          {field.value}
        </span>
      ) : field.emphasis === "link" ? (
        <span className="max-w-[60%] truncate text-right font-semibold text-indigo-600">
          {field.value}
        </span>
      ) : (
        <span
          className={cn(
            "group flex max-w-[60%] items-center justify-end gap-1.5 text-right font-display text-[13px] font-bold text-[var(--text-primary)]",
            type === "money" && "text-[var(--color-success-text)]",
          )}
        >
          <span className="truncate">{field.value}</span>
          <IconPencil
            size={13}
            className="shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
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
