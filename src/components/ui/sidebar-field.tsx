import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  Calendar,
  Clock,
  Heart,
  Mail,
  MapPin,
  Monitor,
  Phone,
  ShoppingBag,
  Tag,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { dt } from "@/lib/design-tokens";

const SIDEBAR_FIELD_ICONS = {
  Clock,
  User,
  MapPin,
  Calendar,
  Tag,
  Monitor,
  Activity,
  Heart,
  Phone,
  Mail,
  Building2,
  ShoppingBag,
} as const satisfies Record<string, LucideIcon>;

export type SidebarFieldIcon = keyof typeof SIDEBAR_FIELD_ICONS;

export interface SidebarFieldProps {
  label: string;
  value?: string | null;
  href?: string;
  editable?: boolean;
  children?: ReactNode;
  className?: string;
  size?: "md" | "sm";
  /** Ícone Lucide à esquerda do label (densidade sidebar). */
  icon?: SidebarFieldIcon;
}

export function SidebarField({
  label,
  value,
  href,
  editable,
  children,
  className,
  size = "md",
  icon,
}: SidebarFieldProps) {
  const row = size === "sm" ? dt.card.rowSm : dt.card.row;
  const Icon = icon ? SIDEBAR_FIELD_ICONS[icon] : null;

  return (
    <div className={cn(row, className)}>
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        {Icon ? <Icon className="size-3 shrink-0 text-slate-400" aria-hidden /> : null}
        <span className={dt.text.label}>{label}</span>
      </div>
      {children ? (
        <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
      ) : href && value ? (
        <a
          href={href}
          onClick={(e) => e.stopPropagation()}
          className={cn(dt.text.link, "truncate hover:underline")}
        >
          {value}
        </a>
      ) : editable ? (
        <span className={cn(dt.text.value, "cursor-pointer")}>
          {value || "—"}{" "}
          <span className="text-[11px] text-slate-300">▾</span>
        </span>
      ) : (
        <span className={cn(dt.text.value, !value && dt.text.muted, "truncate")}>{value || "—"}</span>
      )}
    </div>
  );
}
