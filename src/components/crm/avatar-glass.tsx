import { cn } from "@/lib/utils"
import {
  type AvatarGlassColor,
  avatarInitials,
  getAvatarGlassColor,
} from "@/lib/avatar"

type AvatarSize = "sm" | "md" | "lg"
type AvatarStatus = "online" | "offline" | "none"

interface AvatarGlassProps {
  initials?: string
  name?: string | null
  imageUrl?: string | null
  size?: AvatarSize
  color?: AvatarGlassColor
  /** Seed para cor determinística quando `color` não é passado. */
  seed?: string
  status?: AvatarStatus
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
}

const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
}

const colorStyle: Record<AvatarGlassColor, string> = {
  blue: "var(--avatar-glass-blue)",
  teal: "var(--avatar-glass-teal)",
  orange: "var(--avatar-glass-orange)",
  purple: "var(--avatar-glass-purple)",
  pink: "var(--avatar-glass-pink)",
  coral: "var(--avatar-glass-coral)",
}

export function AvatarGlass({
  initials: initialsProp,
  name,
  imageUrl,
  size = "md",
  color,
  seed,
  status = "none",
  className,
}: AvatarGlassProps) {
  const resolvedColor =
    color ?? getAvatarGlassColor(seed ?? name ?? initialsProp ?? "?")
  const initials =
    initialsProp ?? avatarInitials(name ?? "?")

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--glass-bg-strong)] font-display font-bold text-white",
        sizeClasses[size],
        className,
      )}
      style={{
        width: sizePx[size],
        height: sizePx[size],
        backgroundImage: colorStyle[resolvedColor],
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name ?? initials}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials
      )}
      {status !== "none" && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--glass-bg-strong)]",
            status === "online"
              ? "bg-[var(--color-online)]"
              : "bg-[var(--color-offline)]",
          )}
        />
      )}
    </div>
  )
}
