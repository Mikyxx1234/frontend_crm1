import { forwardRef } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * Ícone custom de Distribuição, redesenhado a partir do asset de referência.
 * Mantém a API dos ícones Tabler e usa currentColor para respeitar o tema.
 */
export const DistributionIcon = forwardRef<SVGSVGElement, IconProps>(
  function DistributionIcon(
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
        <g opacity="0.68">
          <path d="M4 5 12 3.5l4.5 5L11.5 13 4.5 11.5 4 5Z" />
          <path d="m4 5 7.5 8M12 3.5l-7.5 8" />
        </g>
        <path d="m11.5 13 8.5 8m0 0v-5m0 5h-5" />
        <g fill={color} stroke="none">
          <circle cx="4" cy="5" r="1.1" />
          <circle cx="12" cy="3.5" r="1.1" />
          <circle cx="16.5" cy="8.5" r="1.1" />
          <circle cx="11.5" cy="13" r="1.1" />
          <circle cx="4.5" cy="11.5" r="1.1" />
        </g>
      </svg>
    );
  },
);
