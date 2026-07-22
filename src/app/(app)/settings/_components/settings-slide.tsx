"use client";

import { usePathname } from "next/navigation";

/**
 * Wrapper do painel direito: a cada troca de sub-rota, o conteúdo entra
 * deslizando da direita. O `key={pathname}` força remontagem para o
 * `animate-in` do tailwindcss-animate disparar em cada navegação.
 */
export function SettingsSlide({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden animate-in fade-in slide-in-from-right-4 duration-300 ease-out"
    >
      {children}
    </div>
  );
}
