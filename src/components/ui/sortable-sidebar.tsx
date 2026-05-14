"use client";

import * as React from "react";
import { Eye, EyeOff, GripVertical, RotateCcw, Save, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SectionConfig } from "@/lib/field-layout";

type Props = {
  sections: SectionConfig[];
  isAdmin: boolean;
  hasAgentOverride: boolean;
  editMode: boolean;
  onToggleEditMode: () => void;
  onSaveAdmin: (s: SectionConfig[]) => void;
  onSaveAgent: (s: SectionConfig[]) => void;
  onResetAgent: () => void;
  savePending?: boolean;
  renderSection: (section: SectionConfig) => React.ReactNode;
};

export function SortableSidebar({
  sections,
  isAdmin,
  hasAgentOverride,
  editMode,
  onToggleEditMode,
  onSaveAdmin,
  onSaveAgent,
  onResetAgent,
  savePending,
  renderSection,
}: Props) {
  const [local, setLocal] = React.useState(sections);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const dragOver = React.useRef<string | null>(null);

  React.useEffect(() => {
    setLocal(sections);
  }, [sections]);

  const reorder = (fromId: string, toId: string) => {
    setLocal((prev) => {
      const next = [...prev];
      const from = next.findIndex((s) => s.id === fromId);
      const to = next.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0 || next[from].fixed || next[to].fixed) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toggleHidden = (id: string) =>
    setLocal((prev) => prev.map((s) => (s.id === id && !s.fixed ? { ...s, hidden: !s.hidden } : s)));

  if (!editMode) {
    return (
      <div className="relative flex flex-col">
        <button
          type="button"
          onClick={onToggleEditMode}
          className={cn(
            "absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md px-2 py-1",
            "text-[10px] font-medium text-slate-400 transition-colors",
            "hover:bg-slate-100 hover:text-slate-600",
            hasAgentOverride && "text-primary/60 hover:text-primary",
          )}
          aria-label="Personalizar layout"
        >
          <Settings2 className="size-3" />
          {hasAgentOverride ? "Layout personalizado" : "Layout"}
        </button>
        {sections.filter((s) => !s.hidden).map((s) => (
          <div key={s.id}>{renderSection(s)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-700">
          {isAdmin ? "Padrão da org" : "Meu layout"}
        </span>
        <div className="flex items-center gap-1.5">
          {hasAgentOverride ? (
            <button
              type="button"
              onClick={() => {
                onResetAgent();
                onToggleEditMode();
              }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <RotateCcw className="size-3" />
              Resetar
            </button>
          ) : null}
          {isAdmin ? (
            <button
              type="button"
              disabled={savePending}
              onClick={() => {
                onSaveAdmin(local);
                onToggleEditMode();
              }}
              className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              <Save className="size-3" />
              Salvar padrão
            </button>
          ) : null}
          <button
            type="button"
            disabled={savePending}
            onClick={() => {
              onSaveAgent(local);
              onToggleEditMode();
            }}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="size-3" />
            {isAdmin ? "Salvar meu layout" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {local.map((section) => (
          <div
            key={section.id}
            draggable={!section.fixed}
            onDragStart={() => setDragging(section.id)}
            onDragEnter={() => {
              dragOver.current = section.id;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging && dragOver.current && dragging !== dragOver.current) {
                reorder(dragging, dragOver.current);
              }
            }}
            onDragEnd={() => {
              setDragging(null);
              dragOver.current = null;
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 transition-all select-none",
              !section.fixed && "cursor-grab hover:border-slate-200 hover:shadow-sm active:cursor-grabbing",
              section.fixed && "opacity-50",
              dragging === section.id && "opacity-40 ring-2 ring-primary/20",
              section.hidden && "opacity-40",
            )}
          >
            <GripVertical className={cn("size-3.5 shrink-0 text-slate-300", section.fixed && "invisible")} />
            <span className="flex-1 text-[13px] font-medium text-slate-700">{section.label}</span>
            {section.fixed ? (
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">fixo</span>
            ) : (
              <button
                type="button"
                onClick={() => toggleHidden(section.id)}
                className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={section.hidden ? "Mostrar seção" : "Ocultar seção"}
              >
                {section.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin ? (
        <p className="px-3 pb-3 text-[10px] leading-snug text-slate-400">
          <strong>Salvar padrão</strong> define o layout para todos os agentes da org.
          <br />
          <strong>Salvar meu layout</strong> é um override só seu.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onToggleEditMode}
        className="mx-3 mb-3 rounded-lg border border-slate-100 py-1.5 text-[11px] text-slate-400 hover:bg-slate-50"
      >
        Cancelar
      </button>
    </div>
  );
}
