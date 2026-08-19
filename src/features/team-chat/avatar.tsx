import { UserAvatar } from "@/components/crm/user-avatar";
import { cn } from "@/lib/utils";

import { normalizeAvatarUrl, type ChatPerson } from "./helpers";

const sizePx = {
  sm: 36,
  md: 44,
  lg: 56,
  xl: 80,
} as const;

export function Avatar({
  person,
  size = "md",
  showPresence = false,
  className,
}: {
  person: ChatPerson;
  size?: keyof typeof sizePx;
  showPresence?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-visible", className)}>
      <UserAvatar
        name={person.name}
        initials={person.initials}
        imageUrl={normalizeAvatarUrl(person.avatarUrl)}
        size={sizePx[size]}
        status={showPresence ? (person.presence === "online" ? "online" : "offline") : null}
      />
    </div>
  );
}

export function AvatarStack({ people, size = "sm" }: { people: ChatPerson[]; size?: keyof typeof sizePx }) {
  const shown = people.slice(0, 3);
  return (
    <div className="flex -space-x-3" aria-hidden="true">
      {shown.map((p) => (
        <div key={p.id} className="rounded-full ring-2 ring-card">
          <UserAvatar
            name={p.name}
            initials={p.initials}
            imageUrl={normalizeAvatarUrl(p.avatarUrl)}
            size={sizePx[size]}
          />
        </div>
      ))}
    </div>
  );
}
