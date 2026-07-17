"use client";

/**
 * Hook para OAuth Facebook Login (produto Messenger / Instagram Messaging).
 *
 * Espelha `use-embedded-signup` (WhatsApp) mas usa `scope` classico ao inves
 * do `config_id` do Embedded Signup — Embedded Signup e' especifico do
 * fluxo WhatsApp Business. Para IG/Messenger usamos `FB.login` regular
 * com response_type=code, e depois o backend troca por Page Access Token.
 *
 * Escopos:
 *   - pages_show_list        : listar Paginas do usuario
 *   - pages_messaging        : enviar/receber DMs pelo Messenger
 *   - pages_manage_metadata  : subscribed_apps (assinar webhooks da Pagina)
 *   - business_management    : ver estrutura Business Manager (opcional)
 *   - instagram_basic        : ler dados da conta IG Business
 *   - instagram_manage_messages : enviar/receber DMs Instagram
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { apiUrl } from "@/lib/api";

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: {
          scope: string;
          response_type: string;
        },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

type FBLoginResponse = {
  authResponse?: { code?: string } | null;
  status?: string;
};

export type FacebookLoginPlatform = "messenger" | "instagram";

export type FacebookLoginResult = { code: string };

type State = {
  sdkReady: boolean;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
};

function loadFBSDK(appId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve();
      return;
    }
    const existing = document.getElementById("facebook-jssdk");
    if (existing) {
      const iv = setInterval(() => {
        if (window.FB) {
          clearInterval(iv);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(iv);
        reject(new Error("Facebook SDK timeout"));
      }, 15000);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve();
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Falha ao carregar Facebook SDK."));
    document.body.appendChild(script);
  });
}

const SCOPES: Record<FacebookLoginPlatform, string> = {
  messenger: [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "business_management",
  ].join(","),
  instagram: [
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "business_management",
    "instagram_basic",
    "instagram_manage_messages",
  ].join(","),
};

export function useFacebookLogin() {
  const [state, setState] = useState<State>({
    sdkReady: false,
    loading: false,
    error: null,
    isConfigured: false,
  });

  const appIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/config/public"))
      .then((r) => r.json())
      .then((data: { metaAppId?: string }) => {
        if (cancelled) return;
        const appId = data.metaAppId?.trim();
        if (!appId) return;
        appIdRef.current = appId;
        setState((s) => ({ ...s, isConfigured: true }));
        loadFBSDK(appId)
          .then(() => {
            if (!cancelled) setState((s) => ({ ...s, sdkReady: true }));
          })
          .catch((err) => {
            if (!cancelled)
              setState((s) => ({
                ...s,
                error: err instanceof Error ? err.message : "Erro no SDK.",
              }));
          });
      })
      .catch(() => {
        // Config nao disponivel — deixa isConfigured=false
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const launchLogin = useCallback(
    (platform: FacebookLoginPlatform): Promise<FacebookLoginResult> => {
      return new Promise((resolve, reject) => {
        if (!window.FB) {
          reject(new Error("Facebook SDK nao carregado."));
          return;
        }
        setState((s) => ({ ...s, loading: true, error: null }));
        window.FB.login(
          (response: FBLoginResponse) => {
            setState((s) => ({ ...s, loading: false }));
            const code = response.authResponse?.code;
            if (!code) {
              const err = new Error("Login cancelado ou sem autorizacao.");
              setState((s) => ({ ...s, error: err.message }));
              reject(err);
              return;
            }
            resolve({ code });
          },
          {
            scope: SCOPES[platform],
            response_type: "code",
          },
        );
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState((s) => ({ ...s, loading: false, error: null }));
  }, []);

  return { ...state, launchLogin, reset };
}
