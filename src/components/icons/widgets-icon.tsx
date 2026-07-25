import { forwardRef } from "react";
import type { IconProps } from "@tabler/icons-react";

/**
 * Ícone da Central de Widgets.
 * A geometria segue o grid modular com adição e herda os estados do CRM.
 */
export const WidgetsIcon = forwardRef<SVGSVGElement, IconProps>(
  function WidgetsIcon(
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
        <g fill={color} fillOpacity="0.08">
          <rect x="2.75" y="2.75" width="7.5" height="7.5" rx="1.8" />
          <rect x="2.75" y="13.75" width="7.5" height="7.5" rx="1.8" />
          <rect x="13.75" y="13.75" width="7.5" height="7.5" rx="1.8" />
        </g>
        <rect x="2.75" y="2.75" width="7.5" height="7.5" rx="1.8" />
        <rect x="2.75" y="13.75" width="7.5" height="7.5" rx="1.8" />
        <rect x="13.75" y="13.75" width="7.5" height="7.5" rx="1.8" />
        <path d="M17.5 3v7" />
        <path d="M14 6.5h7" />
      </svg>
    );
  },
);
