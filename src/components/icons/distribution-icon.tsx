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
        <path d="M4 5 14 3l6 6-2 9-11 3-3-7Z" />
        <path d="m4 5 8 7 8-3M14 3l-2 9m0 0 6 6m-6-6L7 21" />
        <path d="m5 18 10-4m0 0-2-1m2 1-1 2" />
        <circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="3" r="1" fill="currentColor" stroke="none" />
        <circle cx="20" cy="9" r="1" fill="currentColor" stroke="none" />
        <circle cx="18" cy="18" r="1" fill="currentColor" stroke="none" />
        <circle cx="7" cy="21" r="1" fill="currentColor" stroke="none" />
        <circle cx="4" cy="14" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  },
);
