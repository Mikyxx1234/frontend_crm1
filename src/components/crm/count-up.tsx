"use client";

import { useEffect, useRef, useState } from "react";

/** Anima um inteiro até `value` (ease-out). Com `fromZero`, remount recomeça do 0. */
export function CountUpNumber({
  value,
  className,
  fromZero = false,
}: {
  value: number;
  className?: string;
  fromZero?: boolean;
}) {
  const [n, setN] = useState(fromZero ? 0 : value);
  const fromRef = useRef(fromZero ? 0 : value);

  useEffect(() => {
    const from = fromZero ? 0 : fromRef.current;
    const start = performance.now();
    const dur = Math.min(900, 280 + Math.log10(Math.max(value, 1)) * 180);
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, fromZero]);

  return <span className={className}>{n.toLocaleString("pt-BR")}</span>;
}
