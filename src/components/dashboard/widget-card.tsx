"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SUBTLE_SPRING } from "@/lib/dashboard-tokens";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  isLoading?: boolean;
  onRemove?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /**
   * Toggle de edição: quando true, mostra handle de arrasto (ícone grip) e
   * botão de remover. Fora do modo edição o card é "limpo" (sem grip/X).
   */
  editing?: boolean;
  /**
   * Classe CSS usada pelo react-grid-layout pra identificar o drag handle
   * (default "widget-drag-handle"). O RGL só permite arrastar pela
   * área marcada por essa classe — o resto do card é clicável.
   */
  dragHandleClass?: string;
};

export const WidgetCard = React.memo(function WidgetCard({
  title,
  isLoading,
  onRemove,
  footer,
  children,
  className,
  editing = false,
  dragHandleClass = "widget-drag-handle",
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SUBTLE_SPRING}
      className={cn(
        "group/widget flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-premium transition-shadow duration-300 hover:shadow-float",
        editing && "ring-1 ring-primary/20",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
        {editing && (
          <span
            className={cn(
              dragHandleClass,
              "cursor-grab rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing",
            )}
            aria-label="Arrastar widget"
          >
            <GripVertical className="size-4" />
          </span>
        )}
        <h3 className="flex-1 truncate text-[13px] font-black uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </h3>
        {editing && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Remover widget"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && !isLoading && (
        <div className="border-t border-border/40 px-5 py-2.5">
          {footer}
        </div>
      )}
    </motion.div>
  );
});
