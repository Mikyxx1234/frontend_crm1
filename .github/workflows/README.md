# CI/CD — GitHub Actions + GHCR + Easypanel

Este repo builda a imagem Docker no GitHub Actions (com cache persistente),
publica em `ghcr.io/mikyxx1234/frontend_crm1` e dispara um webhook do
Easypanel para redeploy. Deploy fim-a-fim: **~30-60 segundos** (vs
5-10 min do build direto no Easypanel).

## Como funciona

```
git push main / DEV_BRANCH
   |
   v
GitHub Actions
   1. Checkout
   2. docker buildx build (com cache-from/to: type=gha)
   3. docker push ghcr.io/mikyxx1234/frontend_crm1:<tag>
   4. curl POST <EASYPANEL_WEBHOOK>
   |
   v
Easypanel
   docker pull ghcr.io/mikyxx1234/frontend_crm1:<tag>
   docker restart <container>
```

Tags:
- **push main** → `:latest` + `:<sha>`
- **push DEV_BRANCH** → `:dev` + `:<sha>`

O `:<sha>` permite rollback: no Easypanel troque a tag da imagem para
`ghcr.io/mikyxx1234/frontend_crm1:<sha-antigo>` e faça deploy.

## Setup inicial (fazer 1x)

### 1) GitHub — Secrets & Variables

**Repository variables** (Settings → Secrets and variables → Actions → Variables):

| Name                | Valor                                              |
| ------------------- | -------------------------------------------------- |
| `API_BASE_PROD`     | `https://crm-backend.easypanel.host`               |
| `API_BASE_DEV`      | `https://crm-dev-backend.ca31ey.easypanel.host`    |
| `NEXTAUTH_URL_PROD` | `https://crm.easypanel.host`                       |
| `NEXTAUTH_URL_DEV`  | `https://crm-dev-frontend.ca31ey.easypanel.host`   |

**Repository secrets** (Settings → Secrets and variables → Actions → Secrets):

| Name                     | Valor                                                     |
| ------------------------ | --------------------------------------------------------- |
| `NEXTAUTH_SECRET_PROD`   | Mesmo valor de `NEXTAUTH_SECRET` no Easypanel de prod     |
| `NEXTAUTH_SECRET_DEV`    | Mesmo valor de `NEXTAUTH_SECRET` no Easypanel de dev      |
| `EASYPANEL_WEBHOOK_PROD` | URL do webhook do serviço frontend em prod (ver abaixo)   |
| `EASYPANEL_WEBHOOK_DEV`  | URL do webhook do serviço frontend em dev (ver abaixo)    |

### 2) GHCR — tornar imagem pública (opcional mas recomendado)

Depois do primeiro push, o pacote aparece em
`https://github.com/Mikyxx1234?tab=packages`. Abra o pacote
`frontend_crm1` → **Package settings** → **Change visibility** → **Public**.

Se preferir manter privada:
- Crie um GitHub PAT com escopo `read:packages`.
- No Easypanel: **Registries** → **Add** → tipo `Docker Hub`-like:
  - URL: `ghcr.io`
  - Username: seu login GitHub
  - Password: o PAT
- Selecione essa credencial no serviço.

### 3) Easypanel — mudar source pra Docker Image

Em cada ambiente (prod e dev), no serviço `frontend`:

1. **App** → **General** → **Source**: mudar de `Git` para **Docker Image**.
2. **Image**:
   - Prod: `ghcr.io/mikyxx1234/frontend_crm1:latest`
   - Dev:  `ghcr.io/mikyxx1234/frontend_crm1:dev`
3. **Registry**: selecionar a credencial GHCR (se privado). Se público, deixar vazio.
4. Salvar.

### 4) Easypanel — Deploy Hook (Webhook)

Ainda no serviço `frontend`:

1. **Deployments** → **Deploy Hook** → **Enable** → copia a URL gerada.
2. Cola essa URL em `EASYPANEL_WEBHOOK_PROD` (ou `_DEV`) no GitHub.

### 5) Primeiro deploy (manual)

Faça um push qualquer em `main` ou `DEV_BRANCH`. O workflow roda,
publica a imagem e dispara o Easypanel. Se algo falhar:

- Ver logs em GitHub → Actions.
- Testar manualmente no Easypanel: **Deployments** → **Deploy now**
  (Easypanel puxa a imagem que o Actions acabou de publicar).

## Deploy manual (sem push)

Actions → **Build & Deploy** → **Run workflow** → escolhe branch.

## Rollback rápido

1. Ver histórico em GitHub → **Packages** → `frontend_crm1` → **Versions**.
2. Copiar o SHA da versão anterior.
3. No Easypanel, mudar Image para
   `ghcr.io/mikyxx1234/frontend_crm1:<sha-antigo>` → **Deploy**.
