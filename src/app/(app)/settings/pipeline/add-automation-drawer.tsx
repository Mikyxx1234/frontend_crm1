"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAutomations } from "@/features/automations-v2/hooks";
import type { AutomationListItemDto } from "@/features/automations-v2/api";

// ─── Gatilhos de estágio disponíveis ─────────────────────────────

interface StageTriggerOption {
  value: string;
  label: string;
  description: string;
}

const STAGE_TRIGGERS: StageTriggerOption[] = [
  {
    value: "STAGE_ENTERED",
    label: "Quando criado nesta etapa",
    description: "Executa ao mover ou criar um negócio nesta etapa.",
  },
  {
    value: "STAGE_EXITED",
    label: "Quando sair desta etapa",
    description: "Executa ao mover um negócio para outra etapa.",
  },
  {
    value: "DEAL_CREATED",
    label: "Quando negócio for criado",
    description: "Executa apenas na criação do negócio nesta etapa.",
  },
  {
    value: "MESSAGE_RECEIVED",
    label: "Quando mensagem for recebida",
    description: "Executa ao receber uma mensagem do contato.",
  },
  {
    value: "DEAL_WON",
    label: "Quando negócio for ganho",
    description: "Executa ao marcar o negócio como ganho.",
  },
  {
    value: "DEAL_LOST",
    label: "Quando negócio for perdido",
    description: "Executa ao marcar o negócio como perdido.",
  },
];

// ─── Componente de select glass ───────────────────────────────────

function SelectGlass({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const fn = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", fn);
    return () => document.removeEventListener("pointerdown", fn);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <p className="mb-1.5 font-display text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 text-left font-display text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-primary)]/50 focus:outline-none"
      >
        <span>{selected?.label ?? "Selecionar..."}</span>
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-[var(--text-muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-1 shadow-[0_8px_24px_rgba(15,20,40,0.18)] backdrop-blur-md">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors",
                opt.value === value
                  ? "bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-overlay)]",
              )}
            >
              <span className="font-display text-[13px] font-semibold">{opt.label}</span>
              {opt.description && (
                <span className="font-display text-[11px] text-[var(--text-muted)]">
                  {opt.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seletor de automação ─────────────────────────────────────────

function AutomationPicker({
  selectedId,
  onSelect,
  onCreateNew,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAutomations({ perPage: 100 });

  const items: AutomationListItemDto[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (a) => !q || a.name.toLowerCase().includes(q) || a.triggerType.toLowerCase().includes(q),
    );
  }, [data?.items, search]);

  return (
    <div className="flex flex-col gap-2">
      <p className="font-display text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        Automação
      </p>

      {/* Busca */}
      <div className="relative">
        <IconSearch
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar automação..."
          className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-8 pr-3 font-display text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:outline-none"
        />
      </div>

      {/* Lista */}
      <div className="max-h-[200px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]">
        {isLoading && (
          <p className="px-3.5 py-3 font-display text-[12.5px] text-[var(--text-muted)]">
            Carregando...
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <p className="px-3.5 py-3 font-display text-[12.5px] text-[var(--text-muted)]">
            Nenhuma automação encontrada.
          </p>
        )}

        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3.5 py-2.5 text-left last:border-0 transition-colors",
                isSelected
                  ? "bg-[var(--brand-primary)]/8 text-[var(--brand-primary)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]",
                )}
              >
                {isSelected ? <IconCheck size={13} /> : <IconBolt size={13} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[12.5px] font-bold">
                  {item.name}
                </p>
                {item.description && (
                  <p className="truncate font-display text-[11px] text-[var(--text-muted)]">
                    {item.description}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold",
                  item.active
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                )}
              >
                {item.active ? "Ativa" : "Pausada"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Criar nova */}
      <button
        type="button"
        onClick={onCreateNew}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--glass-border)] py-2.5 font-display text-[12.5px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
      >
        <IconPlus size={14} />
        Criar nova automação
      </button>
    </div>
  );
}

// ─── Drawer principal ─────────────────────────────────────────────

export interface AddAutomationDrawerProps {
  open: boolean;
  stageName: string;
  onClose: () => void;
  onConfirm: (payload: {
    automationId: string;
    trigger: string;
    applyToExisting: boolean;
  }) => void;
}

export function AddAutomationDrawer({
  open,
  stageName,
  onClose,
  onConfirm,
}: AddAutomationDrawerProps) {
  const [trigger, setTrigger] = useState("STAGE_ENTERED");
  const [automationId, setAutomationId] = useState<string | null>(null);
  const [applyToExisting, setApplyToExisting] = useState(false);

  // Fecha ao pressionar Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  const canConfirm = !!automationId;

  const handleConfirm = () => {
    if (!automationId) return;
    onConfirm({ automationId, trigger, applyToExisting });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      {/* Painel lateral */}
      <div
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[−8px_0_32px_rgba(15,20,40,0.18)] backdrop-blur-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-5 py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Adicionar automação
            </h2>
            <p className="mt-0.5 font-display text-[12px] text-[var(--text-muted)]">
              Estágio: <strong>{stageName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">

          {/* Condições (placeholder visual) */}
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] p-4">
            <p className="mb-1 font-display text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Para todos os leads com:
            </p>
            <button
              type="button"
              className="font-display text-[12.5px] text-[var(--brand-primary)] hover:underline"
            >
              + Adicionar uma condição
            </button>
          </div>

          {/* Gatilho */}
          <SelectGlass
            label="Executar"
            value={trigger}
            options={STAGE_TRIGGERS.map((t) => ({
              value: t.value,
              label: t.label,
              description: t.description,
            }))}
            onChange={setTrigger}
          />

          {/* Separador */}
          <div className="border-t border-[var(--glass-border-subtle)]" />

          {/* Seleção de automação */}
          <AutomationPicker
            selectedId={automationId}
            onSelect={setAutomationId}
            onCreateNew={() => {
              onClose();
              window.open("/automations/new", "_blank");
            }}
          />

          {/* Aplicar a leads existentes */}
          <label className="flex cursor-pointer items-start gap-3">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] transition-colors">
              {applyToExisting && (
                <div className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-primary)]" />
              )}
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
            />
            <p className="font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
              Aplicar o gatilho a todos os leads já nesta etapa
            </p>
          </label>
        </div>

        {/* Rodapé fixo */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--glass-border-subtle)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--glass-border)] bg-transparent px-5 py-2 font-display text-[13px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-5 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.30)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconCheck size={14} />
            Finalizado
          </button>
        </div>
      </div>
    </>
  );
}
