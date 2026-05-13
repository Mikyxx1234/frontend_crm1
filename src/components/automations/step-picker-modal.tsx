"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  GitBranch,
  Globe,
  MessageSquare,
  Search,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ActionStepType } from "@/lib/automation-workflow";
import { stepTypeLabel } from "@/lib/automation-workflow";
import { cn } from "@/lib/utils";

import { STEP_GROUPS, stepColor, stepDescription, stepIcon } from "./add-step-node";

// ─────────────────────────────────────────────────────────────────────────────
// StepPickerModal — modal central premium "O que deseja automatizar?"
//
// Substitui o popup pequeno (280px) por um modal central glassmorphism com
// search + grid 2-col de cards, no padrao premium da referencia.
//
// Visual:
//  - backdrop fixed inset-0 z-[70] bg-slate-900/30 backdrop-blur-md
//  - card central rounded-[28px] bg-white/95 backdrop-blur-xl shadow-premium
//  - header sticky com icone gradiente, titulo font-[900] tracking-tighter,
//    subtitle, search input pill e botao X
//  - secoes com eyebrow colorido (icone + label)
//  - grid 2 cols de cards: icone pill colorido + titulo bold + descricao
//    cinza, hover com shadow-blue-glow e border [#507df1]/30
//  - filtragem por search no titulo + descricao
//  - ESC fecha; click no backdrop fecha
// ─────────────────────────────────────────────────────────────────────────────

const GROUP_VISUAL: Record<
  string,
  { Icon: LucideIcon; tone: string; bg: string; ring: string; fg: string }
> = {
  Mensagens:    { Icon: MessageSquare, tone: "blue",    bg: "bg-blue-50",    ring: "ring-blue-200/70",    fg: "text-blue-600" },
  Salesbot:     { Icon: Bot,           tone: "violet",  bg: "bg-violet-50",  ring: "ring-violet-200/70",  fg: "text-violet-600" },
  Acoes:        { Icon: Zap,           tone: "amber",   bg: "bg-amber-50",   ring: "ring-amber-200/70",   fg: "text-amber-600" },
  Logica:       { Icon: GitBranch,     tone: "cyan",    bg: "bg-cyan-50",    ring: "ring-cyan-200/70",    fg: "text-cyan-600" },
  Integracoes:  { Icon: Globe,         tone: "slate",   bg: "bg-slate-100",  ring: "ring-slate-200/70",   fg: "text-slate-600" },
};

// Matching tolerante a acento (referenciamos pelos titles do STEP_GROUPS)
function visualForGroup(title: string) {
  const norm = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return GROUP_VISUAL[norm] ?? {
    Icon: Sparkles,
    tone: "slate",
    bg: "bg-slate-100",
    ring: "ring-slate-200/70",
    fg: "text-slate-600",
  };
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type StepPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ActionStepType) => void;
  title?: string;
  subtitle?: string;
};

