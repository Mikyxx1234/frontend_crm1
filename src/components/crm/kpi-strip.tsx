"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type KpiStripProps = {
  children: React.ReactNode;
  "aria-label"?: string;
  className?: string;
  /** Largura mínima de cada card no scroll horizontal mobile. Default 148px. */
  cardMinWidth?: number;
  /** Classes do grid usado em sm+. Default: 2 cols → 5 cols em lg+. */
  gridClassName?: string;
};

/**
 * KpiStrip — faixa de mini-KPIs (`KpiCard`) com dois modos de layout:
 *  - Mobile (<sm): `toolbar-hscroll` horizontal, cards com largura mínima
 *    fixa — evita que as caixas espremam/cortem em telas estreitas (APK).
 *  - sm+: grid responsivo (2 cols → `lg:grid-cols-5` por padrão), como antes.
 *
 * Os filhos são clonados apenas na variante mobile para herdar a largura
 * mínima via className; a variante desktop usa os filhos originais.
 */
export function KpiStrip({
  children,
  "aria-label": ariaLabel,
  className,
  cardMinWidth = 148,
  gridClassName = "grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-5",
}: KpiStripProps) {
  const mobileChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const prevClassName = (child.props as { className?: string }).className;
    return React.cloneElement(child as React.ReactElement<{ className?: string }>, {
      className: cn(prevClassName, "min-w-[var(--kpi-min)] shrink-0"),
    });
  });

  return (
    <section aria-label={ariaLabel} className={cn("shrink-0", className)}>
      {/* Mobile: faixa com scroll horizontal */}
      <div
        className="toolbar-hscroll min-w-0 max-w-full sm:hidden"
        style={{ "--kpi-min": `${cardMinWidth}px` } as React.CSSProperties}
      >
        <div className="flex w-max flex-nowrap items-stretch gap-2.5">
          {mobileChildren}
        </div>
      </div>
      {/* sm+: grid responsivo */}
      <div className="hidden sm:block">
        <div className={gridClassName}>{children}</div>
      </div>
    </section>
  );
}
