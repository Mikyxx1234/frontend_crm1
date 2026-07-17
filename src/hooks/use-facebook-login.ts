"use client";

/**
 * Hook para Facebook Login for Business (produto Messenger).
 *
 * Desde 2024 a Meta exige `config_id` para permissoes business
 * (pages_messaging etc.) — o padrao `FB.login({ scope: ... })` cru foi
 * deprecado para esses escopos. Este hook espelha `useEmbeddedSignup`
 * (WhatsApp), trocando o config_id (uma "Login for Business Configuration"
 * dedicada ao Messenger criada no painel Meta).
 *
 * Instagram NAO usa este hook: fluxo OAuth por redirect direto em
 * instagram.com/oauth/authorize — ver create-channel-dialog e as rotas
 * /api/channels/instagram/oauth/*.
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
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: { setup: Record<string, unknown> };
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

export function useFacebookLogin() {
  const [state, setState] = useState<State>({
    sdkReady: false,
    loading: false,
    error: null,
    isConfigured: false,
  });

  const configRef = useRef<{ appId: string; configId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/config/public"))
      .then((r) => r.json())
      .then((data: {
        metaAppId?: string;
        metaMessengerConfigId?: string;
        messengerLoginConfigured?: boolean;
      }) => {
        if (cancelled) return;
        if (!data.messengerLoginConfigured) return;
        const appId = data.metaAppId?.trim();
        const configId = data.metaMessengerConfigId?.trim();
        if (!appId || !configId) return;
        configRef.current = { appId, configId };
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

  const launchLogin = useCallback((): Promise<FacebookLoginResult> => {
    return new Promise((resolve, reject) => {
      if (!window.FB || !configRef.current) {
        reject(new Error("Facebook SDK / config nao carregado."));
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
          config_id: configRef.current.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {} },
        },
      );
    });
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, loading: false, error: null }));
  }, []);

  return { ...state, launchLogin, reset };
}
