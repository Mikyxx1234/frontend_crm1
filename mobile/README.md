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

## iOS

Fora do escopo inicial (precisa Mac + Xcode). APK = Android apenas.
