"use client";

/**
 * No APK (Capacitor), `/` não deve mostrar a landing de signup —
 * o app é só para quem já tem conta. Redireciona para `/login`.
 * Web continua vendo a landing normalmente.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LandingClient } from "@/app/landing-client";
import { isNativePlatform } from "@/lib/native/capacitor";

export function NativeRootGate() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ background: "#0d1b3e" }}
        aria-busy="true"
        aria-label="Carregando"
      />
    );
  }

  return <LandingClient />;
}
