#!/usr/bin/env node
/**
 * Gera public/app-revision.json — fingerprint único do build atual.
 *
 * Executado em predev/prebuild, ANTES do Next.js ler `next.config.ts`
 * (que embute o valor em `NEXT_PUBLIC_BUILD_ID`/`NEXT_PUBLIC_BUILD_TIME`
 * via `env`). O `MobileAppUpdateDialog` compara esse valor embutido no JS
 * do cliente contra `/api/app-revision` (rota não-cacheada) para detectar
 * deploys novos — ver `src/components/layout/mobile-app-update-dialog.tsx`.
 *
 * `revision` prioriza IDs estáveis de CI (BUILD_ID / GITHUB_SHA / APP_VERSION)
 * e cai para `build-<timestamp>` quando nenhum estiver setado (dev local),
 * garantindo que cada execução gere uma revisão única.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "public", "app-revision.json");

function main() {
  const revision =
    process.env.BUILD_ID || process.env.GITHUB_SHA || process.env.APP_VERSION || `build-${Date.now()}`;
  const data = { revision, builtAt: new Date().toISOString() };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`[generate-app-revision] revision=${revision} → ${OUT_PATH}`);
}

main();
