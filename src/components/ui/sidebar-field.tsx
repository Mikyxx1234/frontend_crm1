import type { Icon as LucideIcon } from "@tabler/icons-react";
import { IconActivity as Activity, IconBuilding as Building2, IconCalendar as Calendar, IconClock as Clock, IconHeart as Heart, IconMail as Mail, IconMapPin as MapPin, IconDeviceDesktop as Monitor, IconPhone as Phone, IconShoppingBag as ShoppingBag, IconTag as Tag, IconUser as User } from "@tabler/icons-react";
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
        {Icon ? <Icon className="size-3 shrink-0 text-[var(--text-muted)]" aria-hidden /> : null}
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
          <span className="text-[11px] text-[var(--text-faint)]">▾</span>
        </span>
      ) : (
        <span className={cn(dt.text.value, !value && dt.text.muted, "truncate")}>{value || "—"}</span>
      )}
    </div>
  );
}
