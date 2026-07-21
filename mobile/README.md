# EduIT CRM — Mobile (Capacitor)

Casca nativa **Android** do CRM. O WebView carrega a URL remota do frontend Next.js.

> Branch de trabalho: **`CRM_MOBILE`**. Commits do app sobem só nesta branch.

## Pré-requisitos

| Ferramenta | Uso |
|------------|-----|
| Node.js 20+ | CLI Capacitor |
| Android Studio + SDK + JDK 17+ | Gerar/instalar APK |
| URL HTTPS do CRM | Celular precisa alcançar (não use `localhost` sem túnel) |

## Setup

```bash
cd mobile
npm install
```

1. Edite `capacitor.config.json` → `server.url` com a URL HTTPS pública do CRM.
2. Sincronize:

```bash
npm run sync
```

> Stack fixada em **Capacitor 7** (compatível com Node 20). Capacitor 8 exige Node ≥ 22.

## Comandos

```bash
npm run sync           # copia www + sync plugins → android/
npm run open:android   # abre Android Studio (requer JDK + SDK)
```

Plataforma Android já foi adicionada (`mobile/android/`).

## Modelo de atualização

- **UI / features do CRM** → deploy do frontend (sem novo APK).
- **Casca nativa** (permissões, plugins, domínio) → novo APK.

## Permissões (ver AGENT.md § Permissões Android do APK)

Manifesto declara RECORD_AUDIO, CAMERA, READ_MEDIA_*, POST_NOTIFICATIONS e
MODIFY_AUDIO_SETTINGS. Os grants em runtime passam pelo
`BridgeWebChromeClient` do Capacitor — nenhum plugin nativo extra é
necessário para mic/câmera.

## Web Push no APK

Nesta fase o Web Push continua usando Notification API + Service Worker
(mesmo caminho do browser), com POST_NOTIFICATIONS habilitando o prompt
nativo no Android 13+. Se a entrega em background falhar dentro do
WebView (limitação conhecida de Service Worker push em WebView), o
próximo passo é migrar para `@capacitor/push-notifications` + Firebase
Cloud Messaging — não implementado nesta fase.

## Atualizar sem APK

Fluxo interno (fora da Play Store) pra distribuir uma casca nativa nova
sem reenviar o APK manualmente pra cada operador (ver AGENT.md § Atualizar
sem APK):

- **Camada A** (a maioria das mudanças): deploy do frontend web — zero APK,
  cobre UI/features. O `MobileAppUpdateDialog` já avisa quando o bundle
  mudou.
- **Camada B** (só quando a casca nativa muda — plugins, permissões,
  ícone): o app compara `public/mobile-release.json` com a versão nativa
  instalada (plugin `AppUpdate`) e, se houver uma versão mais nova com
  `apkUrl` preenchido, mostra o diálogo **"Atualizar sem APK"** oferecendo
  baixar e instalar o APK direto, sem Play Store.

### Checklist pra publicar um build nativo novo

1. Bump `versionCode` (inteiro, sempre crescente) e `versionName` em
   `mobile/android/app/build.gradle`.
2. Gerar o APK **assinado** com a mesma keystore de sempre (trocar de
   keystore quebra updates — o Android rejeita instalar um APK assinado
   por outra chave sobre um app já instalado).
3. Subir o APK assinado em algum storage HTTPS acessível pelos celulares
   (ex.: EasyPanel, S3, bucket estático).
4. Atualizar `public/mobile-release.json` no repo do frontend com o novo
   `versionCode`, `versionName`, `apkUrl` (link direto pro `.apk`) e
   `notes` (texto exibido no diálogo). Usar `force: true` só se o build
   antigo não puder mais funcionar (ex.: quebra de contrato com o
   backend).
5. Deploy do frontend — o JSON é servido estático em `/mobile-release.json`.

Sem Capgo/live-update nesta fase — apenas download + instalador nativo.

## iOS

Fora do escopo inicial (precisa Mac + Xcode). APK = Android apenas.
