import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { dt } from "@/lib/design-tokens";

export interface SidebarCardProps {
  children: ReactNode;
  className?: string;
  shadow?: boolean;
}

export function SidebarCard({ children, className, shadow = true }: SidebarCardProps) {
  return <div className={cn(dt.card.base, shadow && dt.card.shadow, className)}>{children}</div>;
}
