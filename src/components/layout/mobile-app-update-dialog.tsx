"use client";

/**
 * Popup de "app desatualizado" para o WebView mobile (APK/Capacitor).
 *
 * Diferente do `UpdateAvailableBanner` (desktop, baseado em semver de
 * `NEXT_PUBLIC_APP_VERSION` + localStorage, focado em mostrar "novidades"),
 * este popup só existe em viewport mobile e é focado em pedir reload — o
 * WebView do APK não recebe o novo bundle sozinho como uma aba de navegador
 * normal faria em alguns casos, então avisamos o usuário a fechar/reabrir
 * (ou recarregar) quando detectamos um deploy novo.
 *
 * Detecção: `generatedAt` de `/changelog.json` (gerado a cada build por
 * `scripts/generate-changelog.mjs`) muda em todo deploy, independente de
 * versão semver — serve como fingerprint barato do build atual.
 */

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-media-query";

const POLL_INTERVAL_MS = 60_000;
const DISMISSED_REVISION_KEY = "crm_mobile_update_dismissed_revision";

async function fetchChangelogGeneratedAt(): Promise<string | null> {
  try {
    const res = await fetch("/changelog.json", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { generatedAt?: string };
    return data.generatedAt?.trim() || null;
  } catch {
    return null;
  }
}

export function MobileAppUpdateDialog() {
  const isMobile = useIsMobile();

  /** Revisão vista no mount desta sessão — referência de comparação. */
  const sessionRevision = React.useRef<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pendingRevision, setPendingRevision] = React.useState<string | null>(null);

  const checkForUpdate = React.useCallback(async () => {
    const remote = await fetchChangelogGeneratedAt();
    if (!remote) return;

    // Primeira leitura da sessão: apenas fixa a referência.
    if (!sessionRevision.current) {
      sessionRevision.current = remote;
      return;
    }

    if (remote === sessionRevision.current) return;

    const dismissed =
      typeof window !== "undefined"
        ? window.localStorage.getItem(DISMISSED_REVISION_KEY)
        : null;
    if (dismissed === remote) return;

    setPendingRevision(remote);
    setOpen(true);
  }, []);

  React.useEffect(() => {
    if (!isMobile) return;

    void checkForUpdate();
    const interval = window.setInterval(() => void checkForUpdate(), POLL_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    const onFocus = () => void checkForUpdate();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [isMobile, checkForUpdate]);

  if (!isMobile) return null;

  function handleDismiss() {
    if (pendingRevision && typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_REVISION_KEY, pendingRevision);
    }
    setOpen(false);
  }

  function handleReload() {
    window.location.reload();
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && handleDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualização disponível</AlertDialogTitle>
          <AlertDialogDescription>
            O CRM foi atualizado. Feche o aplicativo e abra novamente para aplicar as
            alterações.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Agora não</AlertDialogCancel>
          <AlertDialogAction onClick={handleReload}>Atualizar agora</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
