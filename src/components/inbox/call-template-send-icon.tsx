"use client";

import { IconPhone, IconSend } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

/**
 * Envio em destaque + selo de ligação — ícone do template `call_permission`.
 */
export function CallTemplateSendIcon({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const plane = Math.round(size * 0.46);
  const badge = Math.max(14, Math.round(size * 0.42));
  const phone = Math.round(badge * 0.58);

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="flex size-full items-center justify-center rounded-full"
        style={{
          background: "#25D366",
          boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
        }}
      >
        <IconSend
          size={plane}
          stroke={2.4}
          className="-translate-x-px translate-y-px text-white"
        />
      </span>
      <span
        className="absolute flex items-center justify-center rounded-full bg-white"
        style={{
          width: badge,
          height: badge,
          right: -Math.round(size * 0.06),
          bottom: -Math.round(size * 0.04),
          boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
        }}
      >
        <IconPhone size={phone} stroke={2.5} className="text-[#25D366]" />
      </span>
    </span>
  );
}
