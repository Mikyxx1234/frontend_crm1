"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { registerNativePush } from "@/lib/native/push-fcm";

/** Após login no APK, pede permissão e registra o token FCM. */
export function NativeFcmBootstrap() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    void registerNativePush();
  }, [status]);

  return null;
}
