"use client";

/**
 * "Atualizar sem APK" (ver AGENT.md § Atualizar sem APK).
 *
 * Distinto do `MobileAppUpdateDialog` (que pede reload quando o BUNDLE
 * WEB mudou — Camada A). Este componente cobre a Camada B: quando a
 * CASCA nativa (plugins, permissões, ícone) muda e exige um APK novo,
 * compara `mobile-release.json` contra a versão nativa instalada e
 * oferece baixar/instalar o APK publicado, sem passar pela Play Store.
 *
 * No-op completo fora do WebView do APK (web/desktop nunca monta nada).
 */

import * as React from "react";
import { IconDownload } from "@tabler/icons-react";

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
import { ButtonGlass } from "@/components/crm/button-glass";
import { isNativePlatform } from "@/lib/native/capacitor";
import {
  checkNativeAppUpdate,
  installNativeUpdate,
  type NativeAppUpdateInfo,
} from "@/lib/native/app-update";

/** Pequeno delay pro cold start terminar antes de bater no plugin nativo. */
const CHECK_DELAY_MS = 1500;

export function NativeApkUpdateDialog() {
  const [native, setNative] = React.useState(false);
  const [info, setInfo] = React.useState<NativeAppUpdateInfo | null>(null);
  const [dismissed, setDismissed] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNative(isNativePlatform());
  }, []);

  React.useEffect(() => {
    if (!native) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void checkNativeAppUpdate().then((result) => {
        if (!cancelled && result) setInfo(result);
      });
    }, CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [native]);

  if (!native || !info || dismissed) return null;

  const { release } = info;
  const isForce = release.force;
  const description =
    release.notes ||
    `Uma nova versão nativa (${release.versionName || release.versionCode}) está disponível.`;

  async function handleUpdate() {
    setError(null);
    setInstalling(true);
    try {
      await installNativeUpdate(release.apkUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar. Tente novamente.");
    } finally {
      setInstalling(false);
    }
  }

  function handleDismiss() {
    if (isForce) return;
    setDismissed(true);
  }

  // Update obrigatória: overlay bloqueante sem opção de dispensar (sem
  // Escape, sem clique fora — por isso não usa o <Dialog> nativo, que
  // sempre permite fechar via tecla Cancel do <dialog>).
  if (isForce) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#0d1b3e]/97 px-6 backdrop-blur-xl">
        <div className="flex w-full max-w-xs flex-col items-center gap-5 rounded-[var(--radius-xl)] border border-white/10 bg-white/[0.06] p-8 text-center shadow-[var(--glass-shadow-lg)] backdrop-blur-md">
          <div className="flex size-16 items-center justify-center rounded-full bg-white/10">
            <IconDownload className="size-8 text-white" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Atualizar sem APK</h2>
            <p className="mt-1.5 text-sm leading-snug text-white/70">{description}</p>
            {error ? (
              <p className="mt-2 text-[12px] leading-snug text-red-300">{error}</p>
            ) : null}
          </div>
          <ButtonGlass
            type="button"
            variant="primary"
            onClick={handleUpdate}
            disabled={installing}
            className="h-11 w-full text-sm disabled:opacity-60"
          >
            <IconDownload className="size-4" aria-hidden />
            {installing ? "Baixando..." : "Atualizar"}
          </ButtonGlass>
        </div>
      </div>
    );
  }

  return (
    <AlertDialog open onOpenChange={(next) => !next && handleDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Atualizar sem APK</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            {error ? <span className="mt-2 block text-red-500">{error}</span> : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss} disabled={installing}>
            Depois
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={installing}
            onClick={(e) => {
              // Evita fechar o dialog antes do download/instalador terminar.
              e.preventDefault();
              void handleUpdate();
            }}
          >
            {installing ? "Baixando..." : "Atualizar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