export function StepPickerModal({
  open,
  onClose,
  onSelect,
  title = "O que deseja automatizar?",
  subtitle = "Selecione um ponto de partida ou uma acao para o seu fluxo.",
}: StepPickerModalProps) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // O modal é invocado tanto por nós do ReactFlow (AddStepNode) quanto
  // pelo próprio canvas. Em ambos os casos ele fica no DOM como filho
  // do pane do ReactFlow — e o pane tem um listener nativo de wheel
  // (D3-zoom do ReactFlow) que dispara ANTES do nosso stopPropagation
  // sintético. Resultado: ao scrollar dentro do modal, o canvas dava
  // zoom. Render via portal em document.body tira o modal da árvore
  // DOM do canvas e resolve o bubbling na raiz.
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = normalize(query.trim());
  const filteredGroups = React.useMemo(() => {
    if (!q) return STEP_GROUPS;
    return STEP_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((type) => {
        const label = normalize(stepTypeLabel(type));
        const desc = normalize(stepDescription[type] ?? "");
        return label.includes(q) || desc.includes(q);
      }),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  // Intercepta wheel/touchmove ainda no ReactSyntheticEvent — é redundância
  // defensiva: o portal (via createPortal abaixo) já remove o modal da
  // árvore do ReactFlow, mas um dev futuro pode renderizar este componente
  // em outro lugar e esse handler mantém a bolha contida.
  const stopWheel = React.useCallback(
    (e: React.WheelEvent | React.TouchEvent) => {
      e.stopPropagation();
    },
    [],
  );

  if (!portalTarget) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="picker-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            onWheel={stopWheel}
            onTouchMove={stopWheel}
            className="fixed inset-0 z-70 bg-slate-900/30 backdrop-blur-md"
            aria-hidden
          />

          <motion.div
            key="picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "fixed left-1/2 top-1/2 z-71 -translate-x-1/2 -translate-y-1/2",
              "w-[min(720px,calc(100vw-32px))] max-h-[min(80vh,720px)]",
              "flex flex-col overflow-hidden rounded-[28px] border border-white/60",
              "bg-white/95 shadow-premium backdrop-blur-xl",
            )}
            onClick={(e) => e.stopPropagation()}
            onWheel={stopWheel}
            onTouchMove={stopWheel}
          >
            {/* Header glass sticky */}
            <div className="shrink-0 border-b border-slate-100 bg-white/60 px-6 pt-6 pb-5 backdrop-blur-md sm:px-7">
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                    "bg-linear-to-br from-brand-blue to-[#7b9bff] text-white",
                    "shadow-blue-glow ring-1 ring-white/40",
                  )}
                >
                  <Zap className="size-5" strokeWidth={2.4} />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-[20px] font-black leading-tight tracking-tighter text-slate-950 sm:text-[22px]">
                    {title}
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium tracking-tight text-slate-500">
                    {subtitle}
                  </p>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <SearchInput
                    inputRef={inputRef}
                    value={query}
                    onChange={setQuery}
                  />
                  <CloseButton onClose={onClose} />
                </div>

                <div className="sm:hidden">
                  <CloseButton onClose={onClose} />
                </div>
              </div>

              <div className="mt-3 sm:hidden">
                <SearchInput
                  inputRef={inputRef}
                  value={query}
                  onChange={setQuery}
                />
              </div>
            </div>

            {/* Body */}
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              {filteredGroups.length === 0 ? (
                <p className="py-12 text-center text-[13px] tracking-tight text-slate-400">
                  Nenhum passo encontrado para "{query}".
                </p>
              ) : (
                filteredGroups.map((group, idx) => {
                  const visual = visualForGroup(group.title);
                  const Icon = visual.Icon;
                  return (
                    <section
                      key={group.title}
                      className={cn(idx > 0 && "mt-6")}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center rounded-md",
                            visual.bg, visual.fg,
                          )}
                        >
                          <Icon className="size-3" strokeWidth={2.6} />
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            visual.fg,
                          )}
                        >
                          {group.title}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {group.items.map((type) => (
                          <StepCard
                            key={type}
                            type={type}
                            onClick={() => {
                              onSelect(type);
                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  );
}

// ──────────────────────────────────────────────────────────────────────────

function SearchInput({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex h-9 items-center gap-1.5 rounded-full border border-slate-200",
        "bg-white pl-3 pr-1 transition-colors",
        "focus-within:border-brand-blue/50 focus-within:ring-2 focus-within:ring-brand-blue/20",
      )}
    >
      <Search className="size-3.5 shrink-0 text-slate-400" strokeWidth={2.2} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pesquisar passos..."
        className={cn(
          "h-full min-w-0 flex-1 border-0 bg-transparent text-[13px]",
          "tracking-tight text-slate-700 outline-none",
          "placeholder:font-medium placeholder:text-slate-400",
          "w-[200px]",
        )}
      />
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Fechar"
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full",
        "border border-slate-200 bg-white text-slate-500",
        "transition-colors hover:bg-slate-50 hover:text-slate-900 active:scale-95",
      )}
    >
      <X className="size-4" strokeWidth={2.2} />
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function StepCard({
  type,
  onClick,
}: {
  type: ActionStepType;
  onClick: () => void;
}) {
  const Icon = stepIcon[type] ?? Sparkles;
  const color = stepColor[type] ?? "text-slate-500";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      className={cn(
        "group/card flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-white",
        "px-3.5 py-3 text-left transition-all duration-150",
        "hover:border-brand-blue/30 hover:shadow-blue-glow",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          "bg-slate-50 ring-1 ring-slate-100 transition-all",
          "group-hover/card:bg-white group-hover/card:ring-brand-blue/20",
          color,
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold tracking-tight text-slate-900">
          {stepTypeLabel(type)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11.5px] font-medium leading-snug tracking-tight text-slate-500">
          {stepDescription[type] ?? ""}
        </p>
      </div>
    </motion.button>
  );
}
