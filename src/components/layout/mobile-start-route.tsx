"use client";

/**
 * Redireciona cold start mobile/APK de `/` ou `/dashboard` para
 * `config.startRoute` (default `/inbox`), uma vez por sessão.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMobileLayout } from "@/hooks/use-mobile-layout";
import { isNativePlatform } from "@/lib/native/capacitor";

const SESSION_KEY = "crm:mobile-start-routed";

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function shouldApplyStartRoute(): boolean {
  return isNativePlatform() || isMobileViewport();
}

export function MobileStartRoute() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { config } = useMobileLayout();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldApplyStartRoute()) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    const startRoute = config.startRoute || "/inbox";
    const onEntry = pathname === "/" || pathname === "/dashboard";
    if (!onEntry) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* noop */
      }
      return;
    }

    if (pathname === startRoute || pathname.startsWith(`${startRoute}/`)) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* noop */
      }
      return;
    }

    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    router.replace(startRoute);
  }, [pathname, config.startRoute, router]);

  return null;
}
