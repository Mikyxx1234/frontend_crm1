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
      <p className="mb-1.5 font-display text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left font-display text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-[var(--brand-primary)]/50 focus:outline-none"
      >
        <span>{selected?.label ?? "Selecionar..."}</span>
        <IconChevronDown
          size={15}
          className={cn(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
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
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              <span className="font-display text-[13px] font-semibold">{opt.label}</span>
              {opt.description && (
                <span className="font-display text-[11px] text-slate-400">
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
      <p className="font-display text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
        Automação
      </p>

      {/* Busca */}
      <div className="relative">
        <IconSearch
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar automação..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 font-display text-[13px] text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20"
        />
      </div>

      {/* Lista */}
      <div className="max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading && (
          <p className="px-3.5 py-3 font-display text-[12.5px] text-slate-400">
            Carregando...
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <p className="px-3.5 py-3 font-display text-[12.5px] text-slate-400">
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
                "flex w-full items-center gap-3 border-b border-slate-100 px-3.5 py-3 text-left last:border-0 transition-colors",
                isSelected
                  ? "bg-[var(--brand-primary)]/6 text-[var(--brand-primary)]"
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-slate-100 text-[var(--brand-primary)]",
                )}
              >
                {isSelected ? <IconCheck size={14} /> : <IconBolt size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[13px] font-bold text-slate-800">
                  {item.name}
                </p>
                {item.description && (
                  <p className="truncate font-display text-[11.5px] text-slate-400">
                    {item.description}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 font-display text-[10.5px] font-bold",
                  item.active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-400",
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
        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 font-display text-[12.5px] font-semibold text-slate-400 transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
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
  /** Pré-preenche para modo de edição */
  initialAutomationId?: string | null;
  initialTrigger?: string;
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
  initialAutomationId,
  initialTrigger,
  onClose,
  onConfirm,
}: AddAutomationDrawerProps) {
  const [trigger, setTrigger] = useState(initialTrigger ?? "STAGE_ENTERED");
  const [automationId, setAutomationId] = useState<string | null>(initialAutomationId ?? null);
  const [applyToExisting, setApplyToExisting] = useState(false);

  // Re-inicializa quando abre para edição
  useEffect(() => {
    if (open) {
      setTrigger(initialTrigger ?? "STAGE_ENTERED");
      setAutomationId(initialAutomationId ?? null);
      setApplyToExisting(false);
    }
  }, [open, initialTrigger, initialAutomationId]);

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
      {/* Overlay — leve, sem blur pesado */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/20 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      {/* Painel lateral */}
      <div
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.10)] transition-transform duration-250",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header com gradiente sutil */}
        <div className="relative flex items-start justify-between bg-gradient-to-br from-[#5B6FF5]/8 via-white to-white px-6 pb-5 pt-6">
          {/* Barra lateral colorida */}
          <span className="absolute left-0 top-0 h-full w-[3px] rounded-r-full bg-[var(--brand-primary)]" />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
              <IconBolt size={18} className="text-[var(--brand-primary)]" />
            </div>
            <div>
              <h2 className="font-display text-[15px] font-bold text-slate-800">
                {initialAutomationId ? "Editar automação" : "Adicionar automação"}
              </h2>
              <p className="mt-0.5 font-display text-[12px] text-slate-500">
                Estágio:{" "}
                <span className="font-semibold text-[var(--brand-primary)]">{stageName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <IconX size={17} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-100" />

        {/* Corpo com scroll */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">

          {/* Condições */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 font-display text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
              Para todos os leads com:
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-display text-[13px] font-semibold text-[var(--brand-primary)] hover:underline"
            >
              <IconPlus size={13} />
              Adicionar uma condição
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
          <div className="h-px w-full bg-slate-100" />

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
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                applyToExisting
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                  : "border-slate-300 bg-white",
              )}
            >
              {applyToExisting && <IconCheck size={10} className="text-white" strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
            />
            <div>
              <p className="font-display text-[13px] font-semibold text-slate-700">
                Aplicar o gatilho a todos os leads já nesta etapa
              </p>
              <p className="mt-0.5 font-display text-[11.5px] text-slate-400">
                Executa imediatamente para leads existentes neste estágio.
              </p>
            </div>
          </label>
        </div>

        {/* Rodapé fixo */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2 font-display text-[13px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
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
