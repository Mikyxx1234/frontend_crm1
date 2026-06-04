import { cn } from "@/lib/utils"

type AvatarSize = 'sm' | 'md' | 'lg'
type AvatarColor = 'blue' | 'teal' | 'orange' | 'purple' | 'pink' | 'coral'
type AvatarStatus = 'online' | 'offline' | 'none'

interface AvatarGlassProps {
  initials: string
  size?: AvatarSize
  color?: AvatarColor
  status?: AvatarStatus
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
}

const colorClasses: Record<AvatarColor, string> = {
  blue: 'bg-gradient-to-br from-[#5DFF7B] via-[#5DFF7B]/60 to-[#356823]',
  teal: 'bg-gradient-to-br from-[#5D90FF] via-[#5D90FF]/60 to-[#37A5FF]',
  orange: 'bg-gradient-to-br from-[#FAFF5D] via-[#FAFF5D]/60 to-[#FF6C37]',
  purple: 'bg-gradient-to-br from-[#D15DFF] via-[#D15DFF]/60 to-[#AF37FF]',
  pink: 'bg-gradient-to-br from-[#FF5DFC] via-[#FF5DFC]/60 to-[#3752FF]',
  coral: 'bg-gradient-to-br from-[#FF5D6D] via-[#FF5D6D]/60 to-[#FFC037]',
}

export function AvatarGlass({ 
  initials, 
  size = 'md', 
  color = 'blue', 
  status = 'none',
  className 
}: AvatarGlassProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--glass-bg-strong)] font-display font-bold text-white",
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    >
      {initials}
      {status !== 'none' && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--glass-bg-strong)]",
            status === 'online' ? 'bg-[var(--color-online)]' : 'bg-[var(--color-offline)]'
          )}
        />
      )}
    </div>
  )
}
