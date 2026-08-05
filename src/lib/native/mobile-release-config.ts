/**
 * Manifesto de versão do APK (Camada B — serviço EasyPanel separado).
 *
 * O CRM de produção NÃO hospeda o .apk. O serviço `crm-mobile-releases`
 * serve `/mobile-release.json` + `/releases/*.apk`.
 *
 * Override opcional: NEXT_PUBLIC_MOBILE_RELEASE_MANIFEST_URL
 */
export const DEFAULT_MOBILE_RELEASE_MANIFEST_URL =
  "https://crm-mobile-releases.6tqx2r.easypanel.host/mobile-release.json";

export function resolveMobileReleaseManifestUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MOBILE_RELEASE_MANIFEST_URL?.trim()
      : undefined;
  if (fromEnv) return fromEnv;
  return DEFAULT_MOBILE_RELEASE_MANIFEST_URL;
}
