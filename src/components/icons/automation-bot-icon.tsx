import { forwardRef } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * Mascote das automações — robô amigável inspirado no avatar do produto.
 * Usa currentColor para acompanhar os estados da NavRail e do CRM.
 */
export const AutomationBotIcon = forwardRef<SVGSVGElement, IconProps>(
  function AutomationBotIcon(
    { color = "currentColor", size = 24, stroke = 2, title, ...props },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        {...props}
      >
        {title ? <title>{title}</title> : null}
        <path d="M12 2v2" />
        <circle cx="12" cy="1.7" r="0.7" fill={color} stroke="none" />
        <path
          d="M6.2 5.3C7.5 4.45 9.45 4 12 4s4.5.45 5.8 1.3c1.05.7 1.7 1.88 1.7 3.15v2.1c0 1.27-.65 2.45-1.7 3.15C16.5 14.55 14.55 15 12 15s-4.5-.45-5.8-1.3a3.78 3.78 0 0 1-1.7-3.15v-2.1c0-1.27.65-2.45 1.7-3.15Z"
          fill={color}
          fillOpacity="0.12"
        />
        <path d="M4.5 8H3.2v3.5h1.3M19.5 8h1.3v3.5h-1.3" />
        <circle cx="9" cy="9.2" r="0.8" fill={color} stroke="none" />
        <circle cx="15" cy="9.2" r="0.8" fill={color} stroke="none" />
        <path d="M10 11.6c.55.5 1.2.75 2 .75s1.45-.25 2-.75" />
        <path d="M8 15.1c-1.15.9-1.8 2.15-2 3.75M16 15.1c1.15.9 1.8 2.15 2 3.75" />
        <path
          d="M8 15.4h8l1 5.1H7l1-5.1Z"
          fill={color}
          fillOpacity="0.08"
        />
        <rect x="10" y="17.1" width="4" height="1.7" rx="0.55" />
        <path d="M5.5 20.5h13" />
      </svg>
    );
  },
);
