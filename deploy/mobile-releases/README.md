# Serviço EasyPanel — releases do APK (EduIT CRM)

Serviço **estático** (nginx) separado do frontend CRM. Hospeda:

- `/mobile-release.json` — manifesto de versão
- `/releases/*.apk` — binários assinados

O CRM de produção **não** rebuilda quando só o APK muda.

## URL esperada (ajuste se o hostname no EasyPanel for outro)

```
https://crm-mobile-releases.6tqx2r.easypanel.host
```

APK 1.0.0:

```
https://crm-mobile-releases.6tqx2r.easypanel.host/releases/eduit-crm-1.0.0.apk
```

## Criar no EasyPanel

1. **New Service** → tipo App / Docker
2. Nome: `crm-mobile-releases` (gera o hostname `crm-mobile-releases.6tqx2r.easypanel.host` no mesmo projeto)
3. Repositório: `frontend_crm1`, branch **`CRM_MOBILE`**
4. Dockerfile path: `deploy/mobile-releases/Dockerfile`
5. Docker build context: `deploy/mobile-releases`
6. Porta: **80**
7. Domínio público HTTPS (Let's Encrypt do EasyPanel)
8. **Sem** variáveis de banco / Next — só o container nginx

Após o primeiro deploy, abra no browser:

- `https://<host>/mobile-release.json`
- `https://<host>/releases/eduit-crm-1.0.0.apk` (deve baixar ~3 MB)

Se o hostname real for diferente, atualize `apkUrl` em:

- `deploy/mobile-releases/public/mobile-release.json`
- `public/mobile-release.json` (espelho lido pelo app via CRM)

e faça rebuild **só** deste serviço (e um deploy leve do CRM se o JSON do frontend mudar).

## Publicar novo APK

1. Bump `versionCode` / `versionName` em `mobile/android/app/build.gradle`
2. `cd mobile/android && .\gradlew.bat assembleRelease`
3. Copiar APK → `deploy/mobile-releases/public/releases/eduit-crm-<ver>.apk`
4. Atualizar os dois `mobile-release.json` (`versionCode`, `apkUrl`, `notes`)
5. Commit + push na `CRM_MOBILE` → rebuild do serviço `crm-mobile-releases`
6. Se o app ainda busca o JSON no CRM (`/mobile-release.json`), atualize também `public/mobile-release.json` e faça deploy do frontend (arquivo pequeno)

## Segurança

- Keystore **nunca** neste serviço nem no Git
- APK é baixável por quem tiver a URL (distribuição interna)
- CORS liberado no nginx só para leitura do manifesto/APK
