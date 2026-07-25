import { forwardRef } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * Rede radial de distribuição.
 * Mantém a API Tabler e herda cor/estados do CRM via currentColor.
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
        <g opacity="0.78">
          <path d="M12 8.5V5.25" />
          <path d="m9.45 9.55-2.8-2.8" />
          <path d="m14.55 9.55 2.8-2.8" />
          <path d="M8.5 12H5.25" />
          <path d="M12 15.5v3.25" />
          <path d="m14.75 14.2 2.65 2.2" />
        </g>
        <circle cx="12" cy="12" r="3.5" fill={color} fillOpacity="0.14" />
        <circle cx="12" cy="3.5" r="1.75" />
        <circle cx="5.4" cy="5.5" r="1.75" />
        <circle cx="18.6" cy="5.5" r="1.75" />
        <circle cx="3.5" cy="12" r="1.75" />
        <circle cx="12" cy="20.5" r="1.75" />
        <circle cx="19" cy="18" r="1.75" />
        <g fill={color} stroke="none">
          <circle cx="12" cy="3.5" r="0.48" />
          <circle cx="5.4" cy="5.5" r="0.48" />
          <circle cx="18.6" cy="5.5" r="0.48" />
          <circle cx="3.5" cy="12" r="0.48" />
          <circle cx="12" cy="20.5" r="0.48" />
          <circle cx="19" cy="18" r="0.48" />
        </g>
      </svg>
    );
  },
);
