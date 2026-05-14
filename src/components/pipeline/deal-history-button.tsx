"use client";

/**
 * DealHistoryButton — botão "Histórico" que abre um drawer lateral
 * com o TimelinePanel do deal. Usado no SalesHub (header) pra
 * substituir a aba "Histórico" do workspace modal.
 *
 * Renderiza o mesmo `TimelinePanel` usado no DealWorkspace, garantindo
 * consistência visual e de dados entre Kanban e Sales Hub.
 */

import * as React from "react";
import { History } from "lucide-react";

import { TimelinePanel } from "@/components/pipeline/deal-detail/timeline-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function DealHistoryButton({
  dealId,
  dealTitle,
  className,
}: {
  dealId: string;
  dealTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Histórico do negócio"
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-slate-200",
          className,
        )}
      >
        <History className="size-3.5" strokeWidth={2} />
        Histórico
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Histórico do negócio</SheetTitle>
          {dealTitle && (
            <SheetDescription className="line-clamp-1">
              {dealTitle}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden">
          <TimelinePanel dealId={dealId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
