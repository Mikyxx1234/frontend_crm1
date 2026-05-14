import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { dt } from "@/lib/design-tokens";

export interface SidebarSectionProps {
  label: string;
  action?: ReactNode;
  className?: string;
}

export function SidebarSection({ label, action, className }: SidebarSectionProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className={dt.text.section}>{label}</p>
      {action}
    </div>
  );
}
