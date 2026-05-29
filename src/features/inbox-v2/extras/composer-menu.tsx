"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconPaperclip,
  IconFileText,
} from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";

import { FilePickerButton } from "./file-picker-button";
import { TemplatePickerList } from "./template-picker-popover";

/**
 * Menu unificado de anexos / ações secundárias do composer.
 * Substitui o botão "Anexar" do ChatArea: ao clicar abre um popover
 * com 2 opções rápidas (arquivo, template WhatsApp).
 */
export function ComposerMenu({
  conversationId,
  className,
}: {
  conversationId: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"root" | "template">("root");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setView("root");
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setView("root");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative">
      <ButtonGlass
        type="button"
        variant="icon"
        size="icon"
        className={className}
        onClick={() => {
          setOpen((v) => !v);
          setView("root");
        }}
        disabled={!conversationId}
        title="Anexos e mais opções"
      >
        <IconPaperclip size={20} />
      </ButtonGlass>

      {open && conversationId ? (
        <div
          ref={popoverRef}
          className="absolute bottom-12 left-0 z-30"
          role="menu"
        >
          {view === "root" ? (
            <div className="flex w-56 flex-col gap-0.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
              <FilePickerButton
                conversationId={conversationId}
                className="w-full justify-start px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]"
              >
                <span className="inline-flex items-center gap-2">
                  <IconPaperclip size={14} /> Anexar arquivo
                </span>
              </FilePickerButton>
              <button
                type="button"
                onClick={() => setView("template")}
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]"
              >
                <IconFileText size={14} /> Templates WhatsApp
              </button>
            </div>
          ) : (
            <TemplatePickerList
              conversationId={conversationId}
              onClose={() => {
                setOpen(false);
                setView("root");
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
